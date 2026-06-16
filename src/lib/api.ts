// src/lib/api.ts
// Centralized API layer for the Outbound Leads and CRM Management system
// Communicates with either local dev Full-Stack Express proxy or directly to Cloudflare Pages/Workers REST API

export interface Agent {
  email: string;
  name: string;
  whatsapp: string;
  country: string;
  languages: string;
  experience: string;
  isApproved: boolean;
  didPassQuiz: boolean;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  isFrozen?: boolean;
  avatarUrl?: string;
  uploads?: Array<{ name: string; url: string; date: string }>;
}

export interface User {
  email: string;
  name: string;
  isApproved: boolean;
  didPassQuiz: boolean;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  isFrozen?: boolean;
  avatarUrl?: string;
}

export interface ContactPerson {
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface Socials {
  linkedin?: string;
  facebook?: string;
  whatsapp?: string;
  twitter?: string;
}

export interface CustomField {
  id: string;
  title: string;
  value: string;
}

export interface LeadNote {
  id: string;
  author: string;
  text: string;
  date: string;
}

export interface LeadUpload {
  id: string;
  name: string;
  url: string;
  date: string;
  uploadedBy: string;
}

export interface Lead {
  id: string;
  name: string;
  industry: string;
  country: string;
  estValue: number;
  payout: number;
  earningsCurrency: "USD" | "EUR" | "BRL" | "MZN" | "ZAR";
  status: "Available" | "Claimed" | "In Progress" | "Completed" | "Sold";
  claimedBy?: string;
  contactPerson: ContactPerson;
  socials: Socials;
  prototypeUrl: string;
  notes: LeadNote[];
  customFields: CustomField[];
  uploads: LeadUpload[];
  commissionPaid?: boolean;
  commissionPaidDate?: string;
  commissionProofName?: string;
  commissionProofUrl?: string;
  description?: string;
  isFrozen?: boolean;
}

export interface Ticket {
  id: string;
  subject: string;
  message: string;
  author: string;
  createdAt: string;
  status: "Open" | "Closed";
}

export interface ReportSummary {
  availableCount: number;
  claimedCount: number;
  closedCount: number;
  pendingCommissionsUSD: number;
  paidCommissionsUSD: number;
  referralCommissionsUSD: number;
  performanceTrend: Array<{
    period: string;
    cleared: number;
    overall: number;
  }>;
}

const BASE_URL = ""; // Empty string for relative proxying in dev, works natively in cloudflare

export const getToken = () => localStorage.getItem("auth_token");
export const setToken = (token: string) => localStorage.setItem("auth_token", token);
export const clearToken = () => localStorage.removeItem("auth_token");

type OnUnauthorizedCallback = () => void;
let unauthorizedHandler: OnUnauthorizedCallback | null = null;

export const setOnUnauthorized = (callback: OnUnauthorizedCallback) => {
  unauthorizedHandler = callback;
};

// Central fetch handler with error handling, session checks, and automatic retries
async function apiRequest<T>(endpoint: string, options: RequestInit = {}, retries = 2): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const token = getToken();

  const headers: HeadersInit = {
    "Accept": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  // Deduce if body is FormData (e.g., upload endpoint)
  if (options.body && options.body instanceof FormData) {
    // Let container handle standard boundary headers
  } else {
    (headers as any)["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      clearToken();
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
      throw new Error("unauthorized_session_expired");
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status} Error`;
      try {
        const parsed = JSON.parse(errorText);
        errorMessage = parsed.error || parsed.message || errorMessage;
      } catch (e) {}
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return (await response.json()) as T;
    }
    return (await response.text()) as any as T;
  } catch (error: any) {
    if (error.message === "unauthorized_session_expired") {
      throw error;
    }
    
    if (retries > 0) {
      // Wait with escalating delay and try again
      await new Promise((resolve) => setTimeout(resolve, 1000 * (3 - retries)));
      return apiRequest<T>(endpoint, options, retries - 1);
    }
    throw error;
  }
}

export const api = {
  getToken,
  setToken,
  clearToken,
  // Authentication
  auth: {
    login: async (email: string, password?: string) => {
      return apiRequest<{ success: boolean; token: string; user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },
    register: async (data: {
      email: string;
      password?: string;
      name?: string;
      whatsapp?: string;
      country?: string;
      languages?: string;
      experience?: string;
      bypassTraining?: boolean;
    }) => {
      return apiRequest<{ success: boolean; token: string; user: User }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    me: async () => {
      return apiRequest<User>("/api/auth/me", {
        method: "GET",
      });
    },
    getAgents: async () => {
      return apiRequest<Agent[]>("/api/agents");
    },
    updateAgent: async (email: string, profile: Partial<Agent>) => {
      return apiRequest<{ success: boolean }>(`/api/agents/${encodeURIComponent(email)}`, {
        method: "PUT",
        body: JSON.stringify(profile),
      });
    },
    deleteAgent: async (email: string) => {
      return apiRequest<{ success: boolean }>(`/api/agents/${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
    },
  },

  // Leads
  leads: {
    getLeads: async () => {
      return apiRequest<Lead[]>("/api/leads");
    },
    createLead: async (lead: Partial<Lead>) => {
      return apiRequest<{ success: boolean; id: string }>("/api/leads", {
        method: "POST",
        body: JSON.stringify(lead),
      });
    },
    updateLead: async (id: string, data: Partial<Lead> & { newNote?: LeadNote }) => {
      return apiRequest<{ success: boolean }>(`/api/leads/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    deleteLead: async (id: string) => {
      return apiRequest<{ success: boolean; message: string }>(`/api/leads/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  },

  // Tickets (Open issues, system bugs or help requests)
  tickets: {
    getTickets: async () => {
      return apiRequest<Ticket[]>("/api/tickets");
    },
    createTicket: async (ticket: Partial<Ticket>) => {
      return apiRequest<Ticket>("/api/tickets", {
        method: "POST",
        body: JSON.stringify(ticket),
      });
    },
  },

  // Analytics & Aggregated Outbound Reports
  reports: {
    getSummary: async (email?: string) => {
      const qs = email ? `?email=${encodeURIComponent(email)}` : "";
      return apiRequest<ReportSummary>(`/api/reports/summary${qs}`);
    },
  },

  // Cloudflare R2 Uploads File Bridge
  upload: {
    file: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiRequest<{ success: boolean; url: string; name: string }>("/api/upload", {
        method: "POST",
        body: formData,
      });
    },
  },

  // Dynamic Remote Configurations & Training Systems
  config: {
    getQuizHtml: async () => {
      return apiRequest<{ quizHtml: string }>("/api/config/quiz");
    },
    saveQuizHtml: async (quizHtml: string) => {
      return apiRequest<{ success: boolean }>("/api/config/quiz", {
        method: "POST",
        body: JSON.stringify({ quizHtml }),
      });
    },
  },

  training: {
    getResources: async () => {
      return apiRequest<any[]>("/api/training/resources");
    },
    saveResources: async (resources: any[]) => {
      return apiRequest<{ success: boolean }>("/api/training/resources", {
        method: "POST",
        body: JSON.stringify({ resources }),
      });
    },
    getModules: async () => {
      return apiRequest<any[]>("/api/training/modules");
    },
    saveModules: async (modules: any[]) => {
      return apiRequest<{ success: boolean }>("/api/training/modules", {
        method: "POST",
        body: JSON.stringify({ modules }),
      });
    },
  },

  billing: {
    getInvoices: async () => {
      return apiRequest<any[]>("/api/billing");
    },
    syncInvoices: async (invoices: any[]) => {
      return apiRequest<{ success: boolean }>("/api/billing/sync", {
        method: "POST",
        body: JSON.stringify(invoices),
      });
    },
    createInvoice: async (invoice: any) => {
      return apiRequest<any>("/api/billing", {
        method: "POST",
        body: JSON.stringify(invoice),
      });
    },
    saveInvoiceProfile: async (agentEmail: string, profile: any) => {
      return apiRequest<{ success: boolean }>(`/api/billing-profile/${encodeURIComponent(agentEmail)}`, {
        method: "POST",
        body: JSON.stringify(profile),
      });
    },
    getInvoiceProfile: async (agentEmail: string) => {
      return apiRequest<any>(`/api/billing-profile/${encodeURIComponent(agentEmail)}`);
    },
  },
};
