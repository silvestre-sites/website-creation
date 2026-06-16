import React, { useState, useEffect } from "react";
import { useJobs, Lead } from "../store/JobsContext";
import { useAuth } from "../store/AuthContext";
import { BillingDoc } from "./AccountsDashboard";

export function ClientPortal() {
  const { leads, convertPrice } = useJobs();
  const { agents } = useAuth();

  // Selected lead context to preview portal
  const claimedLeads = leads.filter(l => l.status !== "Available");
  const [selectedLeadId, setSelectedLeadId] = useState<string>(() => {
    return claimedLeads[0]?.id || "";
  });

  // Selected viewing currency preference (USD by default or saved)
  const [prefCurrency, setPrefCurrency] = useState<"USD" | "EUR" | "BRL" | "MZN" | "ZAR">("USD");

  // Load documents from billing register to match this project
  const [billingDocs, setBillingDocs] = useState<BillingDoc[]>([]);
  useEffect(() => {
    const saved = localStorage.getItem("platform_billing_docs");
    if (saved) {
      try {
        setBillingDocs(JSON.parse(saved));
      } catch (e) {}
    }
  }, [selectedLeadId]);

  // Read current active lead metadata
  const currentLead = leads.find(l => l.id === selectedLeadId) || claimedLeads[0];

  // Agent owner details
  const currentAgent = currentLead
    ? agents.find(a => a.email.toLowerCase() === currentLead.claimedBy?.toLowerCase())
    : null;

  // Filter linked documents for this client name
  const clientDocs = currentLead
    ? billingDocs.filter(d => d.clientName.toLowerCase() === currentLead.name.toLowerCase() || d.clientId === currentLead.id)
    : [];

  return (
    <div className="flex-1 bg-slate-50 min-h-screen pt-24 px-6 md:px-12 pb-16">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Portal Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200 pb-8">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow">
              <span className="material-symbols-outlined text-[26px]">storefront</span>
            </div>
            <div className="space-y-0.5">
              <h1 className="text-2xl font-extrabold text-slate-905 tracking-tight">
                {currentLead ? `${currentLead.name} Client Portal` : "Client Delivery Workspace"}
              </h1>
              <p className="text-xs text-slate-500 font-medium">Your live interactive prototype design delivery and project billing ledger.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Dashboard Selector to view different business perspectives */}
            <div className="flex items-center gap-2 bg-white border border-slate-225 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-slate-400 font-bold uppercase font-mono text-[9px]">PROJECT ENVIRONMENT:</span>
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="font-semibold text-slate-800 bg-transparent border-0 outline-none p-0 cursor-pointer text-xs"
              >
                {claimedLeads.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.country})</option>
                ))}
                {claimedLeads.length === 0 && (
                  <option value="">-- No Active Claims --</option>
                )}
              </select>
            </div>

            {/* Preferred display currency selector (DIRECT USER REQUEST!) */}
            <div className="flex items-center gap-2 bg-white border border-slate-225 px-3 py-1.5 rounded-xl text-xs shadow-sm">
              <span className="material-symbols-outlined text-[16px] text-teal-600">payments</span>
              <span className="text-slate-500 font-bold uppercase font-mono text-[9px]">Show Bills in:</span>
              <select
                value={prefCurrency}
                onChange={(e) => setPrefCurrency(e.target.value as any)}
                className="font-mono font-bold bg-transparent border-0 outline-none p-0 text-slate-800 cursor-pointer text-xs"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="BRL">BRL (R$)</option>
                <option value="MZN">MZN (MT)</option>
                <option value="ZAR">ZAR (R)</option>
              </select>
            </div>
          </div>
        </header>

        {currentLead ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              
              {/* Project Status */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Current Delivery Phase</h4>
                  <span className="px-3 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold tracking-wider font-mono">
                    {currentLead.status.toUpperCase()}
                  </span>
                </div>

                <div className="relative pt-3">
                  <div className="absolute top-1/2 left-4 right-4 h-1 bg-slate-100 -translate-y-1/2 rounded-full z-0"></div>
                  
                  {/* Progress Line */}
                  <div 
                    className="absolute top-1/2 left-4 h-1 bg-emerald-600 -translate-y-1/2 rounded-full z-0 transition-all duration-500"
                    style={{
                      width: currentLead.status === "Completed" || currentLead.status === "Sold" ? "100%" : "50%"
                    }}
                  />

                  <div className="relative z-10 flex justify-between px-2 text-xs">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm mb-2 shadow">
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider font-mono">1. Discovery</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-2 shadow ${
                        currentLead.status !== "Claimed" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                      }`}>
                        <span className="material-symbols-outlined text-[16px]">construction</span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
                        currentLead.status !== "Claimed" ? "text-slate-700" : "text-slate-400"
                      }`}>2. Prototyping</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-2 shadow ${
                        currentLead.status === "Completed" || currentLead.status === "Sold" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-400"
                      }`}>
                        <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
                        currentLead.status === "Completed" || currentLead.status === "Sold" ? "text-slate-700" : "text-slate-400"
                      }`}>3. Handover / Paid</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-slate-50 border border-slate-150 rounded-xl flex items-start gap-4 text-xs font-semibold">
                  <span className="material-symbols-outlined text-emerald-600">info</span>
                  <div className="space-y-1">
                    <p className="text-slate-800">Current Iterative Delivery status</p>
                    <p className="text-slate-450 text-[11px] font-medium leading-relaxed">
                      Our system design department is baking the initial layout templates for your review. Live Figma models and code integration is mapped directly.
                    </p>
                    <a href={currentLead.prototypeUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 font-bold text-emerald-600 hover:underline">
                      Launch Interactive Prototype Live &rarr;
                    </a>
                  </div>
                </div>

              </div>

              {/* Shared Deliverables */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Uploaded Brand Materials & Resources</h4>
                
                {currentLead.uploads.length === 0 ? (
                  <p className="text-xs text-slate-450 italic py-4">No specific static artifacts uploaded for this company yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentLead.uploads.map((file) => (
                      <div key={file.id} className="p-4 border border-slate-150 rounded-xl hover:border-emerald-600 transition flex items-start gap-3">
                        <span className="material-symbols-outlined text-[28px] text-emerald-600">article</span>
                        <div className="space-y-0.5 text-xs">
                          <p className="font-bold text-slate-800 truncate max-w-44">{file.name}</p>
                          <p className="text-[10px] text-slate-400">Uploaded {file.date}</p>
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="block text-[10px] text-emerald-600 font-bold hover:underline mt-1">Download Material</a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Sidebar info */}
            <div className="space-y-8">
              
              {/* Dedicated representative */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Your Dedicated Representative</h4>
                {currentAgent ? (
                  <div className="flex items-center gap-3.5 text-xs">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-white flex items-center justify-center font-bold text-sm shadow">
                      {currentAgent.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900">{currentAgent.name}</p>
                      <p className="text-[10px] text-slate-400">Regional Account Specialist</p>
                      <p className="text-[10px] text-indigo-600 font-mono select-all font-semibold">{currentAgent.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3.5 text-xs">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-normal text-sm">
                      --
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">TBD Team Member</p>
                      <p className="text-[10px] text-slate-400">Claims unassigned</p>
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => alert(`Initiating secure direct messaging bridge with the assigned representative representative...`)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold font-mono tracking-wide text-xs transition cursor-pointer"
                >
                  Message Representative
                </button>
              </div>

              {/* Real linked billing docs */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Issued Ledgers & Estimates</h4>
                
                <div className="space-y-3">
                  {clientDocs.map((doc) => {
                    const documentConvertedVal = convertPrice(doc.total, prefCurrency).formatted;
                    return (
                      <div key={doc.id} className="flex justify-between items-center p-3 border border-slate-150 rounded-xl">
                        <div className="space-y-0.5 text-xs">
                          <p className="font-bold text-slate-800">{doc.type}: {doc.docNumber}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Due: {doc.dueDate}</p>
                        </div>
                        <div className="text-right text-xs">
                          <span className="font-mono font-extrabold text-slate-900 block">{documentConvertedVal}</span>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold ${
                            doc.status === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {clientDocs.length === 0 && (
                    <p className="text-xs text-slate-450 italic py-2">No quotes or outstanding invoices have been raised for your business account yet.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-16 text-center space-y-4">
            <span className="material-symbols-outlined text-[54px] text-slate-300">broken_image</span>
            <h3 className="text-sm font-bold text-slate-700 font-mono uppercase tracking-widest">No Active Client Projects</h3>
            <p className="text-xs text-slate-450 max-w-md mx-auto leading-relaxed">
              When an outbound agent claims a lead opportunity and initiates prototyping delivery, that client environment will represent itself dynamically here!
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
