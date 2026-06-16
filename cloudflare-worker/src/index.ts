/**
 * Cloudflare Worker Backend for the Agent Portal and Leads Marketplace
 * Powered by Cloudflare D1 (SQL Database Engine)
 */

export interface Env {
  // Bind your D1 Database in wrangler.toml to DB
  DB: D1Database;
  JWT_SECRET?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // 1. CORS Preflight & Headers Setup
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };

    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    try {
      // 2. Routing Logic

      // --- AUTHENTICATION ENDPOINTS ---

      // POST /api/auth/login
      if (path === "/api/auth/login" && method === "POST") {
        const { email, password } = await request.json() as any;
        if (!email) return jsonResponse({ error: "Email is required" }, 400, corsHeaders);

        const cleanEmail = email.trim().toLowerCase();

        // Query agent
        const agent = await env.DB.prepare(
          "SELECT * FROM agents WHERE email = ?"
        ).bind(cleanEmail).first() as any;

        if (!agent) {
          return jsonResponse({ error: "Invalid credentials" }, 401, corsHeaders);
        }

        // Check password matching
        if (password && agent.password !== password) {
          return jsonResponse({ error: "Invalid credentials" }, 401, corsHeaders);
        }

        if (agent.is_frozen === 1) {
          return jsonResponse({ error: "Your account is frozen. Contact Super Admin." }, 403, corsHeaders);
        }

        const userPayload = {
          email: agent.email,
          name: agent.name,
          isApproved: agent.is_approved === 1,
          didPassQuiz: agent.did_pass_quiz === 1,
          isAdmin: agent.is_admin === 1,
          isSuperAdmin: agent.is_super_admin === 1,
          avatarUrl: agent.avatar_url,
          token: `session_${btoa(agent.email)}` // Simple token for demonstration
        };

        return jsonResponse({ success: true, user: userPayload }, 200, corsHeaders);
      }

      // POST /api/auth/register
      if (path === "/api/auth/register" && method === "POST") {
        const body = await request.json() as any;
        const { email, password, name, whatsapp, country, languages, experience, bypassTraining } = body;

        if (!email) return jsonResponse({ error: "Email is required" }, 400, corsHeaders);
        const cleanEmail = email.trim().toLowerCase();

        // Check if agent already exists
        const existing = await env.DB.prepare(
          "SELECT email FROM agents WHERE email = ?"
        ).bind(cleanEmail).first();

        if (existing) {
          return jsonResponse({ error: "Account already exists with this email" }, 409, corsHeaders);
        }

        const isAdm = cleanEmail === "olisbel@gmail.com" ? 1 : 0;
        const isSuper = cleanEmail === "olisbel@gmail.com" ? 1 : 0;
        const isApprovedVal = (isAdm || bypassTraining) ? 1 : 0;
        const passedQuizVal = (isAdm || bypassTraining) ? 1 : 0;

        await env.DB.prepare(
          `INSERT INTO agents (email, name, password, whatsapp, country, languages, experience, is_approved, did_pass_quiz, is_admin, is_super_admin, is_frozen)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
        ).bind(
          cleanEmail,
          name || cleanEmail.split("@")[0],
          password || "password123",
          whatsapp || "+0000000000",
          country || "Unknown",
          languages || "EN",
          experience || "0",
          isApprovedVal,
          passedQuizVal,
          isAdm,
          isSuper
        ).run();

        const userPayload = {
          email: cleanEmail,
          name: name || cleanEmail.split("@")[0],
          isApproved: isApprovedVal === 1,
          didPassQuiz: passedQuizVal === 1,
          isAdmin: isAdm === 1,
          isSuperAdmin: isSuper === 1,
          token: `session_${btoa(cleanEmail)}`
        };

        return jsonResponse({ success: true, user: userPayload }, 201, corsHeaders);
      }

      // --- AGENTS ENDPOINTS ---

      // GET /api/agents (Admin only)
      if (path === "/api/agents" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM agents").all();
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
          avatarUrl: row.avatar_url
        }));
        return jsonResponse(formattedAgents, 200, corsHeaders);
      }

      // PUT /api/agents/:email
      if (path.startsWith("/api/agents/") && method === "PUT") {
        const targetEmail = decodeURIComponent(path.split("/").pop() || "").trim().toLowerCase();
        const body = await request.json() as any;

        // Build dynamic updates
        const fields: string[] = [];
        const params: any[] = [];

        if (body.name !== undefined) { fields.push("name = ?"); params.push(body.name); }
        if (body.whatsapp !== undefined) { fields.push("whatsapp = ?"); params.push(body.whatsapp); }
        if (body.country !== undefined) { fields.push("country = ?"); params.push(body.country); }
        if (body.languages !== undefined) { fields.push("languages = ?"); params.push(body.languages); }
        if (body.experience !== undefined) { fields.push("experience = ?"); params.push(body.experience); }
        if (body.isApproved !== undefined) { fields.push("is_approved = ?"); params.push(body.isApproved ? 1 : 0); }
        if (body.didPassQuiz !== undefined) { fields.push("did_pass_quiz = ?"); params.push(body.didPassQuiz ? 1 : 0); }
        if (body.isAdmin !== undefined) { fields.push("is_admin = ?"); params.push(body.isAdmin ? 1 : 0); }
        if (body.isFrozen !== undefined) { fields.push("is_frozen = ?"); params.push(body.isFrozen ? 1 : 0); }
        if (body.avatarUrl !== undefined) { fields.push("avatar_url = ?"); params.push(body.avatarUrl); }

        if (fields.length === 0) {
          return jsonResponse({ error: "No fields provided to update" }, 400, corsHeaders);
        }

        params.push(targetEmail);
        await env.DB.prepare(
          `UPDATE agents SET ${fields.join(", ")} WHERE email = ?`
        ).bind(...params).run();

        return jsonResponse({ success: true }, 200, corsHeaders);
      }

      // --- LEADS / OPPORTUNITIES ENDPOINTS ---

      // GET /api/leads
      if (path === "/api/leads" && method === "GET") {
        const { results: leadsRows } = await env.DB.prepare("SELECT * FROM leads ORDER BY status ASC, id DESC").all();
        
        const leads: any[] = [];
        for (const lead of leadsRows as any[]) {
          // Fetch notes and custom fields for each lead
          const { results: notes } = await env.DB.prepare(
            "SELECT * FROM lead_notes WHERE lead_id = ?"
          ).bind(lead.id).all();

          const { results: customFields } = await env.DB.prepare(
            "SELECT * FROM lead_custom_fields WHERE lead_id = ?"
          ).bind(lead.id).all();

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
              role: lead.contact_role || ""
            },
            socials: {
              linkedin: lead.social_linkedin || undefined,
              facebook: lead.social_facebook || undefined,
              whatsapp: lead.social_whatsapp || undefined,
              twitter: lead.social_twitter || undefined
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
              date: n.date
            })),
            customFields: customFields.map((cf: any) => ({
              id: cf.id,
              title: cf.title,
              value: cf.value
            })),
            uploads: [] // Store attachments/uploads separately
          });
        }

        return jsonResponse(leads, 200, corsHeaders);
      }

      // POST /api/leads
      if (path === "/api/leads" && method === "POST") {
        const body = await request.json() as any;
        const randomId = "L-" + Math.floor(1000 + Math.random() * 9000);

        const estValue = body.estValue || 1500;
        const payout = body.payout || Math.round(estValue * 0.2);

        // Standard Insert Into D1
        await env.DB.prepare(
          `INSERT INTO leads (
            id, name, industry, country, est_value, payout, earnings_currency, status, 
            claimed_by, contact_name, contact_email, contact_phone, contact_role,
            social_linkedin, social_facebook, social_whatsapp, social_twitter, 
            prototype_url, description, is_frozen, commission_paid
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`
        ).bind(
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
        ).run();

        // Custom Fields
        if (body.customFields && Array.isArray(body.customFields)) {
          for (const cf of body.customFields) {
            await env.DB.prepare(
              "INSERT INTO lead_custom_fields (id, lead_id, title, value) VALUES (?, ?, ?, ?)"
            ).bind(cf.id || Math.random().toString(), randomId, cf.title, cf.value).run();
          }
        }

        return jsonResponse({ success: true, id: randomId }, 201, corsHeaders);
      }

      // PUT /api/leads/:id
      if (path.startsWith("/api/leads/") && method === "PUT") {
        const leadId = path.split("/").pop();
        const body = await request.json() as any;

        const fields: string[] = [];
        const params: any[] = [];

        if (body.name !== undefined) { fields.push("name = ?"); params.push(body.name); }
        if (body.status !== undefined) { fields.push("status = ?"); params.push(body.status); }
        if (body.claimedBy !== undefined) { fields.push("claimed_by = ?"); params.push(body.claimedBy); }
        if (body.isFrozen !== undefined) { fields.push("is_frozen = ?"); params.push(body.isFrozen ? 1 : 0); }
        if (body.commissionPaid !== undefined) { fields.push("commission_paid = ?"); params.push(body.commissionPaid ? 1 : 0); }
        if (body.commissionPaidDate !== undefined) { fields.push("commission_paid_date = ?"); params.push(body.commissionPaidDate); }
        if (body.commissionProofName !== undefined) { fields.push("commission_proof_name = ?"); params.push(body.commissionProofName); }
        if (body.commissionProofUrl !== undefined) { fields.push("commission_proof_url = ?"); params.push(body.commissionProofUrl); }

        if (fields.length > 0) {
          params.push(leadId);
          await env.DB.prepare(
            `UPDATE leads SET ${fields.join(", ")} WHERE id = ?`
          ).bind(...params).run();
        }

        // Add lead note if passed
        if (body.newNote) {
          const noteId = "note_" + Date.now();
          await env.DB.prepare(
            "INSERT INTO lead_notes (id, lead_id, author, text, date) VALUES (?, ?, ?, ?, ?)"
          ).bind(noteId, leadId, body.newNote.author, body.newNote.text, body.newNote.date).run();
        }

        return jsonResponse({ success: true }, 200, corsHeaders);
      }

      // DELETE /api/leads/:id
      if (path.startsWith("/api/leads/") && method === "DELETE") {
        const leadId = path.split("/").pop();
        await env.DB.prepare("DELETE FROM leads WHERE id = ?").bind(leadId).run();
        return jsonResponse({ success: true, message: `Lead ${leadId} permanently deleted` }, 200, corsHeaders);
      }

      return jsonResponse({ error: "Endpoint Not Found" }, 404, corsHeaders);

    } catch (err: any) {
      return jsonResponse({ error: err.message || "Internal Server Error" }, 500, corsHeaders);
    }
  }
};

function jsonResponse(data: any, status: number, headers: any): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers
  });
}
