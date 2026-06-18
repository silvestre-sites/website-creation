import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, Agent } from "../store/AuthContext";
import { useJobs, Lead } from "../store/JobsContext";
import { useI18n } from "../store/I18nContext";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../lib/api";
import { CloudflareHub } from "../components/CloudflareHub";

export function Admin() {
  const { 
    user, 
    agents, 
    updateAgentProfile, 
    freezeAgentAccount, 
    deleteAgentAccount, 
    toggleAdminRights, 
    impersonateAgent 
  } = useAuth();

  const { 
    leads, 
    addLead, 
    updateLead, 
    reassignLead, 
    issueCommissionPayment, 
    convertPrice,
    deleteLead
  } = useJobs();

  const navigate = useNavigate();
  const { t } = useI18n();

  // Active view tabs
  const [activeTab, setActiveTab] = useState<"Cockpit" | "Agents" | "Leads" | "Accounting" | "Training" | "Cloudflare">("Cockpit");

  // Dynamic Module state management
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<any | null>(null);
  const [isEditingModule, setIsEditingModule] = useState(false);
  const [modTitle, setModTitle] = useState("");
  const [modDuration, setModDuration] = useState("");
  const [modImage, setModImage] = useState("");
  const [modSummary, setModSummary] = useState("");
  const [modPoints, setModPoints] = useState<string[]>([]);
  const [newModPoint, setNewModPoint] = useState("");

  // Custom Fields on Profile edit
  const [editCustomFields, setEditCustomFields] = useState<{ id: string; title: string; value: string }[]>([]);
  const [newCfTitle, setNewCfTitle] = useState("");
  const [newCfValue, setNewCfValue] = useState("");

  // Lead Editing state
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [leadDescription, setLeadDescription] = useState("");

  // Agent editing profile state
  const [editingAgentEmail, setEditingAgentEmail] = useState<string | null>(null);
  const [editAgentName, setEditAgentName] = useState("");
  const [editAgentWhatsapp, setEditAgentWhatsapp] = useState("");
  const [editAgentExperience, setEditAgentExperience] = useState("");
  const [editAgentCountry, setEditAgentCountry] = useState("");
  const [editAgentLanguages, setEditAgentLanguages] = useState("");
  
  // Sourcing extra resources state
  const [adminResources, setAdminResources] = useState<any[]>([]);
  const [showAddResource, setShowAddResource] = useState(false);
  const [resourceLink, setResourceLink] = useState("");
  const [resourceTitle, setResourceTitle] = useState("");

  // Quiz HTML editor state
  const [showQuizEditor, setShowQuizEditor] = useState(false);
  const [quizHtml, setQuizHtml] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  // Search/Filter states
  const [agentSearch, setAgentSearch] = useState("");
  const [leadSearch, setLeadSearch] = useState("");

  // Lead Modal / State
  const [showAddLead, setShowAddLead] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadIndustry, setLeadIndustry] = useState("");
  const [leadCountry, setLeadCountry] = useState("");
  const [leadEstValue, setLeadEstValue] = useState("");
  const [leadEarningsCurrency, setLeadEarningsCurrency] = useState<"USD" | "EUR" | "BRL" | "MZN" | "ZAR">("USD");
  const [leadCPName, setLeadCPName] = useState("");
  const [leadCPEmail, setLeadCPEmail] = useState("");
  const [leadCPPhone, setLeadCPPhone] = useState("");
  const [leadCPRole, setLeadCPRole] = useState("");
  const [leadPrototype, setLeadPrototype] = useState("");

  // Selective export currency state
  const [exportCurrency, setExportCurrency] = useState<"USD" | "EUR" | "BRL" | "MZN" | "ZAR">("USD");

  // Reassign Modal state
  const [reassigningLead, setReassigningLead] = useState<Lead | null>(null);
  const [reassignTargetEmail, setReassignTargetEmail] = useState("");

  // Payout Modal state
  const [payingLead, setPayingLead] = useState<Lead | null>(null);
  const [payoutProofName, setPayoutProofName] = useState("");
  const [payoutProofUrl, setPayoutProofUrl] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);

  // Load resources, modules, and quiz HTML configs via central backend endpoint
  useEffect(() => {
    api.config.getQuizHtml()
      .then(res => {
         if (res && res.quizHtml) setQuizHtml(res.quizHtml);
      })
      .catch(err => console.error("Error reading quiz html configuration:", err));

    api.training.getResources()
      .then(res => {
         if (res) setAdminResources(res);
      })
      .catch(err => console.error("Error reading training resources list:", err));

    api.training.getModules()
      .then(res => {
        setModules(res || []);
      })
      .catch(err => console.error("Error reading training modules from database:", err));
  }, [activeTab]);

  // Block access to non-admins
  if (!user?.isAdmin) {
    return (
      <div className="pt-28 text-center p-12 space-y-3">
        <span className="material-symbols-outlined text-[48px] text-red-500">gpp_maybe</span>
        <h2 className="text-xl font-bold">Access Restrained</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">This operations section requires elevated administrative credentials.</p>
        <Link to="/dashboard" className="inline-block mt-4 text-xs font-semibold text-emerald-600 hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  // Mass Import / Export Leads and Agents
  const handleExportLeads = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(leads, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `Leads_Marketplace_Export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    alert("Leads list JSON export triggered successfully!");
  };

  const handleExportAgents = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(agents, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `Agents_Registry_Export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    alert("Agents roster JSON export triggered successfully!");
  };

  const handleImportLeads = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            parsed.forEach(l => {
              addLead({
                name: l.name || "Unnamed Import Opportunity",
                industry: l.industry || "General SME",
                country: l.country || "United States",
                estValue: parseFloat(l.estValue) || 1500,
                payout: parseFloat(l.payout) || 300,
                earningsCurrency: l.earningsCurrency || "USD",
                status: l.status || "Available",
                description: l.description || "",
                prototypeUrl: l.prototypeUrl || "https://example.com/demo",
                contactPerson: l.contactPerson || { name: "N/A", email: "", phone: "", role: "" }
              });
            });
            alert(`Succeeded in importing ${parsed.length} client leads into marketplace!`);
          } else {
            alert("Error: Imported file must be a valid JSON Array of leads");
          }
        } catch (err) {
          alert("Error parsing file. Please provide valid JSON.");
        }
      };
    }
  };

  const handleImportAgents = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            parsed.forEach(ag => {
              if (ag.email) {
                updateAgentProfile(ag.email, {
                  name: ag.name || "Agent Name",
                  whatsapp: ag.whatsapp || "",
                  experience: ag.experience || 2,
                  country: ag.country || "United States",
                  languages: ag.languages || "EN"
                });
              }
            });
            alert(`Completed mass syncing profiles for imported records!`);
          } else {
            alert("Error: Imported file must be a valid JSON Array of profiles");
          }
        } catch (err) {
          alert("Error parsing agent dataset. Please provide valid JSON.");
        }
      };
    }
  };

  // Dynamic Module Savers
  const handleSaveModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modTitle.trim()) return;

    let updatedModules = [...modules];
    if (selectedModule) {
      updatedModules = updatedModules.map(m => {
        if (m.id === selectedModule.id) {
          return {
            ...m,
            title: modTitle,
            duration: modDuration || "15 mins",
            image: modImage || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
            summary: modSummary,
            points: modPoints
          };
        }
        return m;
      });
      alert(`Instructional Module "${modTitle}" saved!`);
    } else {
      const newModule = {
        id: modules.length > 0 ? Math.max(...modules.map(m => m.id)) + 1 : 1,
        title: modTitle,
        duration: modDuration || "15 mins",
        image: modImage || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
        summary: modSummary,
        points: modPoints
      };
      updatedModules.push(newModule);
      alert(`New curriculum Module "${modTitle}" deployed to Agent Academy!`);
    }

    localStorage.setItem("platform_modules", JSON.stringify(updatedModules));
    api.training.saveModules(updatedModules)
      .then(() => setModules(updatedModules))
      .catch(err => alert("Error saving dynamic modules on server: " + err.message));
    
    setSelectedModule(null);
    setIsEditingModule(false);
    setModTitle("");
    setModDuration("");
    setModImage("");
    setModSummary("");
    setModPoints([]);
  };

  const handleStartEditModule = (m: any) => {
    setSelectedModule(m);
    setModTitle(m.title);
    setModDuration(m.duration);
    setModImage(m.image);
    setModSummary(m.summary);
    setModPoints([...m.points]);
    setIsEditingModule(true);
  };

  const handleDeleteModule = (id: number) => {
    if (confirm("Are you sure you want to permanently remove this training module?")) {
      const remaining = modules.filter(m => m.id !== id);
      api.training.saveModules(remaining)
        .then(() => setModules(remaining))
        .catch(err => alert("Error deleting module: " + err.message));
    }
  };

  // Save Extra Sourced study asset
  const handleSaveResource = () => {
    if (resourceLink && resourceTitle) {
      const updated = [...adminResources, { 
        title: resourceTitle, 
        url: resourceLink, 
        type: resourceLink.toLowerCase().includes(".pdf") ? "pdf" : "link" 
      }];
      
      api.training.saveResources(updated)
        .then(() => {
          setAdminResources(updated);
          setShowAddResource(false);
          setResourceLink("");
          setResourceTitle("");
        })
        .catch(err => alert("Error saving playbook: " + err.message));
    }
  };

  // Remove Sourced study asset
  const handleRemoveResource = (index: number) => {
    const updated = adminResources.filter((_, idx) => idx !== index);
    api.training.saveResources(updated)
      .then(() => setAdminResources(updated))
      .catch(err => alert("Error removing playbook: " + err.message));
  };

  // Save Quiz Markup template
  const handleSaveQuiz = () => {
    api.config.saveQuizHtml(quizHtml)
      .then(() => {
        setSaveStatus("Custom Quiz schema published successfully.");
        setTimeout(() => setSaveStatus(""), 3000);
      })
      .catch(err => alert("Error saving custom quiz form: " + err.message));
  };

  // Edit triggers for existing Lead
  const handleEditLeadClick = (lead: Lead) => {
    setEditingLeadId(lead.id);
    setLeadName(lead.name);
    setLeadIndustry(lead.industry);
    setLeadCountry(lead.country);
    setLeadEstValue(lead.estValue.toString());
    setLeadEarningsCurrency(lead.earningsCurrency);
    setLeadCPName(lead.contactPerson.name);
    setLeadCPEmail(lead.contactPerson.email);
    setLeadCPPhone(lead.contactPerson.phone);
    setLeadCPRole(lead.contactPerson.role);
    setLeadPrototype(lead.prototypeUrl);
    setLeadDescription(lead.description || "");
    setEditCustomFields(lead.customFields || []);
    setShowAddLead(true);
  };

  // Create Opportunity handler
  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName) return;

    const val = parseFloat(leadEstValue) || 1200;
    const payoutCom = Math.round(val * 0.2); // Default 20% commission

    const leadPayload = {
      name: leadName,
      industry: leadIndustry || "Healthcare",
      country: leadCountry || "United States",
      estValue: val,
      payout: payoutCom,
      earningsCurrency: leadEarningsCurrency,
      description: leadDescription,
      contactPerson: {
        name: leadCPName,
        email: leadCPEmail,
        phone: leadCPPhone,
        role: leadCPRole
      },
      socials: {
        whatsapp: leadCPPhone
      },
      prototypeUrl: leadPrototype || "https://example.com/site-demo-custom",
      customFields: editCustomFields
    };

    if (editingLeadId) {
      updateLead(editingLeadId, leadPayload);
      alert(`Lead details for "${leadName}" updated successfully.`);
    } else {
      addLead({
        ...leadPayload,
        status: "Available"
      });
      alert(`New lead opportunity "${leadName}" deployed into marketplace!`);
    }

    setShowAddLead(false);
    setEditingLeadId(null);
    setLeadName("");
    setLeadIndustry("");
    setLeadCountry("");
    setLeadEstValue("");
    setLeadCPName("");
    setLeadCPEmail("");
    setLeadCPPhone("");
    setLeadCPRole("");
    setLeadPrototype("");
    setLeadDescription("");
    setEditCustomFields([]);
  };

  const handleStartEditAgent = (agent: Agent) => {
    setEditingAgentEmail(agent.email);
    setEditAgentName(agent.name);
    setEditAgentWhatsapp(agent.whatsapp || "");
    setEditAgentExperience(agent.experience.toString());
    setEditAgentCountry(agent.country || "");
    setEditAgentLanguages(agent.languages || "");
  };

  const handleSaveAgentProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgentEmail) return;

    updateAgentProfile(editingAgentEmail, {
      name: editAgentName,
      whatsapp: editAgentWhatsapp,
      experience: parseFloat(editAgentExperience) || 1,
      country: editAgentCountry,
      languages: editAgentLanguages
    });

    setEditingAgentEmail(null);
    alert(`Agent profile for ${editingAgentEmail} has been updated in database.`);
  };

  // Impersonate triggers & navigate
  const handleImpersonate = (email: string) => {
    impersonateAgent(email);
    navigate("/dashboard");
  };

  const handleUpdatePassword = (email: string, pass: string) => {
    if (!pass) return;
    updateAgentProfile(email, { password: pass });
    alert(`Password updated for agent ${email}`);
  };

  const handleExecuteReassign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassigningLead) return;
    reassignLead(reassigningLead.id, reassignTargetEmail);
    setReassigningLead(null);
    setReassignTargetEmail("");
  };

  const handleRemoveAgentUpload = (leadId: string, uploadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const remainingUploads = (lead.uploads || []).filter(u => u.id !== uploadId);
    updateLead(leadId, { uploads: remainingUploads });
    alert("Dynamic file record purged successfully from this opportunity's history.");
  };

  const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingProof(true);
      try {
        const res = await api.upload.file(file);
        if (res && res.success) {
          setPayoutProofUrl(res.url);
          setPayoutProofName(file.name);
        } else {
          alert("Proof document upload failed");
        }
      } catch (err: any) {
        alert("Upload error: " + err.message);
      } finally {
        setUploadingProof(false);
      }
    }
  };

  const handleExecutePayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingLead) return;
    const proof = payoutProofName.trim() || `POP_TRANSFER_${payingLead.id}_${Math.floor(1000 + Math.random() * 9000)}`;
    const proofUrl = payoutProofUrl || "#";
    issueCommissionPayment(payingLead.id, proof, proofUrl);
    setPayingLead(null);
    setPayoutProofName("");
    setPayoutProofUrl("");
  };

  // Accounting analytics
  const totalGrossUSD = leads.filter(l => l.status === "Sold").reduce((sum, l) => sum + l.estValue, 0);
  const totalPayoutEstimateUSD = leads.filter(l => l.status === "Sold" || l.commissionPaid).reduce((sum, l) => sum + l.payout, 0);
  const totalOutstandingCommissionsUSD = leads.filter(l => l.status === "Completed" && !l.commissionPaid).reduce((sum, l) => sum + l.payout, 0);
  const totalVolumeGrossSales = leads.length;

  // Chart data
  const revenueChartData = [
    { name: "Initial", revenue: 2000 },
    { name: "Sourced", revenue: Math.round(totalGrossUSD * 0.4) },
    { name: "Contract", revenue: Math.round(totalGrossUSD * 0.8) },
    { name: "Closed Sales", revenue: totalGrossUSD }
  ];

  // Filters
  const filteredAgents = agents.filter(a => {
    const term = agentSearch.toLowerCase();
    return a.name.toLowerCase().includes(term) || a.email.toLowerCase().includes(term) || a.country.toLowerCase().includes(term);
  });

  const filteredLeads = leads.filter(l => {
    const term = leadSearch.toLowerCase();
    return l.name.toLowerCase().includes(term) || l.industry.toLowerCase().includes(term) || l.id.toLowerCase().includes(term);
  });

  return (
    <div className="flex-1 bg-slate-50 min-h-screen pt-24 px-6 md:px-12 pb-16">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        
        {/* Banner Navigation */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[28px] text-emerald-600">admin_panel_settings</span>
              Operations Control Center
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Enterprise management pipeline for agents, pipeline opportunities, commissions accounting and platform assets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setActiveTab("Cockpit"); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "Cockpit" ? "bg-slate-900 text-white shadow" : "bg-white text-slate-500 border border-slate-220 hover:bg-slate-100"
              }`}
            >
              Control Cockpit
            </button>
            <button 
              onClick={() => { setActiveTab("Agents"); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "Agents" ? "bg-slate-900 text-white shadow" : "bg-white text-slate-500 border border-slate-220 hover:bg-slate-100"
              }`}
            >
              Agent Registry ({agents.length})
            </button>
            <button 
              onClick={() => { setActiveTab("Leads"); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "Leads" ? "bg-slate-900 text-white shadow" : "bg-white text-slate-500 border border-slate-220 hover:bg-slate-100"
              }`}
            >
              Leads Marketplace ({leads.length})
            </button>
            <button 
              onClick={() => { setActiveTab("Accounting"); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "Accounting" ? "bg-slate-900 text-white shadow" : "bg-white text-slate-500 border border-slate-220 hover:bg-slate-100"
              }`}
            >
              Sales Accounting
            </button>
            <button 
              onClick={() => { setActiveTab("Training"); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "Training" ? "bg-slate-900 text-white shadow" : "bg-white text-slate-500 border border-slate-220 hover:bg-slate-100"
              }`}
            >
              Academy Curriculum
            </button>
            <button 
              onClick={() => { setActiveTab("Cloudflare"); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "Cloudflare" ? "bg-slate-900 text-white shadow" : "bg-white text-slate-500 border border-slate-220 hover:bg-slate-100"
              }`}
            >
              Cloudflare Hub
            </button>
          </div>
        </header>

        {/* TAB 1: COCKPIT */}
        {activeTab === "Cockpit" && (
          <div className="space-y-8 animate-fadeIn">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="flex justify-between text-slate-400">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gross Volume</span>
                  <span className="material-symbols-outlined text-[20px] text-indigo-600">equalizer</span>
                </div>
                <h3 className="text-3xl font-bold text-slate-950">${totalGrossUSD.toLocaleString()}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">Earned from closed storefront prototypes</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="flex justify-between text-slate-400">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Clearing Comm.</span>
                  <span className="material-symbols-outlined text-[20px] text-emerald-500">account_balance_wallet</span>
                </div>
                <h3 className="text-3xl font-bold text-slate-950">${totalPayoutEstimateUSD.toLocaleString()}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">Outflow payouts issued to active agents</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="flex justify-between text-slate-400">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Platform Margin</span>
                  <span className="material-symbols-outlined text-[20px] text-teal-500">savings</span>
                </div>
                <h3 className="text-3xl font-bold text-slate-950">${(totalGrossUSD - totalPayoutEstimateUSD).toLocaleString()}</h3>
                <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Direct profit yield
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="flex justify-between text-emerald-600">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Registry</span>
                  <span className="material-symbols-outlined text-[20px] text-indigo-500">groups</span>
                </div>
                <h3 className="text-3xl font-bold text-slate-950">{agents.length} Agents</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{agents.filter(a => a.isApproved).length} qualified and approved outbounders</p>
              </div>
            </div>

            {/* Revenue chart - full-width for clean presentation */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Gross Closed Revenue Growth</h3>
                <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-150 font-semibold px-2.5 py-1 rounded-lg">Live Pipeline Yield</span>
              </div>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData}>
                    <defs>
                      <linearGradient id="opRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#opRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AGENT DIRECTORY */}
        {activeTab === "Agents" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Search/Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-xl bg-slate-50 col-span-1 w-full md:w-80 text-xs">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
                <input 
                  type="text" 
                  value={agentSearch} 
                  onChange={(e) => setAgentSearch(e.target.value)}
                  placeholder="Search agents by name, email, credentials..." 
                  className="bg-transparent outline-none w-full"
                />
              </div>
              <span className="text-xs text-slate-500 font-semibold">Registered Declared Accounts: {filteredAgents.length} Profiles</span>
            </div>

            {/* List block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredAgents.map((agent) => {
                const isMyAccount = user?.email.toLowerCase() === agent.email.toLowerCase();
                // Find all lead files and deliverables this agent uploaded
                const agentClaimedLeads = leads.filter(l => l.claimedBy?.toLowerCase() === agent.email.toLowerCase());
                const uploadedFilesList = agentClaimedLeads.flatMap(l => l.uploads.map(u => ({ ...u, leadName: l.name, leadId: l.id })));

                return (
                  <div 
                    key={agent.email} 
                    className={`bg-white border rounded-2xl p-6 shadow-sm space-y-5 transition relative overflow-hidden ${
                      agent.isFrozen ? "border-amber-400 bg-amber-50/5" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {agent.isFrozen && (
                      <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl">
                        Account Frozen
                      </div>
                    )}
                    {agent.isSuperAdmin && (
                      <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl">
                        Super Admin
                      </div>
                    )}

                    {/* Meta info */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 border-b border-b-transparent hover:border-b-indigo-500">{agent.name}</h4>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide ${
                            agent.isApproved ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {agent.isApproved ? "Approved Profile" : "Pending Approval"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">{agent.email}</p>
                      </div>

                      {/* Impersonator */}
                      {!agent.isSuperAdmin && !isMyAccount && (
                        <button 
                          onClick={() => handleImpersonate(agent.email)}
                          className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/50 px-2.5 py-1 rounded text-[10px] font-bold transition cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[12px]">login</span>
                          Login as Agent
                        </button>
                      )}
                    </div>

                    {/* Inline profile editor OR Credentials view */}
                    {editingAgentEmail === agent.email ? (
                      <form onSubmit={handleSaveAgentProfile} className="bg-slate-50 border border-indigo-150 p-4 rounded-xl space-y-3 font-semibold text-xs text-slate-800">
                        <span className="font-bold text-indigo-700 block text-[10px] uppercase font-mono tracking-widest">Editing Profile Details</span>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-[9px] text-slate-400 uppercase">Agent Full Name</label>
                            <input 
                              type="text" 
                              value={editAgentName} 
                              onChange={e => setEditAgentName(e.target.value)} 
                              className="w-full p-2 bg-white border border-slate-205 rounded outline-none" 
                              required 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[9px] text-slate-400 uppercase">WhatsApp Number</label>
                            <input 
                              type="text" 
                              value={editAgentWhatsapp} 
                              onChange={e => setEditAgentWhatsapp(e.target.value)} 
                              className="w-full p-2 bg-white border border-slate-205 rounded outline-none" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[9px] text-slate-400 uppercase">Experience (Years)</label>
                            <input 
                              type="number" 
                              value={editAgentExperience} 
                              onChange={e => setEditAgentExperience(e.target.value)} 
                              className="w-full p-2 bg-white border border-slate-205 rounded outline-none font-mono" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[9px] text-slate-400 uppercase">Origin Country</label>
                            <input 
                              type="text" 
                              value={editAgentCountry} 
                              onChange={e => setEditAgentCountry(e.target.value)} 
                              className="w-full p-2 bg-white border border-slate-205 rounded outline-none" 
                            />
                          </div>
                          <div className="space-y-1 col-span-2">
                            <label className="block text-[9px] text-slate-400 uppercase">Languages Proficient (e.g. EN, PT, ES)</label>
                            <input 
                              type="text" 
                              value={editAgentLanguages} 
                              onChange={e => setEditAgentLanguages(e.target.value)} 
                              className="w-full p-2 bg-white border border-slate-205 rounded outline-none" 
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end pt-1">
                          <button type="submit" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold cursor-pointer transition">Save Changes</button>
                          <button type="button" onClick={() => setEditingAgentEmail(null)} className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded">Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/70 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                        <div className="space-y-1">
                          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Username / ID</span>
                          <span className="font-mono text-slate-800 font-bold break-all select-all text-sm block bg-white border border-slate-150 rounded-lg p-2.5">{agent.email}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Realtime Password</span>
                          <div className="flex items-center gap-2 bg-white border border-slate-150 rounded-lg p-2.5 text-sm">
                            <input 
                              type="text" 
                              defaultValue={agent.password || "password123"} 
                              onBlur={(e) => handleUpdatePassword(agent.email, e.target.value)}
                              className="font-mono font-bold text-slate-900 bg-transparent outline-none w-full text-sm"
                              title="Edit directly & blur to reset password"
                            />
                            <span className="text-xs text-indigo-500 font-semibold cursor-help whitespace-nowrap shrink-0">(Edit)</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">WhatsApp Number</span>
                          <span className="font-bold text-slate-800 select-all text-sm block bg-white border border-slate-150 rounded-lg p-2.5">{agent.whatsapp || "None"}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">SME Experience</span>
                          <span className="font-bold text-slate-800 text-sm block bg-white border border-slate-150 rounded-lg p-2.5">{agent.experience} Years</span>
                        </div>
                        <div className="space-y-1">
                          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Country</span>
                          <span className="font-bold text-slate-800 text-sm block bg-white border border-slate-150 rounded-lg p-2.5">{agent.country}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Languages Proficient</span>
                          <span className="font-bold text-slate-800 uppercase font-mono text-sm block bg-white border border-slate-150 rounded-lg p-2.5">{agent.languages}</span>
                        </div>
                      </div>
                    )}

                    {/* Uploaded Things register */}
                    <div className="space-y-2 pt-1 font-sans">
                      <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1 font-mono">
                        <span className="material-symbols-outlined text-[13px] text-slate-500">cloud_upload</span>
                        Uploaded Documents ({uploadedFilesList.length})
                      </span>
                      {uploadedFilesList.length === 0 ? (
                        <p className="text-[10px] text-slate-400 leading-normal italic">No client files or agreements uploaded by this agent yet.</p>
                      ) : (
                        <div className="space-y-1 bg-slate-50 border border-slate-100 rounded-lg p-2 max-h-24 overflow-y-auto">
                          {uploadedFilesList.map((uf) => (
                            <div key={uf.id} className="flex justify-between items-center text-[10px] py-1 border-b border-slate-100 last:border-0 hover:bg-slate-100/40 transition px-1 rounded">
                              <div className="truncate max-w-52">
                                <a 
                                  href={uf.url || "#"} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  referrerPolicy="no-referrer"
                                  className="font-bold text-slate-800 hover:text-indigo-600 block truncate"
                                  title="View file upload"
                                >
                                  {uf.name}
                                </a>
                                <span className="text-slate-400 block tracking-tighter text-[9px]">Linked Lead: {uf.leadName} ({uf.leadId})</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-slate-400 text-[9px] font-mono">{uf.date}</span>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete file "${uf.name}" permanently from lead record?`)) {
                                      handleRemoveAgentUpload(uf.leadId, uf.id);
                                    }
                                  }}
                                  className="text-red-500 hover:text-red-700 font-bold text-sm shrink-0 px-1"
                                  title="Remove agent upload permanently"
                                >
                                  &times;
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Admin actions control rail */}
                    {!agent.isSuperAdmin && (
                      <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 pt-4 text-xs font-semibold">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Edit Profile Button trigger */}
                          <button 
                            onClick={() => {
                              if (editingAgentEmail === agent.email) {
                                setEditingAgentEmail(null);
                              } else {
                                handleStartEditAgent(agent);
                              }
                            }}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[10px] transition"
                          >
                            {editingAgentEmail === agent.email ? "Exit Editing" : "Edit Profile Details"}
                          </button>

                          {agent.isAdmin ? (
                            <button 
                              onClick={() => toggleAdminRights(agent.email, false)}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-250 rounded text-[10px]"
                            >
                              Revoke Admin Rights
                            </button>
                          ) : (
                            <button 
                              onClick={() => toggleAdminRights(agent.email, true)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 rounded text-[10px]"
                            >
                              Promote to Admin (Tiered)
                            </button>
                          )}

                          {agent.isFrozen ? (
                            <button 
                              onClick={() => freezeAgentAccount(agent.email, false)}
                              className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[10px]"
                            >
                              Unfreeze Account
                            </button>
                          ) : (
                            <button 
                              onClick={() => freezeAgentAccount(agent.email, true)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[10px]"
                              title="Freezes access entirely"
                            >
                              Freeze Account
                            </button>
                          )}
                        </div>

                        <button 
                          onClick={() => {
                            if (confirm(`Are you sure you want to permanently delete account: ${agent.name}?`)) {
                              deleteAgentAccount(agent.email);
                            }
                          }}
                          className="text-[10px] text-red-500 hover:text-red-700 hover:font-bold border border-transparent hover:border-red-100 px-2 py-1 rounded"
                        >
                          Remove Account
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: LEADS MARKETPLACE PIPELINE */}
        {activeTab === "Leads" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex gap-2">
                <div className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-xl bg-slate-50 text-xs w-64 md:w-80">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
                  <input 
                    type="text" 
                    value={leadSearch} 
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Search leads by client name, industry, ID..." 
                    className="bg-transparent outline-none w-full"
                  />
                </div>
              </div>

              <button 
                onClick={() => setShowAddLead(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                Register New Lead
              </button>
            </div>            {/* Detailed Cards Feed (Completely spacing-optimized and readable) */}
            <div className="space-y-6">
              <div className="p-5 bg-white border border-slate-200 rounded-2xl flex justify-between items-center shadow-sm">
                <span className="font-bold text-slate-805 text-sm uppercase tracking-wider">Business Opportunities Monitor</span>
                <span className="px-3 py-1 bg-indigo-50 border border-indigo-150 text-indigo-750 rounded-xl font-bold text-xs">
                  {leads.length} Live leads registered
                </span>
              </div>

              {filteredLeads.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 font-semibold space-y-2 shadow-sm">
                  <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
                  <p className="text-sm">No client leads match your active filters or search terms.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {filteredLeads.map((lead) => {
                    const displayCommValue = convertPrice(lead.payout, lead.earningsCurrency).formatted;
                    return (
                      <div 
                        key={lead.id} 
                        className={`bg-white border-2 rounded-2xl p-6 shadow-md relative transition-all flex flex-col justify-between ${
                          lead.isFrozen ? "border-amber-350 bg-amber-50/5" : "border-slate-200 hover:border-slate-350"
                        }`}
                      >
                        {/* Upper Section */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-start gap-4 flex-wrap">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-0.5 bg-slate-900 text-slate-105 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono">
                                  {lead.id}
                                </span>
                                <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-lg border border-teal-150">
                                  {lead.industry}
                                </span>
                                {lead.isFrozen && (
                                  <span className="px-2.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg">
                                    Frozen Asset
                                  </span>
                                )}
                              </div>
                              <h3 
                                onClick={() => navigate(`/jobs/${lead.id}`)}
                                className="text-lg font-bold text-slate-950 hover:text-indigo-600 transition-colors cursor-pointer pt-0.5 flex items-center gap-1.5"
                              >
                                {lead.name}
                              </h3>
                              <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] text-slate-300">public</span>
                                {lead.country}
                              </p>
                            </div>
                            
                            <span className={`inline-block px-3 py-1 rounded-xl text-xs font-bold tracking-wider ${
                              lead.status === "Available" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                              lead.status === "Claimed" ? "bg-indigo-50 text-indigo-700 border border-indigo-150" :
                              lead.status === "In Progress" ? "bg-indigo-100 text-indigo-800 border border-indigo-200" : 
                              "bg-emerald-100 text-emerald-800 border border-emerald-250"
                            }`}>
                              {lead.status}
                            </span>
                          </div>

                          {/* Description text */}
                          {lead.description && (
                            <p className="text-xs text-slate-650 leading-relaxed font-semibold bg-slate-50 rounded-xl p-3.5 border border-slate-150">
                              {lead.description}
                            </p>
                          )}

                          {/* Demonstration link trigger */}
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">language</span>
                            <a 
                              href={lead.prototypeUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
                            >
                              (View Demo Link)
                            </a>
                          </div>

                          {/* Custom Fields segment */}
                          {lead.customFields && lead.customFields.length > 0 && (
                            <div className="border-t border-slate-100 pt-3 space-y-2">
                              <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold">Supplemental Metadata</span>
                              <div className="grid grid-cols-2 gap-2.5">
                                {lead.customFields.map((cf) => (
                                  <div key={cf.id} className="bg-indigo-50/30 border border-indigo-100 px-3 py-1.5 rounded-xl">
                                    <span className="block text-[9px] text-indigo-600 font-semibold uppercase">{cf.title}</span>
                                    <span className="text-xs text-slate-800 font-bold">{cf.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Metrics/Claims Columns Info */}
                          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs font-semibold">
                            
                            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-150/70 space-y-1.5">
                              <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold">Estimated Pipeline Yield</span>
                              <div className="text-slate-800 font-semibold">Est: <strong className="text-slate-900 font-black">${lead.estValue.toLocaleString()}</strong></div>
                              <div className="text-emerald-700 font-bold">Comm: {displayCommValue}</div>
                              <div className="text-blue-700 font-bold font-semibold">Currency: {lead.earningsCurrency}</div>
                            </div>

                            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-150/70 space-y-1">
                              <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold">SME Business Contact</span>
                              <div className="text-slate-900 font-bold truncate">{lead.contactPerson.name || "(No Name listed)"}</div>
                              <div className="text-slate-500 font-medium truncate select-all">{lead.contactPerson.email || "(No email)"}</div>
                              <div className="text-slate-500 font-medium select-all">{lead.contactPerson.phone || "(No phone)"}</div>
                            </div>

                            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-150/70 space-y-1.5">
                              <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold">Contract Claims Info</span>
                              {lead.claimedBy ? (
                                <div className="space-y-1 text-xs select-all">
                                  <span className="text-slate-500 font-medium block">Claimant Account:</span>
                                  <strong className="text-slate-800 truncate block font-mono font-bold" title={lead.claimedBy}>
                                    {lead.claimedBy}
                                  </strong>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic block pt-1">-- Unclaimed Opportunity --</span>
                              )}
                            </div>

                          </div>
                        </div>

                        {/* Control actions footer */}
                        <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold font-sans">
                          <button 
                            onClick={() => handleEditLeadClick(lead)}
                            className="py-2.5 text-center bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 border border-indigo-200 text-indigo-700 rounded-xl transition cursor-pointer"
                          >
                            Edit Details
                          </button>

                          <button 
                            onClick={() => { setReassigningLead(lead); setReassignTargetEmail(lead.claimedBy || ""); }}
                            className="py-2.5 text-center border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 rounded-xl font-semibold text-slate-700 transition cursor-pointer"
                          >
                            {lead.claimedBy ? "Reassign Claim" : "Assign to Agent"}
                          </button>

                          <button 
                            onClick={() => {
                              updateLead(lead.id, { isFrozen: !lead.isFrozen });
                              alert(`Lead "${lead.name}" is now ${!lead.isFrozen ? "FROZEN (unlisted)" : "ACTIVE"}`);
                            }}
                            className={`py-2.5 text-center rounded-xl transition cursor-pointer ${
                              lead.isFrozen ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {lead.isFrozen ? "Unfreeze Asset" : "Freeze Status"}
                          </button>

                          <button 
                            onClick={() => {
                              if (confirm(`Are you sure you want to permanently delete lead: ${lead.name}?`)) {
                                deleteLead(lead.id);
                              }
                            }}
                            className="py-2.5 text-center bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition cursor-pointer"
                          >
                            Delete Opportunity
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: COMPREHENSIVE SALES ACCOUNTING & COMMISSION PORTAL */}
        {activeTab === "Accounting" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Sales calculations overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Financial Metrics Sheet (Extremely readable and standard styled) */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md space-y-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.06),transparent)] pointer-events-none" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">Enterprise Accounting Sales Sheet</h3>
                
                <div className="grid grid-cols-2 gap-6 pb-4 border-b border-slate-800 text-sm">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Gross Pipelines Closed</span>
                    <p className="text-2xl font-bold text-white">${totalGrossUSD.toLocaleString()} USD</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-455 uppercase tracking-wider">Platform Profit Margin</span>
                    <p className="text-2xl font-bold text-emerald-400">${(totalGrossUSD - totalPayoutEstimateUSD).toLocaleString()} USD</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 text-xs font-semibold">
                  <div className="space-y-1">
                    <span className="block text-slate-450 uppercase tracking-wider text-[11px]">Total Paid Out Commissions</span>
                    <span className="text-sm font-bold text-slate-200">${totalPayoutEstimateUSD.toLocaleString()} USD</span>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-slate-450 uppercase tracking-wider text-[11px]">Pending Approval Deficit</span>
                    <span className="text-sm font-bold text-amber-400">${totalOutstandingCommissionsUSD.toLocaleString()} USD</span>
                  </div>
                </div>
              </div>

              {/* Data Export Center (Highly spaced with readable inputs) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Ledger Export Configurator</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    Selective formatting: Select the currency standard you would like to export your final sheets in.
                  </p>
                </div>

                <div className="space-y-4 pt-1">
                  <div className="space-y-2 text-xs font-semibold">
                    <label className="block text-slate-655 uppercase tracking-wider text-xs font-bold">Target Export Currency Mapping:</label>
                    <select
                      value={exportCurrency}
                      onChange={(e) => setExportCurrency(e.target.value as any)}
                      className="p-2.5 border border-slate-205 rounded-xl outline-none w-56 text-sm font-bold bg-slate-50 text-slate-800"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="BRL">BRL (R$)</option>
                      <option value="MZN">MZN (MT)</option>
                      <option value="ZAR">ZAR (R)</option>
                    </select>
                  </div>

                  <button 
                    onClick={() => alert(`Ledger data formatted to ${exportCurrency} converted successfully. Initiating raw selectable CSV download stream...`)}
                    className="flex items-center gap-1.5 px-4.5 py-3 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Export Ledger Sheet to CSV (.csv)
                  </button>
                </div>
              </div>

            </div>

            {/* Commissions Management ledger (Proof upload - Enhanced Typography and Spacing) */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-sm">
              <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-800 text-sm uppercase tracking-wider">Commission Payout Approvals Queue</span>
                <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-bold text-xs">
                  {leads.filter(l => l.status === "Completed" || l.status === "Sold" || l.commissionPaid).length} METRIC TARGETS
                </span>
              </div>

              <div className="overflow-x-auto select-text">
                <table className="w-full text-left">
                  <thead className="bg-[#FAFAFA] text-slate-500 font-bold uppercase tracking-wider text-xs border-b border-slate-150">
                    <tr>
                      <th className="p-4">Sold Business</th>
                      <th className="p-4">Active Agent</th>
                      <th className="p-4">Base Payout Ratio</th>
                      <th className="p-4">Ex. Value ({exportCurrency})</th>
                      <th className="p-4">Payout Date</th>
                      <th className="p-4">Payment Verification Proof</th>
                      <th className="p-4 text-center">Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold text-xs">
                    {leads.filter(l => l.status === "Completed" || l.status === "Sold" || l.commissionPaid).map((lead) => {
                      const displayPayoutVal = convertPrice(lead.payout, exportCurrency).formatted;
                      return (
                        <tr 
                          key={lead.id} 
                          onClick={() => {
                            handleEditLeadClick(lead);
                            setEditingLeadId(lead.id);
                            setShowAddLead(true);
                            setActiveTab("Leads");
                          }}
                          className="hover:bg-slate-100/70 cursor-pointer border-b border-slate-100 transition-colors text-xs font-semibold"
                        >
                          <td className="p-4">
                            <span className="font-bold text-indigo-700 hover:underline block text-sm">{lead.name}</span>
                            <span className="text-slate-405 block text-xs pt-1 font-mono">ID: {lead.id} &bull; {lead.country}</span>
                          </td>
                          <td className="p-4 font-semibold">
                            <strong className="text-slate-800 block text-xs">{lead.claimedBy || "Unassigned"}</strong>
                            <span className="text-slate-400 text-xs font-semibold block pt-0.5">Preferred Currency: {lead.earningsCurrency}</span>
                          </td>
                          <td className="p-4 font-bold text-slate-800 text-sm">
                            ${lead.payout.toLocaleString()} USD
                          </td>

                          {/* Export currency conversion column */}
                          <td className="p-4 font-bold text-blue-700 bg-slate-50/50 text-sm">
                            {displayPayoutVal}
                          </td>

                          <td className="p-4 text-slate-500 font-semibold text-xs">
                            {lead.commissionPaidDate || "--"}
                          </td>
                          <td className="p-4">
                            {lead.commissionPaid ? (
                              <div className="flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded inline-block max-w-sm border border-emerald-250">
                                <span className="material-symbols-outlined text-[14px]">done_all</span>
                                <span className="truncate max-w-[125px] inline-block pt-0.5" title={lead.commissionProofName}>{lead.commissionProofName}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-semibold italic">Pending Transfer...</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                              {lead.commissionPaid ? (
                                <span className="text-emerald-700 font-bold text-xs uppercase tracking-wider bg-emerald-100/50 px-3 py-1.5 rounded-lg border border-emerald-200">PAID</span>
                              ) : (
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation();
                                    setPayingLead(lead); 
                                    setPayoutProofName(`POP_TRANSFER_${lead.id}_${Math.floor(1000 + Math.random() * 9000)}`); 
                                  }}
                                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                                >
                                  Pay & Attach Proof
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ACADEMY & RESOURCES CURRICULUM CONFIGURATION */}
        {activeTab === "Training" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Header section with actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm font-sans">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono">Academy Training & Resources Hub</h3>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Configure corporate learning modules, sales playbooks, scripts, guidelines and external PDFs displayed in the agent's Hub.
                </p>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setSelectedModule(null);
                    setModTitle("");
                    setModDuration("");
                    setModImage("");
                    setModSummary("");
                    setModPoints([]);
                    setNewModPoint("");
                    setIsEditingModule(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">post_add</span>
                  Create Custom Module
                </button>
              </div>
            </div>

            {/* Main view rows */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Modules List and details */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4 font-sans">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider font-mono">Academy Course Chapters ({modules.length})</span>
                  
                  {modules.length === 0 ? (
                    <p className="text-xs text-slate-400 italic font-medium">No curriculum courses available. Click "Create Custom Module" above to add.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {modules.map((m) => (
                        <div key={m.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-4 items-start justify-between">
                          <div className="flex gap-3.5 items-start">
                            <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/55">
                              <img src={m.image} alt={m.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 text-sm tracking-tight">{m.title}</h4>
                                <span className="bg-slate-100 text-slate-650 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono">{m.duration}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-normal">{m.summary || "No description provided."}</p>
                              
                              {m.points && m.points.length > 0 && (
                                <div className="space-y-1 mt-1 pt-1 border-t border-slate-50">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase font-mono tracking-wider">Syllabus Outline Topics ({m.points.length})</span>
                                  <div className="flex flex-wrap gap-1">
                                    {m.points.map((p: string, idx: number) => (
                                      <span key={idx} className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-100 truncate max-w-xs" title={p}>
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-1.5 shrink-0 self-end sm:self-center">
                            <button 
                              onClick={() => handleStartEditModule(m)}
                              className="px-2.5 py-1 text-[10px] font-bold border border-slate-205 hover:bg-slate-50 text-slate-700 bg-white rounded-lg transition"
                            >
                              Edit Module
                            </button>
                            <button 
                              onClick={() => handleDeleteModule(m.id)}
                              className="px-2.5 py-1 text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sales Resources List and Add Resource */}
              <div className="space-y-6">
                
                {/* Add Quick Resource card */}
                <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono text-[10px]">Add Field Sales Resource</h4>
                    <p className="text-[10px] text-slate-405 font-normal">Add sales playbooks, scripts, pitch recordings or PDF links directly into the system resource matrix.</p>
                  </div>

                  <div className="space-y-2.5 text-slate-850 text-xs font-semibold">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Resource Document Title</label>
                      <input 
                        type="text" 
                        value={resourceTitle}
                        onChange={(e) => setResourceTitle(e.target.value)}
                        placeholder="e.g. Objections Handling Masterclass"
                        className="w-full p-2 bg-white rounded-lg outline-none font-sans text-slate-950 font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Cloud File Web Link</label>
                      <input 
                        type="text" 
                        value={resourceLink}
                        onChange={(e) => setResourceLink(e.target.value)}
                        placeholder="https://drive.google.com/.../guide.pdf"
                        className="w-full p-2 bg-white rounded-lg outline-none font-sans text-slate-950 font-medium font-mono text-[10px]"
                      />
                    </div>

                    <button 
                      onClick={handleSaveResource}
                      disabled={!resourceTitle.trim() || !resourceLink.trim()}
                      className="w-full py-2 mt-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 text-slate-950 font-extrabold rounded-lg font-mono tracking-widest uppercase text-[10px] transition cursor-pointer"
                    >
                      + Publish Resource
                    </button>
                  </div>
                </div>

                {/* Published resources list */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3.5 font-sans">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Published Field Playbooks ({adminResources.length})</span>
                  
                  {adminResources.length === 0 ? (
                    <p className="text-xs text-slate-455 italic leading-snug font-medium">No active field materials published. Use the editor to deploy resources.</p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {adminResources.map((res: any, idx: number) => {
                        const isPdf = res.url?.toLowerCase().includes(".pdf") || res.type === "pdf";
                        return (
                          <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-150 p-2.5 rounded-xl text-xs font-sans">
                            <div className="truncate max-w-[170px]">
                              <a 
                                href={res.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="font-bold text-slate-800 hover:text-indigo-600 truncate block hover:underline"
                                title="Open resource Link"
                              >
                                {res.title}
                              </a>
                              <span className="text-slate-405 block text-[9px] font-mono tracking-tighter truncate">
                                {isPdf ? "PDF Handbook" : "External Resource"}
                              </span>
                            </div>

                            <button 
                              onClick={() => {
                                if (confirm(`Remove asset record: "${res.title}"?`)) {
                                  handleRemoveResource(idx);
                                }
                              }}
                              className="text-red-500 hover:text-red-700 font-bold text-lg p-1 shrink-0"
                              title="Delete Resource Entry"
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Overlay modal for Module editing */}
            {isEditingModule && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn text-xs">
                <form onSubmit={handleSaveModule} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto space-y-4 font-semibold text-slate-850 font-sans">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-widest flex items-center gap-1">
                      <span className="material-symbols-outlined text-indigo-600">edit_note</span>
                      {selectedModule ? "Edit Curriculum Module" : "Deploy New Academy Module"}
                    </h3>
                    <button type="button" onClick={() => setIsEditingModule(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">Module Course Title</label>
                      <input 
                        type="text" 
                        value={modTitle} 
                        onChange={(e) => setModTitle(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                        placeholder="e.g. Closing Enterprise SME Accounts"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">Instructional Duration</label>
                      <input 
                        type="text" 
                        value={modDuration} 
                        onChange={(e) => setModDuration(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                        placeholder="e.g. 25 mins"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">Cover Illustration / Image URL</label>
                      <input 
                        type="text" 
                        value={modImage} 
                        onChange={(e) => setModImage(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-xl outline-none font-mono text-[10px]"
                        placeholder="https://images.unsplash.com/photo-..."
                      />
                    </div>

                    <div className="space-y-1 col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">Curriculum Syllabus Summary</label>
                      <textarea 
                        value={modSummary} 
                        onChange={(e) => setModSummary(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-normal"
                        placeholder="Provide a high-level syllabus summary of what agents will learn..."
                        rows={2.5}
                      />
                    </div>

                    {/* Bullet key topics builder */}
                    <div className="col-span-2 space-y-2 border-t border-slate-100 pt-3">
                      <label className="block text-[10px] font-bold text-indigo-600 uppercase font-mono tracking-wider">Syllabus Outline Topics & Chapters ({modPoints.length})</label>
                      
                      {modPoints.length > 0 && (
                        <div className="space-y-1.5 bg-slate-50 border border-slate-150 p-3 rounded-xl max-h-32 overflow-y-auto">
                          {modPoints.map((p, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10.5px]">
                              <span className="truncate max-w-[400px] text-slate-750 font-bold">{p}</span>
                              <button 
                                type="button" 
                                onClick={() => setModPoints(modPoints.filter((_, i) => i !== idx))}
                                className="text-red-500 hover:text-red-700 font-bold ml-2 block text-xs"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 bg-slate-50/55 border border-slate-150 p-2.5 rounded-xl">
                        <input 
                          type="text" 
                          placeholder="e.g. Master Objection-handling workflows with script blocks" 
                          value={newModPoint}
                          onChange={(e) => setNewModPoint(e.target.value)}
                          className="flex-1 p-2 bg-white border border-slate-200 rounded-lg outline-none font-normal font-sans"
                        />
                        <button 
                          type="button" 
                          onClick={() => {
                            if (newModPoint.trim()) {
                              setModPoints([...modPoints, newModPoint.trim()]);
                              setNewModPoint("");
                            }
                          }}
                          className="px-3 bg-indigo-50 text-indigo-700 border border-indigo-250 font-bold hover:bg-indigo-100 rounded-lg transition text-[11px]"
                        >
                          + Add Chapter
                        </button>
                      </div>
                    </div>

                  </div>

                  <div className="pt-4 border-t border-slate-150 flex justify-end gap-3 font-sans">
                    <button type="button" onClick={() => setIsEditingModule(false)} className="px-4 py-2 bg-slate-100 font-bold hover:bg-slate-200 text-slate-600 rounded-xl font-medium">Cancel</button>
                    <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 font-bold text-white rounded-xl shadow transition cursor-pointer font-sans">
                      Save Syllabus Module
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: CLOUDFLARE EDGE ENGINE WORKSPACE */}
        {activeTab === "Cloudflare" && (
          <div className="space-y-8 animate-fadeIn">
            <CloudflareHub />
          </div>
        )}

        {/* MODAL: REGISTER NEW LEAD */}
        {showAddLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn text-sm font-sans">
            <form onSubmit={handleCreateLead} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 max-h-[92vh] overflow-y-auto space-y-5 text-slate-800 border border-slate-100">
              <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-2xl">
                    {editingLeadId ? "edit_document" : "add_circle"}
                  </span>
                  {editingLeadId ? "Edit Lead Details" : "Register Lead Opportunity"}
                </h3>
                <button type="button" onClick={() => { setShowAddLead(false); setEditingLeadId(null); }} className="text-slate-400 hover:text-slate-600 font-bold text-2xl leading-none">&times;</button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Business Name *</label>
                <input 
                  type="text" 
                  value={leadName} 
                  onChange={(e) => setLeadName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. Apex Health Clinic"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Industry</label>
                  <input 
                    type="text" 
                    value={leadIndustry} 
                    onChange={(e) => setLeadIndustry(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal text-slate-800 focus:border-indigo-500"
                    placeholder="Healthcare, Legal..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Country of Origin</label>
                  <input 
                    type="text" 
                    value={leadCountry} 
                    onChange={(e) => setLeadCountry(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal text-slate-800 focus:border-indigo-500"
                    placeholder="United States..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Est. Contract Value (USD baseline)</label>
                  <input 
                    type="number" 
                    value={leadEstValue} 
                    onChange={(e) => setLeadEstValue(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal text-slate-800 focus:border-indigo-500"
                    placeholder="2500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Earnings Payout Currency</label>
                  <select
                    value={leadEarningsCurrency}
                    onChange={(e) => setLeadEarningsCurrency(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-semibold bg-slate-50 text-slate-800 focus:border-indigo-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="BRL">BRL (R$)</option>
                    <option value="MZN">MZN (MT)</option>
                    <option value="ZAR">ZAR (R)</option>
                  </select>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="block text-sm font-semibold text-slate-700">Prototype Demonstration Website Link</label>
                  <input 
                    type="text" 
                    value={leadPrototype} 
                    onChange={(e) => setLeadPrototype(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal text-slate-800 focus:border-indigo-500"
                    placeholder="https://example.com/demo-dental"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Business Description</label>
                <textarea 
                  value={leadDescription} 
                  onChange={(e) => setLeadDescription(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl outline-none text-sm font-normal text-slate-800 focus:border-indigo-500"
                  placeholder="e.g. Traditional business looking to optimize conversion channels through targeted local demo pipelines."
                  rows={2.5}
                />
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-3">
                <span className="block text-sm font-bold text-indigo-700 font-sans tracking-wide">Custom Profile Fields ({editCustomFields.length})</span>
                
                {editCustomFields.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-205 rounded-xl p-3">
                    {editCustomFields.map((cf) => (
                      <div key={cf.id} className="flex justify-between items-center bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700">
                        <span className="truncate max-w-[150px]"><strong className="text-indigo-700">{cf.title}:</strong> {cf.value}</span>
                        <button 
                          type="button" 
                          onClick={() => setEditCustomFields(editCustomFields.filter(f => f.id !== cf.id))}
                          className="text-red-505 text-red-500 hover:text-red-700 font-bold ml-2 shrink-0 text-base"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 bg-slate-50/50 border border-slate-200 p-2.5 rounded-xl">
                  <input 
                    type="text" 
                    placeholder="Field Title (e.g. Yelp Link)" 
                    value={newCfTitle}
                    onChange={(e) => setNewCfTitle(e.target.value)}
                    className="w-1/2 p-2.5 bg-white border border-slate-250 rounded-xl outline-none text-xs font-normal"
                  />
                  <input 
                    type="text" 
                    placeholder="Field Value" 
                    value={newCfValue}
                    onChange={(e) => setNewCfValue(e.target.value)}
                    className="w-1/2 p-2.5 bg-white border border-slate-250 rounded-xl outline-none text-xs font-normal"
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      if (newCfTitle.trim() && newCfValue.trim()) {
                        setEditCustomFields([...editCustomFields, { id: Date.now().toString(), title: newCfTitle.trim(), value: newCfValue.trim() }]);
                        setNewCfTitle("");
                        setNewCfValue("");
                      }
                    }}
                    className="px-3 py-2 bg-indigo-50 text-indigo-750 border border-indigo-200 font-bold hover:bg-indigo-150 rounded-lg text-xs transition"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Contact Sub-Fields */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <span className="block text-sm font-bold text-indigo-700">Primary Business Contact details</span>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <input 
                      type="text" 
                      value={leadCPName} 
                      onChange={(e) => setLeadCPName(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal text-slate-800 focus:border-indigo-500"
                      placeholder="Contact Person Name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <input 
                      type="text" 
                      value={leadCPRole} 
                      onChange={(e) => setLeadCPRole(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal text-slate-800 focus:border-indigo-500"
                      placeholder="Contact Role/Designation"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <input 
                      type="email" 
                      value={leadCPEmail} 
                      onChange={(e) => setLeadCPEmail(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal text-slate-800 focus:border-indigo-500"
                      placeholder="Corporate Email"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <input 
                      type="text" 
                      value={leadCPPhone} 
                      onChange={(e) => setLeadCPPhone(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal text-slate-800 focus:border-indigo-500"
                      placeholder="WhatsApp/Phone"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3 text-sm font-semibold">
                <button type="button" onClick={() => { setShowAddLead(false); setEditingLeadId(null); }} className="px-5 py-2.5 bg-slate-100 text-slate-650 hover:bg-slate-200 rounded-xl transition">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-bold hover:shadow-md transition">
                  {editingLeadId ? "Save Changes" : "Deploy Opportunity"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL: REASSIGN LEAD CLAIMS */}
        {reassigningLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn text-xs">
            <form onSubmit={handleExecuteReassign} className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">Assign Opportunity Claim</h3>
                <p className="text-[11px] text-slate-400">Reassign or strip agent ownership: <strong>{reassigningLead.name}</strong></p>
              </div>

              <div className="space-y-2">
                <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono">Choose Agent</label>
                <select
                  value={reassignTargetEmail}
                  onChange={(e) => setReassignTargetEmail(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-mono font-semibold"
                >
                  <option value="">-- Remove Claims Holder (Set Available) --</option>
                  {agents.filter(a => !a.isSuperAdmin).map(a => (
                    <option key={a.email} value={a.email}>{a.name} ({a.email})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setReassigningLead(null)} className="px-4 py-2 bg-slate-100 font-bold text-slate-500 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 font-bold text-white rounded-lg">Confirm Owner</button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL: COMMISSION PAYMENT FILE ATTACH PROOF */}
        {payingLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn text-xs">
            <form onSubmit={handleExecutePayout} className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wide">Attaching proof of commission payment</h3>
                <p className="text-[11px] text-slate-400">Specify details for payor bank transfer link representation: <strong>{payingLead.name}</strong></p>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-mono">Recipient Payout Value:</span>
                  <p className="text-sm font-bold font-mono text-emerald-600">
                    {convertPrice(payingLead.payout, payingLead.earningsCurrency).formatted} ({payingLead.earningsCurrency})
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">Proof of Payment Document / Receipt</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={payoutProofUrl} 
                      onChange={(e) => setPayoutProofUrl(e.target.value)}
                      className="flex-1 p-2 border border-slate-200 rounded-xl outline-none font-mono text-[11px] truncate"
                      placeholder="Upload receipt PDF or enter URL"
                    />
                    <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl cursor-pointer text-[11px] block text-slate-700 shrink-0 font-sans font-semibold">
                      {uploadingProof ? "Uploading..." : "Upload File"}
                      <input type="file" accept="application/pdf,image/*" onChange={handleProofFileChange} disabled={uploadingProof} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">Proof of Payment Filename</label>
                  <input 
                    type="text" 
                    value={payoutProofName} 
                    onChange={(e) => setPayoutProofName(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-mono"
                    placeholder="Payment_Slip_Tx_4091_Carlos.pdf"
                    required
                  />
                  <p className="text-[9px] text-slate-400 leading-normal">This file registry represents the formal transaction receipt downloadable by the agent.</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => { setPayingLead(null); setPayoutProofName(""); setPayoutProofUrl(""); }} className="px-4 py-2 bg-slate-100 font-bold text-slate-550 rounded-lg">Browse Vault</button>
                <button type="submit" disabled={uploadingProof} className="px-4 py-2 bg-emerald-600 font-bold text-white rounded-lg disabled:opacity-50">Settle Commission</button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
