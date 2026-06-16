import React, { createContext, useContext, useState, useEffect } from "react";
import { api, Lead, LeadNote, LeadUpload, CustomField } from "../lib/api";
import { useAuth } from "./AuthContext";

export type { Lead, LeadNote, LeadUpload, CustomField };

interface Notification {
  id: string;
  message: string;
}

interface JobsContextType {
  leads: Lead[];
  notifications: Notification[];
  loadingLeads: boolean;
  refreshLeads: () => Promise<void>;
  addLead: (lead: Partial<Lead>) => Promise<void>;
  updateLead: (id: string, updated: Partial<Lead>) => Promise<void>;
  claimLead: (id: string, agentEmail: string) => Promise<void>;
  unclaimLead: (id: string) => Promise<void>;
  reassignLead: (id: string, agentEmail: string) => Promise<void>;
  addLeadNote: (leadId: string, text: string, author: string) => Promise<void>;
  addLeadCustomField: (leadId: string, title: string, value: string) => Promise<void>;
  uploadLeadFile: (leadId: string, fileName: string, fileUrl: string, uploadedBy: string) => Promise<void>;
  issueCommissionPayment: (leadId: string, proofName: string, proofUrl: string) => Promise<void>;
  removeNotification: (id: string) => void;
  deleteLead: (id: string) => Promise<void>;
  
  // Multi-currency conversion helpers
  convertPrice: (amountInUSD: number, targetCurrency?: string) => { symbol: string; value: number; formatted: string };
  globalCurrency: "USD" | "EUR" | "BRL" | "MZN" | "ZAR";
  setGlobalCurrency: (curr: "USD" | "EUR" | "BRL" | "MZN" | "ZAR") => void;
}

const JobsContext = createContext<JobsContextType | undefined>(undefined);

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // User-chosen currency preference (baseline master currency default USD)
  const [globalCurrency, setGlobalCurrency] = useState<"USD" | "EUR" | "BRL" | "MZN" | "ZAR">(() => {
    return (localStorage.getItem("global_currency") as any) || "USD";
  });

  useEffect(() => {
    localStorage.setItem("global_currency", globalCurrency);
  }, [globalCurrency]);

  const refreshLeads = async () => {
    try {
      const data = await api.leads.getLeads();
      setLeads(data);
    } catch (e) {
      console.error("Failed to fetch leads from CRM backend:", e);
    } finally {
      setLoadingLeads(false);
    }
  };

  // On App login state change trigger a reload of CRM pipeline
  useEffect(() => {
    refreshLeads();
  }, [user]);

  const addLead = async (lead: Partial<Lead>) => {
    const res = await api.leads.createLead(lead);
    if (res.success) {
      setNotifications(prev => [
        { id: "notif-" + Date.now(), message: `New lead created: ${lead.name || "Unnamed Prospect"}` },
        ...prev
      ]);
      await refreshLeads();
    }
  };

  const updateLead = async (id: string, updated: Partial<Lead>) => {
    const res = await api.leads.updateLead(id, updated);
    if (res.success) {
      await refreshLeads();
    }
  };

  const deleteLead = async (id: string) => {
    const res = await api.leads.deleteLead(id);
    if (res.success) {
      setNotifications(prev => [
        { id: "notif-" + Date.now(), message: `Lead ${id} permanently deleted from CRM.` },
        ...prev
      ]);
      await refreshLeads();
    }
  };

  const claimLead = async (id: string, agentEmail: string) => {
    await api.leads.updateLead(id, {
      status: "Claimed",
      claimedBy: agentEmail,
      newNote: {
        id: "note-" + Date.now(),
        author: "Platform System",
        text: `Opportunity claimed by agent (${agentEmail})`,
        date: new Date().toISOString().slice(0, 10)
      }
    });
    setNotifications(prev => [
      { id: "notif-" + Date.now(), message: `Successfully claimed lead target ${id}!` },
      ...prev
    ]);
    await refreshLeads();
  };

  const unclaimLead = async (id: string) => {
    await api.leads.updateLead(id, {
      status: "Available",
      claimedBy: "",
      newNote: {
        id: "note-" + Date.now(),
        author: "Platform System",
        text: "Opportunity released back to the general Marketplace.",
        date: new Date().toISOString().slice(0, 10)
      }
    });
    setNotifications(prev => [
      { id: "notif-" + Date.now(), message: `Released lead ${id} pipeline claim` },
      ...prev
    ]);
    await refreshLeads();
  };

  const reassignLead = async (id: string, agentEmail: string) => {
    const isSelfunclaim = !agentEmail;
    await api.leads.updateLead(id, {
      status: isSelfunclaim ? "Available" : "Claimed",
      claimedBy: isSelfunclaim ? "" : agentEmail,
      newNote: {
        id: "note-" + Date.now(),
        author: "Platform System",
        text: isSelfunclaim ? "Lead claim cancelled by administrator" : `Lead reassigned by administrator to ${agentEmail}`,
        date: new Date().toISOString().slice(0, 10)
      }
    });
    await refreshLeads();
  };

  const addLeadNote = async (leadId: string, text: string, author: string) => {
    await api.leads.updateLead(leadId, {
      newNote: {
        id: "note-" + Date.now(),
        author,
        text,
        date: new Date().toISOString().slice(0, 10)
      }
    });
    await refreshLeads();
  };

  const addLeadCustomField = async (leadId: string, title: string, value: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      const updatedFields = [...(lead.customFields || []), { id: "cf-" + Date.now(), title, value }];
      await api.leads.updateLead(leadId, { customFields: updatedFields });
      await refreshLeads();
    }
  };

  const uploadLeadFile = async (leadId: string, fileName: string, fileUrl: string, uploadedBy: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      const updatedUploads = [...(lead.uploads || []), { id: "upl-" + Date.now(), name: fileName, url: fileUrl, date: new Date().toISOString().slice(0, 10), uploadedBy }];
      await api.leads.updateLead(leadId, {
        uploads: updatedUploads,
        newNote: {
          id: "note-" + Date.now(),
          author: uploadedBy,
          text: `Uploaded Deliverable: ${fileName}`,
          date: new Date().toISOString().slice(0, 10)
        }
      });
      await refreshLeads();
    }
  };

  const issueCommissionPayment = async (leadId: string, proofName: string, proofUrl: string) => {
    await api.leads.updateLead(leadId, {
      commissionPaid: true,
      commissionPaidDate: new Date().toISOString().slice(0, 10),
      commissionProofName: proofName,
      commissionProofUrl: proofUrl,
      status: "Sold",
      newNote: {
        id: "note-" + Date.now(),
        author: "Platform System",
        text: `Commission Paid successfully. Proof of Payment uploaded: ${proofName}`,
        date: new Date().toISOString().slice(0, 10)
      }
    });
    setNotifications(prev => [
      { id: "notif-" + Date.now(), message: `Commission paid out for lead ${leadId}` },
      ...prev
    ]);
    await refreshLeads();
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const convertPrice = (amountInUSD: number, targetCurrency?: string) => {
    const finalCurrency = globalCurrency;
    const rates: Record<string, { symbol: string; rate: number; isSuffix?: boolean }> = {
      USD: { symbol: "$", rate: 1.0 },
      EUR: { symbol: "€", rate: 0.92 },
      BRL: { symbol: "R$", rate: 5.15 },
      MZN: { symbol: " MT", rate: 63.80, isSuffix: true },
      ZAR: { symbol: "R", rate: 18.50 }
    };

    const currencyConfig = rates[finalCurrency] || rates.USD;
    const value = Math.round(amountInUSD * currencyConfig.rate);
    const formatted = currencyConfig.isSuffix 
      ? `${value.toLocaleString()}${currencyConfig.symbol}`
      : `${currencyConfig.symbol}${value.toLocaleString()}`;

    return {
      symbol: currencyConfig.isSuffix ? " MT" : currencyConfig.symbol,
      value,
      formatted
    };
  };

  return (
    <JobsContext.Provider value={{
      leads,
      notifications,
      loadingLeads,
      refreshLeads,
      addLead,
      updateLead,
      claimLead,
      unclaimLead,
      reassignLead,
      addLeadNote,
      addLeadCustomField,
      uploadLeadFile,
      issueCommissionPayment,
      removeNotification,
      convertPrice,
      globalCurrency,
      setGlobalCurrency,
      deleteLead
    }}>
      {children}
    </JobsContext.Provider>
  );
}

export function useJobs() {
  const context = useContext(JobsContext);
  if (!context) throw new Error("useJobs must be used within JobsProvider");
  return context;
}
