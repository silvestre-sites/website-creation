import React, { useState, useEffect } from "react";
import { useI18n } from "../store/I18nContext";
import { useAuth } from "../store/AuthContext";
import { motion, AnimatePresence } from "motion/react";

interface ReferralAgent {
  id: string;
  name: string;
  email: string;
  joinedDate: string;
  salesCompleted: number;
  maxSales: number;
  status: "Invited" | "Registered" | "Active" | "Expired";
}

export function Referrals() {
  const { t } = useI18n();
  const { user } = useAuth();
  
  const userName = user?.email?.split('@')[0] || "agt_x89f2";
  const refUrl = window.location.origin + "/?ref=" + userName;

  // Local storage state keys
  const STORAGE_KEY_REFERRED = `referred_agents_list_${user?.email || "guest"}`;
  
  const [referredAgents, setReferredAgents] = useState<ReferralAgent[]>([]);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Invite form inputs
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState("Hey! I've been working with this outbound sales portal to present digital prototypes to local businesses and earn high commission payouts. It's a great model. Sign up using my referral link here!");
  const [inviteSentAlert, setInviteSentAlert] = useState<string | null>(null);

  // Simulator inputs (Test signup)
  const [testName, setTestName] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);

  // Load state from local storage on component mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_REFERRED);
    if (saved) {
      try {
        setReferredAgents(JSON.parse(saved));
      } catch (e) {
        setReferredAgents(getDefaultReferrals());
      }
    } else {
      const defaults = getDefaultReferrals();
      setReferredAgents(defaults);
      localStorage.setItem(STORAGE_KEY_REFERRED, JSON.stringify(defaults));
    }
  }, [user]);

  const getDefaultReferrals = (): ReferralAgent[] => [
    {
      id: "ref-101",
      name: "Douglas Silva",
      email: "d.silva@example.com",
      joinedDate: "2 months ago",
      salesCompleted: 8,
      maxSales: 10,
      status: "Active"
    },
    {
      id: "ref-102",
      name: "Reny Chen",
      email: "r.chen@example.com",
      joinedDate: "1 month ago",
      salesCompleted: 3,
      maxSales: 10,
      status: "Active"
    },
    {
      id: "ref-103",
      name: "Markus Johnson",
      email: "m.johnson@example.com",
      joinedDate: "3 months ago",
      salesCompleted: 10,
      maxSales: 10,
      status: "Expired"
    }
  ];

  const updateReferralsState = (updated: ReferralAgent[]) => {
    setReferredAgents(updated);
    localStorage.setItem(STORAGE_KEY_REFERRED, JSON.stringify(updated));
  };

  const copyToClipboard = () => {
    setCopying(true);
    navigator.clipboard.writeText(refUrl);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setCopying(false);
    }, 2000);
  };

  // Send an invite email (simulated)
  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    // Add to pending logs
    const newAgent: ReferralAgent = {
      id: "ref-" + Math.floor(1000 + Math.random() * 9000),
      name: inviteName,
      email: inviteEmail,
      joinedDate: "Just invited",
      salesCompleted: 0,
      maxSales: 10,
      status: "Invited"
    };

    const updated = [newAgent, ...referredAgents];
    updateReferralsState(updated);

    setInviteSentAlert(`Successfully simulated sending invitation email to ${inviteName} (${inviteEmail})! Track their onboarding status below.`);
    setInviteName("");
    setInviteEmail("");
    
    setTimeout(() => {
      setInviteSentAlert(null);
    }, 6000);
  };

  // Simulate a test signup (someone registering through the agent's link)
  const handleSimulateSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testName.trim() || !testEmail.trim()) return;

    // Check if they are already invited/present
    const existingIndex = referredAgents.findIndex(a => a.email.toLowerCase() === testEmail.toLowerCase());
    
    if (existingIndex > -1) {
      // Transition them
      const updated = [...referredAgents];
      updated[existingIndex] = {
        ...updated[existingIndex],
        status: "Active",
        joinedDate: "Registered today"
      };
      updateReferralsState(updated);
    } else {
      const newAgent: ReferralAgent = {
        id: "ref-" + Math.floor(1000 + Math.random() * 9000),
        name: testName,
        email: testEmail,
        joinedDate: "Registered today",
        salesCompleted: 0,
        maxSales: 10,
        status: "Active"
      };
      const updated = [newAgent, ...referredAgents];
      updateReferralsState(updated);
    }

    setTestSuccessMessage(`Successfully simulated: ${testName} has signed up using your link! They are now an Active agent in your network.`);
    setTestName("");
    setTestEmail("");

    setTimeout(() => {
      setTestSuccessMessage(null);
    }, 6000);
  };

  // Increase sales count to simulate earning commission
  const handleSimulateSale = (agentId: string) => {
    const updated = referredAgents.map(a => {
      if (a.id === agentId && a.salesCompleted < a.maxSales) {
        const nextSales = a.salesCompleted + 1;
        return {
          ...a,
          salesCompleted: nextSales,
          status: nextSales >= a.maxSales ? "Expired" as const : "Active" as const
        };
      }
      return a;
    });
    updateReferralsState(updated);
  };

  // Metrics calculations
  const activeReferredCount = referredAgents.filter(a => a.status === "Active" || a.status === "Expired").length;
  // Let's assume each sale generates a $1,245 value, we earn 10% of that which is $124.50.
  const COMM_RATE_PER_SALE = 124.50;
  const totalSalesCompleted = referredAgents.reduce((sum, a) => sum + a.salesCompleted, 0);
  const totalCommissionEarned = totalSalesCompleted * COMM_RATE_PER_SALE;
  const totalNetworkRevenue = totalSalesCompleted * 1245;

  const preFilledWhatsAppText = encodeURIComponent(`Hey! I am earning great commission payouts by sharing professional, customized website designs with local businesses. It's fully authorized, very low-friction, and pre-built templates do all the heavy lifting. You should register as an outbound agent too! Tap my link to begin: ${refUrl}`);
  const shareWhatsAppUrl = `https://api.whatsapp.com/send?text=${preFilledWhatsAppText}`;

  return (
    <div className="flex-1 bg-slate-50 min-h-screen pt-24 px-6 md:px-12 pb-16">
      <div className="max-w-6xl mx-auto w-full space-y-8 animate-fadeIn">
        
        {/* Header Block */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Grow Your Agent Network</h1>
            <p className="text-xs text-slate-500 font-medium max-w-2xl leading-relaxed">
              Invite friends to join as Outbound Representatives. When they close clients on customized prototypes, you earn a passive **10% overriding commission** on their first 10 successful integrations!
            </p>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-full w-fit">
            <span className="material-symbols-outlined text-[15px]">stars</span>
            Passive Recurring overrides enabled
          </div>
        </header>

        {/* Share Section Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Referral Information Box */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Your Direct Referral Gateway</h3>
              <p className="text-xs text-slate-400">Share your custom link with your marketing lists, friends, or digital sales groups.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-center">
              <div className="relative w-full">
                <span className="material-symbols-outlined text-slate-400 text-[18px] absolute left-3.5 top-1/2 -translate-y-1/2">link</span>
                <input 
                  type="text" 
                  readOnly 
                  value={refUrl} 
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 font-mono text-xs text-indigo-700 font-bold focus:outline-none"
                />
              </div>

              <div className="flex gap-2 w-full md:w-auto shrink-0">
                <button 
                  onClick={copyToClipboard}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm select-none cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">{copied ? 'check_circle' : 'content_copy'}</span>
                  {copied ? 'Copied Link' : 'Copy Link'}
                </button>

                <a 
                  href={shareWhatsAppUrl}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm select-none cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] font-bold">share</span>
                  Share on WhatsApp
                </a>
              </div>
            </div>

            {/* Simulated Email Invite Form */}
            <form onSubmit={handleSendInvite} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 pt-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1">
                <span className="material-symbols-outlined text-slate-500 text-[16px]">alternate_email</span>
                Simulate Sending Email Invitation
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Friend's Name *</label>
                  <input 
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Liam Thompson"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Friend's Email *</label>
                  <input 
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. liam@marketingleads.com"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Personal Message</label>
                <textarea 
                  value={inviteMsg}
                  onChange={(e) => setInviteMsg(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-indigo-500 font-sans leading-relaxed text-slate-505"
                />
              </div>

              <div className="flex justify-between items-center sm:pt-1">
                <p className="text-[10px] text-slate-400 italic">This will launch a simulated outbound dispatch template.</p>
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs cursor-pointer select-none"
                >
                  Send Invitation
                </button>
              </div>

              <AnimatePresence>
                {inviteSentAlert && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium"
                  >
                    {inviteSentAlert}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          {/* Reward Milestones Tiers */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Commission Super-Chargers</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 shrink-0">
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">10% Overriding Commission</h4>
                  <p className="text-[10px] text-slate-400 leading-snug">Earn a baseline override on every dollar your referred contacts clear on their first 10 accounts.</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide font-mono block mb-2">Milestone Rewards Checklist:</span>
                <div className="space-y-3">
                  {[
                    { title: "Bronze Tier: 1st Active Friend", progress: `${activeReferredCount}/1`, cleared: activeReferredCount >= 1 },
                    { title: "Silver Tier: 5 Active Friends", progress: `${activeReferredCount}/5`, cleared: activeReferredCount >= 5 },
                    { title: "Gold Tier: 10 Active Friends", progress: `${activeReferredCount}/10`, cleared: activeReferredCount >= 10 },
                    { title: "Cash Match Bonus ($500 Extra)", progress: `${totalSalesCompleted}/25 Sales`, cleared: totalSalesCompleted >= 25 },
                  ].map((tier, index) => (
                    <div key={index} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl p-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-[16px] text-emerald-600 ${tier.cleared ? 'text-teal-600 font-bold' : 'text-slate-350 opacity-55'}`}>
                          {tier.cleared ? "check_circle" : "radio_button_unchecked"}
                        </span>
                        <span className={`text-[11px] font-semibold ${tier.cleared ? 'text-slate-800 line-through' : 'text-slate-600'}`}>{tier.title}</span>
                      </div>
                      <span className="text-[10px] font-extrabold text-indigo-600 font-mono tracking-tight">{tier.progress}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Network Playground and Interactive Sandbox */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Table Panel: network stats */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-slate-900 text-sm">Referred Representatives & Interactive Pipeline</h4>
                  <p className="text-[11px] text-slate-400">View and trigger performance mockups to simulate live overrides flow.</p>
                </div>
                <div className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg font-mono">
                  {referredAgents.length} Enlisted Contacts
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-[#FAFAFA] border-b border-slate-200 text-slate-450 uppercase font-bold text-[9px] font-mono tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Representative</th>
                      <th className="px-6 py-3.5">Join Date</th>
                      <th className="px-6 py-3.5 text-center">Overrides Progress</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Interactive sandbox</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {referredAgents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No invitees registered. Use the links or sandbox forms above to trigger some signups!</td>
                      </tr>
                    ) : (
                      referredAgents.map((agent) => (
                        <tr key={agent.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{agent.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono font-medium">{agent.email}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-medium">{agent.joinedDate}</td>
                          <td className="px-6 py-4">
                            <div className="max-w-[120px] mx-auto text-center space-y-1">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="font-extrabold text-indigo-600 font-mono">{agent.salesCompleted} / {agent.maxSales}</span>
                                <span className="text-slate-400 text-[9px] italic">Limit limit</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                                <div 
                                  className={`h-full transition-all duration-500 ${agent.salesCompleted >= agent.maxSales ? 'bg-amber-500' : 'bg-teal-500'}`}
                                  style={{ width: `${Math.min(100, (agent.salesCompleted / agent.maxSales) * 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              agent.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                              agent.status === "Invited" ? "bg-amber-50 text-amber-700 border-amber-100 animate-pulse" :
                              agent.status === "Expired" ? "bg-slate-50 text-slate-500 border-slate-200" :
                              "bg-indigo-50 text-indigo-700 border-indigo-100"
                            }`}>
                              {agent.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {agent.status === "Invited" ? (
                              <button 
                                onClick={() => {
                                  const updated = referredAgents.map(a => {
                                    if (a.id === agent.id) {
                                      return { ...a, status: "Active" as const, joinedDate: "Just signed up!" };
                                    }
                                    return a;
                                  });
                                  updateReferralsState(updated);
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold text-slate-700 border border-slate-300 rounded-lg hover:border-indigo-600 bg-white hover:text-indigo-600 transition"
                              >
                                Simulate Join
                              </button>
                            ) : agent.status === "Active" && agent.salesCompleted < agent.maxSales ? (
                              <button 
                                onClick={() => handleSimulateSale(agent.id)}
                                className="px-2 py-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition"
                                title="Add a sale to see how overriding commissions scale live"
                              >
                                + Force Sale ($124.50)
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium italic">Eligibility Expired</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-450 italic text-center font-medium">
              * Active referral overrides last for the first 10 integrations closed by the recruited outbound rep.
            </div>
          </div>

          {/* Right Panel: Interactive Sandbox Simulation forms */}
          <div className="space-y-6">
            
            {/* Live overriding override status scoreboard */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm space-y-4 shadow-md border border-slate-800">
              <span className="text-[9px] font-bold text-indigo-400 tracking-wider font-mono uppercase block">Real-time Scorecard</span>
              
              <div className="space-y-3.5">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Total Network Revenue</span>
                  <span className="text-2xl font-extrabold font-mono text-white">${totalNetworkRevenue.toLocaleString()}</span>
                  <span className="text-[10px] text-emerald-400 block font-medium mt-0.5">• Active Pipeline Cleared</span>
                </div>
                <hr className="border-slate-800" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Your Override Commissions</span>
                  <span className="text-3xl font-extrabold font-mono text-emerald-400">${totalCommissionEarned.toLocaleString()}</span>
                  <span className="text-[10px] text-emerald-400 block font-medium mt-0.5">• Fully unlocked overrides yield</span>
                </div>
              </div>
            </div>

            {/* Test Invite Signup Sandbox form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-1">
                <span className="material-symbols-outlined text-indigo-500 text-[16px]">psychology</span>
                Referral Link Sandbox Sandbox
              </h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                Want to test out how your referred representatives populate? Enter details to simulate a prospect instantly clicking your link and registering!
              </p>

              <form onSubmit={handleSimulateSignup} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Simulate Name</label>
                  <input 
                    type="text"
                    required
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="e.g. Reny Chen"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-indigo-500 font-sans font-medium text-slate-705"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Simulate Email</label>
                  <input 
                    type="email"
                    required
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="e.g. rchen@gmail.com"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-indigo-500 font-sans font-medium text-slate-705"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-extrabold hover:bg-slate-800 cursor-pointer select-none"
                >
                  Test Referral Signup
                </button>
              </form>

              <AnimatePresence>
                {testSuccessMessage && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-3 bg-indigo-50 border border-indigo-150 text-indigo-800 rounded-xl text-xs leading-relaxed"
                  >
                    {testSuccessMessage}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
