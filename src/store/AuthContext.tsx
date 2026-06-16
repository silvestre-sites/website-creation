import React, { createContext, useContext, useState, useEffect } from "react";
import { api, User, Agent, setOnUnauthorized } from "../lib/api";

export type { User, Agent };

interface AuthContextType {
  user: User | null;
  agents: Agent[];
  impersonatingFrom: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password?: string,
    name?: string,
    bypassTraining?: boolean,
    whatsapp?: string,
    country?: string,
    languages?: string,
    experience?: string
  ) => Promise<void>;
  logout: () => void;
  passQuiz: () => Promise<void>;
  approveUser: () => Promise<void>;
  updateAvatar: (url: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  
  // Admin functions
  updateAgentProfile: (email: string, data: Partial<Agent>) => Promise<void>;
  freezeAgentAccount: (email: string, freeze: boolean) => Promise<void>;
  deleteAgentAccount: (email: string) => Promise<void>;
  toggleAdminRights: (email: string, enableAdmin: boolean) => Promise<void>;
  impersonateAgent: (email: string) => void;
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [impersonatingFrom, setImpersonatingFrom] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Synchronous callback for token expirations
  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
      setImpersonatingFrom(null);
    });
  }, []);

  // Fetch logged in profile from session token on startup
  const refreshUser = async () => {
    const token = api.getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const u = await api.auth.me();
      setUser(u);
    } catch (e) {
      console.warn("Session retrieval failed:", e);
      api.clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  // Admin capability: Fetch all registered agents if current user is admin
  const loadAgents = async () => {
    if (!user?.isAdmin) return;
    try {
      const data = await api.auth.getAgents();
      setAgents(data);
    } catch (err) {
      console.error("Failed to query agents list from backend:", err);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) {
      loadAgents();
    } else {
      setAgents([]);
    }
  }, [user]);

  const login = async (email: string, password?: string) => {
    try {
      const res = await api.auth.login(email, password);
      if (res.success && res.token) {
        api.setToken(res.token);
        setUser(res.user);
        return { success: true };
      }
      return { success: false, error: "Authentication failed" };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to log in" };
    }
  };

  const register = async (
    email: string,
    password?: string,
    name?: string,
    bypassTraining?: boolean,
    whatsapp?: string,
    country?: string,
    languages?: string,
    experience?: string
  ) => {
    const res = await api.auth.register({
      email,
      password,
      name,
      bypassTraining,
      whatsapp,
      country,
      languages,
      experience
    });
    if (res.success && res.token) {
      api.setToken(res.token);
      setUser(res.user);
    }
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
    setImpersonatingFrom(null);
  };

  const passQuiz = async () => {
    if (user) {
      await api.auth.updateAgent(user.email, { didPassQuiz: true });
      setUser(prev => prev ? { ...prev, didPassQuiz: true } : null);
      await loadAgents();
    }
  };

  const approveUser = async () => {
    if (user) {
      await api.auth.updateAgent(user.email, { isApproved: true });
      setUser(prev => prev ? { ...prev, isApproved: true } : null);
      await loadAgents();
    }
  };

  const updateAvatar = async (url: string) => {
    if (user) {
      await api.auth.updateAgent(user.email, { avatarUrl: url });
      setUser(prev => prev ? { ...prev, avatarUrl: url } : null);
      await loadAgents();
    }
  };

  // Admin capabilities
  const updateAgentProfile = async (email: string, data: Partial<Agent>) => {
    await api.auth.updateAgent(email, data);
    await loadAgents();
    if (user && user.email.toLowerCase() === email.toLowerCase()) {
      setUser(prev => prev ? {
        ...prev,
        name: data.name ?? prev.name,
        isApproved: data.isApproved ?? prev.isApproved,
        didPassQuiz: data.didPassQuiz ?? prev.didPassQuiz,
        isAdmin: data.isAdmin ?? prev.isAdmin,
        avatarUrl: data.avatarUrl ?? prev.avatarUrl
      } : null);
    }
  };

  const freezeAgentAccount = async (email: string, freeze: boolean) => {
    await api.auth.updateAgent(email, { isFrozen: freeze });
    await loadAgents();
    if (freeze && user && user.email.toLowerCase() === email.toLowerCase()) {
      logout();
    }
  };

  const deleteAgentAccount = async (email: string) => {
    await api.auth.deleteAgent(email);
    await loadAgents();
    if (user && user.email.toLowerCase() === email.toLowerCase()) {
      logout();
    }
  };

  const toggleAdminRights = async (email: string, enableAdmin: boolean) => {
    await api.auth.updateAgent(email, { isAdmin: enableAdmin });
    await loadAgents();
    if (user && user.email.toLowerCase() === email.toLowerCase()) {
      setUser(prev => prev ? { ...prev, isAdmin: enableAdmin } : null);
    }
  };

  const impersonateAgent = (email: string) => {
    const target = agents.find(a => a.email.toLowerCase() === email.toLowerCase());
    if (!target) return;

    if (!impersonatingFrom && user) {
      setImpersonatingFrom(user);
    }

    setUser({
      email: target.email,
      name: target.name,
      isApproved: target.isApproved,
      didPassQuiz: target.didPassQuiz,
      isAdmin: target.isAdmin,
      isSuperAdmin: target.isSuperAdmin,
      isFrozen: target.isFrozen,
      avatarUrl: target.avatarUrl
    });
  };

  const stopImpersonation = () => {
    if (impersonatingFrom) {
      setUser(impersonatingFrom);
      setImpersonatingFrom(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      agents,
      impersonatingFrom,
      loading,
      login,
      register,
      logout,
      passQuiz,
      approveUser,
      updateAvatar,
      refreshUser,
      updateAgentProfile,
      freezeAgentAccount,
      deleteAgentAccount,
      toggleAdminRights,
      impersonateAgent,
      stopImpersonation
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
