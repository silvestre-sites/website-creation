import React, { useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useJobs } from "../store/JobsContext";
import { useAuth } from "../store/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../lib/api";

export function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { leads, updateLead, uploadLeadFile, claimLead, addLeadNote, convertPrice } = useJobs();
  
  const [noteText, setNoteText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fallback / find the correct lead
  const lead = leads.find(l => l.id === id) || leads[0];

  if (!lead) {
    return (
      <div className="flex-1 bg-slate-50 min-h-screen pt-24 px-6 md:px-12 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <span className="material-symbols-outlined text-red-500 text-5xl">warning</span>
          <h2 className="text-lg font-bold text-slate-800">No Lead Found</h2>
          <p className="text-xs text-slate-400">The requested lead profile could not be retrieved from the pipeline registry.</p>
          <button onClick={() => navigate('/jobs')} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const isClaimedByMe = lead.claimedBy?.toLowerCase() === user?.email?.toLowerCase();
  const canModify = isClaimedByMe || user?.isAdmin;

  const claimStatus = lead.status;
  
  // Available statuses for pipeline movement
  const statusesOrder: Array<"Available" | "Claimed" | "In Progress" | "Completed" | "Sold"> = [
    "Available", 
    "Claimed", 
    "In Progress", 
    "Completed", 
    "Sold"
  ];
  
  const progressPercent = Math.max(10, (statusesOrder.indexOf(claimStatus) / (statusesOrder.length - 1)) * 100);

  const handleClaim = () => {
    if (!user?.email) return;
    claimLead(lead.id, user.email);
    addLeadNote(lead.id, "Lead successfully claimed from marketplace.", "System Agent Console");
  };

  const handleStatusChange = (newStatus: "Available" | "Claimed" | "In Progress" | "Completed" | "Sold") => {
    updateLead(lead.id, { status: newStatus });
    addLeadNote(lead.id, `Status updated to ${newStatus}.`, user?.name || user?.email || "Agent");
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addLeadNote(lead.id, noteText, user?.name || user?.email || "Agent");
    setNoteText("");
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canModify) return;
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processAndUpload(files[0]);
    }
  };

  const processAndUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await api.upload.file(file);
      if (res && res.success && res.url) {
        await uploadLeadFile(lead.id, file.name, res.url, user?.name || user?.email || "Agent");
      } else {
        alert("File upload failed. Ensure server upload directory is writable.");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(err.message || "An error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleNativeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processAndUpload(e.target.files[0]);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen pt-24 px-6 md:px-12 pb-16">
      <div className="max-w-6xl mx-auto w-full space-y-8 animate-fadeIn">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          <button 
             onClick={() => navigate('/jobs')} 
             className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
          >
            <span className="material-symbols-outlined text-[15px]">arrow_back</span>
            Back to Pipeline Marketplace
          </button>
          
          {user?.isAdmin && (
            <span className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-mono font-bold uppercase tracking-wide rounded-full">
              Manager Overseer Profile
            </span>
          )}
        </div>

        {/* Lead Dashboard Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Workspace Frame */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Lead Brief & Status Dashboard */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-extrabold text-indigo-700">
                      ID: {lead.id}
                    </span>
                    {lead.claimedBy ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                        Claimed • {lead.claimedBy === user?.email ? "My Campaign" : "Allocated Agent"}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold">
                        Available Profile
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{lead.name}</h1>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">
                    {lead.industry} • {lead.country}
                  </p>
                </div>
                
                <div className="sm:text-right space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Priced commission yield</span>
                  <p className="text-3xl font-extrabold text-indigo-750 font-mono tracking-tight">
                    {convertPrice(lead.payout).formatted}
                  </p>
                </div>
              </div>

              {/* Profile description */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Opportunity Scope Summary</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-normal">
                  {lead.description || "Review this localized target profile. A customized, high-density professional digital prototype has been pre-built by our generation pipeline to help demonstrate value before asking for commissions."}
                </p>
              </div>

              {/* Prototype Details Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-indigo-600 text-[18px]">web</span>
                    Pre-generated Site Demonstration URL
                  </h4>
                  <div className="bg-white border border-slate-200 p-3 rounded-xl flex items-center justify-between">
                    <a 
                      href={lead.prototypeUrl || "https://example.com/site-demo-link"} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-indigo-600 font-bold hover:underline text-xs block truncate max-w-[340px] md:max-w-[420px]"
                    >
                      {lead.prototypeUrl || "https://example.com/site-demo-link"}
                    </a>
                    <span className="material-symbols-outlined text-[16px] text-slate-400">open_in_new</span>
                  </div>
                </div>

                {/* Pipeline Stages Picker */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Outbound Campaign Status: {lead.status}</h4>
                  
                  {lead.claimedBy ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 pt-1">
                        {statusesOrder.filter(s => s !== "Available").map(stg => (
                          <button 
                            key={stg}
                            onClick={() => handleStatusChange(stg)}
                            disabled={!canModify}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
                              stg === lead.status 
                                ? "bg-indigo-600 text-white shadow-sm font-extrabold" 
                                : "bg-white border border-slate-300 hover:border-indigo-400 text-slate-600"
                            }`}
                          >
                            {stg === "Claimed" ? "Claimed" : stg}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-300/40">
                          <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        <p className="text-[10px] text-slate-400">Keep this tag updated to notify accounting and system administrators of campaign completions.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2">
                      <button 
                        onClick={handleClaim}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-sm cursor-pointer"
                      >
                        Claim Outstanding Opportunity
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Leads Associated Folder / Documents Drive (DIRECT REQUIRED DIRECTIVE) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-700 text-xl font-bold">folder_open</span>
                    Lead Document Folder Drive: <span className="text-indigo-600">{lead.name}</span>
                  </h3>
                  <p className="text-xs text-slate-400">Direct workspace directory. Agents can dump receipts, logs, and outbound templates here. Admin holds full download and audit rights.</p>
                </div>
                <span className="px-2.5 py-1 bg-slate-100 font-mono text-[10px] font-bold text-slate-500 rounded-lg shrink-0">
                  {lead.uploads?.length || 0} Assets
                </span>
              </div>

              {/* Upload Drop Zone Container */}
              {canModify ? (
                <div 
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                    uploading ? 'bg-slate-50 border-slate-300 cursor-not-allowed' : (isDragging ? 'border-indigo-600 bg-indigo-50/10' : 'border-slate-300 hover:bg-slate-50/50')
                  }`}
                  onDragOver={(e) => { if (!uploading) { e.preventDefault(); setIsDragging(true); } }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { if (!uploading) handleFileDrop(e); }}
                  onClick={() => { if (!uploading) fileInputRef.current?.click(); }}
                >
                  <input 
                    type="file" 
                    className="hidden"
                    ref={fileInputRef} 
                    disabled={uploading}
                    onChange={handleNativeFileUpload}
                  />
                  {uploading ? (
                    <div className="py-4 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-500 animate-spin mb-3">
                        <span className="material-symbols-outlined text-[24px]">sync</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 mb-0.5">Uploading deliverable file...</p>
                      <p className="text-[11px] text-slate-400">Saving securely to project cabinet</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-indigo-100 text-indigo-600">
                        <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 mb-0.5">Drag and drop receipts, PDFs or logs here</p>
                      <p className="text-[11px] text-slate-400">or click to browse from finder window</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400 italic">
                  Only the claiming agent or administrators can upload to this lead's folder.
                </div>
              )}

              {/* Document Cabinet Grid */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Files inside lead cabinet:</span>
                
                {!lead.uploads || lead.uploads.length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="material-symbols-outlined text-slate-300 text-3xl mb-1.5 block">draft</span>
                    <p className="text-xs text-slate-400 italic font-medium">Cabinet directory is empty. Drop first resource files inside.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {lead.uploads.map((file) => (
                      <div 
                        key={file.id} 
                        className="p-4 bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition rounded-2xl flex items-start gap-3 relative group"
                      >
                        <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 shrink-0">
                          <span className="material-symbols-outlined text-[22px]">description</span>
                        </div>

                        <div className="space-y-1 truncate flex-1 pr-4">
                          <a 
                            href={file.url} 
                            download={file.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-slate-800 hover:text-indigo-600 block truncate"
                            title="Open / Download Document"
                          >
                            {file.name}
                          </a>
                          
                          <div className="space-y-0.5 text-[10px] text-slate-400 font-medium">
                            <span className="block font-mono">Date: {file.date}</span>
                            <span className="block text-indigo-700">Uploaded by: {file.uploadedBy}</span>
                          </div>
                        </div>

                        <a 
                          href={file.url} 
                          download={file.name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition"
                          title="Download asset"
                        >
                          <span className="material-symbols-outlined text-[17px]">download</span>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Note Logging feed */}
            {lead.claimedBy && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">Outbound Activity Logs & Milestones</h3>
                  <p className="text-xs text-slate-400">Record calls, client responses, contract signatures and audit trail notes.</p>
                </div>

                <div className="flex gap-3 items-start">
                  <textarea 
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Log a client interaction event... (e.g. Phone call left message, requested callback)"
                    className="flex-1 bg-slate-50 border border-slate-250 p-2.5 rounded-xl text-xs outline-none focus:border-indigo-500 font-sans leading-relaxed text-slate-800"
                    rows={2}
                  />
                  <button 
                    onClick={handleAddNote}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 shrink-0 h-10 mt-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">send</span> Log
                  </button>
                </div>

                {/* Vertical Timeline */}
                <div className="space-y-3.5 pt-2 relative border-l border-slate-150 pl-5 ml-4">
                  {lead.notes?.slice().reverse().map((nt) => (
                    <div key={nt.id} className="relative space-y-1">
                      {/* Timeline Dot icon */}
                      <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white"></span>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{nt.author}</span>
                        <span className="text-[10px] text-slate-450 font-mono">{nt.date}</span>
                      </div>
                      
                      <p className="text-xs text-slate-500 leading-normal font-normal">
                        {nt.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
          
          {/* Side Info Panel */}
          <div className="space-y-8">
            
            {/* Contact Information Details Box */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider font-mono">Lead Contact profile</h4>
              
              <div className="space-y-4 text-xs font-medium">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Decision Maker</span>
                  <span className="text-sm font-bold text-slate-800 block">
                    {lead.contactPerson?.name || "Dr. Sarah Jenkins"}
                  </span>
                  <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded w-fit block mt-1">
                    Role: {lead.contactPerson?.role || "Owner & CDO"}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Business Mail</span>
                  <a href={`mailto:${lead.contactPerson?.email}`} className="text-sm text-indigo-600 font-bold hover:underline block truncate">
                    {lead.contactPerson?.email || "sarah@peakdental.com"}
                  </a>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Outbound Phone</span>
                  <span className="text-sm font-bold text-slate-800 block">
                    {lead.contactPerson?.phone || "+1 (555) 019-2834"}
                  </span>
                </div>

                {lead.socials && Object.keys(lead.socials).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Verified Social Channels</span>
                    <div className="flex flex-wrap gap-2">
                      {lead.socials.linkedin && (
                        <a href={`https://${lead.socials.linkedin}`} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-[11px] font-semibold text-slate-600 transition truncate max-w-[160px]">
                          LinkedIn
                        </a>
                      )}
                      {lead.socials.whatsapp && (
                        <a href={`https://wa.me/${lead.socials.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-[11px] font-semibold text-slate-600 transition truncate max-w-[160px]">
                          WhatsApp
                        </a>
                      )}
                      {lead.socials.facebook && (
                        <a href={`https://${lead.socials.facebook}`} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-55 rounded-lg text-[11px] font-semibold text-slate-600 transition truncate max-w-[160px]">
                          Facebook
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Agent Playbook resources */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-widest font-mono">Outbound sales templates</h4>
              
              <div className="space-y-2">
                <button className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition text-left cursor-pointer">
                  <span className="material-symbols-outlined text-indigo-600 text-xl font-bold">mail</span>
                  <div className="space-y-0.5">
                    <span className="block text-xs font-bold text-slate-800">Healthcare Cold Script</span>
                    <span className="block text-[10px] text-slate-400">Pre-built email presentation text</span>
                  </div>
                </button>

                <button className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition text-left cursor-pointer">
                  <span className="material-symbols-outlined text-indigo-600 text-xl font-bold">chat_bubble</span>
                  <div className="space-y-0.5">
                    <span className="block text-xs font-bold text-slate-800">WhatsApp Briefing Script</span>
                    <span className="block text-[10px] text-slate-400">Low friction introductory message</span>
                  </div>
                </button>

                <button className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition text-left cursor-pointer">
                  <span className="material-symbols-outlined text-indigo-600 text-xl font-bold">assignment</span>
                  <div className="space-y-0.5">
                    <span className="block text-xs font-bold text-slate-800">Objection Bible</span>
                    <span className="block text-[10px] text-slate-400">Quick answers for trust building</span>
                  </div>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
