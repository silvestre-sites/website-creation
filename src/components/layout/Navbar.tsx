import React, { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { useI18n } from "../../store/I18nContext";
import { useJobs } from "../../store/JobsContext";

export function Navbar() {
  const { user, logout, updateAvatar, impersonatingFrom, stopImpersonation } = useAuth();
  const { lang, setLang, t } = useI18n();
  const { globalCurrency, setGlobalCurrency, addLead } = useJobs();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistent Lead Registration modal states
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadIndustry, setLeadIndustry] = useState("");
  const [leadCountry, setLeadCountry] = useState("");
  const [leadValue, setLeadValue] = useState("");
  const [leadDescription, setLeadDescription] = useState("");
  const [leadDemoUrl, setLeadDemoUrl] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [leadEarningsCurrency, setLeadEarningsCurrency] = useState<"USD" | "EUR" | "BRL" | "MZN" | "ZAR">("USD");
  const [editCustomFields, setEditCustomFields] = useState<{ id: string; title: string; value: string }[]>([]);
  const [newCfTitle, setNewCfTitle] = useState("");
  const [newCfValue, setNewCfValue] = useState("");

  const isActive = (path: string) => location.pathname === path;

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuickRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName) return;

    const val = parseFloat(leadValue) || 1500;
    addLead({
      name: leadName,
      industry: leadIndustry || "Healthcare",
      country: leadCountry || "United States",
      estValue: val,
      payout: Math.round(val * 0.2),
      earningsCurrency: leadEarningsCurrency,
      description: leadDescription,
      status: "Available",
      prototypeUrl: leadDemoUrl || "https://example.com/demo-website",
      contactPerson: {
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
        role: contactRole
      },
      socials: {
        whatsapp: contactPhone
      },
      customFields: editCustomFields
    });

    // clear states
    setLeadName("");
    setLeadIndustry("");
    setLeadCountry("");
    setLeadValue("");
    setLeadDescription("");
    setLeadDemoUrl("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setContactRole("");
    setLeadEarningsCurrency("USD");
    setEditCustomFields([]);
    setNewCfTitle("");
    setNewCfValue("");
    
    setShowRegisterForm(false);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col">
      {impersonatingFrom && (
        <div className="bg-amber-600 text-white text-[12px] font-semibold py-2 px-6 flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
            <span>Impersonating Agent: <strong className="underline">{user?.name}</strong> ({user?.email}) • Views represent this agent.</span>
          </div>
          <button 
            onClick={stopImpersonation} 
            className="bg-white text-amber-700 px-3 py-0.5 rounded text-[11px] font-bold shadow hover:bg-slate-100 transition-all cursor-pointer"
          >
            Return to Super Admin
          </button>
        </div>
      )}
      <nav className="bg-white/85 backdrop-blur-md border-b border-[rgba(0,0,0,0.06)] w-full">
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full px-6 h-16">
          <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-sm tracking-tighter shadow-sm">
              AP
            </div>
            <span className="font-bold text-slate-800 tracking-tight text-base">
              AgencyPro
            </span>
          </Link>
          
          {/* Desktop navigation links - hidden on mid-size screens to prevent overlapping */}
          <div className="hidden lg:flex items-center gap-2">
            {!user ? (
              <>
                <Link to="/" className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${isActive('/') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                  {t("nav.services")}
                </Link>
              </>
            ) : (
              <>
                {(user.isApproved || user.isAdmin) && (
                  <>
                    <Link to="/jobs" className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${isActive('/jobs') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                      {t("nav.marketplace")}
                    </Link>
                    <Link to="/dashboard" className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${isActive('/dashboard') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                      {t("nav.dashboard")}
                    </Link>
                    <Link to="/accounts" className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${isActive('/accounts') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                      Billing & Invoices
                    </Link>
                    <Link to="/referrals" className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${isActive('/referrals') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                      {t("nav.referrals")}
                    </Link>
                  </>
                )}
                <Link to="/resources" className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${isActive('/resources') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                  {t("nav.education")}
                </Link>
                {user.isAdmin && (
                  <Link to="/admin" className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1 ${isActive('/admin') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                    <span className="material-symbols-outlined text-[15px]">admin_panel_settings</span>
                    {t("nav.admin")}
                  </Link>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Global Master Currency selector - hidden on mobile container, kept inside drawer/navbar on desktop */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg text-xs font-bold border border-slate-200 font-mono">
              <span className="text-[9px] text-slate-500 uppercase font-bold">CURR:</span>
              <select 
                value={globalCurrency}
                onChange={(e) => setGlobalCurrency(e.target.value as any)}
                className="bg-transparent border-none outline-none font-bold text-slate-800 text-xs cursor-pointer focus:ring-0 p-0 pr-1 shrink-0"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="BRL">BRL (R$)</option>
                <option value="MZN">MZN (MT)</option>
                <option value="ZAR">ZAR (R)</option>
              </select>
            </div>

            {/* Language switches */}
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium border border-slate-250">
              <button 
                onClick={() => setLang("en")}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${lang === "en" ? "bg-white shadow-sm text-slate-900 font-extrabold" : "text-slate-400 hover:text-slate-700"}`}
              >
                EN
              </button>
              <button 
                onClick={() => setLang("pt")}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${lang === "pt" ? "bg-white shadow-sm text-slate-900 font-extrabold" : "text-slate-400 hover:text-slate-700"}`}
              >
                PT
              </button>
            </div>

            {/* Register New Lead Button "at all times" for Admin users */}
            {user?.isAdmin && (
              <button 
                onClick={() => { setShowRegisterForm(true); setIsMobileMenuOpen(false); }}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold font-sans transition shadow-sm select-none"
              >
                <span className="material-symbols-outlined text-[15px]">add_circle</span>
                <span>Register Lead</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-2 pl-2 relative group">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 rounded-full border border-slate-250 bg-white overflow-hidden shadow-xs relative focus:outline-none"
                  title="Upload Profile Picture"
                >
                  {user.avatarUrl ? (
                     <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                     <span className="material-symbols-outlined text-indigo-600 mt-2">person</span>
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="material-symbols-outlined text-white text-[15px]">upload</span>
                  </div>
                </button>
                <div className="text-right leading-tight hidden xl:block">
                  <p className="font-bold text-[12px] text-slate-800">{user.name}</p>
                  <p className="text-[10px] font-semibold text-indigo-700">{user.isAdmin ? "Administrator" : (user.isApproved ? "Agent" : "Pending")}</p>
                </div>
                
                {/* Logout Button (Desktop only, mobile version in drawer) */}
                <button 
                  onClick={logout}
                  title={t("nav.logout")}
                  className="hidden sm:flex w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 items-center justify-center text-slate-700 transition ml-2"
                 >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link 
                  to="/login"
                  className="px-3.5 py-1.5 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition border border-slate-200"
                >
                  {t("nav.login")}
                </Link>
                <Link 
                  to="/register"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                 >
                  {t("nav.register")}
                </Link>
              </div>
            )}

            {/* Responsive Tablet & Mobile Burger Menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex lg:hidden p-2 text-slate-650 hover:bg-slate-100 rounded-xl transition"
              title="Toggle Navigation Menu"
            >
              <span className="material-symbols-outlined text-[24px]">
                {isMobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        {/* Responsive Mobile Drawer Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white/95 backdrop-blur-md px-6 py-5 shadow-lg flex flex-col gap-4 animate-slideDown font-sans text-xs">
            
            {/* Nav section */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-widest block px-2 mb-1">Navigation</span>
              {!user ? (
                <Link 
                  to="/" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl font-bold flex items-center gap-2 ${isActive('/') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-650 hover:bg-slate-50'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">home</span>
                  {t("nav.services")}
                </Link>
              ) : (
                <>
                  {(user.isApproved || user.isAdmin) && (
                    <>
                      <Link 
                        to="/jobs" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`p-2.5 rounded-xl font-bold flex items-center gap-2 ${isActive('/jobs') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-650 hover:bg-slate-50'}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">local_mall</span>
                        {t("nav.marketplace")}
                      </Link>
                      <Link 
                        to="/dashboard" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`p-2.5 rounded-xl font-bold flex items-center gap-2 ${isActive('/dashboard') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-650 hover:bg-slate-50'}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">dashboard</span>
                        {t("nav.dashboard")}
                      </Link>
                      <Link 
                        to="/accounts" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`p-2.5 rounded-xl font-bold flex items-center gap-2 ${isActive('/accounts') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-650 hover:bg-slate-50'}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                        Billing & Invoices
                      </Link>
                      <Link 
                        to="/referrals" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`p-2.5 rounded-xl font-bold flex items-center gap-2 ${isActive('/referrals') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-650 hover:bg-slate-50'}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">group_add</span>
                        {t("nav.referrals")}
                      </Link>
                    </>
                  )}
                  <Link 
                    to="/resources" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`p-2.5 rounded-xl font-bold flex items-center gap-2 ${isActive('/resources') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-650 hover:bg-slate-50'}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">school</span>
                    {t("nav.education")}
                  </Link>
                  {user.isAdmin && (
                    <Link 
                      to="/admin" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`p-2.5 rounded-xl font-bold flex items-center gap-2 ${isActive('/admin') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-650 hover:bg-slate-50'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                      {t("nav.admin")}
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Config controls section */}
            <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-widest block px-2">Account Configuration</span>
              
              <div className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded-xl">
                <span className="font-bold text-slate-600">Select Currency</span>
                <select 
                  value={globalCurrency}
                  onChange={(e) => setGlobalCurrency(e.target.value as any)}
                  className="bg-transparent font-bold text-slate-800 text-xs cursor-pointer border-none outline-none focus:ring-0 p-0"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="BRL">BRL (R$)</option>
                  <option value="MZN">MZN (MT)</option>
                  <option value="ZAR">ZAR (R)</option>
                </select>
              </div>

              <div className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded-xl">
                <span className="font-bold text-slate-600">Language</span>
                <div className="flex gap-2 font-mono">
                  <button 
                    onClick={() => { setLang("en"); setIsMobileMenuOpen(false); }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${lang === "en" ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}
                  >
                    EN
                  </button>
                  <button 
                    onClick={() => { setLang("pt"); setIsMobileMenuOpen(false); }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${lang === "pt" ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}
                  >
                    PT
                  </button>
                </div>
              </div>

              {user?.isAdmin && (
                <button 
                  onClick={() => { setShowRegisterForm(true); setIsMobileMenuOpen(false); }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-center shadow-sm block flex items-center justify-center gap-1.5 mt-1"
                >
                  <span className="material-symbols-outlined text-[17px]">add_circle</span>
                  Register Lead Account
                </button>
              )}
            </div>

            {/* Auth actions section */}
            <div className="border-t border-slate-100 pt-3">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <span className="material-symbols-outlined text-slate-400">account_circle</span>
                    <div className="text-left font-sans">
                      <p className="font-bold text-slate-800 leading-none">{user.name}</p>
                      <p className="text-[10px] text-slate-400 mt-1 leading-none">{user.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-center font-bold block"
                  >
                    Sign Out Account
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link 
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-center block"
                  >
                    Login
                  </Link>
                  <Link 
                    to="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-center block"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>

          </div>
        )}
      </nav>

    {/* QUICK FLOATING MODAL FORM FOR NEW LEAD REGISTRATION AT ALL TIMES */}
    {showRegisterForm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn text-sm font-sans">
        <form onSubmit={handleQuickRegister} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 max-h-[92vh] overflow-y-auto space-y-5 text-slate-800 border border-slate-100">
          <div className="flex justify-between items-center border-b border-slate-200 pb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-2xl">add_circle</span>
              Register Opportunity Portal
            </h3>
            <button type="button" onClick={() => setShowRegisterForm(false)} className="text-slate-400 hover:text-slate-600 font-bold text-2xl leading-none">&times;</button>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">Business Brand/Name *</label>
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
              <label className="block text-sm font-semibold text-slate-700">Industry Sector</label>
              <input 
                type="text" 
                value={leadIndustry} 
                onChange={(e) => setLeadIndustry(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal text-slate-800 focus:border-indigo-500"
                placeholder="e.g. Healthcare, Retail"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Country of Origin</label>
              <input 
                type="text" 
                value={leadCountry} 
                onChange={(e) => setLeadCountry(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal text-slate-800 focus:border-indigo-500"
                placeholder="e.g. Canada, UK, US"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Contract Value (USD baseline)</label>
              <input 
                type="number" 
                value={leadValue} 
                onChange={(e) => setLeadValue(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal text-slate-800 focus:border-indigo-500"
                placeholder="1500"
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
              <label className="block text-sm font-semibold text-slate-700">Demo Website URL</label>
              <input 
                type="text" 
                value={leadDemoUrl} 
                onChange={(e) => setLeadDemoUrl(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal text-slate-800 focus:border-indigo-500"
                placeholder="https://example.com/demo"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">Corporate Description (Business Summary) *</label>
            <textarea 
              value={leadDescription} 
              onChange={(e) => setLeadDescription(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl outline-none text-sm font-normal text-slate-800 focus:border-indigo-500"
              placeholder="Provide details about their services, requirements, and digital targets..."
              rows={3}
              required
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
                      className="text-red-500 hover:text-red-700 font-bold ml-2 shrink-0 text-base"
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

          <div className="border-t border-slate-200 pt-4 space-y-3">
            <span className="block text-sm font-bold text-indigo-700">Primary Lead Contact Point</span>
            <div className="grid grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Contact Person Name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal text-slate-800 focus:border-indigo-500"
              />
              <input 
                type="text" 
                placeholder="Role/Designation"
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal text-slate-800 focus:border-indigo-500"
              />
              <input 
                type="email" 
                placeholder="Corporate Email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal text-slate-800 focus:border-indigo-500"
              />
              <input 
                type="text" 
                placeholder="WhatsApp/Phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal text-slate-800 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3 text-sm font-semibold">
            <button 
              type="button" 
              onClick={() => setShowRegisterForm(false)} 
              className="px-5 py-2.5 bg-slate-100 text-slate-650 hover:bg-slate-200 rounded-xl transition"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-bold hover:shadow-md transition"
            >
              Submit Lead
            </button>
          </div>
        </form>
      </div>
    )}
    </div>
  );
}
