# ☁️ Cloudflare Full-Stack Integration Guide

This guide details how to host and deploy this application as a high-performance **Full-Stack Application** inside the **Cloudflare Ecosystem**:
1. **Frontend**: Hosted on **Cloudflare Pages** (global edge hosting with automatic GitHub deployments).
2. **Backend Engine**: Implemented via a serverless **Cloudflare Worker** running on V8 isolates.
3. **Database Store**: Backed by **Cloudflare D1** (serverless relational SQLite-compatible edge SQL database).

---

## 📂 Project Structure Created

We initialized a production-grade Cloudflare backend template in `/cloudflare-worker`:
- `wrangler.toml`: Wrangler service and binding descriptors.
- `schema.sql`: Full D1 Database initialization and tables structure (clean, zero-mock).
- `src/index.ts`: Native worker routing, database query bindings, auth checkers, and cross-origin CORS.

---

## 🛠️ Step 1: Provision the Cloudflare D1 Database

Secure access to the Cloudflare CLI `wrangler` and run the command to deploy your serverless relational database:

```bash
# 1. Login to your personal Cloudflare Dashboard
npx wrangler login

# 2. Create the D1 Relational SQL Database
npx wrangler d1 create lead-marketplace-db
```

This will print out a configuration snippet like:
```toml
[[d1_databases]]
binding = "DB"
database_name = "lead-marketplace-db"
database_id = "xxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
Copy and replace the placeholder `database_id` value in the `/cloudflare-worker/wrangler.toml` file with your output.

---

## 💾 Step 2: Initialize Database Schema (Zero Mock Data)

Run the SQL migration command to create the tables in your live Cloudflare D1 instance using the pre-configured zero-mock schema:

```bash
# Apply schema to the remote database
npx wrangler d1 execute lead-marketplace-db --remote --file=schema.sql
```
This sets up your `agents`, `leads`, `lead_notes`, and `lead_custom_fields` tables on the serverless edge with **no mock listings**, providing a clean slate plus the superadmin account with credentials:
- **SuperAdmin Email**: `olisbel@gmail.com`
- **SuperAdmin Password**: `19921108626`

---

## ⚡ Step 3: Deploy the Cloudflare Worker

Move inside the `/cloudflare-worker` directory and deploy the serverless handler code:

```bash
cd cloudflare-worker
npm install
npx wrangler deploy
```
Once deployed, Cloudflare will output an active backend API URL, for example:
`https://lead-marketplace-api.your-subdomain.workers.dev`

---

## 🖥️ Step 4: Host React Frontend on Cloudflare Pages

1. Commit and push this repository to your **GitHub** account.
2. Log into your **Cloudflare Dashboard** and navigate to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Choose your repository.
4. Input the following Build configurations:
   - **Framework Preset**: `Vite` OR `None`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **Save and Deploy**. Your frontend client is now deployed of your custom domains with instantaneous global SSD routing!

---

## 🔗 Step 5: Connecting Frontend React to the Edge API

To switch your local storage engine to your new Cloudflare Edge database API, add/replace your API endpoints inside React.

Simply create an `.env` file or assign the environment variable in Cloudflare Pages dashboard:
```env
VITE_API_URL=https://lead-marketplace-api.your-subdomain.workers.dev
```

And update your `src/store/AuthContext.tsx` or `src/store/JobsContext.tsx` functions to fetch from your edge serverless API:

```typescript
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Example login fetch replacing localStorage:
const login = async (email: string, password?: string) => {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (res.ok) {
     setUser(data.user);
     return { success: true };
  } else {
     return { success: false, error: data.error };
  }
};
```

This lets you decouple your persistent web app to have Cloudflare as the absolute serverless backend engine!
