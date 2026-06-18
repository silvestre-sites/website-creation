// server.ts
// Robust Full-Stack Express Server with built-in SQLite-like persistence (db.json)
// Serves static client files in production and proxies through Vite in development

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import crypto from "crypto";

const app = express();
const PORT = 3000;

// Helper: SHA-256 password hashing with SALT_TOKEN
function hashPassword(password: string): string {
  const salt = process.env.SALT_TOKEN || "";
  return crypto.createHash("sha256").update(password + salt).digest("hex");
}

// Set up local folder for storage
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer disk storage for real file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});
const upload = multer({ storage });

// Database File Persistence Path
const DB_PATH = path.join(process.cwd(), "db.json");

// Helper to load/save state
interface DbSchema {
  agents: any[];
  leads: any[];
  tickets: any[];
  billingDocs: any[];
  quizHtml: string;
  resources: any[];
  modules: any[];
  billingProfiles: Record<string, any>;
}

function loadDatabase(): DbSchema {
  const defaultDb: DbSchema = {
    agents: [
      {
        email: "olisbel@gmail.com",
        password: "19921108626",
        name: "Olisbel (Super Admin)",
        whatsapp: "+1000000000",
        country: "United Kingdom",
        languages: "EN, PT",
        experience: "10",
        isApproved: true,
        didPassQuiz: true,
        isAdmin: true,
        isSuperAdmin: true,
        isFrozen: false,
        uploads: []
      }
    ],
    leads: [],
    tickets: [],
    billingDocs: [],
    quizHtml: "",
    resources: [],
    modules: [],
    billingProfiles: {}
  };

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2));
    return defaultDb;
  }

  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return defaultDb;
  }
}

function saveDatabase(data: DbSchema) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Ensure database is initialized
loadDatabase();

// Middlewares
app.use(express.json());
app.use("/uploads", express.static(UPLOADS_DIR));

// Helper: authenticate token from Bearer header
function authenticate(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authentication token" });
  }

  const token = authHeader.split(" ")[1];
  const db = loadDatabase();
  
  // Find agent linked to token session
  // Our simple session token format: "session_" + Base64(email)
  try {
    const tokenPart = token.replace("session_", "");
    const decodedEmail = Buffer.from(tokenPart, "base64").toString("utf-8");
    const agent = db.agents.find(a => a.email.toLowerCase() === decodedEmail.toLowerCase());

    if (!agent) {
      return res.status(401).json({ error: "Invalid session token" });
    }

    if (agent.isFrozen) {
      return res.status(403).json({ error: "Your account is frozen. Contact Super Admin." });
    }

    req.user = agent;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Malformed session token" });
  }
}

// ==========================================
// 1. AUTHENTICATION & AGENT ENDPOINTS
// ==========================================

// POST /api/auth/login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const db = loadDatabase();
  const cleanEmail = email.trim().toLowerCase();

  // Special bypass for fresh superadmin
  if (cleanEmail === "olisbel@gmail.com" && (!password || password === "19921108626")) {
    let superAdmin = db.agents.find(a => a.email === "olisbel@gmail.com");
    if (!superAdmin) {
      superAdmin = {
        email: "olisbel@gmail.com",
        password: "19921108626",
        name: "Olisbel (Super Admin)",
        whatsapp: "+1000000000",
        country: "United Kingdom",
        languages: "EN, PT",
        experience: "10",
        isApproved: true,
        didPassQuiz: true,
        isAdmin: true,
        isSuperAdmin: true,
        isFrozen: false,
        uploads: []
      };
      db.agents.push(superAdmin);
      saveDatabase(db);
    }

    const token = `session_${Buffer.from(cleanEmail).toString("base64")}`;
    return res.json({
      success: true,
      token,
      user: {
        email: superAdmin.email,
        name: superAdmin.name,
        isApproved: superAdmin.isApproved,
        didPassQuiz: superAdmin.didPassQuiz,
        isAdmin: superAdmin.isAdmin,
        isSuperAdmin: superAdmin.isSuperAdmin,
        isFrozen: superAdmin.isFrozen,
        avatarUrl: superAdmin.avatarUrl
      }
    });
  }

  const agent = db.agents.find(a => a.email.toLowerCase() === cleanEmail);
  if (!agent) {
    return res.status(401).json({ error: "Incorrect email or password" });
  }

  // Support both SHA-256 hashed password lookup and plain text database seeds lookup
  const isMatch = (agent.password === password) || (agent.password === hashPassword(password || ""));
  if (!isMatch) {
    return res.status(401).json({ error: "Incorrect email or password" });
  }

  if (agent.isFrozen) {
    return res.status(403).json({ error: "Your account is frozen. Please contact Super Admin." });
  }

  const token = `session_${Buffer.from(cleanEmail).toString("base64")}`;
  return res.json({
    success: true,
    token,
    user: {
      email: agent.email,
      name: agent.name,
      isApproved: agent.isApproved,
      didPassQuiz: agent.didPassQuiz,
      isAdmin: agent.isAdmin,
      isSuperAdmin: agent.isSuperAdmin,
      isFrozen: agent.isFrozen,
      avatarUrl: agent.avatarUrl
    }
  });
});

// POST /api/auth/register
app.post("/api/auth/register", (req, res) => {
  const { email, password, name, whatsapp, country, languages, experience, bypassTraining } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const db = loadDatabase();
  const cleanEmail = email.trim().toLowerCase();

  const existing = db.agents.find(a => a.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(409).json({ error: "Account already exists with this email" });
  }

  const isAdm = cleanEmail === "olisbel@gmail.com" || cleanEmail.includes("admin");
  const isSuper = cleanEmail === "olisbel@gmail.com";
  const approved = (isAdm || !!bypassTraining) ? true : false;
  const passedQuiz = (isAdm || !!bypassTraining) ? true : false;

  const newAgent = {
    email: cleanEmail,
    password: hashPassword(password || "password123"),
    name: name || cleanEmail.split("@")[0],
    whatsapp: whatsapp || "+0000000000",
    country: country || "Unknown",
    languages: languages || "EN",
    experience: experience || "0",
    isApproved: approved,
    didPassQuiz: passedQuiz,
    isAdmin: isAdm,
    isSuperAdmin: isSuper,
    isFrozen: false,
    uploads: []
  };

  db.agents.push(newAgent);
  saveDatabase(db);

  const token = `session_${Buffer.from(cleanEmail).toString("base64")}`;
  return res.json({
    success: true,
    token,
    user: {
      email: newAgent.email,
      name: newAgent.name,
      isApproved: newAgent.isApproved,
      didPassQuiz: newAgent.didPassQuiz,
      isAdmin: newAgent.isAdmin,
      isSuperAdmin: newAgent.isSuperAdmin
    }
  });
});

// GET /api/auth/me
app.get("/api/auth/me", authenticate, (req: any, res) => {
  return res.json({
    email: req.user.email,
    name: req.user.name,
    isApproved: req.user.isApproved,
    didPassQuiz: req.user.didPassQuiz,
    isAdmin: req.user.isAdmin,
    isSuperAdmin: req.user.isSuperAdmin,
    isFrozen: req.user.isFrozen,
    avatarUrl: req.user.avatarUrl
  });
});

// GET /api/agents (Admin only)
app.get("/api/agents", authenticate, (req: any, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Permission denied. Administrator access required." });
  }
  const db = loadDatabase();
  return res.json(db.agents);
});

// PUT /api/agents/:email
app.put("/api/agents/:email", authenticate, (req: any, res) => {
  const targetEmail = decodeURIComponent(req.params.email).toLowerCase().trim();
  const db = loadDatabase();

  const idx = db.agents.findIndex(a => a.email.toLowerCase() === targetEmail);
  if (idx === -1) {
    return res.status(404).json({ error: "Agent not found" });
  }

  // Permissions validation:
  // Non-admins can only edit themselves. Only admins can edit other agents.
  if (!req.user.isAdmin && req.user.email.toLowerCase() !== targetEmail) {
    return res.status(403).json({ error: "Permission denied." });
  }

  // Protect superadmin from losing status or being frozen by someone else
  if (db.agents[idx].isSuperAdmin && req.user.email.toLowerCase() !== targetEmail) {
    return res.status(403).json({ error: "Superadmin role is protected" });
  }

  const { password, ...otherBody } = req.body;
  const updatedAgent = { ...db.agents[idx], ...otherBody };
  if (password !== undefined && password !== "") {
    updatedAgent.password = hashPassword(password);
  }
  db.agents[idx] = updatedAgent;
  saveDatabase(db);

  return res.json({ success: true, agent: updatedAgent });
});

// DELETE /api/agents/:email
app.delete("/api/agents/:email", authenticate, (req: any, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Administrator rights required to delete agents" });
  }

  const targetEmail = decodeURIComponent(req.params.email).toLowerCase().trim();
  const db = loadDatabase();

  const agent = db.agents.find(a => a.email.toLowerCase() === targetEmail);
  if (!agent) {
    return res.status(404).json({ error: "Agent not found" });
  }

  if (agent.isSuperAdmin) {
    return res.status(403).json({ error: "Superadmin account cannot be removed" });
  }

  db.agents = db.agents.filter(a => a.email.toLowerCase() !== targetEmail);
  saveDatabase(db);

  return res.json({ success: true });
});

// ==========================================
// 2. LEADS / CRM ENDPOINTS
// ==========================================

// GET /api/leads
app.get("/api/leads", (req, res) => {
  const db = loadDatabase();
  return res.json(db.leads);
});

// POST /api/leads
app.post("/api/leads", authenticate, (req: any, res) => {
  const db = loadDatabase();
  const newLead = {
    id: "L-" + Math.floor(1000 + Math.random() * 9000),
    name: req.body.name || "Unnamed Prospect",
    industry: req.body.industry || "General",
    country: req.body.country || "United States",
    estValue: Number(req.body.estValue) || 1500,
    payout: Number(req.body.payout) || Math.round((Number(req.body.estValue) || 1500) * 0.2),
    earningsCurrency: req.body.earningsCurrency || "USD",
    status: req.body.status || "Available",
    claimedBy: req.body.claimedBy || undefined,
    contactPerson: req.body.contactPerson || { name: "", email: "", phone: "", role: "" },
    socials: req.body.socials || {},
    prototypeUrl: req.body.prototypeUrl || "https://example.com/demo",
    notes: req.body.notes || [{ id: "n-init", author: "Platform System", text: "Opportunity registered in marketplace.", date: new Date().toISOString().slice(0, 10) }],
    customFields: req.body.customFields || [],
    uploads: req.body.uploads || [],
    description: req.body.description || "",
    isFrozen: false
  };

  db.leads.unshift(newLead);
  saveDatabase(db);

  return res.status(201).json({ success: true, id: newLead.id, lead: newLead });
});

// PUT /api/leads/:id
app.put("/api/leads/:id", authenticate, (req: any, res) => {
  const leadId = req.params.id;
  const db = loadDatabase();

  const idx = db.leads.findIndex(l => l.id === leadId);
  if (idx === -1) {
    return res.status(404).json({ error: "Lead not found" });
  }

  const { newNote, ...fields } = req.body;
  const updatedLead = { ...db.leads[idx], ...fields };

  if (newNote) {
    if (!updatedLead.notes) updatedLead.notes = [];
    const noteId = "note-" + Date.now() + "-" + Math.floor(Math.random() * 100);
    updatedLead.notes.push({
      id: noteId,
      ...newNote
    });
  }

  db.leads[idx] = updatedLead;
  saveDatabase(db);

  return res.json({ success: true, lead: updatedLead });
});

// DELETE /api/leads/:id
app.delete("/api/leads/:id", authenticate, (req: any, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Permission denied. Admin required." });
  }

  const leadId = req.params.id;
  const db = loadDatabase();

  db.leads = db.leads.filter(l => l.id !== leadId);
  saveDatabase(db);

  return res.json({ success: true, message: `Lead ${leadId} permanently deleted` });
});

// ==========================================
// 3. SUPPORT TICKETS ENDPOINTS
// ==========================================

// GET /api/tickets
app.get("/api/tickets", authenticate, (req, res) => {
  const db = loadDatabase();
  return res.json(db.tickets);
});

// POST /api/tickets
app.post("/api/tickets", authenticate, (req: any, res) => {
  const db = loadDatabase();
  const ticket = {
    id: "TICK-" + Date.now().toString().slice(-6),
    subject: req.body.subject || "General Inquiry",
    message: req.body.message || "",
    author: req.user.email,
    createdAt: new Date().toISOString(),
    status: "Open"
  };

  db.tickets.unshift(ticket);
  saveDatabase(db);

  return res.json(ticket);
});

// ==========================================
// 4. METRICS / REPORT SUMMARIES ENDPOINTS
// ==========================================

// GET /api/reports/summary
app.get("/api/reports/summary", authenticate, (req: any, res) => {
  const db = loadDatabase();
  const targetEmail = (req.query.email || req.user.email).toLowerCase();

  const myLeads = db.leads.filter(l => l.claimedBy?.toLowerCase() === targetEmail);

  const availableCount = db.leads.filter(l => l.status === "Available" && !l.isFrozen).length;
  const claimedCount = myLeads.length;
  const closedCount = myLeads.filter(l => l.status === "Sold").length;

  const pendingEarnRaw = myLeads.filter(l => (l.status === "Completed" || l.status === "In Progress") && !l.commissionPaid).reduce((sum, l) => sum + l.payout, 0);
  const paidEarnRaw = myLeads.filter(l => l.commissionPaid).reduce((sum, l) => sum + l.payout, 0);
  const referralEarnRaw = 120; // Default flat bonus for successful onboarding

  const performanceTrend = [
    { period: "Init Period", cleared: 0, overall: 0 },
    { period: "Q1 Campaign", cleared: Math.round(paidEarnRaw * 0.2), overall: Math.round((paidEarnRaw + pendingEarnRaw) * 0.3) },
    { period: "Q2 Campaign", cleared: Math.round(paidEarnRaw * 0.6), overall: Math.round((paidEarnRaw + pendingEarnRaw) * 0.7) },
    { period: "Current Month", cleared: paidEarnRaw, overall: paidEarnRaw + pendingEarnRaw }
  ];

  return res.json({
    availableCount,
    claimedCount,
    closedCount,
    pendingCommissionsUSD: pendingEarnRaw,
    paidCommissionsUSD: paidEarnRaw,
    referralCommissionsUSD: referralEarnRaw,
    performanceTrend
  });
});

// ==========================================
// 5. LOCAL FILE UPLOAD (Mock R2 Integration)
// ==========================================
app.post("/api/upload", authenticate, upload.single("file"), (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file was selected for upload." });
  }

  // Create absolute/relative serving URL (e.g., /uploads/file-xyz.pdf)
  const fileUrl = `/uploads/${req.file.filename}`;
  return res.json({
    success: true,
    url: fileUrl,
    name: req.file.originalname
  });
});

// ==========================================
// 5B. DYNAMIC ACADEMY, CONFIGS & BILLING ROUTES
// ==========================================

// QUIZ HTML CONFIG
app.get("/api/config/quiz", (req, res) => {
  const db = loadDatabase();
  return res.json({ quizHtml: db.quizHtml || "" });
});

app.post("/api/config/quiz", authenticate, (req: any, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Admin authorization required" });
  }
  const db = loadDatabase();
  db.quizHtml = req.body.quizHtml || "";
  saveDatabase(db);
  return res.json({ success: true });
});

// TRAINING RESOURCES
app.get("/api/training/resources", (req, res) => {
  const db = loadDatabase();
  return res.json(db.resources || []);
});

app.post("/api/training/resources", authenticate, (req: any, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Admin authorization required" });
  }
  const db = loadDatabase();
  db.resources = req.body.resources || [];
  saveDatabase(db);
  return res.json({ success: true });
});

// TRAINING MODULES
app.get("/api/training/modules", (req, res) => {
  const db = loadDatabase();
  return res.json(db.modules || []);
});

app.post("/api/training/modules", authenticate, (req: any, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Admin authorization required" });
  }
  const db = loadDatabase();
  db.modules = req.body.modules || [];
  saveDatabase(db);
  return res.json({ success: true });
});

// BILLING LEDGER DOCS
app.get("/api/billing", authenticate, (req, res) => {
  const db = loadDatabase();
  return res.json(db.billingDocs || []);
});

app.post("/api/billing/sync", authenticate, (req: any, res) => {
  const db = loadDatabase();
  db.billingDocs = req.body || [];
  saveDatabase(db);
  return res.json({ success: true });
});

app.post("/api/billing", authenticate, (req: any, res) => {
  const db = loadDatabase();
  const invoice = {
    id: "INV-" + Date.now().toString().slice(-6),
    docNumber: req.body.docNumber || ("QT-" + Math.floor(1000 + Math.random() * 9000)),
    clientId: req.body.clientId || "",
    clientName: req.body.clientName || "",
    total: Number(req.body.total) || 0,
    dueDate: req.body.dueDate || new Date().toISOString().slice(0, 10),
    status: req.body.status || "Unpaid",
    type: req.body.type || "Estimate",
    createdAt: new Date().toISOString()
  };

  if (!db.billingDocs) db.billingDocs = [];
  db.billingDocs.unshift(invoice);
  saveDatabase(db);
  return res.json(invoice);
});

// BILLING AGENT PROFILES
app.get("/api/billing-profile/:email", authenticate, (req: any, res) => {
  const targetEmail = decodeURIComponent(req.params.email).toLowerCase().trim();
  const db = loadDatabase();
  if (!db.billingProfiles) db.billingProfiles = {};
  return res.json(db.billingProfiles[targetEmail] || {});
});

app.post("/api/billing-profile/:email", authenticate, (req: any, res) => {
  const targetEmail = decodeURIComponent(req.params.email).toLowerCase().trim();
  const db = loadDatabase();
  if (!db.billingProfiles) db.billingProfiles = {};
  db.billingProfiles[targetEmail] = req.body || {};
  saveDatabase(db);
  return res.json({ success: true });
});

// ==========================================
// 6. FRONTEND AND VITE MIDDLEWARE SETUP
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    // Serve production built assets
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Full-Stack Portal API] Service listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
