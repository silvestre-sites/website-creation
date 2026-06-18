import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { useI18n } from "../store/I18nContext";
import { api } from "../lib/api";

interface ModuleQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface ModuleConfig {
  id: number;
  title: string;
  duration: string;
  image: string;
  summary: string;
  points: string[];
  pdfUrl?: string;
  pdfName?: string;
  externalLink?: string;
  externalLinkText?: string;
  quizQuestions?: ModuleQuizQuestion[];
}

export function Resources() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [adminResources, setAdminResources] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(1);
  const [modules, setModules] = useState<ModuleConfig[]>([]);

  // Admin Module Form States
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ModuleConfig | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  
  const [modTitle, setModTitle] = useState("");
  const [modDuration, setModDuration] = useState("");
  const [modImage, setModImage] = useState("");
  const [modSummary, setModSummary] = useState("");
  const [modPoints, setModPoints] = useState<string[]>([]);
  const [newModPoint, setNewModPoint] = useState("");
  
  const [modPdfUrl, setModPdfUrl] = useState("");
  const [modPdfName, setModPdfName] = useState("");
  const [modExternalLink, setModExternalLink] = useState("");
  const [modExternalLinkText, setModExternalLinkText] = useState("");
  
  // Custom Quiz Questions state inside editor
  const [modQuizQuestions, setModQuizQuestions] = useState<ModuleQuizQuestion[]>([]);
  const [newQText, setNewQText] = useState("");
  const [newQOpts, setNewQOpts] = useState<string[]>(["", "", ""]);
  const [newQCorrect, setNewQCorrect] = useState(0);

  // Agent Quiz Playing State
  const [activeQuizModuleId, setActiveQuizModuleId] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({}); // questionIndex -> selectedIndex
  const [quizGraded, setQuizGraded] = useState(false);
  const [quizSuccess, setQuizSuccess] = useState(false);

  // Sourced materials publishing
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceLink, setResourceLink] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const resDocs = await api.training.getResources();
      setAdminResources(resDocs || []);
    } catch (e) {
      console.error("Failed to load training resources:", e);
    }

    try {
      const dbMods = await api.training.getModules();
      setModules(dbMods || []);
    } catch (e) {
      console.error("Failed to load training modules:", e);
    } finally {
      setLoading(false);
    }
  };

  // Check if agent passed specific module quiz state
  const isModuleQuizPassed = (modId: number) => {
    return localStorage.getItem(`passed_mod_quiz_${user?.email}_${modId}`) === "true";
  };

  // Pass single module quiz handler
  const setModuleQuizPassed = (modId: number) => {
    localStorage.setItem(`passed_mod_quiz_${user?.email}_${modId}`, "true");
    setActiveQuizModuleId(null);
    setQuizAnswers({});
    setQuizGraded(false);
    loadData();
    alert("Well done! You passed the Module quiz and unlocked certification eligibility.");
  };

  // Grading logic for interactive quizzes
  const handleGradeQuiz = (m: ModuleConfig) => {
    if (!m.quizQuestions) return;
    let correctCount = 0;
    m.quizQuestions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctIndex) {
        correctCount++;
      }
    });

    const isPass = correctCount === m.quizQuestions.length;
    setQuizGraded(true);
    setQuizSuccess(isPass);

    if (isPass) {
      setModuleQuizPassed(m.id);
    }
  };

  // Helper for uploading cover images to R2
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingImage(true);
      try {
        const targetType = selectedModule ? "training_module_image" : undefined;
        const targetId = selectedModule ? String(selectedModule.id) : undefined;
        const res = await api.upload.file(file, targetType, targetId);
        if (res && res.success) {
          setModImage(res.url);
        } else {
          alert("Image upload failed");
        }
      } catch (err: any) {
        alert("Image upload error: " + err.message);
      } finally {
        setUploadingImage(false);
      }
    }
  };

  // Helper for uploading PDFs to R2
  const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingPdf(true);
      try {
        const targetType = selectedModule ? "training_module_pdf" : undefined;
        const targetId = selectedModule ? String(selectedModule.id) : undefined;
        const res = await api.upload.file(file, targetType, targetId);
        if (res && res.success) {
          setModPdfUrl(res.url);
          setModPdfName(res.name);
        } else {
          alert("PDF upload failed");
        }
      } catch (err: any) {
        alert("PDF upload error: " + err.message);
      } finally {
        setUploadingPdf(false);
      }
    }
  };

  // Open & Prepopulate Module Editor
  const handleOpenEditModule = (m: ModuleConfig) => {
    setSelectedModule(m);
    setModTitle(m.title);
    setModDuration(m.duration);
    setModImage(m.image || "");
    setModSummary(m.summary);
    setModPoints([...m.points]);
    setModPdfUrl(m.pdfUrl || "");
    setModPdfName(m.pdfName || "");
    setModExternalLink(m.externalLink || "");
    setModExternalLinkText(m.externalLinkText || "");
    setModQuizQuestions(m.quizQuestions || []);
    
    // reset question scratchpad
    setNewQText("");
    setNewQOpts(["", "", ""]);
    setNewQCorrect(0);

    setShowModuleModal(true);
  };

  // Save changes to local module directory
  const handleSaveModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modTitle.trim()) return;

    let updated = [...modules];
    if (selectedModule) {
      updated = updated.map(m => {
        if (m.id === selectedModule.id) {
          return {
            ...m,
            title: modTitle,
            duration: modDuration || "15 mins",
            image: modImage || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
            summary: modSummary,
            points: modPoints,
            pdfUrl: modPdfUrl,
            pdfName: modPdfName,
            externalLink: modExternalLink,
            externalLinkText: modExternalLinkText,
            quizQuestions: modQuizQuestions
          };
        }
        return m;
      });
    } else {
      const newM: ModuleConfig = {
        id: modules.length > 0 ? Math.max(...modules.map(x => x.id)) + 1 : 1,
        title: modTitle,
        duration: modDuration || "20 mins",
        image: modImage || "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80",
        summary: modSummary,
        points: modPoints,
        pdfUrl: modPdfUrl,
        pdfName: modPdfName,
        externalLink: modExternalLink,
        externalLinkText: modExternalLinkText,
        quizQuestions: modQuizQuestions
      };
      updated.push(newM);
    }

    api.training.saveModules(updated)
      .then(() => {
        setModules(updated);
        setShowModuleModal(false);
        resetModuleForm();
        alert("Academy Hub updated successfully!");
      })
      .catch((err) => alert("Could not save training modules: " + err.message));
  };

  const resetModuleForm = () => {
    setSelectedModule(null);
    setModTitle("");
    setModDuration("");
    setModImage("");
    setModSummary("");
    setModPoints([]);
    setNewModPoint("");
    setModPdfUrl("");
    setModPdfName("");
    setModExternalLink("");
    setModExternalLinkText("");
    setModQuizQuestions([]);
    setNewQText("");
    setNewQOpts(["", "", ""]);
  };

  const handleDeleteModule = (id: number) => {
    if (confirm("Are you sure you want to permanently delete this module and its attachments?")) {
      const updated = modules.filter(m => m.id !== id);
      api.training.saveModules(updated)
        .then(() => setModules(updated))
        .catch((err) => alert("Could not delete module: " + err.message));
    }
  };

  // Extra Sales Resource creation
  const handlePublishResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceTitle.trim() || !resourceLink.trim()) return;

    const updated = [...adminResources, {
      title: resourceTitle,
      url: resourceLink,
      type: resourceLink.toLowerCase().includes(".pdf") ? "pdf" : "link"
    }];

    api.training.saveResources(updated)
      .then(() => {
        setAdminResources(updated);
        setResourceTitle("");
        setResourceLink("");
        setShowResourceForm(false);
        alert("Resource catalog updated!");
      })
      .catch((err) => alert("Could not append resource asset: " + err.message));
  };

  const handleRemoveResource = (idx: number) => {
    if (confirm("Confirm removal of sales playbook resource asset?")) {
      const updated = adminResources.filter((_, i) => i !== idx);
      api.training.saveResources(updated)
        .then(() => setAdminResources(updated))
        .catch((err) => alert("Could not delete resource asset: " + err.message));
    }
  };

  // Custom quiz questions editor actions
  const handleAddQuestionToScratchpad = () => {
    if (!newQText.trim()) return;
    const validatedOpts = newQOpts.filter(o => o.trim() !== "");
    if (validatedOpts.length < 2) {
      alert("Please provide at least 2 non-empty answers options.");
      return;
    }
    const q: ModuleQuizQuestion = {
      question: newQText,
      options: validatedOpts,
      correctIndex: Math.min(newQCorrect, validatedOpts.length - 1)
    };
    setModQuizQuestions([...modQuizQuestions, q]);
    setNewQText("");
    setNewQOpts(["", "", ""]);
    setNewQCorrect(0);
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen pt-16 pb-20 font-sans" id="resources-hub-view">
      
      {/* Premium Hero Section */}
      <div className="relative bg-slate-900 overflow-hidden text-white py-16 md:py-20 px-6 md:px-12 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent)] pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-10">
          
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              AgencyPro Academy
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-normal">
              Master the Craft of Digital Growth
            </h1>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed font-normal">
              Equip yourself with elite business models, refined sales frameworks, and the precise tools needed to convert local SME prototypes into passive income commissions.
            </p>
          </div>
          
          <div className="bg-slate-800/70 border border-slate-700 p-6 rounded-2xl md:w-80 backdrop-blur shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Your Training Progress
              </span>
              {user?.didPassQuiz ? (
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                  Certified
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-bold">
                  Incomplete
                </span>
              )}
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-200">
                <span>Modules Complete</span>
                <span>{user?.didPassQuiz ? "All Passed" : "In Progress"}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: user?.didPassQuiz ? "100%" : "40%" }}
                />
              </div>
            </div>

            {!user?.didPassQuiz && (
              <p className="text-slate-400 text-[11px] leading-relaxed font-normal">
                📢 Before gaining access to the live pipelines and financial invoicing systems, expand your knowledge and complete the module requirements.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Admin Panel Header Overlay inside the Academy view */}
      {user?.isAdmin && (
        <div className="bg-white border-b border-slate-200 py-5 px-6 md:px-12 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <span className="text-xs bg-indigo-600 text-white font-semibold px-2.5 py-1 rounded-lg uppercase tracking-wider">
                Administration Curator Portal
              </span>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-[20px]">architecture</span>
                Academy Training & Resources Builder
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  resetModuleForm();
                  setShowModuleModal(true);
                }}
                className="flex items-center gap-1 px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-sm"
              >
                <span className="material-symbols-outlined text-[15px]">post_add</span>
                Create Course Module
              </button>
              <button 
                onClick={() => setShowResourceForm(true)}
                className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm"
              >
                <span className="material-symbols-outlined text-[15px]">add_circle</span>
                Add PDF/Web Resource
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main curriculum workspace */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Main Course Modules List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600">school</span>
                Core Curriculum Modules
              </h2>
              <span className="text-xs text-slate-500 font-medium">{modules.length} modules loaded</span>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="p-12 text-center text-slate-400 space-y-2 bg-white border border-slate-200 rounded-2xl">
                  <span className="animate-spin text-[32px] text-teal-600 material-symbols-outlined block">sync</span>
                  <p className="text-sm font-semibold">Loading data...</p>
                </div>
              ) : modules.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2 bg-white border border-slate-200 rounded-2xl">
                  <span className="material-symbols-outlined text-[48px] text-slate-300">school</span>
                  <p className="text-sm font-semibold">No training modules available.</p>
                </div>
              ) : (
                modules.map((m) => {
                const isExpanded = expandedId === m.id;
                const isPassed = isModuleQuizPassed(m.id);
                
                return (
                  <div 
                    key={m.id} 
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                    id={`module-curriculum-${m.id}`}
                  >
                    <div 
                      onClick={() => setExpandedId(isExpanded ? null : m.id)}
                      className="p-5 flex items-center gap-5 cursor-pointer select-none group"
                    >
                      <div className="hidden sm:block w-22 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                        <img 
                          src={m.image} 
                          alt={m.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">Module {m.id}</span>
                          <span className="text-xs text-slate-500">• {m.duration}</span>
                          {isPassed && (
                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200">
                              Passed
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
                          {m.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {user?.isAdmin && (
                          <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg text-xs" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => handleOpenEditModule(m)}
                              className="px-2.5 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteModule(m.id)}
                              className="px-2.5 py-1 text-[10px] font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                        <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-600 transition-colors">
                          {isExpanded ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-6 pb-6 pt-3 border-t border-slate-100 bg-slate-50/50 space-y-5 animate-fadeIn font-sans">
                        <p className="text-slate-600 text-sm leading-relaxed font-normal">
                          {m.summary}
                        </p>
                        
                        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3.5 shadow-inner">
                          <h4 className="text-sm font-semibold text-slate-700">Course Syllabus Objectives:</h4>
                          <ul className="space-y-3">
                            {m.points.map((pt, index) => (
                              <li key={index} className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed font-semibold">
                                <span className="material-symbols-outlined text-[16px] text-emerald-500 mt-0.5 flex-shrink-0">check_circle</span>
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Interactive custom files and link widgets direct (REQ CHECK!) */}
                        {(m.pdfUrl || m.externalLink) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {m.pdfUrl && (
                              <a 
                                href={m.pdfUrl} 
                                download={m.pdfName || `module_${m.id}_handbook.pdf`}
                                className="flex items-center gap-3.5 p-4 bg-white border border-slate-200 rounded-xl hover:border-teal-500/50 shadow-sm transition-all group"
                              >
                                <div className="p-2.5 rounded-lg bg-red-50 text-red-600 font-bold">
                                  <span className="material-symbols-outlined text-[20px] flex">picture_as_pdf</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-red-500 font-semibold uppercase tracking-wider">PDF Handbook Document</p>
                                  <h4 className="text-xs font-bold text-slate-800 truncate" title={m.pdfName}>{m.pdfName || "Study Material PDF"}</h4>
                                </div>
                                <span className="material-symbols-outlined text-slate-300 group-hover:text-slate-600 text-[16px] transition-colors">download</span>
                              </a>
                            )}

                            {m.externalLink && (
                              <a 
                                href={m.externalLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-3.5 p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-500/50 shadow-sm transition-all group"
                              >
                                <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 font-bold">
                                  <span className="material-symbols-outlined text-[20px] flex">link</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider">External Web Reference</p>
                                  <h4 className="text-xs font-bold text-slate-800 truncate">{m.externalLinkText || "Visit Resource Link"}</h4>
                                </div>
                                <span className="material-symbols-outlined text-slate-300 group-hover:text-slate-600 text-[16px] transition-colors">open_in_new</span>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Interactive custom assessment quiz block (REQ CHECK!) */}
                        {m.quizQuestions && m.quizQuestions.length > 0 && (
                          <div className="border border-slate-200 rounded-2xl bg-white p-5 space-y-4 shadow-sm font-sans">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-teal-600 text-[18px]">quiz</span>
                                Module {m.id} Evaluation Quiz
                              </h4>
                              {isPassed ? (
                                <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-xl border border-emerald-200">
                                  Verified Credentials
                                </span>
                              ) : (
                                <span className="text-xs bg-slate-150 text-slate-600 font-semibold px-2.5 py-1 rounded-xl">
                                  Incomplete Requirement
                                </span>
                              )}
                            </div>

                            {activeQuizModuleId !== m.id ? (
                              <div className="flex items-center justify-between flex-wrap gap-4 bg-slate-50/50 p-4 rounded-xl">
                                <div className="space-y-0.5">
                                  <p className="text-xs font-bold text-slate-700">Test Your Framework Mastery</p>
                                  <p className="text-[11px] text-slate-500">{m.quizQuestions.length} Multiple choice questions. Required: 100% Correct.</p>
                                </div>
                                <button 
                                  onClick={() => {
                                    setActiveQuizModuleId(m.id);
                                    setQuizAnswers({});
                                    setQuizGraded(false);
                                  }}
                                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
                                >
                                  {isPassed ? "Re-take Quiz" : "Start Module Quiz"}
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-5">
                                {m.quizQuestions.map((q, qIdx) => (
                                  <div key={qIdx} className="space-y-2.5">
                                    <p className="text-xs font-bold text-slate-800 font-sans leading-relaxed">
                                      {qIdx + 1}. {q.question}
                                    </p>
                                    <div className="grid grid-cols-1 gap-2">
                                      {q.options.map((opt, oIdx) => {
                                        const isSelected = quizAnswers[qIdx] === oIdx;
                                        return (
                                          <button
                                            type="button"
                                            key={oIdx}
                                            disabled={quizGraded && isPassed}
                                            onClick={() => setQuizAnswers({ ...quizAnswers, [qIdx]: oIdx })}
                                            className={`text-left p-3 border rounded-xl text-xs font-medium transition duration-200 select-none ${
                                              isSelected 
                                                ? "bg-slate-950 border-slate-950 text-white shadow-sm font-bold" 
                                                : "bg-[#FAFAFA] border-slate-200 hover:bg-slate-100 text-slate-700"
                                            }`}
                                          >
                                            {opt}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}

                                {quizGraded && (
                                  <div className={`p-4 rounded-xl font-semibold border ${
                                    quizSuccess 
                                      ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                                      : "bg-red-50 border-red-200 text-red-800"
                                  }`}>
                                    {quizSuccess 
                                      ? "🎉 Perfect score! You passed evaluation metrics and updated your profile credentials." 
                                      : "❌ Answer parameters incorrect. Please review curriculum elements and take unlimited retries."
                                    }
                                  </div>
                                )}

                                <div className="flex justify-end gap-2 text-xs font-bold pt-2">
                                  <button 
                                    type="button" 
                                    onClick={() => { setActiveQuizModuleId(null); setQuizGraded(false); }}
                                    className="px-3.5 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => handleGradeQuiz(m)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                                  >
                                    Submit and Grade
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
                })
              )}
            </div>

            {/* Sourced Template materials catalog */}
            {adminResources.length > 0 && (
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600">folder_open</span>
                    Additional Study Materials & Templates
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {adminResources.map((res, i) => (
                    <div 
                      key={i} 
                      className="flex items-center gap-3.5 p-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50/50 shadow-sm transition-all group relative"
                    >
                      <a 
                        href={res.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center gap-3.5 min-w-0"
                      >
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 font-bold group-hover:bg-emerald-100 transition-colors">
                          <span className="material-symbols-outlined text-[20px] flex">
                            {res.type === 'pdf' ? 'picture_as_pdf' : 'link'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-widest">{res.type === 'pdf' ? 'PDF Document' : 'External Website Link'}</p>
                          <h4 className="text-xs font-semibold text-slate-800 truncate" title={res.title}>{res.title}</h4>
                        </div>
                      </a>
                      
                      <div className="flex items-center gap-2">
                        <a 
                          href={res.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="material-symbols-outlined text-slate-300 group-hover:text-slate-600 text-[18px] transition-colors"
                        >
                          open_in_new
                        </a>
                        
                        {user?.isAdmin && (
                          <button 
                            type="button"
                            onClick={() => handleRemoveResource(i)}
                            className="text-red-500 hover:text-red-700 font-bold text-lg p-1"
                            title="Remove resource"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Assessment static certification tracker side element */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">Ecosystem Certification</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  Before launching live outbound pipeline campaigns, agents can review standard curriculum milestones and pass evaluations.
                </p>
              </div>

              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3.5 text-xs text-slate-600">
                <div className="flex items-center gap-2 font-medium">
                  <span className="material-symbols-outlined text-teal-600 text-[16px]">quiz</span>
                  <span><strong>Assessments:</strong> In-Module Questionnaires</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <span className="material-symbols-outlined text-teal-600 text-[16px]">grade</span>
                  <span><strong>Req Threshold:</strong> 100% Score to pass</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <span className="material-symbols-outlined text-teal-600 text-[16px]">autorenew</span>
                  <span><strong>Attempts:</strong> Unlimited Retakes</span>
                </div>
              </div>

              {user?.didPassQuiz ? (
                <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-5 text-center space-y-3">
                  <span className="material-symbols-outlined text-[36px] text-emerald-600">verified</span>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800">You Are Certified!</h4>
                    <p className="text-[11px] text-slate-500 font-normal">Your profile is approved for full market lead allocations and payment receipts on commission conversion.</p>
                  </div>
                  <Link 
                    to="/jobs" 
                    className="block w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold text-center transition-all shadow-sm"
                  >
                    Browse Opportunities
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <button 
                    onClick={() => navigate('/quiz')} 
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow hover:shadow-md transition-all"
                  >
                    Take General Entrance Quiz
                  </button>
                  <p className="text-[10px] text-center text-slate-400 font-normal">
                    Or select individual modules below to trigger localized answers.
                  </p>
                </div>
              )}
            </div>

            {/* Sales Playbook helper cards */}
            <div className="bg-slate-900 text-slate-400 border border-slate-800 rounded-2xl shadow-sm p-6 space-y-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(52,211,153,0.06),transparent)] pointer-events-none" />
              <div className="space-y-2">
                <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase">Strategic Masterclass Advice</span>
                <h4 className="text-white text-xs font-bold leading-snug">Avoid high pressure hard-selling. Let the prototype website do the heavy-lifting.</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                  Instead of asking "Would you like to buy a $2000 website?", pitch: "I built an active customized demonstration showing how your store would capture orders. You can test it out for free at this link."
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* OVERLAY MODAL: CREATE / EDIT CURRICULUM MODULE */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <form onSubmit={handleSaveModule} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8 max-h-[92vh] overflow-y-auto space-y-5 text-sm font-medium font-sans text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-150 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-2xl">edit_note</span>
                {selectedModule ? "Edit Curriculum Module" : "Deploy New Academy Module"}
              </h3>
              <button type="button" onClick={() => setShowModuleModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-2xl leading-none">&times;</button>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2 space-y-1">
                <label className="block text-sm font-semibold text-slate-700">Module Course Title *</label>
                <input 
                  type="text" 
                  value={modTitle} 
                  onChange={(e) => setModTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. Closing Enterprise SME Accounts"
                  required
                />
              </div>

              <div className="space-y-1 col-span-1">
                <label className="block text-sm font-semibold text-slate-700">Instructional Duration</label>
                <input 
                  type="text" 
                  value={modDuration} 
                  onChange={(e) => setModDuration(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal focus:border-indigo-500"
                  placeholder="e.g. 25 mins"
                />
              </div>

              <div className="space-y-1 col-span-1">
                <label className="block text-sm font-semibold text-slate-700">Cover Image URL / Upload</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={modImage} 
                    onChange={(e) => setModImage(e.target.value)}
                    className="flex-1 p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal"
                    placeholder="https://images.unsplash.com/photo-..."
                  />
                  <label className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl cursor-pointer text-sm block font-semibold text-slate-750 shrink-0">
                    {uploadingImage ? "Uploading..." : "Upload File"}
                    <input type="file" accept="image/*" onChange={handleImageFileChange} disabled={uploadingImage} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="col-span-2 space-y-1">
                <label className="block text-sm font-semibold text-slate-700">Curriculum Syllabus Summary *</label>
                <textarea 
                  value={modSummary} 
                  onChange={(e) => setModSummary(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl outline-none font-normal text-sm"
                  placeholder="Provide a high-level syllabus summary of what agents will learn..."
                  rows={3}
                  required
                />
              </div>

              {/* Syllabus topics list */}
              <div className="col-span-2 space-y-2 border-t border-slate-200 pt-4">
                <label className="block text-sm font-semibold text-indigo-700">Syllabus Topics Checkmarks ({modPoints.length})</label>
                {modPoints.length > 0 && (
                  <div className="space-y-2 bg-slate-50 border border-slate-200 p-4 rounded-xl max-h-36 overflow-y-auto">
                    {modPoints.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm">
                        <span className="truncate max-w-[450px] text-slate-700 font-normal">{p}</span>
                        <button 
                          type="button" 
                          onClick={() => setModPoints(modPoints.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 font-bold ml-2 text-base"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="e.g. Discovering Google Maps targets lacking domains" 
                    value={newModPoint}
                    onChange={(e) => setNewModPoint(e.target.value)}
                    className="flex-1 p-2.5 bg-white border border-slate-300 rounded-xl outline-none text-sm font-normal"
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      if (newModPoint.trim()) {
                        setModPoints([...modPoints, newModPoint.trim()]);
                        setNewModPoint("");
                      }
                    }}
                    className="px-5 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold hover:bg-indigo-100 rounded-xl transition shrink-0"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* PDF and External Link Config Fields */}
              <div className="col-span-2 md:col-span-1 space-y-1 border-t border-slate-200 pt-4">
                <span className="block text-sm font-semibold text-slate-700">Attachment: PDF Handbook document</span>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={modPdfUrl} 
                    onChange={(e) => setModPdfUrl(e.target.value)}
                    className="flex-1 p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal truncate"
                    placeholder="PDF Document Web URL / Link"
                  />
                  <label className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl cursor-pointer text-sm block font-semibold text-slate-750 shrink-0">
                    {uploadingPdf ? "Uploading..." : "Upload"}
                    <input type="file" accept="application/pdf" onChange={handlePdfFileChange} disabled={uploadingPdf} className="hidden" />
                  </label>
                </div>
                {modPdfName && <p className="text-xs text-emerald-600 font-medium">Selected: {modPdfName}</p>}
              </div>

              <div className="col-span-2 md:col-span-1 space-y-1 border-t border-slate-200 pt-4">
                <span className="block text-sm font-semibold text-slate-700">Attachment: External Resource Link</span>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    value={modExternalLink} 
                    onChange={(e) => setModExternalLink(e.target.value)}
                    className="p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal"
                    placeholder="Link URL"
                  />
                  <input 
                    type="text" 
                    value={modExternalLinkText} 
                    onChange={(e) => setModExternalLinkText(e.target.value)}
                    className="p-2.5 border border-slate-300 rounded-xl outline-none text-sm font-normal"
                    placeholder="Link Display Text"
                  />
                </div>
              </div>

              {/* Assessment Quiz question builder */}
              <div className="col-span-2 space-y-4 border-t border-slate-200 pt-4">
                <h4 className="text-base font-bold text-indigo-700">Embedded Quiz Generator ({modQuizQuestions.length} Questions)</h4>
                
                {modQuizQuestions.length > 0 && (
                  <div className="space-y-2 bg-slate-50 border border-slate-200 p-4 rounded-xl max-h-40 overflow-y-auto">
                    {modQuizQuestions.map((q, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-start text-sm">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-800">Question {idx + 1}: {q.question}</p>
                          <p className="text-xs text-slate-500">Options: {q.options.join(" | ")} • <strong className="text-emerald-700">Correct option index: {q.correctIndex + 1}</strong></p>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setModQuizQuestions(modQuizQuestions.filter((_, i) => i !== idx))}
                          className="text-red-500 font-bold hover:text-red-700 text-lg ml-2"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 text-sm">
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-slate-700">New Question Title</label>
                    <input 
                      type="text" 
                      value={newQText} 
                      onChange={(e) => setNewQText(e.target.value)}
                      placeholder="e.g. Which of the following matches warm-prospecting requirements?"
                      className="w-full p-2.5 bg-white border border-slate-350 rounded-xl outline-none text-sm font-normal focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {newQOpts.map((opt, oIdx) => (
                      <div key={oIdx} className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-500">Option {oIdx + 1}</label>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updated = [...newQOpts];
                            updated[oIdx] = e.target.value;
                            setNewQOpts(updated);
                          }}
                          placeholder={`Option ${oIdx + 1}`}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none text-sm font-normal"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <label className="block text-sm font-semibold text-slate-700">Correct Option Index:</label>
                      <select
                        value={newQCorrect}
                        onChange={(e) => setNewQCorrect(parseInt(e.target.value))}
                        className="p-2 border border-slate-350 rounded-lg text-sm bg-white font-bold"
                      >
                        <option value="0">Option 1</option>
                        <option value="1">Option 2</option>
                        <option value="2">Option 3</option>
                      </select>
                    </div>

                    <button 
                      type="button" 
                      onClick={handleAddQuestionToScratchpad}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm shadow-sm transition"
                    >
                      + Save Question to Module
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-200 flex justify-end gap-3 font-semibold text-sm">
              <button 
                type="button" 
                onClick={() => { setShowModuleModal(false); resetModuleForm(); }} 
                className="px-5 py-2.5 bg-slate-100 text-slate-650 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition">
                {selectedModule ? "Save Module Changes" : "Deploy Active Module"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* OVERLAY MODAL: ADD EXTRA PLAYBOOK REFERENCE ASSET */}
      {showResourceForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <form onSubmit={handlePublishResource} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 text-sm font-medium text-slate-800 font-sans">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-xl">post_add</span>
                Publish Sourced Resource Handout
              </h3>
              <button type="button" onClick={() => setShowResourceForm(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none">&times;</button>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-slate-700">Resource Document Title *</label>
              <input 
                type="text" 
                required
                value={resourceTitle} 
                onChange={(e) => setResourceTitle(e.target.value)}
                className="w-full p-2.5 border border-slate-350 rounded-xl outline-none text-sm font-normal focus:border-emerald-500"
                placeholder="e.g. Elite Objections Handling Workbook"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-slate-700">Resource Document URL / Link *</label>
              <input 
                type="text" 
                required
                value={resourceLink}
                onChange={(e) => setResourceLink(e.target.value)}
                className="w-full p-2.5 border border-slate-350 rounded-xl outline-none text-sm font-normal focus:border-emerald-500"
                placeholder="https://drive.google.com/.../handout.pdf"
              />
            </div>

            <div className="pt-4 border-t border-slate-250 flex justify-end gap-3 text-sm font-semibold">
              <button type="button" onClick={() => setShowResourceForm(false)} className="px-4 py-2 bg-slate-100 text-slate-650 hover:bg-slate-200 rounded-lg">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm">Publish Resource</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
