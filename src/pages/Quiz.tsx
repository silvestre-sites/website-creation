import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../store/I18nContext";
import { useAuth } from "../store/AuthContext";
import { api } from "../lib/api";

export function Quiz() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user, passQuiz, approveUser } = useAuth();
  const [selected, setSelected] = useState("");
  const [customHtml, setCustomHtml] = useState<string | null>(null);

  useEffect(() => {
     api.config.getQuizHtml()
       .then((res) => {
         if (res && res.quizHtml && res.quizHtml.trim() !== "") {
           setCustomHtml(res.quizHtml);
         }
       })
       .catch((err) => console.error("Could not fetch quiz html:", err));
  }, []);

  if (user?.didPassQuiz && !user?.isApproved) {
    return (
      <div className="flex-1 bg-[#FAFAFA] min-h-screen pt-24 px-6 flex items-center justify-center">
        <div className="saas-card p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#f4f4f5] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <span className="material-symbols-outlined text-[32px] text-on-surface-variant font-light">hourglass_empty</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-on-surface mb-3">Certification Under Review</h2>
          <p className="text-[15px] text-on-surface-variant mb-8 leading-relaxed">
            Your application and assessment scores are currently under editorial review by the administration team. Please wait for approval.
          </p>
          <button 
             onClick={() => {
              approveUser();
              navigate("/dashboard");
             }}
             className="saas-button saas-button-secondary text-[12px] opacity-50 hover:opacity-100"
          >
             [MOCK] Auto-approve me
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selected || customHtml) { // if custom html is present, allow submit anyway
      passQuiz();
    }
  };

  return (
    <div className="flex-1 bg-[#FAFAFA] min-h-screen pt-24 px-6 md:px-12 pb-12">
      <div className="max-w-2xl mx-auto w-full">
        
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-semibold text-on-surface tracking-tight mb-2">{t("hub.cert.title")}</h1>
          <p className="text-[15px] text-on-surface-variant max-w-md mx-auto">
            {t("hub.cert.desc")}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="saas-card p-8">
            {customHtml ? (
               <div dangerouslySetInnerHTML={{ __html: customHtml }} />
            ) : (
               <>
                 <h3 className="font-semibold text-[17px] text-on-surface mb-6">
                   1. When contacting a business owner, how should the website prototype be positioned?
                 </h3>
                 <div className="space-y-3">
                   {[
                     { id: 'a', label: 'As an expensive investment they must buy immediately.' },
                     { id: 'b', label: 'As a visual opportunity to show what a professional online presence can look like without heavy sales pressure.' },
                     { id: 'c', label: 'As a mandatory requirement for their business to survive.' }
                   ].map((opt) => (
                     <label 
                       key={opt.id} 
                       className={`flex items-start p-4 border rounded-xl cursor-pointer transition-all ${
                         selected === opt.id 
                         ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                         : 'border-outline hover:border-[rgba(0,0,0,0.2)] bg-white'
                       }`}
                     >
                       <div className="flex h-6 items-center">
                         <input
                           type="radio"
                           name="q1"
                           value={opt.id}
                           checked={selected === opt.id}
                           onChange={() => setSelected(opt.id)}
                           className="h-4 w-4 text-primary border-outline focus:ring-primary/20"
                         />
                       </div>
                       <div className="ml-3">
                         <span className="block text-[15px] font-medium text-on-surface">{opt.label}</span>
                       </div>
                     </label>
                   ))}
                 </div>
               </>
            )}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={!selected && !customHtml}
              className="saas-button saas-button-primary px-8 py-3.5 text-[15px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Assessment
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
