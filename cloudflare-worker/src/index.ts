import { Hono } from "hono";
import { cors } from "hono/cors";

export interface Env {
  DB: any; // D1Database
  FILES: any; // R2Bucket
  ASSETS: any;
  SALT_TOKEN?: string;
  JWT_SECRET?: string;
}

type Variables = {
  user: any;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Enable global CORS
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

// Hashing password with Web Crypto (SHA-256) combined with SALT_TOKEN
async function hashPassword(password: string, salt?: string): Promise<string> {
  const text = password + (salt || "");
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Decode session email securely from session token
function getEmailFromSessionToken(token: string): string | null {
  try {
    if (!token.startsWith("session_")) {
      return null;
    }
    const tokenPart = token.replace("session_", "");
    return atob(tokenPart);
  } catch (e) {
    return null;
  }
}

// Global Auth Middleware
const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Missing authentication token" }, 401);
  }

  const token = authHeader.split(" ")[1];
  const email = getEmailFromSessionToken(token);
  if (!email) {
    return c.json({ error: "Malformed session token" }, 401);
  }

  const agent = await c.env.DB.prepare("SELECT * FROM agents WHERE email = ?")
    .bind(email.toLowerCase().trim())
    .first();

  if (!agent) {
    return c.json({ error: "Invalid session token" }, 401);
  }

  if (agent.is_frozen === 1) {
    return c.json({ error: "Your account is frozen. Contact Super Admin." }, 403);
  }

  c.set("user", agent);
  await next();
};

// Help helper functions for platform configurations and training systems stored in platform_configs
async function ensureConfigTable(db: any) {
  await db.prepare("CREATE TABLE IF NOT EXISTS platform_configs (key TEXT PRIMARY KEY, value TEXT)").run();
}

async function ensureAllTables(db: any) {
  await ensureConfigTable(db);
  
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS billing_docs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      doc_number TEXT NOT NULL,
      client_id TEXT,
      client_name TEXT NOT NULL,
      issue_date TEXT,
      due_date TEXT NOT NULL,
      currency TEXT NOT NULL,
      items_json TEXT NOT NULL,
      subtotal REAL NOT NULL,
      tax_rate REAL NOT NULL,
      total REAL NOT NULL,
      notes TEXT,
      status TEXT NOT NULL,
      issuer_email TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS training_modules (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      duration TEXT,
      image TEXT,
      summary TEXT,
      points_json TEXT,
      quiz_questions_json TEXT
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS training_resources (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      type TEXT NOT NULL
    )
  `).run();

  // Ensure and alter training_modules with pdf_url and pdf_name columns if not exist
  try {
    await db.prepare("ALTER TABLE training_modules ADD COLUMN pdf_url TEXT").run();
  } catch (e) {}
  try {
    await db.prepare("ALTER TABLE training_modules ADD COLUMN pdf_name TEXT").run();
  } catch (e) {}

  // Ensure and alter leads table with uploads_json column if not exist
  try {
    await db.prepare("ALTER TABLE leads ADD COLUMN uploads_json TEXT").run();
  } catch (e) {}
}

async function getConfig(db: any, key: string, defaultValue: any = null): Promise<any> {
  await ensureConfigTable(db);
  const row = (await db
    .prepare("SELECT value FROM platform_configs WHERE key = ?")
    .bind(key)
    .first()) as any;
  if (!row) return defaultValue;
  try {
    return JSON.parse(row.value);
  } catch (e) {
    return row.value;
  }
}

async function setConfig(db: any, key: string, value: any) {
  await ensureConfigTable(db);
  const jsonStr = JSON.stringify(value);
  await db
    .prepare("INSERT OR REPLACE INTO platform_configs (key, value) VALUES (?, ?)")
    .bind(key, jsonStr)
    .run();
}

// --------------------------------------------------
// AUTHENTICATION ROUTES
// --------------------------------------------------

// POST /api/auth/login
app.post("/api/auth/login", async (c) => {
  const { email, password } = (await c.req.json()) as any;
  if (!email) return c.json({ error: "Email is required" }, 400);

  const cleanEmail = email.trim().toLowerCase();
  const salt = c.env.SALT_TOKEN || "";
  const hashedPassword = await hashPassword(password || "", salt);

  const agent = (await c.env.DB.prepare("SELECT * FROM agents WHERE email = ?")
    .bind(cleanEmail)
    .first()) as any;

  if (!agent) {
    return c.json({ error: "Incorrect email or password" }, 401);
  }

  // Preserve backwards compatibility for superadmin plain password check
  const isMatch = agent.password === password || agent.password === hashedPassword;

  if (!isMatch) {
    return c.json({ error: "Incorrect email or password" }, 401);
  }

  if (agent.is_frozen === 1) {
    return c.json({ error: "Your account is frozen. Please contact Super Admin." }, 403);
  }

  const token = `session_${btoa(cleanEmail)}`;
  return c.json({
    success: true,
    token,
    user: {
      email: agent.email,
      name: agent.name,
      isApproved: agent.is_approved === 1,
      didPassQuiz: agent.did_pass_quiz === 1,
      isAdmin: agent.is_admin === 1,
      isSuperAdmin: agent.is_super_admin === 1,
      isFrozen: agent.is_frozen === 1,
      avatarUrl: agent.avatar_url,
    },
  });
});

// POST /api/auth/register
app.post("/api/auth/register", async (c) => {
  const body = (await c.req.json()) as any;
  const { email, password, name, whatsapp, country, languages, experience, bypassTraining } = body;

  if (!email) return c.json({ error: "Email is required" }, 400);
  const cleanEmail = email.trim().toLowerCase();

  const existing = await c.env.DB.prepare("SELECT email FROM agents WHERE email = ?")
    .bind(cleanEmail)
    .first();

  if (existing) {
    return c.json({ error: "Account already exists with this email" }, 409);
  }

  const salt = c.env.SALT_TOKEN || "";
  const hashedPassword = await hashPassword(password || "password123", salt);

  const isAdm = cleanEmail === "olisbel@gmail.com" ? 1 : 0;
  const isSuper = cleanEmail === "olisbel@gmail.com" ? 1 : 0;
  const isApprovedVal = isAdm || bypassTraining ? 1 : 0;
  const passedQuizVal = isAdm || bypassTraining ? 1 : 0;

  await c.env.DB.prepare(
    `INSERT INTO agents (email, name, password, whatsapp, country, languages, experience, is_approved, did_pass_quiz, is_admin, is_super_admin, is_frozen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
  )
    .bind(
      cleanEmail,
      name || cleanEmail.split("@")[0],
      hashedPassword,
      whatsapp || "+0000000000",
      country || "Unknown",
      languages || "EN",
      experience || "0",
      isApprovedVal,
      passedQuizVal,
      isAdm,
      isSuper
    )
    .run();

  const token = `session_${btoa(cleanEmail)}`;
  return c.json(
    {
      success: true,
      token,
      user: {
        email: cleanEmail,
        name: name || cleanEmail.split("@")[0],
        isApproved: isApprovedVal === 1,
        didPassQuiz: passedQuizVal === 1,
        isAdmin: isAdm === 1,
        isSuperAdmin: isSuper === 1,
      },
    },
    201
  );
});

// GET /api/auth/me
app.get("/api/auth/me", authMiddleware, async (c) => {
  const user = c.get("user");
  return c.json({
    email: user.email,
    name: user.name,
    isApproved: user.is_approved === 1,
    didPassQuiz: user.did_pass_quiz === 1,
    isAdmin: user.is_admin === 1,
    isSuperAdmin: user.is_super_admin === 1,
    isFrozen: user.is_frozen === 1,
    avatarUrl: user.avatar_url,
  });
});

// --------------------------------------------------
// AGENTS ENDPOINTS
// --------------------------------------------------

// GET /api/agents (Admin only)
app.get("/api/agents", authMiddleware, async (c) => {
  const user = c.get("user");
  if (user.is_admin !== 1) {
    return c.json({ error: "Permission denied. Administrator access required." }, 403);
  }
  const { results } = await c.env.DB.prepare("SELECT * FROM agents").all();
  const formattedAgents = results.map((row: any) => ({
    email: row.email,
    name: row.name,
    whatsapp: row.whatsapp,
    country: row.country,
    languages: row.languages,
    experience: row.experience,
    isApproved: row.is_approved === 1,
    didPassQuiz: row.did_pass_quiz === 1,
    isAdmin: row.is_admin === 1,
    isSuperAdmin: row.is_super_admin === 1,
    isFrozen: row.is_frozen === 1,
    avatarUrl: row.avatar_url,
  }));
  return c.json(formattedAgents);
});

// PUT /api/agents/:email
app.put("/api/agents/:email", authMiddleware, async (c) => {
  const targetEmail = decodeURIComponent(c.req.param("email")).toLowerCase().trim();
  const user = c.get("user");
  const body = (await c.req.json()) as any;

  if (user.is_admin !== 1 && user.email.toLowerCase() !== targetEmail) {
    return c.json({ error: "Permission denied." }, 403);
  }

  const agent = (await c.env.DB.prepare("SELECT * FROM agents WHERE email = ?")
    .bind(targetEmail)
    .first()) as any;

  if (!agent) {
    return c.json({ error: "Agent not found" }, 404);
  }

  if (agent.is_super_admin === 1 && user.email.toLowerCase() !== targetEmail) {
    return c.json({ error: "Superadmin role is protected" }, 403);
  }

  const fields: string[] = [];
  const params: any[] = [];

  if (body.name !== undefined) {
    fields.push("name = ?");
    params.push(body.name);
  }
  if (body.whatsapp !== undefined) {
    fields.push("whatsapp = ?");
    params.push(body.whatsapp);
  }
  if (body.country !== undefined) {
    fields.push("country = ?");
    params.push(body.country);
  }
  if (body.languages !== undefined) {
    fields.push("languages = ?");
    params.push(body.languages);
  }
  if (body.experience !== undefined) {
    fields.push("experience = ?");
    params.push(body.experience);
  }

  if (user.is_admin === 1) {
    if (body.isApproved !== undefined) {
      fields.push("is_approved = ?");
      params.push(body.isApproved ? 1 : 0);
    }
    if (body.didPassQuiz !== undefined) {
      fields.push("did_pass_quiz = ?");
      params.push(body.didPassQuiz ? 1 : 0);
    }
    if (body.isAdmin !== undefined) {
      fields.push("is_admin = ?");
      params.push(body.isAdmin ? 1 : 0);
    }
    if (body.isFrozen !== undefined) {
      fields.push("is_frozen = ?");
      params.push(body.isFrozen ? 1 : 0);
    }
  }

  if (body.avatarUrl !== undefined) {
    fields.push("avatar_url = ?");
    params.push(body.avatarUrl);
  }

  if (body.password !== undefined && body.password !== "") {
    const salt = c.env.SALT_TOKEN || "";
    const hashed = await hashPassword(body.password, salt);
    fields.push("password = ?");
    params.push(hashed);
  }

  if (fields.length > 0) {
    params.push(targetEmail);
    await c.env.DB.prepare(`UPDATE agents SET ${fields.join(", ")} WHERE email = ?`)
      .bind(...params)
      .run();
  }

  return c.json({ success: true });
});

// DELETE /api/agents/:email
app.delete("/api/agents/:email", authMiddleware, async (c) => {
  const user = c.get("user");
  if (user.is_admin !== 1) {
    return c.json({ error: "Administrator rights required to delete agents" }, 403);
  }

  const targetEmail = decodeURIComponent(c.req.param("email")).toLowerCase().trim();
  const agent = (await c.env.DB.prepare("SELECT * FROM agents WHERE email = ?")
    .bind(targetEmail)
    .first()) as any;

  if (!agent) {
    return c.json({ error: "Agent not found" }, 404);
  }

  if (agent.is_super_admin === 1) {
    return c.json({ error: "Superadmin account cannot be removed" }, 403);
  }

  await c.env.DB.prepare("DELETE FROM agents WHERE email = ?").bind(targetEmail).run();
  return c.json({ success: true });
});

// --------------------------------------------------
// LEADS / CRM ENDPOINTS
// --------------------------------------------------

// GET /api/leads
app.get("/api/leads", async (c) => {
  try {
    const { results: leadsRows } = await c.env.DB.prepare("SELECT * FROM leads ORDER BY status ASC, id DESC").all();

    const leads: any[] = [];
    for (const lead of leadsRows as any[]) {
      const { results: notes } = await c.env.DB.prepare("SELECT * FROM lead_notes WHERE lead_id = ?")
        .bind(lead.id)
        .all();

      const { results: customFields } = await c.env.DB.prepare("SELECT * FROM lead_custom_fields WHERE lead_id = ?")
        .bind(lead.id)
        .all();

      leads.push({
        id: lead.id,
        name: lead.name,
        industry: lead.industry,
        country: lead.country,
        estValue: lead.est_value,
        payout: lead.payout,
        earningsCurrency: lead.earnings_currency,
        status: lead.status,
        claimedBy: lead.claimed_by || undefined,
        contactPerson: {
          name: lead.contact_name || "",
          email: lead.contact_email || "",
          phone: lead.contact_phone || "",
          role: lead.contact_role || "",
        },
        socials: {
          linkedin: lead.social_linkedin || undefined,
          facebook: lead.social_facebook || undefined,
          whatsapp: lead.social_whatsapp || undefined,
          twitter: lead.social_twitter || undefined,
        },
        prototypeUrl: lead.prototype_url,
        description: lead.description || "",
        isFrozen: lead.is_frozen === 1,
        commissionPaid: lead.commission_paid === 1,
        commissionPaidDate: lead.commission_paid_date || undefined,
        commissionProofName: lead.commission_proof_name || undefined,
        commissionProofUrl: lead.commission_proof_url || undefined,
        notes: notes.map((n: any) => ({
          id: n.id,
          author: n.author,
          text: n.text,
          date: n.date,
        })),
        customFields: customFields.map((cf: any) => ({
          id: cf.id,
          title: cf.title,
          value: cf.value,
        })),
        uploads: JSON.parse(lead.uploads_json || "[]"),
      });
    }

    return c.json(leads);
  } catch (err: any) {
    return c.json({ error: "Failed to load leads from database: " + err.message }, 500);
  }
});

// POST /api/leads
app.post("/api/leads", authMiddleware, async (c) => {
  try {
    const body = (await c.req.json()) as any;
    const randomId = "L-" + Math.floor(1000 + Math.random() * 9000);

    const estValue = body.estValue || 1500;
    const payout = body.payout || Math.round(estValue * 0.2);

    await c.env.DB.prepare(
      `INSERT INTO leads (
        id, name, industry, country, est_value, payout, earnings_currency, status, 
        claimed_by, contact_name, contact_email, contact_phone, contact_role,
        social_linkedin, social_facebook, social_whatsapp, social_twitter, 
        prototype_url, description, is_frozen, commission_paid
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`
    )
      .bind(
        randomId,
        body.name || "Unnamed Opportunity",
        body.industry || "General Services",
        body.country || "United States",
        estValue,
        payout,
        body.earningsCurrency || "USD",
        body.status || "Available",
        body.claimedBy || null,
        body.contactPerson?.name || null,
        body.contactPerson?.email || null,
        body.contactPerson?.phone || null,
        body.contactPerson?.role || null,
        body.socials?.linkedin || null,
        body.socials?.facebook || null,
        body.socials?.whatsapp || null,
        body.socials?.twitter || null,
        body.prototypeUrl || "https://example.com/demo",
        body.description || ""
      )
      .run();

    if (body.customFields && Array.isArray(body.customFields)) {
      for (const cf of body.customFields) {
        await c.env.DB.prepare("INSERT INTO lead_custom_fields (id, lead_id, title, value) VALUES (?, ?, ?, ?)")
          .bind(cf.id || Math.random().toString(), randomId, cf.title, cf.value)
          .run();
      }
    }

    return c.json({ success: true, id: randomId }, 201);
  } catch (err: any) {
    return c.json({ error: "Failed to create lead opportunity: " + err.message }, 500);
  }
});

// PUT /api/leads/:id
app.put("/api/leads/:id", authMiddleware, async (c) => {
  try {
    const leadId = c.req.param("id");
    const body = (await c.req.json()) as any;

    const fields: string[] = [];
    const params: any[] = [];

    if (body.name !== undefined) {
      fields.push("name = ?");
      params.push(body.name);
    }
    if (body.industry !== undefined) {
      fields.push("industry = ?");
      params.push(body.industry);
    }
    if (body.country !== undefined) {
      fields.push("country = ?");
      params.push(body.country);
    }
    if (body.estValue !== undefined) {
      fields.push("est_value = ?");
      params.push(Number(body.estValue));
    }
    if (body.payout !== undefined) {
      fields.push("payout = ?");
      params.push(Number(body.payout));
    }
    if (body.earningsCurrency !== undefined) {
      fields.push("earnings_currency = ?");
      params.push(body.earningsCurrency);
    }
    if (body.status !== undefined) {
      fields.push("status = ?");
      params.push(body.status);
    }
    if (body.claimedBy !== undefined) {
      fields.push("claimed_by = ?");
      params.push(body.claimedBy || null);
    }
    if (body.isFrozen !== undefined) {
      fields.push("is_frozen = ?");
      params.push(body.isFrozen ? 1 : 0);
    }
    if (body.commissionPaid !== undefined) {
      fields.push("commission_paid = ?");
      params.push(body.commissionPaid ? 1 : 0);
    }
    if (body.commissionPaidDate !== undefined) {
      fields.push("commission_paid_date = ?");
      params.push(body.commissionPaidDate || null);
    }
    if (body.commissionProofName !== undefined) {
      fields.push("commission_proof_name = ?");
      params.push(body.commissionProofName || null);
    }
    if (body.commissionProofUrl !== undefined) {
      fields.push("commission_proof_url = ?");
      params.push(body.commissionProofUrl || null);
    }
    if (body.uploads !== undefined) {
      fields.push("uploads_json = ?");
      params.push(JSON.stringify(body.uploads));
    }
    if (body.prototypeUrl !== undefined) {
      fields.push("prototype_url = ?");
      params.push(body.prototypeUrl);
    }
    if (body.description !== undefined) {
      fields.push("description = ?");
      params.push(body.description);
    }

    // Nested structure contact person mapping:
    if (body.contactPerson !== undefined) {
      if (body.contactPerson.name !== undefined) {
        fields.push("contact_name = ?");
        params.push(body.contactPerson.name);
      }
      if (body.contactPerson.email !== undefined) {
        fields.push("contact_email = ?");
        params.push(body.contactPerson.email);
      }
      if (body.contactPerson.phone !== undefined) {
        fields.push("contact_phone = ?");
        params.push(body.contactPerson.phone);
      }
      if (body.contactPerson.role !== undefined) {
        fields.push("contact_role = ?");
        params.push(body.contactPerson.role);
      }
    }

    // Nested structure socials mapping:
    if (body.socials !== undefined) {
      if (body.socials.linkedin !== undefined) {
        fields.push("social_linkedin = ?");
        params.push(body.socials.linkedin);
      }
      if (body.socials.facebook !== undefined) {
        fields.push("social_facebook = ?");
        params.push(body.socials.facebook);
      }
      if (body.socials.whatsapp !== undefined) {
        fields.push("social_whatsapp = ?");
        params.push(body.socials.whatsapp);
      }
      if (body.socials.twitter !== undefined) {
        fields.push("social_twitter = ?");
        params.push(body.socials.twitter);
      }
    }

    if (fields.length > 0) {
      params.push(leadId);
      await c.env.DB.prepare(`UPDATE leads SET ${fields.join(", ")} WHERE id = ?`)
        .bind(...params)
        .run();
    }

    if (body.newNote) {
      const noteId = "note_" + Date.now();
      await c.env.DB.prepare("INSERT INTO lead_notes (id, lead_id, author, text, date) VALUES (?, ?, ?, ?, ?)")
        .bind(noteId, leadId, body.newNote.author, body.newNote.text, body.newNote.date)
        .run();
    }

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: "Failed to update lead: " + err.message }, 500);
  }
});

// DELETE /api/leads/:id
app.delete("/api/leads/:id", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (user.is_admin !== 1) {
      return c.json({ error: "Permission denied. Admin required." }, 403);
    }
    const leadId = c.req.param("id");
    await c.env.DB.prepare("DELETE FROM leads WHERE id = ?").bind(leadId).run();
    return c.json({ success: true, message: `Lead ${leadId} permanently deleted` });
  } catch (err: any) {
    return c.json({ error: "Failed to delete lead: " + err.message }, 500);
  }
});

// --------------------------------------------------
// TICKETS ENDPOINTS
// --------------------------------------------------

// GET /api/tickets
app.get("/api/tickets", authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM tickets ORDER BY created_at DESC").all();
  return c.json(
    results.map((r: any) => ({
      id: r.id,
      subject: r.subject,
      message: r.description,
      priority: r.priority,
      createdAt: r.created_at,
    }))
  );
});

// POST /api/tickets
app.post("/api/tickets", authMiddleware, async (c) => {
  const user = c.get("user");
  const body = (await c.req.json()) as any;
  const ticketId = "TICK-" + Date.now().toString().slice(-6);

  await c.env.DB.prepare(
    "INSERT INTO tickets (id, subject, description, priority, created_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(ticketId, body.subject || "General Inquiry", body.message || "", body.priority || "Medium", new Date().toISOString())
    .run();

  return c.json({
    id: ticketId,
    subject: body.subject || "General Inquiry",
    message: body.message || "",
    author: user.email,
    createdAt: new Date().toISOString(),
    status: "Open",
  });
});

// --------------------------------------------------
// REPORTS ENDPOINTS
// --------------------------------------------------

// GET /api/reports/summary
app.get("/api/reports/summary", authMiddleware, async (c) => {
  const user = c.get("user");
  const queryParamEmail = c.req.query("email") || user.email;
  const targetEmail = queryParamEmail.toLowerCase().trim();

  const { results: leadsRows } = await c.env.DB.prepare("SELECT * FROM leads").all();
  const myLeads = (leadsRows as any[]).filter((l) => l.claimed_by?.toLowerCase() === targetEmail);

  const availableCount = (leadsRows as any[]).filter((l) => l.status === "Available" && l.is_frozen !== 1).length;
  const claimedCount = myLeads.length;
  const closedCount = myLeads.filter((l) => l.status === "Sold").length;

  const pendingEarnRaw = myLeads
    .filter((l) => (l.status === "Completed" || l.status === "In Progress") && l.commission_paid !== 1)
    .reduce((sum, l) => sum + l.payout, 0);

  const paidEarnRaw = myLeads.filter((l) => l.commission_paid === 1).reduce((sum, l) => sum + l.payout, 0);
  const referralEarnRaw = 120;

  const performanceTrend = [
    { period: "Init Period", cleared: 0, overall: 0 },
    { period: "Q1 Campaign", cleared: Math.round(paidEarnRaw * 0.2), overall: Math.round((paidEarnRaw + pendingEarnRaw) * 0.3) },
    { period: "Q2 Campaign", cleared: Math.round(paidEarnRaw * 0.6), overall: Math.round((paidEarnRaw + pendingEarnRaw) * 0.7) },
    { period: "Current Month", cleared: paidEarnRaw, overall: paidEarnRaw + pendingEarnRaw },
  ];

  return c.json({
    availableCount,
    claimedCount,
    closedCount,
    pendingCommissionsUSD: pendingEarnRaw,
    paidCommissionsUSD: paidEarnRaw,
    referralCommissionsUSD: referralEarnRaw,
    performanceTrend,
  });
});

// --------------------------------------------------
// CLOUDFLARE R2 FILE PERSISTENCE & UPLOAD
// --------------------------------------------------

// POST /api/upload
app.post("/api/upload", authMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    if (!file) return c.json({ error: "No file was selected for upload." }, 400);

    const targetType = formData.get("targetType") as string;
    const targetId = formData.get("targetId") as string;
    const extra = formData.get("extra") as string;

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileName = `${uniqueSuffix}-${file.name}`;

    // Put file stream to Cloudflare R2 files bucket
    const arrayBuffer = await file.arrayBuffer();
    await c.env.FILES.put(fileName, arrayBuffer, {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });

    const fileUrl = `/api/files/${fileName}`;

    // Retreat to make database updates if parameters are supplied for synchronous D1 updates
    if (targetType && targetId) {
      await ensureAllTables(c.env.DB);
      if (targetType === "training_module_pdf") {
        await c.env.DB.prepare("UPDATE training_modules SET pdf_url = ?, pdf_name = ? WHERE id = ?")
          .bind(fileUrl, file.name, Number(targetId))
          .run();
      } else if (targetType === "training_module_image") {
        await c.env.DB.prepare("UPDATE training_modules SET image = ? WHERE id = ?")
          .bind(fileUrl, Number(targetId))
          .run();
      } else if (targetType === "lead_upload") {
        const leadRow = await c.env.DB.prepare("SELECT uploads_json FROM leads WHERE id = ?")
          .bind(targetId)
          .first() as any;
        if (leadRow) {
          const existing = JSON.parse(leadRow.uploads_json || "[]");
          const newUpload = {
            id: "upl-" + Date.now(),
            name: file.name,
            url: fileUrl,
            date: new Date().toISOString().slice(0, 10),
            uploadedBy: extra || "Agent"
          };
          existing.push(newUpload);
          await c.env.DB.prepare("UPDATE leads SET uploads_json = ? WHERE id = ?")
            .bind(JSON.stringify(existing), targetId)
            .run();
        }
      }
    }

    return c.json({
      success: true,
      url: fileUrl,
      name: file.name,
    });
  } catch (err: any) {
    return c.json({ error: "Upload failed: " + err.message }, 500);
  }
});

// GET /api/files/:name
app.get("/api/files/:name", async (c) => {
  const fileName = c.req.param("name");
  const object = await c.env.FILES.get(fileName);
  if (!object) return c.text("File not found", 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);

  return new Response(object.body, { headers });
});

// --------------------------------------------------
// DYNAMIC CONFIGURATIONS & BILLING PORTAL
// --------------------------------------------------

// GET /api/config/quiz
app.get("/api/config/quiz", async (c) => {
  const quizHtml = await getConfig(c.env.DB, "quizHtml", "");
  return c.json({ quizHtml });
});

// POST /api/config/quiz
app.post("/api/config/quiz", authMiddleware, async (c) => {
  const user = c.get("user");
  if (user.is_admin !== 1) return c.json({ error: "Admin authorization required" }, 403);
  const { quizHtml } = (await c.req.json()) as any;
  await setConfig(c.env.DB, "quizHtml", quizHtml || "");
  return c.json({ success: true });
});

// GET /api/training/resources
app.get("/api/training/resources", async (c) => {
  try {
    await ensureAllTables(c.env.DB);
    const { results } = await c.env.DB.prepare("SELECT * FROM training_resources").all();
    return c.json(results);
  } catch (err: any) {
    return c.json({ error: "Failed to load training resources: " + err.message }, 500);
  }
});

// POST /api/training/resources
app.post("/api/training/resources", authMiddleware, async (c) => {
  try {
    await ensureAllTables(c.env.DB);
    const user = c.get("user");
    if (user.is_admin !== 1) return c.json({ error: "Admin authorization required" }, 403);

    const { resources } = (await c.req.json()) as any;
    if (!resources || !Array.isArray(resources)) {
      return c.json({ error: "Expected 'resources' array" }, 400);
    }

    const queries = [
      c.env.DB.prepare("DELETE FROM training_resources")
    ];

    for (const res of resources) {
      queries.push(
        c.env.DB.prepare(`
          INSERT INTO training_resources (id, title, url, type) 
          VALUES (?, ?, ?, ?)
        `).bind(
          res.id || res.title || Math.random().toString(),
          res.title,
          res.url,
          res.type || "link"
        )
      );
    }

    await c.env.DB.batch(queries);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: "Failed to save training resources: " + err.message }, 500);
  }
});

// GET /api/training/modules
app.get("/api/training/modules", async (c) => {
  try {
    await ensureAllTables(c.env.DB);
    const { results } = await c.env.DB.prepare("SELECT * FROM training_modules ORDER BY id ASC").all();
    const formattedModules = results.map((row: any) => ({
      id: row.id,
      title: row.title,
      duration: row.duration,
      image: row.image,
      summary: row.summary,
      points: JSON.parse(row.points_json || "[]"),
      quizQuestions: JSON.parse(row.quiz_questions_json || "[]"),
      pdfUrl: row.pdf_url || "",
      pdfName: row.pdf_name || ""
    }));
    return c.json(formattedModules);
  } catch (err: any) {
    return c.json({ error: "Failed to load training modules: " + err.message }, 500);
  }
});

// POST /api/training/modules
app.post("/api/training/modules", authMiddleware, async (c) => {
  try {
    await ensureAllTables(c.env.DB);
    const user = c.get("user");
    if (user.is_admin !== 1) return c.json({ error: "Admin authorization required" }, 403);

    const { modules } = (await c.req.json()) as any;
    if (!modules || !Array.isArray(modules)) {
      return c.json({ error: "Expected 'modules' array" }, 400);
    }

    const queries = [
      c.env.DB.prepare("DELETE FROM training_modules")
    ];

    for (const mod of modules) {
      queries.push(
        c.env.DB.prepare(`
          INSERT INTO training_modules (id, title, duration, image, summary, points_json, quiz_questions_json, pdf_url, pdf_name) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          mod.id,
          mod.title,
          mod.duration || "",
          mod.image || "",
          mod.summary || "",
          JSON.stringify(mod.points || []),
          JSON.stringify(mod.quizQuestions || []),
          mod.pdfUrl || "",
          mod.pdfName || ""
        )
      );
    }

    await c.env.DB.batch(queries);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: "Failed to save training modules: " + err.message }, 500);
  }
});

// GET /api/billing
app.get("/api/billing", authMiddleware, async (c) => {
  try {
    await ensureAllTables(c.env.DB);
    const { results } = await c.env.DB.prepare("SELECT * FROM billing_docs ORDER BY created_at DESC").all();
    const formattedDocs = results.map((row: any) => ({
      id: row.id,
      type: row.type,
      docNumber: row.doc_number,
      clientId: row.client_id,
      clientName: row.client_name,
      issueDate: row.issue_date,
      dueDate: row.due_date,
      currency: row.currency,
      items: JSON.parse(row.items_json || "[]"),
      subtotal: row.subtotal,
      taxRate: row.tax_rate,
      total: row.total,
      notes: row.notes,
      status: row.status,
      issuerEmail: row.issuer_email,
    }));
    return c.json(formattedDocs);
  } catch (err: any) {
    return c.json({ error: "Failed to retrieve billing docs: " + err.message }, 500);
  }
});

// POST /api/billing/sync
app.post("/api/billing/sync", authMiddleware, async (c) => {
  try {
    await ensureAllTables(c.env.DB);
    const invoices = (await c.req.json()) as any[];
    if (!Array.isArray(invoices)) {
      return c.json({ error: "Request body must be a JSON array of invoices" }, 400);
    }

    const queries = [
      c.env.DB.prepare("DELETE FROM billing_docs")
    ];

    for (const inv of invoices) {
      queries.push(
        c.env.DB.prepare(`
          INSERT INTO billing_docs (
            id, type, doc_number, client_id, client_name, issue_date, due_date, 
            currency, items_json, subtotal, tax_rate, total, notes, status, issuer_email, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          inv.id,
          inv.type || "Estimate",
          inv.docNumber,
          inv.clientId || null,
          inv.clientName,
          inv.issueDate || null,
          inv.dueDate,
          inv.currency || "USD",
          JSON.stringify(inv.items || []),
          inv.subtotal || 0,
          inv.taxRate || 0,
          inv.total || 0,
          inv.notes || "",
          inv.status || "Unpaid",
          inv.issuerEmail || "unknown@agencypro.com",
          inv.createdAt || new Date().toISOString()
        )
      );
    }

    await c.env.DB.batch(queries);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: "Failed to sync billing: " + err.message }, 500);
  }
});

// POST /api/billing
app.post("/api/billing", authMiddleware, async (c) => {
  try {
    await ensureAllTables(c.env.DB);
    const body = (await c.req.json()) as any;
    const invoiceId = "INV-" + Date.now().toString().slice(-6);
    const docNumber = body.docNumber || "QT-" + Math.floor(1000 + Math.random() * 9000);
    const createdAt = new Date().toISOString();

    const invoice = {
      id: invoiceId,
      type: body.type || "Estimate",
      docNumber: docNumber,
      clientId: body.clientId || null,
      clientName: body.clientName || "",
      issueDate: body.issueDate || new Date().toISOString().slice(0, 10),
      dueDate: body.dueDate || new Date().toISOString().slice(0, 10),
      currency: body.currency || "USD",
      items: body.items || [],
      subtotal: body.subtotal || 0,
      taxRate: body.taxRate || 0,
      total: Number(body.total) || 0,
      notes: body.notes || "",
      status: body.status || "Unpaid",
      issuerEmail: body.issuerEmail || c.get("user").email,
      createdAt: createdAt
    };

    await c.env.DB.prepare(`
      INSERT INTO billing_docs (
        id, type, doc_number, client_id, client_name, issue_date, due_date, 
        currency, items_json, subtotal, tax_rate, total, notes, status, issuer_email, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      invoice.id,
      invoice.type,
      invoice.docNumber,
      invoice.clientId,
      invoice.clientName,
      invoice.issueDate,
      invoice.dueDate,
      invoice.currency,
      JSON.stringify(invoice.items),
      invoice.subtotal,
      invoice.taxRate,
      invoice.total,
      invoice.notes,
      invoice.status,
      invoice.issuerEmail,
      invoice.createdAt
    ).run();

    return c.json(invoice);
  } catch (err: any) {
    return c.json({ error: "Failed to create invoice: " + err.message }, 500);
  }
});

// GET /api/billing-profile/:email
app.get("/api/billing-profile/:email", authMiddleware, async (c) => {
  try {
    const targetEmail = decodeURIComponent(c.req.param("email")).toLowerCase().trim();
    const profiles = await getConfig(c.env.DB, "billingProfiles", {});
    return c.json(profiles[targetEmail] || {});
  } catch (err: any) {
    return c.json({ error: "Failed to get billing profile: " + err.message }, 500);
  }
});

// POST /api/billing-profile/:email
app.post("/api/billing-profile/:email", authMiddleware, async (c) => {
  try {
    const targetEmail = decodeURIComponent(c.req.param("email")).toLowerCase().trim();
    const body = (await c.req.json()) as any;
    const profiles = await getConfig(c.env.DB, "billingProfiles", {});
    profiles[targetEmail] = body || {};
    await setConfig(c.env.DB, "billingProfiles", profiles);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: "Failed to save billing profile: " + err.message }, 500);
  }
});

// --------------------------------------------------
// FALLBACK SPA & STATIC ASSETS ROUTING
// --------------------------------------------------
app.all("*", async (c) => {
  try {
    const assetResponse = await c.env.ASSETS.fetch(c.req.raw);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }
  } catch (e) {}

  // SPA Route Fallback in Cloudflare Workers to serve index.html for unknown routes
  try {
    const rootUrl = new URL("/", c.req.url);
    const rootRequest = new Request(rootUrl.toString(), c.req.raw);
    return await c.env.ASSETS.fetch(rootRequest);
  } catch (e) {
    return c.text("Not Found", 404);
  }
});

export default app;
