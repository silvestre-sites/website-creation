import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "../store/I18nContext";
import { useAuth } from "../store/AuthContext";
import { useJobs } from "../store/JobsContext";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function Dashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { leads, convertPrice, globalCurrency } = useJobs();
  const navigate = useNavigate();

  // Filter leads claimed by this exact agent
  const myLeads = leads.filter(l => l.claimedBy?.toLowerCase() === user?.email?.toLowerCase());
  
  // Counts
  const availableCount = leads.filter(l => l.status === "Available" && !l.isFrozen).length;
  const claimedCount = myLeads.length;
  const closedCount = myLeads.filter(l => l.status === "Sold").length;

  // Earnings calculations
  const pendingEarnRaw = myLeads.filter(l => (l.status === "Completed" || l.status === "In Progress") && !l.commissionPaid).reduce((sum, l) => sum + l.payout, 0);
  const paidEarnRaw = myLeads.filter(l => l.commissionPaid).reduce((sum, l) => sum + l.payout, 0);
  const referralEarnRaw = 120; // Default flat bonus for successful onboarding

  // Dynamic currency conversion values representing display
  const convertedPending = convertPrice(pendingEarnRaw).formatted;
  const convertedPaid = convertPrice(paidEarnRaw).formatted;
  const convertedReferral = convertPrice(referralEarnRaw).formatted;

  // Visual statistics for agent earnings chart
  const performanceTrend = [
    { period: "Init Period", cleared: 0, overall: 0 },
    { period: "Q1 Campaign", cleared: Math.round(paidEarnRaw * 0.2), overall: Math.round((paidEarnRaw + pendingEarnRaw) * 0.3) },
    { period: "Q2 Campaign", cleared: Math.round(paidEarnRaw * 0.6), overall: Math.round((paidEarnRaw + pendingEarnRaw) * 0.7) },
    { period: "Current Month", cleared: paidEarnRaw, overall: paidEarnRaw + pendingEarnRaw }
  ];

  return (
    <div className="flex-1 bg-slate-50 min-h-screen pt-24 px-6 md:px-12 pb-16">
      <div className="max-w-7xl mx-auto w-full space-y-8 animate-fadeIn">
        
        {/* Welcome Section */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {t("dash.welcome.title") || "Welcome back"}, {user?.name || "Agent Representative"}!
              </h1>
              {user?.isAdmin && (
                <span className="px-2.5 py-0.5 bg-red-50 text-red-700 text-[10px] font-mono font-bold uppercase rounded tracking-wider border border-red-200">
                  Admin Tier
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium max-w-xl leading-normal">
              {t("dash.welcome.desc") || "Review live pipeline metrics, draft instant client quotes/invoices and track outbound progress."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Display Master Currency Information */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm text-xs font-semibold">
              <span className="material-symbols-outlined text-[17px] text-teal-600">payments</span>
              <span className="text-slate-450 font-bold uppercase font-mono text-[9px]">Master Currency:</span>
              <span className="font-mono font-extrabold text-indigo-700">{globalCurrency}</span>
            </div>

            <button 
              onClick={() => navigate("/jobs")} 
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white hover:shadow rounded-xl text-xs font-bold transition shadow-sm cursor-pointer select-none"
            >
              <span className="material-symbols-outlined text-[18px]">explore</span>
              Marketplace Pipeline
            </button>
          </div>
        </header>

        {/* Dynamic Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Available Opportunities", value: availableCount, icon: "dns", color: "text-amber-500 bg-amber-50" },
            { label: "Your Claimed Leads", value: claimedCount, icon: "bookmark", color: "text-indigo-600 bg-indigo-55 bg-indigo-50" },
            { label: "Completed Wins", value: closedCount, icon: "stars", color: "text-emerald-600 bg-emerald-50" },
            { label: "Pending Commissions", value: convertedPending, icon: "hourglass_empty", color: "text-amber-600 bg-amber-50 font-mono" },
            { label: "Paid Commissions", value: convertedPaid, icon: "check_circle", color: "text-teal-700 bg-teal-50 font-mono" },
            { label: "Verified Referral", value: convertedReferral, icon: "groups", color: "text-sky-600 bg-sky-50 font-mono" },
          ].map((metric, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 hover:-translate-y-0.5 transition-transform duration-300">
              <div className={`p-2 rounded-xl w-fit ${metric.color.split(" ").slice(-1)[0]}`}>
                <span className={`material-symbols-outlined text-[20px] ${metric.color.split(" ")[0]} block`}>{metric.icon}</span>
              </div>
              <div className="space-y-0.5">
                <div className="text-xl font-extrabold text-slate-900 tracking-tight">{metric.value}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono leading-tight">{metric.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Interactive Earnings Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Commission Yield Performance</h3>
              <p className="text-[11px] text-slate-400">Cleared commissions vs projected overall yield trended over time.</p>
            </div>
            <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded-full font-mono">LIVE CONVERSIONS</span>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceTrend}>
                <defs>
                  <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4338ca" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#4338ca" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="period" fontSize={11} tickLine={false} axisLine={false} stroke="#94a3b8" />
                <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#94a3b8" tickFormatter={(v) => convertPrice(v).formatted} />
                <Tooltip formatter={(value: any) => [convertPrice(Number(value)).formatted, ""]} />
                <Area type="monotone" name="Paid Commissions" dataKey="cleared" stroke="#0f766e" strokeWidth={2.5} fillOpacity={1} fill="url(#paidGrad)" />
                <Area type="monotone" name="Projected Yield" dataKey="overall" stroke="#4338ca" strokeWidth={2} fillOpacity={1} fill="url(#totalGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline / Earnings split Section */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Real Active Workspace list */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center font-mono">
              <span className="font-bold text-slate-700 uppercase">Your Claimed Opportunities</span>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-bold">{myLeads.length} ACTIVE CLAIMS</span>
            </div>

            {myLeads.length === 0 ? (
              <div className="p-12 text-center space-y-3.5">
                <span className="material-symbols-outlined text-[48px] text-zinc-300">work_outline</span>
                <p className="text-xs text-slate-500 font-medium">You have not claimed any lead opportunities yet.</p>
                <Link to="/jobs" className="inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm">
                  Visit Leads Marketplace
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-150">
                <div className="flex items-center px-4 py-3 bg-slate-50 font-bold text-slate-400 font-mono text-[10px]">
                  <div className="w-8"></div>
                  <div className="flex-1">BUSINESS TARGET</div>
                  <div className="w-32">PIPELINE STATUS</div>
                  <div className="w-28 text-right font-bold">EST. CONTRACT VALUE</div>
                </div>

                {myLeads.map((lead) => {
                  const leadDisplayValue = convertPrice(lead.estValue).formatted;
                  return (
                    <div key={lead.id} className="flex items-center px-4 py-4 hover:bg-slate-50/50 transition duration-300">
                      <div className="w-8 shrink-0 text-slate-400 font-mono text-[10px] font-bold">{lead.id.slice(-2)}</div>
                      
                      <div className="flex-1 space-y-0.5">
                        <Link to={`/jobs/${lead.id}`} className="font-bold text-slate-900 hover:text-emerald-700 hover:underline">
                          {lead.name}
                        </Link>
                        <p className="text-slate-400 text-[11px] font-medium">{lead.industry} • {lead.country}</p>
                      </div>

                      <div className="w-32">
                        <span className={`inline-block px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${
                          lead.status === "In Progress" ? "bg-blue-50 text-blue-800 border border-blue-100" :
                          lead.status === "Completed" ? "bg-purple-50 text-purple-800 border border-purple-100" :
                          lead.status === "Sold" ? "bg-teal-50 text-teal-800 border border-teal-100" : 
                          "bg-indigo-50 text-indigo-800 border border-indigo-100"
                        }`}>
                          {lead.status === "Sold" ? "Completed" : lead.status}
                        </span>
                      </div>

                      <div className="w-28 text-right font-mono font-bold text-slate-800">
                        {leadDisplayValue}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column - Multi-currency earnings pipeline */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono border-b border-slate-100 pb-2">My Payout Records Ledger</h3>
              
              <div className="divide-y divide-slate-100">
                {myLeads.filter(l => l.status === "Sold" || l.commissionPaid || l.status === "Completed").slice(0, 5).map((item) => {
                  const earnDisplay = convertPrice(item.payout).formatted;
                  return (
                    <div key={item.id} className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-slate-850 leading-tight truncate max-w-44">{item.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono font-semibold">Payment cleared standard standard</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-extrabold text-slate-900 block">{earnDisplay}</span>
                        <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          item.commissionPaid ? "bg-teal-50 text-teal-850 border-teal-200" : "bg-amber-50 text-amber-850 border-amber-200"
                        }`}>
                          {item.commissionPaid ? "Cleared Paid" : "Pending Approval"}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {myLeads.filter(l => l.status === "Sold" || l.commissionPaid || l.status === "Completed").length === 0 && (
                  <p className="text-[11px] text-slate-450 italic py-4">No logged payouts recorded recently. Claim a lead and close the deal!</p>
                )}
              </div>
            </div>

            {/* Quick action card for training */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3.5 relative overflow-hidden bg-gradient-to-br from-white to-teal-50/10">
              <span className="material-symbols-outlined text-teal-600 block">school</span>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Learning Academy</h4>
                <p className="text-[11px] text-slate-500 leading-normal mb-2">
                  Access official objection-handling scripts, cold outbound pitches and complete your certification quiz!
                </p>
                <Link to="/resources" className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:underline">
                  Browse Lessons & Resources &rarr;
                </Link>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
