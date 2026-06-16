import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../store/I18nContext";

export function Landing() {
  const { t } = useI18n();

  return (
    <div className="relative flex-1 w-full bg-[#FAFAFA] min-h-screen">
      
      {/* Background Grid & Blur */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60 z-0 pointer-events-none"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-[120px] pointer-events-none -z-10"></div>
      
      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-24 px-6 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
        <div className="md:w-1/2 flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(0,0,0,0.08)] bg-white shadow-sm mb-8 text-[13px] font-medium text-on-surface-variant">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              {t("landing.hero.pill") || "New Platform is live"}
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-on-surface mb-6 leading-[1.05]">
              {t("landing.hero.title")}
            </h1>
            
            <p className="text-[17px] md:text-[19px] text-on-surface-variant max-w-2xl leading-relaxed mb-10">
              {t("landing.hero.subtitle")}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link to="/register" className="saas-button saas-button-primary px-6 py-3 text-[15px]">
                {t("landing.hero.cta")}
              </Link>
              <a href="#how" className="saas-button saas-button-secondary px-6 py-3 text-[15px]">
                <span className="material-symbols-outlined mr-2">info</span>
                {t("landing.hero.learn")}
              </a>
            </div>
        </div>
        <div className="md:w-1/2 relative w-full h-[400px] md:h-[500px]">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent rounded-2xl md:rounded-[40px] transform rotate-3"></div>
            <img 
                src="https://images.pexels.com/photos/3987016/pexels-photo-3987016.jpeg" 
                alt="Working on a laptop" 
                className="w-full h-full object-cover rounded-2xl md:rounded-[40px] shadow-2xl relative z-10 block"
                loading="lazy"
            />
        </div>
      </section>

      {/* Trusted/Smarter Way */}
      <section className="relative z-10 py-24 bg-white border-y border-[rgba(0,0,0,0.06)] px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-on-surface mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">lightbulb</span>
              {t("landing.trusted.title")}
            </h2>
            <div className="space-y-4 text-on-surface-variant text-[16px] leading-relaxed">
              <p>{t("landing.trusted.textp1")}</p>
              <p>{t("landing.trusted.textp2")}</p>
            </div>
          </div>
          <div className="relative">
            <div className="saas-card p-6 bg-[#FAFAFA] flex flex-col gap-4">
              <div className="flex items-center gap-3 border-b border-[rgba(0,0,0,0.06)] pb-4">
                <div className="w-10 h-10 rounded-lg bg-white border border-[rgba(0,0,0,0.06)] shadow-sm flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">storefront</span>
                </div>
                <div>
                  <div className="font-medium text-sm text-on-surface">{t("landing.trusted.card.title")}</div>
                  <div className="text-xs text-on-surface-variant">{t("landing.trusted.card.subtitle")}</div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium text-on-surface">{t("landing.trusted.card.comission")}</span>
                <button className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md shadow-sm">{t("landing.trusted.card.action")}</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how" className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-semibold tracking-tight text-on-surface">{t("landing.how.title")}</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: '1', icon: 'search', title: t("landing.how.step1.title"), desc: t("landing.how.step1.desc") },
            { step: '2', icon: 'code', title: t("landing.how.step2.title"), desc: t("landing.how.step2.desc") },
            { step: '3', icon: 'present_to_all', title: t("landing.how.step3.title"), desc: t("landing.how.step3.desc") },
            { step: '4', icon: 'payments', title: t("landing.how.step4.title"), desc: t("landing.how.step4.desc") }
          ].map((s) => (
            <div key={s.step} className="saas-card p-6 flex flex-col items-start text-left hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                 <span className="material-symbols-outlined text-[24px]">{s.icon}</span>
              </div>
              <h3 className="font-semibold text-on-surface mb-2">{s.title}</h3>
              <p className="text-[14px] text-on-surface-variant leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Agents Love The Platform */}
      <section className="py-24 bg-white border-y border-[rgba(0,0,0,0.06)] px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 md:w-1/2">
            <h2 className="text-3xl font-semibold tracking-tight text-on-surface mb-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[32px]">favorite</span>
              {t("landing.benefits.title")}
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: 'radar', title: t("landing.benefits.card1.title"), desc: t("landing.benefits.card1.desc") },
              { icon: 'devices', title: t("landing.benefits.card2.title"), desc: t("landing.benefits.card2.desc") },
              { icon: 'schedule', title: t("landing.benefits.card3.title"), desc: t("landing.benefits.card3.desc") },
              { icon: 'all_inclusive', title: t("landing.benefits.card4.title"), desc: t("landing.benefits.card4.desc") },
              { icon: 'school', title: t("landing.benefits.card5.title"), desc: t("landing.benefits.card5.desc") },
              { icon: 'groups', title: t("landing.benefits.card6.title"), desc: t("landing.benefits.card6.desc") }
            ].map((b, i) => (
              <div key={i} className="p-6 border border-[rgba(0,0,0,0.06)] rounded-xl bg-[#FAFAFA] hover:bg-white transition-all transform hover:-translate-y-1">
                <span className="material-symbols-outlined text-primary mb-4 text-[28px]">{b.icon}</span>
                <h3 className="font-semibold text-on-surface mb-2">{b.title}</h3>
                <p className="text-[14px] text-on-surface-variant">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Income & Referral side by side */}
      <section className="py-24 px-6 max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
        <div className="saas-card p-10 bg-gradient-to-br from-white to-[#FAFAFA]">
          <h3 className="text-2xl font-semibold tracking-tight text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">trending_up</span>
            {t("landing.earnings.title")}
          </h3>
          <p className="text-[15px] text-on-surface-variant leading-relaxed mb-6">
            {t("landing.earnings.desc")}
          </p>
           <div className="pt-6 border-t border-[rgba(0,0,0,0.06)] flex items-center justify-between">
             <span className="text-sm font-medium">{t("landing.earnings.estimate")}</span>
            <span className="text-2xl font-bold text-primary">Uncapped Scale</span>
          </div>
        </div>
        <div className="saas-card p-10 bg-gradient-to-br from-white to-[#FAFAFA]">
          <h3 className="text-2xl font-semibold tracking-tight text-on-surface mb-4 flex items-center gap-2">
             <span className="material-symbols-outlined text-primary">group_add</span>
            {t("landing.referral.title")}
          </h3>
          <p className="text-[15px] text-on-surface-variant leading-relaxed mb-6">
             {t("landing.referral.desc")}
          </p>
          <Link to="/register" className="saas-button saas-button-secondary">Learn about Referrals</Link>
        </div>
      </section>

      {/* Training Center & CTA */}
      <section className="py-32 bg-white border-t border-[rgba(0,0,0,0.06)] px-6 text-center">
        <div className="max-w-3xl mx-auto flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FAFAFA] border border-[rgba(0,0,0,0.06)] flex items-center justify-center mb-8 shadow-sm">
            <span className="material-symbols-outlined text-3xl text-primary">school</span>
          </div>
          <h2 className="text-4xl font-semibold tracking-tight text-on-surface mb-6">
            {t("landing.training.title")}
          </h2>
          <p className="text-[18px] text-on-surface-variant leading-relaxed mb-12">
            {t("landing.training.desc")}
          </p>
          <h3 className="text-xl font-medium tracking-tight text-on-surface mb-6">{t("landing.cta.title")}</h3>
          <p className="text-[15px] text-on-surface-variant leading-relaxed mb-8">
            {t("landing.cta.desc")}
          </p>
          <Link to="/register" className="saas-button saas-button-primary px-8 py-3.5 text-[16px]">
            {t("landing.cta.button")}
          </Link>
        </div>
      </section>

      {/* FAQ preview - simple footer look */}
      <footer className="bg-[#FAFAFA] border-t border-[rgba(0,0,0,0.06)] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded bg-primary text-white flex items-center justify-center font-bold text-[10px]">AP</div>
              <span className="font-semibold text-sm">AgencyPro</span>
            </div>
            <p className="text-xs text-on-surface-variant">© 2026 AgencyPro Infrastructure. All rights reserved.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-4 text-[13px] text-on-surface-variant">
            <span className="font-medium text-on-surface mb-2 col-span-full">{t("landing.faq.title")}</span>
            <a className="hover:text-primary cursor-pointer transition-colors">{t("landing.faq.q1")}</a>
            <a className="hover:text-primary cursor-pointer transition-colors">{t("landing.faq.q2")}</a>
            <a className="hover:text-primary cursor-pointer transition-colors">{t("landing.faq.q3")}</a>
            <a className="hover:text-primary cursor-pointer transition-colors">{t("landing.faq.q4")}</a>
            <a className="hover:text-primary cursor-pointer transition-colors">{t("landing.faq.q5")}</a>
            <a className="hover:text-primary cursor-pointer transition-colors">{t("landing.faq.q6")}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

