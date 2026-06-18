import React, { useState, useEffect } from "react";
import { useAuth } from "../store/AuthContext";
import { useJobs } from "../store/JobsContext";
import { jsPDF } from "jspdf";
import { api } from "../lib/api";

export interface BillingDocItem {
  description: string;
  quantity: number;
  price: number;
}

export interface BillingDoc {
  id: string;
  type: "Invoice" | "Quote" | "Receipt";
  docNumber: string;
  clientId: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  currency: "USD" | "EUR" | "BRL" | "MZN" | "ZAR";
  items: BillingDocItem[];
  subtotal: number;
  taxRate: number; // percentage
  total: number;
  notes: string;
  status: "Draft" | "Sent" | "Paid" | "Cancelled";
  issuerEmail: string;
}

export function AccountsDashboard() {
  const { user } = useAuth();
  const { leads, convertPrice } = useJobs();

  const [docs, setDocs] = useState<BillingDoc[]>([]);

  const [activeTab, setActiveTab] = useState<"All" | "Invoice" | "Quote" | "Receipt" | "Billing">("All");
  const [selectedDoc, setSelectedDoc] = useState<BillingDoc | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [docType, setDocType] = useState<"Invoice" | "Quote" | "Receipt">("Invoice");
  const [docNumber, setDocNumber] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [clientName, setClientName] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [docCurrency, setDocCurrency] = useState<"USD" | "EUR" | "BRL" | "MZN" | "ZAR">("USD");
  const [formItems, setFormItems] = useState<BillingDocItem[]>([
    { description: "AgencyPro Professional SEO Website Prototype Launch", quantity: 1, price: 1500 }
  ]);
  const [taxRate, setTaxRate] = useState(0);
  const [docNotes, setDocNotes] = useState("Thank you for choosing AgencyPro!");
  const [docStatus, setDocStatus] = useState<"Draft" | "Sent" | "Paid" | "Cancelled">("Draft");

  // Agent profiles listing for admin selections
  const [allAgents, setAllAgents] = useState<any[]>([]);
  const [billingTargetEmail, setBillingTargetEmail] = useState("");

  // Billing Profile States
  const [profileName, setProfileName] = useState("");
  const [profileCompany, setProfileCompany] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [profileTaxId, setProfileTaxId] = useState("");
  const [profileBankIban, setProfileBankIban] = useState("");
  const [profileBankSwift, setProfileBankSwift] = useState("");

  // Load docs from remote DB
  useEffect(() => {
    api.billing.getInvoices()
      .then(res => {
        if (res) setDocs(res);
      })
      .catch(err => console.error("Could not fetch invoices ledger:", err));
  }, []);

  // Load all agents registered for dropdown edit in admin mode
  useEffect(() => {
    api.auth.getAgents()
      .then(res => {
        if (res) setAllAgents(res);
      })
      .catch(err => console.error("Could not load agents registry:", err));
    setBillingTargetEmail(user?.email || "");
  }, [user]);

  // Dynamic live loading of billing profile matching targeted agent
  useEffect(() => {
    const target = billingTargetEmail || user?.email;
    if (!target) return;
    api.billing.getInvoiceProfile(target)
      .then(stored => {
        setProfileName(stored?.legalName || "");
        setProfileCompany(stored?.companyName || "");
        setProfileAddress(stored?.address || "");
        setProfileTaxId(stored?.taxId || "");
        setProfileBankIban(stored?.iban || "");
        setProfileBankSwift(stored?.swift || "");
      })
      .catch(err => {
        console.error("Could not query billing details:", err);
        setProfileName("");
        setProfileCompany("");
        setProfileAddress("");
        setProfileTaxId("");
        setProfileBankIban("");
        setProfileBankSwift("");
      });
  }, [billingTargetEmail, user]);

  const handleSaveBillingProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const target = billingTargetEmail || user?.email;
    if (!target) return;
    const payload = {
      legalName: profileName,
      companyName: profileCompany,
      address: profileAddress,
      taxId: profileTaxId,
      iban: profileBankIban,
      swift: profileBankSwift
    };
    api.billing.saveInvoiceProfile(target, payload)
      .then(() => alert(`Billing Profile credentials for ${target} saved securely on server!`))
      .catch(err => alert("Error saving invoice profile: " + err.message));
  };

  // Determine current active leads (Admins see all, agents see only what they claimed)
  const availableLeads = leads.filter(l => user?.isAdmin || l.claimedBy?.toLowerCase() === user?.email?.toLowerCase());

  // Filter documents
  const filteredDocs = docs.filter(d => {
    const matchesUser = user?.isAdmin || d.issuerEmail.toLowerCase() === user?.email.toLowerCase();
    if (!matchesUser) return false;

    if (activeTab === "All" || activeTab === "Billing") return true;
    return d.type === activeTab;
  });

  // Prepopulate lead stats
  const handleLeadChange = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (!leadId) {
      setClientName("");
      return;
    }
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setClientName(lead.name);
      setDocCurrency(lead.earningsCurrency || "USD");
      setFormItems([
        { description: `AgencyPro Premium Prototype Setup & Handover - ${lead.name}`, quantity: 1, price: lead.estValue }
      ]);
    }
  };

  const addFormItem = () => {
    setFormItems([...formItems, { description: "", quantity: 1, price: 0 }]);
  };

  const updateFormItem = (index: number, field: keyof BillingDocItem, value: any) => {
    const updated = [...formItems];
    if (field === "quantity") {
      updated[index].quantity = Math.max(1, parseInt(value) || 1);
    } else if (field === "price") {
      updated[index].price = Math.max(0, parseFloat(value) || 0);
    } else {
      updated[index].description = value;
    }
    setFormItems(updated);
  };

  const removeFormItem = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, idx) => idx !== index));
  };

  const calcSubtotal = (items: BillingDocItem[]) => items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const calcTotal = (sub: number, tax: number) => Math.round(sub + (sub * (tax / 100)));

  const handleOpenCreateForm = () => {
    const genNum = `${docType.slice(0, 3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;
    setDocType("Invoice");
    setDocNumber(genNum);
    setSelectedLeadId("");
    setClientName("");
    setIssueDate(new Date().toISOString().slice(0, 10));
    setDueDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)); // 14 days due
    setFormItems([{ description: "AgencyPro Custom UI Prototype Production Package", quantity: 1, price: 1500 }]);
    setTaxRate(0);
    setDocNotes("We appreciate your business. Prototype services under contract.");
    setDocStatus("Draft");
    
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleEditClick = (doc: BillingDoc) => {
    setSelectedDoc(doc);
    setDocType(doc.type);
    setDocNumber(doc.docNumber);
    setSelectedLeadId(doc.clientId);
    setClientName(doc.clientName);
    setIssueDate(doc.issueDate);
    setDueDate(doc.dueDate);
    setDocCurrency(doc.currency);
    setFormItems([...doc.items]);
    setTaxRate(doc.taxRate);
    setDocNotes(doc.notes);
    setDocStatus(doc.status);

    setIsEditing(true);
    setIsCreating(false);
  };

  const handleDeleteClick = (id: string) => {
    if (confirm("Are you sure you want to delete this billing document record?")) {
      const remaining = docs.filter(d => d.id !== id);
      setDocs(remaining);
      setSelectedDoc(null);
      api.billing.syncInvoices(remaining)
        .catch(err => alert("Error syncing deletion to server: " + err.message));
    }
  };

  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !docNumber.trim()) {
      alert("Please provide the beneficiary's business name and reference code.");
      return;
    }

    const sub = calcSubtotal(formItems);
    const tot = calcTotal(sub, taxRate);

    if (isEditing && selectedDoc) {
      const updated = docs.map(d => {
        if (d.id === selectedDoc.id) {
          return {
            ...d,
            type: docType,
            docNumber,
            clientId: selectedLeadId,
            clientName,
            issueDate,
            dueDate,
            currency: docCurrency,
            items: formItems,
            subtotal: sub,
            taxRate,
            total: tot,
            notes: docNotes,
            status: docStatus
          };
        }
        return d;
      });
      setDocs(updated);
      setIsEditing(false);
      const matched = updated.find(x => x.id === selectedDoc.id);
      if (matched) setSelectedDoc(matched);
      api.billing.syncInvoices(updated)
        .then(() => alert("Billing Record updated successfully on server!"))
        .catch(err => alert("Error syncing billing update to server: " + err.message));
    } else {
      const newD: BillingDoc = {
        id: Math.random().toString(36).substring(2, 9).toUpperCase(),
        type: docType,
        docNumber,
        clientId: selectedLeadId,
        clientName,
        issueDate,
        dueDate,
        currency: docCurrency,
        items: formItems,
        subtotal: sub,
        taxRate,
        total: tot,
        notes: docNotes,
        status: docStatus,
        issuerEmail: user?.email || "unknown@agencypro.com"
      };
      const updated = [newD, ...docs];
      setDocs(updated);
      setIsCreating(false);
      setSelectedDoc(newD);
      api.billing.syncInvoices(updated)
        .then(() => alert("New Billing Record registered successfully on server!"))
        .catch(err => alert("Error syncing new billing document to server: " + err.message));
    }
  };

  // high-fidelity PDF Generation (REQ EXPLICIT RESOLVE!)
  const handlePrint = () => {
    if (!selectedDoc) return;
    
    // Attempt to load profile credentials of the issuer
    const issuer = selectedDoc.issuerEmail || user?.email || "unknown@agencypro.com";
    let storedProfile: any = {};
    try {
      storedProfile = JSON.parse(localStorage.getItem(`billing_profile_${issuer}`) || "{}");
    } catch(e){}

    const pName = storedProfile.legalName || "Not configured";
    const pCompany = storedProfile.companyName || "Independent Partner";
    const pAddress = storedProfile.address || "Global Partner Registry";
    const pTax = storedProfile.taxId || "N/A";
    const pIban = storedProfile.iban || "-";
    const pSwift = storedProfile.swift || "-";

    try {
      const doc = new jsPDF();
      
      // Document Style Branding Theme
      doc.setFillColor(15, 23, 42); // slate-900 background top header banner
      doc.rect(0, 0, 210, 38, "F");

      // Branded Title text
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text("AGENCYPRO OUTBOUND BILLING STATEMENT", 15, 20);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("Official decentralized records vault invoice generator", 15, 28);

      // Section labels
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("BENEFICIARY STATEMENT (CLIENT)", 15, 52);
      doc.text("REQUISITE ROUTING DETAILS (AGENT)", 115, 52);

      // Lines beneath subtitles
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 55, 95, 55);
      doc.line(115, 55, 195, 55);

      // Client specs column
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(selectedDoc.clientName, 15, 62);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Lead Identifier: ${selectedDoc.clientId || "N/A"}`, 15, 68);
      doc.text(`Original Baseline: ${selectedDoc.currency} Contract`, 15, 74);
      doc.text(`Issuer Agent Email: ${selectedDoc.issuerEmail}`, 15, 80);

      // Agent specs column
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(pName, 115, 62);

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`Company Entity: ${pCompany}`, 115, 68);
      doc.text(`Legal Mail Address: ${pAddress}`, 115, 74);
      doc.text(`Tax ID Code: ${pTax}`, 115, 80);

      // Metas box
      doc.setFillColor(248, 250, 252); // slate-50 background
      doc.rect(15, 88, 180, 20, "F");
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("DOCUMENT TYPE", 20, 94);
      doc.text("REFERENCE CODE", 70, 94);
      doc.text("ISSUE TIMELINE", 120, 94);
      doc.text("DUE LIMIT", 160, 94);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(selectedDoc.type.toUpperCase(), 20, 102);
      doc.text(selectedDoc.docNumber, 20 + 50, 102);
      doc.text(selectedDoc.issueDate, 20 + 100, 102);
      doc.text(selectedDoc.dueDate, 20 + 140, 102);

      // Table mapping items
      doc.setDrawColor(203, 213, 225);
      doc.line(15, 116, 195, 116);

      // Table headers
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Line Item Description", 18, 122);
      doc.text("QTY", 120, 122);
      doc.text(`Price (${selectedDoc.currency})`, 140, 122);
      doc.text(`Subtotal (${selectedDoc.currency})`, 168, 122);

      doc.line(15, 126, 195, 126);

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9.5);
      let currentY = 134;

      selectedDoc.items.forEach((it, idx) => {
        doc.text(it.description, 18, currentY);
        doc.text(String(it.quantity), 122, currentY);
        doc.text(convertPrice(it.price, selectedDoc.currency).formatted, 140, currentY);
        doc.text(convertPrice(it.price * it.quantity, selectedDoc.currency).formatted, 168, currentY);
        currentY += 8;
      });

      doc.line(15, currentY, 195, currentY);
      currentY += 8;

      // Mathematical calculations right block
      doc.setFont("Helvetica", "normal");
      doc.text(`Subtotal Baseline:`, 110, currentY);
      doc.text(convertPrice(selectedDoc.subtotal, selectedDoc.currency).formatted, 168, currentY);
      
      currentY += 6;
      doc.text(`Applied Tax (${selectedDoc.taxRate}%):`, 110, currentY);
      doc.text(convertPrice(selectedDoc.total - selectedDoc.subtotal, selectedDoc.currency).formatted, 168, currentY);

      currentY += 8;
      doc.setDrawColor(16, 185, 129); // Green border for total block
      doc.line(110, currentY - 5, 195, currentY - 5);
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(16, 185, 129);
      doc.text(`CONVERTED MASTER TOTAL:`, 110, currentY);
      doc.text(convertPrice(selectedDoc.total, selectedDoc.currency).formatted, 168, currentY);

      currentY += 15;
      
      // Wire details for agent payment
      doc.setFillColor(240, 253, 250); // custom background
      doc.rect(15, currentY, 180, 24, "F");
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(13, 148, 136); // teal-600
      doc.text("VERIFIED SETTLEMENT ROUTING PORTAL", 20, currentY + 6);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`IBAN Line / Account No: ${pIban}`, 20, currentY + 13);
      doc.text(`Routing Code / SWIFT: ${pSwift}`, 20, currentY + 19);

      currentY += 32;

      // Verification Footnote signature
      doc.setFont("Courier", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`AUTHENTIC LEDGER TRACK TRANSACTION LOCK ID: AGENCYPRO-BILL-${selectedDoc.id.toUpperCase()}`, 15, currentY);
      
      // Save PDF file trigger download!
      doc.save(`${selectedDoc.docNumber}_Statement_${clientName.replace(/\s+/g, "_")}.pdf`);
      alert("jsPDF invoice generated and downloaded successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Error generating high fidelity PDF: " + err.message);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen pt-24 pb-12 px-6 md:px-12" id="accounts-portal">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-[28px]">payments</span>
              Financial Accounts Portal
            </h1>
            <p className="text-xs text-slate-505 font-medium">
              {user?.isAdmin 
                ? "ADMIN ACCESS • Centralized Oversight Registry for quotes, invoices, and payment receipts." 
                : `AGENT WORKSPACE • Raise quotes, invoices & client receipts linked directly to your claimed leads.`
              }
            </p>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab("Billing")}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">account_box</span>
              Configure Profile Details
            </button>
            <button 
              onClick={handleOpenCreateForm}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 border border-slate-800 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Issue Quote, Invoice or Receipt
            </button>
          </div>
        </div>

        {/* Dashboard Cards Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1.5">
            <span className="text-xs font-semibold text-slate-400 tracking-wider">Total Issued Docs</span>
            <p className="text-2xl font-bold text-slate-800">{filteredDocs.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1.5">
            <span className="text-xs font-semibold text-emerald-500 tracking-wider">Client Paid Revenue</span>
            <p className="text-2xl font-bold text-slate-800 font-mono">
              {convertPrice(filteredDocs.filter(d => d.status === "Paid" && d.type === "Invoice").reduce((sum, d) => sum + d.total, 0)).formatted}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1.5">
            <span className="text-xs font-semibold text-amber-500 tracking-wider">Outstanding Balance</span>
            <p className="text-2xl font-bold text-slate-800 font-mono">
              {convertPrice(filteredDocs.filter(d => d.status === "Sent" && d.type === "Invoice").reduce((sum, d) => sum + d.total, 0)).formatted}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1.5 row-span-1">
            <span className="text-xs font-semibold text-blue-500 tracking-wider">Total Quoted Value</span>
            <p className="text-2xl font-bold text-slate-800 font-mono">
              {convertPrice(filteredDocs.filter(d => d.type === "Quote").reduce((sum, d) => sum + d.total, 0)).formatted}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200">
          {(["All", "Invoice", "Quote", "Receipt", "Billing"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedDoc(null); }}
              className={`py-3 px-6 text-xs font-bold border-b-2 tracking-wide transition-all uppercase cursor-pointer ${
                activeTab === tab
                  ? "border-emerald-600 text-emerald-700 font-bold bg-white"
                  : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-250"
              }`}
            >
              {tab === "All" ? "ALL RECORDS" : tab === "Billing" ? "Profile & Details" : `${tab}S`}
            </button>
          ))}
        </div>

        {/* TAB WORKSPACE: BILLING PROFILE FORMS PANEL */}
        {activeTab === "Billing" ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 max-w-3xl mx-auto shadow-sm">
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600">manage_accounts</span>
                My Corporate Billing Credentials
              </h2>
              <p className="text-xs text-slate-450 leading-relaxed font-normal">
                Registered names, legally corporate addresses, tax identifier details, and settlement bank route coordinates. Invoices created through this portal will dynamically extract this metadata into generated high-fidelity PDFs.
              </p>
            </div>

            {user?.isAdmin && (
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2 text-xs font-semibold">
                <label className="block text-xs font-bold text-indigo-750 uppercase tracking-wider">Admin Override: Select target agent profile to edit</label>
                <select
                  value={billingTargetEmail}
                  onChange={(e) => setBillingTargetEmail(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl outline-none"
                >
                  <option value={user.email}>{user.name} (Myself / SuperAdmin)</option>
                  {allAgents.filter(a => a.email !== user.email).map((a, i) => (
                    <option key={i} value={a.email}>{a.name} ({a.email})</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 font-normal">📝 Active override enabled. Modifying files saves directly to: <strong>{billingTargetEmail}</strong> registry vault.</p>
              </div>
            )}

            <form onSubmit={handleSaveBillingProfile} className="space-y-5 text-sm font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Agent Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="e.g. Amina Diop"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-normal"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Business / Company Name</label>
                  <input
                    type="text"
                    value={profileCompany}
                    onChange={(e) => setProfileCompany(e.target.value)}
                    placeholder="e.g. Diop Tech solutions"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-normal"
                  />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Billing Street Address</label>
                  <input
                    type="text"
                    value={profileAddress}
                    onChange={(e) => setProfileAddress(e.target.value)}
                    placeholder="e.g. Avenue Bourguiba, Dakar, Senegal"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-normal"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Tax Registration ID (NIF/NIn/VAT)</label>
                  <input
                    type="text"
                    value={profileTaxId}
                    onChange={(e) => setProfileTaxId(e.target.value)}
                    placeholder="e.g. SN-NIF-2023-8902A"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-medium text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Settlement Account IBAN (Payouts)</label>
                  <input
                    type="text"
                    value={profileBankIban}
                    onChange={(e) => setProfileBankIban(e.target.value)}
                    placeholder="e.g. SN76 2093 1892 0182 9310"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-medium text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">SWIFT / Bank Routing Code</label>
                  <input
                    type="text"
                    value={profileBankSwift}
                    onChange={(e) => setProfileBankSwift(e.target.value)}
                    placeholder="e.g. SGBSNDK2"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow"
                >
                  Save Invoicing Details
                </button>
              </div>
            </form>
          </div>
        ) : (
          
          /* Core Billing Table Workspace split */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            
            {/* List panel */}
            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 tracking-wider uppercase">Issued Bills Register ({filteredDocs.length})</span>
                <span className="text-xs bg-slate-100 text-slate-650 font-semibold px-2.5 py-1 rounded-lg">Live Synchronized</span>
              </div>

              {filteredDocs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <span className="material-symbols-outlined text-[48px] text-slate-300">hourglass_empty</span>
                  <p className="text-sm font-semibold">No transactions or invoices found in selection category.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[580px] text-sm">
                  {filteredDocs.map((doc) => {
                    const isSelected = selectedDoc?.id === doc.id;
                    const isInvoice = doc.type === "Invoice";
                    const isQuote = doc.type === "Quote";
                    const isPaid = doc.status === "Paid";
                    const isDraft = doc.status === "Draft";

                    return (
                      <div 
                        key={doc.id}
                        onClick={() => { setSelectedDoc(doc); setIsCreating(false); setIsEditing(false); }}
                        className={`p-4 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                          isSelected ? "bg-slate-50 border-l-4 border-emerald-600" : "hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              isInvoice 
                                ? "bg-blue-50 text-blue-700 border border-blue-200" 
                                : isQuote 
                                  ? "bg-amber-50 text-amber-700 border border-amber-200" 
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}>
                              {doc.type.toUpperCase()}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-600">No. {doc.docNumber}</span>
                            <span className="text-slate-400 font-mono text-[10px]">&bull; {doc.issueDate}</span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-800 truncate" title={doc.clientName}>{doc.clientName}</h4>
                          <span className="text-[10px] text-slate-400 font-semibold truncate block">Issuer: {doc.issuerEmail}</span>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1 shrink-0">
                          <span className="font-mono font-bold text-slate-900">{convertPrice(doc.total, doc.currency).formatted}</span>
                          
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPaid 
                              ? "bg-emerald-100 text-emerald-800" 
                              : isDraft 
                                ? "bg-slate-100 text-slate-600" 
                                : "bg-amber-100 text-amber-800"
                          }`}>
                            {doc.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Detail or Form panel on the right */}
            <div className="lg:col-span-2 flex flex-col">
              
              {/* CREATE / EDIT FORM CONTAINER */}
              {(isCreating || isEditing) ? (
                <form onSubmit={handleSaveDocument} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4 text-xs font-semibold text-slate-800">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold font-mono tracking-wide flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                      {isEditing ? "Edit Invoicing parameters" : "Settle New Client Document"}
                    </h3>
                    <button 
                      type="button" 
                      onClick={() => { setIsCreating(false); setIsEditing(false); }}
                      className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                    >
                      &times;
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Invoice/Report Type</label>
                        <select 
                          value={docType}
                          onChange={(e) => {
                            setDocType(e.target.value as any);
                            const prefix = e.target.value.slice(0, 3).toUpperCase();
                            setDocNumber(`${prefix}-${Math.floor(10000 + Math.random() * 90000)}`);
                          }}
                          className="w-full p-2 border border-slate-200 rounded-lg outline-none bg-white font-bold"
                        >
                          <option value="Invoice">Invoice (Commercial request)</option>
                          <option value="Quote">Quote (Pricing proposal)</option>
                          <option value="Receipt">Receipt (Proof of payment)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Reference Code (Ref)</label>
                        <input 
                          type="text" 
                          value={docNumber}
                          onChange={(e) => setDocNumber(e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-lg font-mono outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Select Active Lead Reference *</label>
                      <select
                        value={selectedLeadId}
                        onChange={(e) => handleLeadChange(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-lg outline-none bg-white font-semibold"
                      >
                        <option value="">-- Manual Client Entry / Freelance Contract --</option>
                        {availableLeads.map((l, i) => (
                          <option key={i} value={l.id}>{l.name} ({l.industry} &bull; ${l.estValue.toLocaleString()} USD Target)</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Client Legal Business Name *</label>
                        <input 
                          type="text" 
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="e.g. Horizon Seafood Ltd."
                          className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-semibold"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Issue Date</label>
                        <input 
                          type="date"
                          value={issueDate}
                          onChange={(e) => setIssueDate(e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-lg outline-none font-mono"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Due Limit / Timeline</label>
                        <input 
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-lg outline-none font-mono"
                          required
                        />
                      </div>
                    </div>

                    {/* Form Item line mapper */}
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-405 uppercase font-mono">Billable Line Items</span>
                        <button 
                          type="button" 
                          onClick={addFormItem}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[9px]"
                        >
                          + Add Row
                        </button>
                      </div>

                      <div className="space-y-2 max-h-36 overflow-y-auto">
                        {formItems.map((it, idx) => (
                          <div key={idx} className="flex gap-2 items-center bg-slate-50 border border-slate-150 p-2.5 rounded-lg text-xs">
                            <input 
                              type="text" 
                              value={it.description}
                              onChange={(e) => updateFormItem(idx, "description", e.target.value)}
                              placeholder="Line item description"
                              className="flex-1 p-1 bg-white border border-slate-200 rounded outline-none text-[11px]"
                              required
                            />
                            <input 
                              type="number" 
                              value={it.quantity}
                              onChange={(e) => updateFormItem(idx, "quantity", e.target.value)}
                              className="w-10 p-1 bg-white border border-slate-200 rounded outline-none text-[11px] font-mono text-center"
                              min="1"
                              required
                            />
                            <input 
                              type="number" 
                              value={it.price}
                              onChange={(e) => updateFormItem(idx, "price", e.target.value)}
                              className="w-16 p-1 bg-white border border-slate-200 rounded outline-none text-[11px] font-mono text-right"
                              min="0"
                              required
                            />
                            {formItems.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removeFormItem(idx)}
                                className="text-red-500 font-bold hover:text-red-700 font-sans text-sm ml-1"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Applied Tax Rate (%)</label>
                        <input 
                          type="number" 
                          value={taxRate}
                          onChange={(e) => setTaxRate(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full p-2 border border-slate-200 rounded-lg outline-none font-mono"
                          min="0"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Approval/Bill Status</label>
                        <select 
                          value={docStatus}
                          onChange={(e) => setDocStatus(e.target.value as any)}
                          className="w-full p-2 border border-slate-200 rounded-lg outline-none bg-white font-bold"
                        >
                          <option value="Draft">Draft (Offline lock)</option>
                          <option value="Sent">Sent (Awaiting customer wire)</option>
                          <option value="Paid">Paid (Settled / Cleared)</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div className="col-span-2 space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Document Instructions / Bank wire notes</label>
                        <textarea 
                          value={docNotes}
                          onChange={(e) => setDocNotes(e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-lg outline-none font-serif leading-relaxed"
                          rows={2.5}
                          placeholder="Standard Bank Wire Details, SWIFT routes, or instructions..."
                        />
                      </div>
                    </div>

                  </div>

                  <div className="flex gap-2 justify-end border-t border-slate-100 pt-3 text-xs font-semibold">
                    <button 
                      type="button" 
                      onClick={() => { setIsCreating(false); setIsEditing(false); }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-5 py-2 bg-slate-900 border border-slate-800 text-white rounded-lg shadow-sm"
                    >
                      Save Document Entries
                    </button>
                  </div>
                </form>
              ) : selectedDoc ? (
                
                /* PREVIEW CONTAINER */
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-slate-900 text-slate-100 uppercase tracking-widest rounded">
                          PREVIEW MODEL
                        </span>
                        <h4 className="text-xs text-slate-500 font-mono tracking-tight pt-1">Vault Key Ref: {selectedDoc.id}</h4>
                      </div>

                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-lg">
                        <button 
                          onClick={() => handleEditClick(selectedDoc)}
                          className="px-2.5 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 border border-dashed border-indigo-200 rounded"
                          title="Edit Document"
                        >
                          Modify
                        </button>
                        
                        {/* Elegant jsPDF trigger download button (REQ CHECK!) */}
                        <button 
                          onClick={handlePrint}
                          className="px-2.5 py-1 text-[10px] font-bold text-teal-600 hover:bg-teal-50 border border-dashed border-teal-200 rounded flex items-center gap-1"
                          title="Generate high fidelity PDF using jsPDF library"
                        >
                          <span className="material-symbols-outlined text-[13px]">picture_as_pdf</span>
                          PDF Download
                        </button>

                        <button 
                          onClick={() => handleDeleteClick(selectedDoc.id)}
                          className="px-2.5 py-1 text-[10px] font-bold text-red-600 hover:bg-red-50 border border-dashed border-red-200 rounded"
                          title="Delete Record"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="border border-slate-150 p-6 rounded-2xl bg-slate-50/50 space-y-5 text-xs font-semibold relative overflow-hidden" id="print-area">
                      <div className="absolute inset-x-0 top-0 h-1 bg-slate-900" />
                      
                      {/* Document Branding Metadata */}
                      <div className="flex justify-between items-start flex-wrap gap-4 select-all">
                        <div className="space-y-0.5">
                          <h1 className="text-sm font-black font-sans uppercase tracking-tight text-slate-950">AGENCYPRO BLOCK</h1>
                          <span className="text-[10px] text-slate-400 font-mono block">Outbound Global Partnership Ledger</span>
                          <span className="text-[10px] text-slate-400 font-semibold block italic pt-1">Issuer: {selectedDoc.issuerEmail}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-600 font-bold uppercase tracking-widest px-2.5 py-1 rounded-md block">
                            {selectedDoc.type} Statement
                          </span>
                          <span className="font-mono text-slate-700 block font-bold pt-1.5">No. {selectedDoc.docNumber}</span>
                        </div>
                      </div>

                      {/* Timeline Metas */}
                      <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3.5 select-text text-[11px]">
                        <div>
                          <span className="block text-[9px] text-slate-400 uppercase tracking-widest font-mono">BENEFICIARY DETAILS</span>
                          <p className="font-bold text-slate-800 text-xs pt-1">{selectedDoc.clientName}</p>
                          {selectedDoc.clientId && (
                            <span className="text-[10px] text-slate-400 block font-mono">Lead ID Ref: {selectedDoc.clientId}</span>
                          )}
                        </div>
                        <div className="text-right">
                          <div>
                            <span className="text-slate-400">Created Date:</span> <strong className="font-mono">{selectedDoc.issueDate}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Due Expiration:</span> <strong className="font-mono">{selectedDoc.dueDate}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Items loop */}
                      <div className="border-t border-b border-slate-100 py-3 space-y-1.5 select-text">
                        <span className="block text-[9px] text-slate-400 uppercase tracking-widest font-mono pb-1">BILLABLE ACCOUNTS MATRIX</span>
                        {selectedDoc.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-xs py-1 border-b border-slate-100/30 last:border-0 pl-1">
                            <span className="text-slate-700 font-medium max-w-xs">{it.description}</span>
                            <div className="flex gap-8">
                              <span className="text-slate-500 font-bold">{it.quantity}</span>
                              <span className="w-20 text-right text-slate-850 font-bold">{convertPrice(it.price, selectedDoc.currency).formatted}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Calculations breakdown bottom right */}
                      <div className="flex flex-col items-end gap-1 select-text">
                        <div className="flex justify-between w-48 border-b border-slate-100 pb-1">
                          <span className="text-slate-400">SUBTOTAL:</span>
                          <span className="text-slate-700 font-bold">{convertPrice(selectedDoc.subtotal, selectedDoc.currency).formatted}</span>
                        </div>
                        <div className="flex justify-between w-48 border-b border-slate-100 pb-1">
                          <span className="text-slate-400">TAX RATE ({selectedDoc.taxRate}%):</span>
                          <span className="text-slate-700 font-bold">{convertPrice(selectedDoc.total - selectedDoc.subtotal, selectedDoc.currency).formatted}</span>
                        </div>
                        <div className="flex justify-between w-48 text-emerald-700 font-extrabold text-sm border-t-2 border-slate-200 pt-1">
                          <span>TOTAL:</span>
                          <span>{convertPrice(selectedDoc.total, selectedDoc.currency).formatted}</span>
                        </div>
                      </div>

                      {/* Notes bottom segment */}
                      {selectedDoc.notes && (
                        <div className="bg-slate-50 border border-slate-110 p-3 rounded-xl flex flex-col gap-0.5 max-w-full">
                          <span className="text-[9px] font-bold text-slate-400 uppercase font-mono tracking-wider">INSTRUCTIONS & NOTES</span>
                          <p className="text-[11px] text-slate-500 select-text font-semibold leading-relaxed">{selectedDoc.notes}</p>
                        </div>
                      )}

                      {/* Signatures */}
                      <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-[9px] text-slate-400 uppercase tracking-widest font-mono">
                        <span>AgencyPro Accountancy Ledger</span>
                        <span>APP-BILL-{selectedDoc.id.toUpperCase()}</span>
                      </div>

                    </div>
                  </div>

                  <p className="text-[10px] text-center text-slate-400 font-normal leading-normal select-all pt-3">
                    🚀 Want to customize this statement's issuer address, tax code, and routing SWIFTs? Browse the <strong>Profile & Details</strong> tab.
                  </p>
                </div>
              ) : (
                
                /* EMPTY STATE PREVIEW */
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center text-slate-400 py-16 space-y-3">
                  <span className="material-symbols-outlined text-[54px] text-slate-300">receipt</span>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-800">No Document Selected</h4>
                    <p className="text-[11px] text-slate-405 leading-relaxed font-normal max-w-xs mx-auto">
                      Select an existing quote, invoice or cleared client receipt from the list on the left to verify, update, or download its official high-fidelity PDF.
                    </p>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
