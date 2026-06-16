import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { useI18n } from "../store/I18nContext";

export function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [country, setCountry] = useState("");
  const [languages, setLanguages] = useState("EN");
  const [experience, setExperience] = useState("");
  const [bypassTraining, setBypassTraining] = useState(false);
  
  const { login, register } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    const cleanEmail = email.trim().toLowerCase();
    const isAdministrative = cleanEmail.includes('admin') || cleanEmail === 'olisbel@gmail.com';
    
    try {
      if (isLogin) {
        const res = await login(email, password);
        if (res && !res.success) {
          setErrorMsg(res.error || "Incorrect login email or password.");
          setLoading(false);
          return;
        }
        if (isAdministrative) {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      } else {
        await register(email, password, name, bypassTraining, whatsapp, country, languages, experience);
        if (isAdministrative) {
          navigate("/admin");
        } else if (bypassTraining) {
          navigate("/dashboard"); // bypasses academy
        } else {
          navigate("/resources"); // Agent first registers, sent to academy
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4 pt-16 bg-grid-pattern relative">
      <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-[rgba(0,0,0,0.02)] to-transparent pointer-events-none"></div>
      
      <div className="w-full max-w-[440px] z-10 my-12">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-xl mx-auto mb-4 tracking-tighter shadow-[0_4px_16px_rgba(31,109,0,0.3)]">
            <span className="material-symbols-outlined text-[28px]">rocket_launch</span>
          </div>
          <h1 className="text-2xl font-semibold text-on-surface tracking-tight mb-2">
            {isLogin ? t("auth.login.title") : t("auth.register.title")}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {isLogin ? t("auth.login.subtitle") : t("auth.register.subtitle")}
          </p>
        </div>

        <div className="saas-card p-6 sm:p-8">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2 animate-fadeIn">
              <span className="material-symbols-outlined text-[16px] mt-0.5">error</span>
              <span>{errorMsg}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-[13px] font-medium text-on-surface mb-1.5">
                    {t("auth.name")}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="saas-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-on-surface mb-1.5">
                    {t("auth.whatsapp")}
                  </label>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    required
                    className="saas-input w-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-on-surface mb-1.5">
                      {t("auth.country")}
                    </label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      required
                      className="saas-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-on-surface mb-1.5">
                      {t("auth.languages")}
                    </label>
                    <select
                      value={languages}
                      onChange={(e) => setLanguages(e.target.value)}
                      required
                      className="saas-input w-full bg-white relative pr-8 select-none"
                    >
                      <option value="EN">English</option>
                      <option value="PT">Portuguese</option>
                      <option value="ES">Spanish</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-on-surface mb-1.5">
                    {t("auth.experience")}
                  </label>
                  <input
                    type="number"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    required
                    min="0"
                    placeholder="Years"
                    className="saas-input w-full"
                  />
                </div>
                <div>
                   <label className="flex items-center gap-2 cursor-pointer mt-2">
                     <input 
                       type="checkbox" 
                       checked={bypassTraining} 
                       onChange={(e) => setBypassTraining(e.target.checked)}
                       className="rounded border-outline text-primary focus:ring-primary/20 w-4 h-4"
                     />
                     <span className="text-[13px] text-on-surface-variant font-medium">Bypass Training Request (Manager Approval required)</span>
                   </label>
                </div>
              </>
            )}

            <div>
              <label className="block text-[13px] font-medium text-on-surface mb-1.5">
                {t("auth.email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="saas-input w-full"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-on-surface mb-1.5">
                {t("auth.password")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="saas-input w-full"
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="saas-button saas-button-primary w-full py-2.5 mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">{isLogin ? 'login' : 'person_add'}</span>
                  <span>{isLogin ? t("auth.login.submit") : t("auth.register.submit")}</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <div>
            <span className="text-[13px] text-on-surface-variant">
              {isLogin ? "Don't have an account?" : "Already an agent?"}
            </span>
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="ml-1.5 text-[13px] font-medium text-primary hover:text-[#165200] transition-colors"
            >
              {isLogin ? "Apply Now" : "Sign In"}
            </button>
          </div>
          
          <button 
             onClick={() => {
                setEmail('olisbel@gmail.com');
                setPassword('19921108626');
                setIsLogin(true);
             }}
             className="text-[11px] text-on-surface-variant/60 hover:text-primary transition-colors flex items-center gap-1"
          >
             <span className="material-symbols-outlined text-[14px]">shield_person</span>
             Admin Quick Login
          </button>
        </div>
      </div>
    </div>
  );
}
