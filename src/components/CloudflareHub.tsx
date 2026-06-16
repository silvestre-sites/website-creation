import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

// Types for Simulator data
interface QueueTask {
  id: string;
  type: string;
  payload: string;
  status: "Pending" | "Processing" | "Completed" | "Failed";
  timestamp: string;
}

export function CloudflareHub() {
  const [activePhase, setActivePhase] = useState<1 | 2 | 3 | 4 | 5>(1);

  // --- PHASE 1 STATE ---
  const [agentsCount, setAgentsCount] = useState(50);
  const [leadsCount, setLeadsCount] = useState(250);
  const [avgPromptsPerAgent, setAvgPromptsPerAgent] = useState(15);

  // Computed metrics
  const computesD1Writes = (agentsCount * 4) + (leadsCount * 6);
  const computesKVReads = (agentsCount * 22) + (leadsCount * 3);
  const computesR2Uploads = leadsCount * 0.4;
  const computesAIGatewayCalls = agentsCount * avgPromptsPerAgent;

  // --- PHASE 3 STATE ---
  const [inputText, setInputText] = useState("agentSecurePassword123!");
  const [saltToken, setSaltToken] = useState("PLATFORM_SECRET_SALT_2026");
  const [hashedText, setHashedText] = useState("");
  const [apiLogs, setApiLogs] = useState<string[]>([]);

  const handleHashText = async () => {
    if (!inputText) return;
    const data = new TextEncoder().encode(inputText + saltToken);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    setHashedText(hashHex);
    addApiLog(`POST /api/auth/register : Hash password via SHA-256 with SALT_TOKEN`);
  };

  useEffect(() => {
    handleHashText();
  }, [inputText, saltToken]);

  const addApiLog = (message: string) => {
    setApiLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 9)]);
  };

  // --- PHASE 4 STATE ---
  // Queue Simulator State
  const [queue, setQueue] = useState<QueueTask[]>([
    { id: "q-011", type: "Social Lead Monitor", payload: "Scanning Twitter for '#looking-for-website'", status: "Pending", timestamp: "08:15" },
    { id: "q-014", type: "Currency Sync Sync", payload: "Fetching ECB exchange rates updates", status: "Pending", timestamp: "08:17" },
    { id: "q-015", type: "Commission Payout Batch", payload: "Re-computing agent earnings balance", status: "Pending", timestamp: "08:20" }
  ]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // KV Caching Simulator State
  const [cacheHits, setCacheHits] = useState(0);
  const [cacheMisses, setCacheMisses] = useState(0);
  const [queryLatency, setQueryLatency] = useState<number | null>(null);
  const [lastQuerySource, setLastQuerySource] = useState<"D1 Database" | "KV Cache" | null>(null);

  // AI Gateway Orchestrator State
  const [selectedAIModel, setSelectedAIModel] = useState<"Gemini-2.5-Flash" | "GPT-4o-Mini" | "Claude-3.5-Haiku">("Gemini-2.5-Flash");
  const [aiPrompt, setAiPrompt] = useState("Suggest five high-payout local niches operating without websites.");
  const [aiOutput, setAiOutput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const simulateAddQueueTask = (type: string, payload: string) => {
    const newTask: QueueTask = {
      id: "q-" + Math.floor(100 + Math.random() * 900),
      type,
      payload,
      status: "Pending",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    };
    setQueue(prev => [...prev, newTask]);
    addApiLog(`Queues : Dispatched background task ${newTask.id} (${type})`);
  };

  const drainQueue = async () => {
    if (isProcessingQueue || queue.filter(t => t.status === "Pending").length === 0) return;
    setIsProcessingQueue(true);

    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status === "Pending") {
        setQueue(prev => {
          const cloned = [...prev];
          cloned[i] = { ...cloned[i], status: "Processing" };
          return cloned;
        });
        await new Promise(r => setTimeout(r, 900));
        setQueue(prev => {
          const cloned = [...prev];
          cloned[i] = { ...cloned[i], status: "Completed" };
          return cloned;
        });
        addApiLog(`Queues : Worker acknowledged task ${queue[i].id} successfully.`);
      }
    }
    setIsProcessingQueue(false);
  };

  const runCachingTest = (itemKey: string) => {
    const isCached = cacheHits > 0 || Math.random() > 0.45;
    if (isCached) {
      setCacheHits(prev => prev + 1);
      setQueryLatency(2); // extremely fast 2ms from key-value edge cache
      setLastQuerySource("KV Cache");
      addApiLog(`KV Cache Hub : HIT key '${itemKey}' resolved in 2ms`);
    } else {
      setCacheMisses(prev => prev + 1);
      setQueryLatency(156); // slow relational lookup query latency
      setLastQuerySource("D1 Database");
      addApiLog(`KV Cache Hub : MISS key '${itemKey}'. Queried D1 Database directly (156ms). Populated KV Cache.`);
      if (cacheHits === 0) {
        setCacheHits(1); // Auto seed next cache request
      }
    }
  };

  const triggerAIGatewayQuery = () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    setAiOutput("");
    setTimeout(() => {
      const responses: Record<string, string> = {
        "Gemini-2.5-Flash": `[AI Gateway Grounding Enabled]\n💡 Optimized local services identified:\n1. Boutique Bakery Outlets (MZN / ZAR market segments)\n2. Independent Logistics/Freight Operators (BRL)\n3. Local Dental Clinics (USD/EUR)\n\nRecommended Pitching Hook: Share a pre-rendered dynamic custom landing page showing local SEO gaps.`,
        "GPT-4o-Mini": `[AI Gateway Cached Response]\n⚡ High-converting niches:\n1. Roofer Subcontractors with Google Maps listings only.\n2. Artisanal Co-ops.\n\nCommission target estimate: 20-30% payout ratio.`,
        "Claude-3.5-Haiku": `[AI Gateway Routing Segment]\n🤖 Niche targets:\n1. Private Medical/Podiatry Practices.\n2. Specialized Handyman Services.\n\nStrategy: Frame contact using 'Warm boost introductory script'.`
      };
      setAiOutput(responses[selectedAIModel] || "AI processed successfully via global Cloudflare routing.");
      setIsAiLoading(false);
      addApiLog(`AI Gateway : Routed model prompt to ${selectedAIModel} with tracking middleware`);
    }, 1200);
  };

  // --- PHASE 5 STATE ---
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([
    "✨ Wrangler Deploy Command Initialized",
    "✔ Validating wrangler.toml configurations...",
    "✔ Bundling backend TypeScript worker entrypoint index.ts",
    "✔ Executing D1 SQL schema migrations on DB: lead-marketplace-db",
    "✔ Creating secure R2 buckets (public-assets, credentials-vault)",
    "✔ Building compiled client React bundles inside /dist directories",
    "✔ Uploading static assets to globally distributed edge nodes",
    "🎉 Frontend & backend worker live at: https://lead-marketplace-api.olisbel.workers.dev"
  ]);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8 font-sans">
      
      {/* Visual Hub Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-100 uppercase tracking-wide">
            <span className="material-symbols-outlined text-[14px]">cloud</span> Cloudflare Serverless Stack
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Cloudflare Integration Center</h2>
          <p className="text-xs text-slate-500 max-w-2xl">
            Live operations workspace aligned with the 5-phase edge SaaS architecture. Design, configure, test, and monitor distributed compute.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 text-white rounded-full px-3 py-1.5 text-[11px] font-mono shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Wrangler Engine: ONLINE</span>
        </div>
      </div>

      {/* 5 Phase Steps Nav */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { phase: 1, title: "1. Architect", subtitle: "Primitives & Diagram" },
          { phase: 2, title: "2. Provision", subtitle: "Wrangler CLI & D1" },
          { phase: 3, title: "3. Implement", subtitle: "Auth & Secrets" },
          { phase: 4, title: "4. Scale & Sync", subtitle: "KV & AI Gateway" },
          { phase: 5, title: "5. Deploy", subtitle: "Observability" }
        ].map((p) => {
          const isAct = activePhase === p.phase;
          return (
            <button
              key={p.phase}
              onClick={() => setActivePhase(p.phase as any)}
              className={`text-left p-3.5 rounded-2xl border transition-all ${
                isAct 
                  ? "bg-slate-900 border-slate-900 text-white shadow-md relative"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100/70 text-slate-700"
              }`}
            >
              <div className="text-xs font-extrabold tracking-tight">{p.title}</div>
              <div className={`text-[10px] font-medium mt-0.5 ${isAct ? "text-slate-350" : "text-slate-450"}`}>{p.subtitle}</div>
              {isAct && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 hidden md:block"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Sandbox Workspace area */}
      <div className="bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden">
        
        <AnimatePresence mode="wait">
          {activePhase === 1 && (
            <motion.div 
              key="phase-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-6 space-y-6"
            >
              {/* Architecture Intro */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[20px] text-indigo-600">dns</span>
                  Phase 1: Architecture Mapping & Resource Planner
                </h3>
                <p className="text-xs text-slate-550 leading-relaxed">
                  Establish edge execution pathways. Every request reaches Cloudflare's smart routing network, allocating ephemeral workers closest to users, keeping latency low.
                </p>
              </div>

              {/* Grid block diagram representing D1, Workers, R2, etc */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4 text-center flex flex-col justify-between">
                  <span className="material-symbols-outlined text-[28px] text-indigo-600 block mb-2 mx-auto">bolt</span>
                  <strong className="text-xs font-extrabold text-slate-800 block">HTTP Workers</strong>
                  <p className="text-[10px] text-slate-500 mt-1 lines-2">Serverless compute proxies routing login/leads APIs.</p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-4 text-center flex flex-col justify-between">
                  <span className="material-symbols-outlined text-[28px] text-amber-600 block mb-2 mx-auto">database</span>
                  <strong className="text-xs font-extrabold text-slate-800 block">D1 Database</strong>
                  <p className="text-[10px] text-slate-500 mt-1">Structured SQL storing agent and lead registers.</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4 text-center flex flex-col justify-between">
                  <span className="material-symbols-outlined text-[28px] text-emerald-600 block mb-2 mx-auto">folder_open</span>
                  <strong className="text-xs font-extrabold text-slate-800 block">R2 Storage</strong>
                  <p className="text-[10px] text-slate-500 mt-1">S3-compatible bucket storing PDF payout receipts.</p>
                </div>

                <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100 rounded-2xl p-4 text-center flex flex-col justify-between">
                  <span className="material-symbols-outlined text-[28px] text-sky-600 block mb-2 mx-auto">key</span>
                  <strong className="text-xs font-extrabold text-slate-800 block">KV Caching</strong>
                  <p className="text-[10px] text-slate-500 mt-1">Ultra-fast global KV storage for quick sessions.</p>
                </div>

                <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 rounded-2xl p-4 text-center flex flex-col justify-between">
                  <span className="material-symbols-outlined text-[28px] text-rose-600 block mb-2 mx-auto">psychology</span>
                  <strong className="text-xs font-extrabold text-slate-800 block">AI Gateway</strong>
                  <p className="text-[10px] text-slate-500 mt-1">Grounding, caching, and routing Gemini models.</p>
                </div>
              </div>

              {/* Interactive Load Simulator Calculator */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4 shadow-inner">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">Edge Workload Load Estimator</h4>
                  <p className="text-[11px] text-slate-400">Scale the sliders below to estimate read/write throughput required on edge databases.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex justify-between">
                      <span>Active Sales Agents</span>
                      <strong className="text-emerald-400">{agentsCount}</strong>
                    </label>
                    <input 
                      type="range" 
                      min="5" 
                      max="500" 
                      step="5"
                      value={agentsCount} 
                      onChange={(e) => setAgentsCount(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex justify-between">
                      <span>CRM Opportunities Leads</span>
                      <strong className="text-emerald-400">{leadsCount}</strong>
                    </label>
                    <input 
                      type="range" 
                      min="20" 
                      max="2000" 
                      step="10"
                      value={leadsCount} 
                      onChange={(e) => setLeadsCount(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex justify-between">
                      <span>AI Prompts/Day (Agent)</span>
                      <strong className="text-emerald-400">{avgPromptsPerAgent}</strong>
                    </label>
                    <input 
                      type="range" 
                      min="2" 
                      max="100" 
                      step="2"
                      value={avgPromptsPerAgent} 
                      onChange={(e) => setAvgPromptsPerAgent(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-slate-800/40 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-mono">D1 DB WRITES</span>
                    <strong className="text-base font-bold text-white font-mono">{computesD1Writes} ops</strong>
                  </div>
                  <div className="p-3 bg-slate-800/40 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-mono">KV CACHE READS</span>
                    <strong className="text-base font-bold text-white font-mono">{computesKVReads} ops</strong>
                  </div>
                  <div className="p-3 bg-slate-800/40 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-mono">R2 FILES SAVED</span>
                    <strong className="text-base font-bold text-white font-mono">{computesR2Uploads.toFixed(0)} files</strong>
                  </div>
                  <div className="p-3 bg-slate-800/40 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-mono">AI GATEWAY CALLS</span>
                    <strong className="text-base font-bold text-white font-mono">{computesAIGatewayCalls} syncs</strong>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activePhase === 2 && (
            <motion.div 
              key="phase-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-6 space-y-6"
            >
              {/* Setup Guideline */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-indigo-600">sdk</span>
                  Phase 2: Core Provisioning CLI
                </h3>
                <p className="text-xs text-slate-550">
                  Boot up Wrangler commands locally to register the edge D1 database and store configuration files.
                </p>

                <div className="space-y-3">
                  <div className="p-3 bg-slate-900/5 hover:bg-slate-900/10 rounded-xl flex items-center justify-between text-xs transition-all border border-slate-220">
                    <div className="font-mono text-slate-705">
                      1. <span className="text-indigo-600 font-bold">npm create cloudflare@latest</span> -- --template=hello-world
                    </div>
                    <span className="text-[10px] font-semibold uppercase bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono">CLI INIT</span>
                  </div>

                  <div className="p-3 bg-slate-900/5 hover:bg-slate-900/10 rounded-xl flex items-center justify-between text-xs transition-all border border-slate-220">
                    <div className="font-mono text-slate-705">
                      2. <span className="text-indigo-600 font-bold">npx wrangler d1 create</span> lead-marketplace-db
                    </div>
                    <span className="text-[10px] font-semibold uppercase bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono">CREATE D1</span>
                  </div>

                  <div className="p-3 bg-slate-900/5 hover:bg-slate-900/10 rounded-xl flex items-center justify-between text-xs transition-all border border-slate-220">
                    <div className="font-mono text-slate-705">
                      3. <span className="text-indigo-600 font-bold">npx wrangler d1 execute</span> lead-marketplace-db --remote --file=schema.sql
                    </div>
                    <span className="text-[10px] font-semibold uppercase bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono">MIGRATE remote D1</span>
                  </div>
                </div>
              </div>

              {/* Binding Visualizer */}
              <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl space-y-3 shadow-inner">
                <span className="text-[10px] font-bold text-orange-400 font-mono uppercase tracking-wider block">wrangler.toml Binding Layout</span>
                <pre className="text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto p-3 bg-slate-950 rounded-xl border border-slate-800">
{`[[d1_databases]]
binding = "DB"
database_name = "lead-marketplace-db"
database_id = "your-d1-database-id-here" # Binded with Workers`}
                </pre>
              </div>
            </motion.div>
          )}

          {activePhase === 3 && (
            <motion.div 
              key="phase-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-6 space-y-6"
            >
              {/* Features and Hash sandbox */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Visual Hash Testing Box */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono">SHA-256 Hashing Sandbox</h3>
                    <p className="text-[11px] text-slate-500">Live test hashing with standard salt tokens. Never store plaintext credentials!</p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <span className="font-semibold text-slate-700 block text-[11px]">Plainttext Input password:</span>
                      <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-mono text-xs focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="font-semibold text-slate-700 block text-[11px]">SALT_TOKEN secret:</span>
                      <input 
                        type="text" 
                        value={saltToken}
                        onChange={(e) => setSaltToken(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-mono text-xs focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="bg-slate-900 text-white p-3.5 rounded-xl space-y-1 overflow-hidden">
                      <span className="text-[10px] text-slate-400 font-mono block">Computed SHA-256 Hash Digest:</span>
                      <p className="text-[10px] break-all font-mono text-emerald-400 leading-tight">{hashedText || "(computing...)"}</p>
                    </div>
                  </div>
                </div>

                {/* Secret Store Overview */}
                <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 shadow-inner space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-purple-400 font-mono uppercase tracking-wider block">Edge Secret Storage Binding</span>
                    <p className="text-[11px] text-slate-400">Referenced securely within Worker runtime environment</p>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between p-2 bg-slate-800/60 rounded-lg border border-slate-800">
                      <span className="text-slate-300">SALT_TOKEN</span>
                      <span className="text-emerald-450">&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-800/60 rounded-lg border border-slate-800">
                      <span className="text-slate-300">JWT_SECRET</span>
                      <span className="text-emerald-450">&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-800/60 rounded-lg border border-slate-800">
                      <span className="text-slate-300">GEMINI_API_KEY</span>
                      <span className="text-emerald-450">&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</span>
                    </div>
                  </div>

                  <div className="bg-slate-800/40 p-3 rounded-lg text-[10px] text-slate-400 leading-snug">
                    🔒 <strong>Wrangler Secret Command</strong>:<br/>
                    <code className="text-white">echo "secret-value" | npx wrangler secret put JWT_SECRET</code>
                  </div>
                </div>

              </div>

              {/* Endpoint routing simulator */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Hono Endpoint Mapping Router logs</h4>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => { addApiLog("GET /api/leads - Query active directory results"); }}
                    className="bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 font-semibold px-3 py-1.5 rounded-lg text-xs font-mono"
                  >
                    GET /api/leads
                  </button>
                  <button 
                    onClick={() => { addApiLog("POST /api/leads - Insert new prospect opportunity"); }}
                    className="bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-700 font-semibold px-3 py-1.5 rounded-lg text-xs font-mono"
                  >
                    POST /api/leads
                  </button>
                  <button 
                    onClick={() => { addApiLog("GET /api/agents - Fetch agents list"); }}
                    className="bg-amber-50 border border-amber-100 hover:bg-amber-100 text-amber-700 font-semibold px-3 py-1.5 rounded-lg text-xs font-mono"
                  >
                    GET /api/agents
                  </button>
                </div>

                <div className="bg-slate-900 rounded-xl p-3 h-28 overflow-y-auto font-mono text-[10px] text-indigo-300 space-y-1">
                  {apiLogs.length === 0 ? (
                    <span className="text-slate-500 italic block">No endpoint hits triggered yet. Click buttons above.</span>
                  ) : (
                    apiLogs.map((log, index) => (
                      <div key={index} className="leading-relaxed">{log}</div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activePhase === 4 && (
            <motion.div 
              key="phase-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-6 space-y-6"
            >
              {/* Caching and queues simulator */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* KV Cache Sandbox */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="space-y-1">
                    <span className="text-purple-600 text-[10px] uppercase font-mono font-bold tracking-widest block">KV Edge Caching Engine</span>
                    <h4 className="text-sm font-bold text-slate-800">D1 Database Caching Pipeline</h4>
                    <p className="text-[11px] text-slate-500">Querying edge KV takes ~2ms. Relational direct lookup on D1 tables takes ~150ms.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-2 border border-slate-200 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 font-mono block">CACHE HITS</span>
                      <strong className="text-lg text-emerald-600 font-mono">{cacheHits}</strong>
                    </div>
                    <div className="p-2 border border-slate-200 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 font-mono block">CACHE MISSES</span>
                      <strong className="text-lg text-rose-600 font-mono">{cacheMisses}</strong>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => runCachingTest("agents_total_count")}
                      className="bg-slate-900 text-white font-bold text-xs px-3 py-2 rounded-xl flex-1 hover:bg-slate-850"
                    >
                      Query Active Agents count
                    </button>
                    <button 
                      onClick={() => { setCacheHits(0); setCacheMisses(0); setQueryLatency(null); setLastQuerySource(null); }}
                      className="border border-slate-300 text-slate-600 text-xs px-3 py-2 rounded-xl hover:bg-slate-100"
                    >
                      Clear stats
                    </button>
                  </div>

                  {queryLatency !== null && (
                    <div className="p-3 bg-slate-900 rounded-xl flex justify-between items-center text-xs text-white">
                      <span>Source: <strong className="text-yellow-400">{lastQuerySource}</strong></span>
                      <span>Latency: <strong className={queryLatency < 10 ? "text-emerald-400" : "text-rose-400"}>{queryLatency} ms</strong></span>
                    </div>
                  )}
                </div>

                {/* Queue Sandbox */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <span className="text-amber-600 text-[10px] uppercase font-mono font-bold tracking-widest block">Cloudflare Queues</span>
                      <h4 className="text-sm font-bold text-slate-800 font-sans">Background Jobs Processor</h4>
                    </div>

                    <button
                      onClick={() => simulateAddQueueTask("Prospect Generator", "Scrape business directory for email contacts")}
                      className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold px-2 py-1 rounded"
                    >
                      + Push Job
                    </button>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2 h-44 overflow-y-auto">
                    {queue.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-8">Queue clear!</p>
                    ) : (
                      queue.map((task) => (
                        <div key={task.id} className="flex justify-between items-center text-[10px] bg-white border border-slate-200 p-2 rounded-lg">
                          <div className="font-mono">
                            <span className="font-bold text-slate-800 mr-2">[{task.status}]</span>
                            <span className="text-slate-600">{task.type} : {task.payload}</span>
                          </div>
                          <span className="text-slate-400">{task.timestamp}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={drainQueue}
                    disabled={isProcessingQueue || queue.filter(t => t.status === "Pending").length === 0}
                    className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-slate-850 disabled:opacity-40"
                  >
                    {isProcessingQueue ? "Processing Tasks..." : "⚡ Drain Queue (Trigger Asynchronous Worker Consumer)"}
                  </button>
                </div>

              </div>

              {/* AI Gateway Orchestration Setup */}
              <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-inner space-y-4">
                <div className="flex flex-col md:flex-row justify-between gap-1.5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 font-mono uppercase tracking-wider block">AI Gateway Orchestration Middleware</span>
                    <h3 className="text-base font-bold">Consolidated AI Multi-model Endpoint Routing</h3>
                  </div>

                  {/* AI Providers Selection */}
                  <div className="flex gap-2">
                    {["Gemini-2.5-Flash", "GPT-4o-Mini", "Claude-3.5-Haiku"].map((m) => (
                      <button
                        key={m}
                        onClick={() => setSelectedAIModel(m as any)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg font-mono transition-all ${
                          selectedAIModel === m 
                            ? "bg-amber-400 text-slate-900 font-black shadow"
                            : "bg-slate-800 text-slate-350 hover:bg-slate-750"
                        }`}
                      >
                        {m === "Gemini-2.5-Flash" ? "Google" : m === "GPT-4o-Mini" ? "OpenAI" : "Anthropic"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-sans block">Unified Prompt Input:</span>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 p-2.5 rounded-xl font-sans text-xs focus:ring-1 focus:ring-amber-400 text-slate-205"
                      />
                      <button 
                        onClick={triggerAIGatewayQuery}
                        disabled={isAiLoading}
                        className="bg-amber-400 text-slate-950 font-bold px-4 rounded-xl text-xs flex items-center gap-1 hover:bg-amber-350 disabled:opacity-40"
                      >
                        {isAiLoading ? "Processing..." : (
                          <>
                            <span className="material-symbols-outlined text-[16px]">sync_alt</span>
                            <span>Route</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {aiOutput && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden"
                      >
                        <span className="text-[9px] text-amber-400 uppercase tracking-widest font-mono block mb-1">AI Gateway Output Result</span>
                        <pre className="text-xs font-mono text-slate-300 leading-normal whitespace-pre-wrap">{aiOutput}</pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {activePhase === 5 && (
            <motion.div 
              key="phase-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-6 space-y-6 animate-fadeIn"
            >
              {/* Build output & observing */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-800">Phase 5: Global Deployment Command Line output</h3>
                <p className="text-xs text-slate-500">Deploy changes instantaneously to 300+ countries with Cloudflare Wrangler.</p>

                <div className="bg-slate-950 rounded-xl p-4 border border-slate-850 space-y-1.5 h-56 overflow-y-auto leading-relaxed">
                  {deploymentLogs.map((log, i) => (
                    <div key={i} className="font-mono text-[11px] text-slate-300 flex items-start gap-2">
                      <span className="text-indigo-400">➜</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Maintenance checklist wildcards info */}
              <div className="p-5 bg-yellow-500/10 border border-yellow-250 rounded-2xl flex items-start gap-3 text-xs leading-relaxed text-yellow-850">
                <span className="material-symbols-outlined text-[20px] text-yellow-600 mt-0.5">report_problem</span>
                <div>
                  <strong className="block font-bold">Observation Alert: Static Routing Assets & Wildcards</strong>
                  <span>When deploying fully client-side SPAs on Pages connecting to Edge API endpoints, ensure your <code>_routes.json</code> excludes static folder directories to prevent 404 client router issues. Configure backend proxies seamlessly.</span>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </div>

    </div>
  );
}
