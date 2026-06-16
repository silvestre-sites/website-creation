import React, { useState } from "react";
import { useJobs } from "../store/JobsContext";
import { useI18n } from "../store/I18nContext";
import { motion } from "motion/react";
import { UploadCloud, FileType, CheckCircle2 } from "lucide-react";

export function Submissions() {
  const { jobs } = useJobs();
  const { t } = useI18n();
  const [selectedJob, setSelectedJob] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const claimedJobs = jobs.filter(j => j.status === "claimed");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // Real implementation would involve uploading files and marking task as completed
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-8 border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold uppercase tracking-widest text-slate-900">{t("submit.title")}</h1>
      </header>

      {claimedJobs.length === 0 ? (
        <div className="bg-white border border-slate-200 border-dashed p-12 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
          You have no active claims. Claim an assignment from the Pool first.
        </div>
      ) : submitted ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white border border-slate-200 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-slate-900 mx-auto mb-6" />
          <h2 className="text-xl font-bold mb-2 uppercase tracking-wide">Submission Received</h2>
          <p className="text-slate-500 text-sm mb-8">Your deliverables and communication notes will be reviewed for payment clearance.</p>
          <button 
            onClick={() => setSubmitted(false)}
            className="border border-slate-900 text-slate-900 px-6 py-3 text-[10px] uppercase font-bold tracking-widest hover:bg-slate-50 transition-colors"
          >
            Submit Another
          </button>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="border border-slate-200 bg-white">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-4">
              <label className="block text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                {t("submit.assignment_id")}
              </label>
              <select 
                required
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50 focus:outline-none focus:border-slate-900 transition-colors uppercase"
              >
                <option value="" disabled>Select Assignment</option>
                {claimedJobs.map(job => (
                  <option key={job.id} value={job.id}>{job.id} - {job.title}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col h-full">
                <label className="block text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-4">
                  {t("submit.proof")}
                </label>
                <div className="flex-1 border border-dashed border-slate-300 p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer flex flex-col items-center justify-center">
                  <UploadCloud className="w-6 h-6 text-slate-400 mb-2" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Click to upload files</span>
                </div>
              </div>
              <div className="flex flex-col h-full">
                 <label className="block text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-4">
                  {t("submit.payment")}
                 </label>
                 <textarea 
                   rows={4}
                   placeholder="Enter PayPal or Bank details..."
                   className="flex-1 w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50 focus:outline-none focus:border-slate-900 transition-colors resize-none"
                 />
              </div>
            </div>

            <div>
               <label className="block text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-4">
                {t("submit.notes")}
               </label>
               <textarea 
                 rows={4}
                 placeholder="Attach client communication logs, issues, or details about the work..."
                 className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50 focus:outline-none focus:border-slate-900 transition-colors resize-none"
               />
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <button
                 type="submit"
                 className="w-full bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest py-3 hover:bg-black transition-colors"
               >
                 {t("submit.action")}
               </button>
            </div>
          </form>
        </motion.div>
      )}
    </div>
  );
}
