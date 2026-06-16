import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useJobs } from "../store/JobsContext";
import { useAuth } from "../store/AuthContext";

export function Jobs() {
  const { leads, convertPrice } = useJobs();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("available");
  const [searchQuery, setSearchQuery] = useState("");

  // Filtering leads based on active tab and search query
  const filtered = leads.filter(lead => {
    // Search query matching
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Tab filtering
    if (activeTab === "available") {
      return lead.status === "Available" && !lead.isFrozen;
    } else if (activeTab === "claimed") {
      return lead.claimedBy?.toLowerCase() === user?.email?.toLowerCase();
    }
    // "all": show everything that is not frozen (or frozen too, just show all)
    return true;
  });

  return (
    <div className="flex-1 bg-[#FAFAFA] min-h-screen pt-24 px-6 md:px-12 pb-12">
      <div className="max-w-6xl mx-auto w-full space-y-6 animate-fadeIn">
        
        <header className="mb-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[28px] text-teal-600">travel_explore</span>
              Leads Marketplace
            </h1>
            <p className="text-[14px] text-slate-500 max-w-xl font-medium leading-relaxed">
              Browse qualified offline businesses and claim opportunities that match your interests. Each lead includes business profiles, developer demo website access, contact sheets, and support materials.
            </p>
          </div>
        </header>

        {/* Filter / View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 border-b border-slate-205 pb-4">
          <div className="flex items-center gap-2">
            <button 
               onClick={() => setActiveTab('available')}
               className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'available' ? 'bg-slate-900 border border-slate-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800'}`}
            >
              Available Leads
            </button>
            <button 
               onClick={() => setActiveTab('claimed')}
               className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'claimed' ? 'bg-slate-900 border border-slate-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800'}`}
            >
              My Pipeline ({leads.filter(l => l.claimedBy?.toLowerCase() === user?.email?.toLowerCase()).length})
            </button>
            <button 
               onClick={() => setActiveTab('all')}
               className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'all' ? 'bg-slate-900 border border-slate-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800'}`}
            >
              All Market
            </button>
          </div>
          
          <div className="sm:ml-auto relative">
             <input 
               type="text" 
               placeholder="Search industry, business name or location..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="saas-input py-1.5 pl-8 text-xs w-full sm:w-64 border border-slate-220 rounded-xl outline-none" 
             />
             <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">search</span>
          </div>
        </div>

        {/* Linear style list view */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
               <thead className="bg-[#FAFAFA] text-slate-400 border-b border-slate-150 font-bold uppercase tracking-wider font-mono text-[10px]">
                 <tr>
                   <th className="px-6 py-4 font-bold">Business Prospect / ID</th>
                   <th className="px-6 py-4 font-bold max-w-xs">Description</th>
                   <th className="px-6 py-4 font-bold">Industry Channel</th>
                   <th className="px-6 py-4 font-bold">Location Country</th>
                   <th className="px-6 py-4 font-bold">Est. Value (Converted)</th>
                   <th className="px-6 py-4 font-bold text-center">Operation / Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-slate-700">
                 {filtered.map(lead => (
                   <tr 
                     key={lead.id} 
                     onClick={() => navigate(`/jobs/${lead.id}`)}
                     className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                   >
                     <td className="px-6 py-4">
                       <div className="flex items-center gap-2.5">
                         <span className="text-[10px] font-mono text-slate-450 bg-slate-105 border border-slate-150 px-1.5 py-0.5 rounded font-bold">{lead.id}</span>
                         <span className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors">{lead.name}</span>
                       </div>
                     </td>
                     <td className="px-6 py-4 text-slate-450 font-medium truncate max-w-xs" title={lead.description || "No corporate description registered."}>
                       {lead.description || "Offline business looking for digital modernization."}
                     </td>
                     <td className="px-6 py-4 font-semibold text-slate-700">{lead.industry}</td>
                     <td className="px-6 py-4 text-slate-500">{lead.country}</td>
                     <td className="px-6 py-4 font-mono font-bold text-indigo-700 text-[13px]">
                       {convertPrice(lead.estValue).formatted}
                     </td>
                     <td className="px-6 py-4 text-center">
                       {lead.isFrozen ? (
                         <span className="inline-block px-2.5 py-1 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold leading-none uppercase tracking-wide">Frozen</span>
                       ) : (
                         <>
                           {lead.status === 'Available' && <span className="inline-block px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-bold leading-none uppercase tracking-wide">Available</span>}
                           {lead.status === 'Claimed' && <span className="inline-block px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold leading-none uppercase tracking-wide">Claimed</span>}
                           {lead.status === 'In Progress' && <span className="inline-block px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold leading-none uppercase tracking-wide">In Progress</span>}
                           {lead.status === 'Sold' && <span className="inline-block px-2.5 py-1 rounded bg-teal-50 text-teal-800 border border-teal-100 text-[10px] font-bold leading-none uppercase tracking-wide">Completed</span>}
                         </>
                       )}
                     </td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
             <div className="p-16 text-center text-slate-400 font-medium font-sans">
               <span className="material-symbols-outlined text-[40px] text-slate-300 block mb-2">find_in_page</span>
               No live marketplace leads found matching active query filters.
             </div>
          )}
        </div>

      </div>
    </div>
  );
}
