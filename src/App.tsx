/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { Referrals } from "./pages/Referrals";
import { Admin } from "./pages/Admin";
import { ClientPortal } from "./pages/ClientPortal";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AppProviders } from "./store";
import { useAuth } from "./store/AuthContext";
import { useJobs } from "./store/JobsContext";
import { Navbar } from "./components/layout/Navbar";
import { Landing } from "./pages/Landing";
import { Resources } from "./pages/Resources";
import { Auth } from "./pages/Auth";
import { Quiz } from "./pages/Quiz";
import { Dashboard } from "./pages/Dashboard";
import { Jobs } from "./pages/Jobs";
import { TaskDetail } from "./pages/TaskDetail";
import { Submissions } from "./pages/Submissions";
import { AccountsDashboard } from "./pages/AccountsDashboard";
import { motion, AnimatePresence } from "motion/react";
import { Bell } from "lucide-react";

function NotificationsLayer() {
  const { notifications, removeNotification } = useJobs();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
      <AnimatePresence>
        {notifications.map(n => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 20 }}
            className="bg-slate-900 text-white px-4 py-3 shadow-lg flex items-center space-x-3"
          >
            <Bell className="w-5 h-5 text-slate-400" />
            <span className="font-medium text-sm">{n.message}</span>
            <button 
              onClick={() => removeNotification(n.id)}
              className="pl-2 ml-auto text-slate-400 hover:text-white transition-colors text-xl leading-none"
            >
              &times;
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ProtectedRoute({ children, requireApproval = false }: { children: React.ReactNode, requireApproval?: boolean }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (requireApproval && !user.isApproved) return <Navigate to="/quiz" />;
  return <>{children}</>;
}


function InitialRoute() {
  const { user } = useAuth();
  
  useEffect(() => {
     const params = new URLSearchParams(window.location.search);
     const ref = params.get('ref');
     if (ref) {
        localStorage.setItem('referred_by', ref);
        window.history.replaceState({}, '', '/');
     }
  }, []);

  if (user?.isApproved) return <Navigate to="/dashboard" />;
  if (user) return <Navigate to="/quiz" />;
  return <Landing />;
}

export default function App() {
  return (
    <AppProviders>
      <Router>
        <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<InitialRoute />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/register" element={<Auth />} />
              <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
              
              <Route path="/dashboard" element={<ProtectedRoute requireApproval><Dashboard /></ProtectedRoute>} />
              <Route path="/jobs" element={<ProtectedRoute requireApproval><Jobs /></ProtectedRoute>} />
              <Route path="/jobs/:id" element={<ProtectedRoute requireApproval><TaskDetail /></ProtectedRoute>} />
              <Route path="/accounts" element={<ProtectedRoute requireApproval><AccountsDashboard /></ProtectedRoute>} />
              <Route path="/submissions" element={<ProtectedRoute requireApproval><Submissions /></ProtectedRoute>} />
              <Route path="/referrals" element={<ProtectedRoute requireApproval><Referrals /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requireApproval><Admin /></ProtectedRoute>} />
              <Route path="/client-portal" element={<ClientPortal />} />
            </Routes>
          </main>
          <NotificationsLayer />
        </div>
      </Router>
    </AppProviders>
  );
}
