/**
 * ABC LLC - Actual Project Cost & Profit Tracking Module
 * Implements Section 9 of the Master Prompt specifications.
 * Tracks post-award expenses, visit logs, recognized revenue,
 * budget variance, and provisional margin health.
 * Includes interactive Bulk Expense Creation from raw pasted Excel / CSV data.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  DollarSign, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  Download,
  Info,
  Building,
  ClipboardPaste,
  UploadCloud,
  Check,
  Copy,
  Sparkles,
  Filter,
  Layers,
  HelpCircle,
  X
} from 'lucide-react';
import { 
  ProjectCosting, 
  ActualExpenseRecord, 
  UserProfile 
} from '../types';
import { 
  formatAED, 
  calculateActualsAndVariance 
} from '../utils/calculator';
import { exportVarianceReport } from '../utils/exportUtils';
import { 
  parseRawExpenseData, 
  convertParsedRowsToRecords, 
  SAMPLE_EXCEL_EXPENSE_DATA, 
  ParsedExpenseRow 
} from '../utils/expenseParser';

interface ActualsTrackerProps {
  projects: ProjectCosting[];
  actualExpenses: ActualExpenseRecord[];
  currentUser: UserProfile;
  initialProjectId?: string;
  onAddExpense: (expense: ActualExpenseRecord) => void;
  onBulkAddExpenses?: (expenses: ActualExpenseRecord[]) => void;
  onDeleteExpense: (expenseId: string) => void;
  onUpdateProjectRevenue: (projectId: string, recognizedRevenue: number, invoiced: number, collected: number) => void;
}

export const ActualsTracker: React.FC<ActualsTrackerProps> = ({
  projects,
  actualExpenses,
  currentUser,
  initialProjectId,
  onAddExpense,
  onBulkAddExpenses,
  onDeleteExpense,
  onUpdateProjectRevenue,
}) => {
  // Selected project for expense tracking
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId || (projects[0]?.id || '')
  );

  // Tab mode for recording expenses: Single Form vs Bulk Excel Paste
  const [entryMode, setEntryMode] = useState<'single' | 'bulk'>('single');

  // Single new expense form state
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [expenseCategory, setExpenseCategory] = useState<ActualExpenseRecord['category']>('Labour');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseQuantity, setExpenseQuantity] = useState<number>(1);
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  const [receiptRef, setReceiptRef] = useState<string>('');
  const [visitNumber, setVisitNumber] = useState<number>(1);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Bulk Excel Paste state
  const [rawPasteText, setRawPasteText] = useState<string>('');
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);
  const [customParsedRows, setCustomParsedRows] = useState<ParsedExpenseRow[] | null>(null);
  const [expenseTableCategoryFilter, setExpenseTableCategoryFilter] = useState<string>('All');

  // Current active project
  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  // Expenses for the active project
  const projectExpenses = useMemo(() => {
    if (!currentProject) return [];
    const all = actualExpenses.filter((e) => e.projectId === currentProject.id);
    if (expenseTableCategoryFilter === 'All') return all;
    return all.filter((e) => e.category === expenseTableCategoryFilter);
  }, [actualExpenses, currentProject, expenseTableCategoryFilter]);

  // All expenses for active project (unfiltered)
  const allCurrentProjectExpenses = useMemo(() => {
    if (!currentProject) return [];
    return actualExpenses.filter((e) => e.projectId === currentProject.id);
  }, [actualExpenses, currentProject]);

  // Financial Variance Analysis (Section 9)
  const analysis = useMemo(() => {
    if (!currentProject) return null;
    return calculateActualsAndVariance(
      currentProject.estimatedTotalCost,
      currentProject.quotedSellingPrice,
      currentProject.recognizedRevenueBeforeVat,
      currentProject.invoicedAmountBeforeVat,
      currentProject.collectedAmountBeforeVat,
      allCurrentProjectExpenses,
      currentProject.status === 'Completed'
    );
  }, [currentProject, allCurrentProjectExpenses]);

  // Parse raw text whenever rawPasteText changes
  const parseResult = useMemo(() => {
    if (!currentProject) return null;
    return parseRawExpenseData(
      rawPasteText,
      currentProject.id,
      currentUser,
      visitNumber || 1
    );
  }, [rawPasteText, currentProject, currentUser, visitNumber]);

  // Synchronize custom parsed rows for interactive editing in preview table
  useEffect(() => {
    if (parseResult) {
      setCustomParsedRows(parseResult.rows);
    } else {
      setCustomParsedRows(null);
    }
  }, [parseResult]);

  // Computed summary from either edited preview rows or raw parse
  const activePreviewRows = customParsedRows || (parseResult ? parseResult.rows : []);
  const validPreviewRows = useMemo(() => {
    return activePreviewRows.filter((r) => r.isValid && r.amount > 0);
  }, [activePreviewRows]);

  const bulkTotalAED = useMemo(() => {
    return validPreviewRows.reduce((sum, r) => sum + r.amount, 0);
  }, [validPreviewRows]);

  const bulkCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    validPreviewRows.forEach((r) => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return counts;
  }, [validPreviewRows]);

  // Revenue inputs state for the active project
  const [recognizedRevInput, setRecognizedRevInput] = useState<number>(
    currentProject?.recognizedRevenueBeforeVat || 0
  );
  const [invoicedInput, setInvoicedInput] = useState<number>(
    currentProject?.invoicedAmountBeforeVat || 0
  );
  const [collectedInput, setCollectedInput] = useState<number>(
    currentProject?.collectedAmountBeforeVat || 0
  );

  // Sync inputs when selected project changes
  useEffect(() => {
    if (currentProject) {
      setRecognizedRevInput(currentProject.recognizedRevenueBeforeVat || 0);
      setInvoicedInput(currentProject.invoicedAmountBeforeVat || 0);
      setCollectedInput(currentProject.collectedAmountBeforeVat || 0);
    }
  }, [currentProject?.id]);

  const handleSaveRevenue = () => {
    if (!currentProject) return;
    onUpdateProjectRevenue(currentProject.id, recognizedRevInput, invoicedInput, collectedInput);
    setFormSuccess('Project revenue recognition parameters updated.');
    setTimeout(() => setFormSuccess(null), 3500);
  };

  // Single expense creation
  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || expenseAmount <= 0) return;

    const newExp: ActualExpenseRecord = {
      id: `ACT-${Date.now()}`,
      projectId: currentProject.id,
      date: expenseDate,
      category: expenseCategory,
      quantity: expenseQuantity,
      amount: expenseAmount,
      description: expenseDescription || `${expenseCategory} expense for visit #${visitNumber}`,
      enteredBy: currentUser.name,
      enteredByRole: currentUser.role,
      receiptOrRefNumber: receiptRef || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      isApproved: true,
      visitNumber: visitNumber,
    };

    onAddExpense(newExp);
    setExpenseAmount(0);
    setExpenseDescription('');
    setReceiptRef('');
    setFormSuccess(`Actual expense of ${formatAED(expenseAmount)} (${expenseCategory}) recorded successfully.`);
    setTimeout(() => setFormSuccess(null), 4000);
  };

  // Bulk expenses creation from parsed rows
  const handleCommitBulkImport = () => {
    if (!currentProject || validPreviewRows.length === 0) return;

    const recordsToCreate = convertParsedRowsToRecords(
      validPreviewRows,
      currentProject.id,
      currentUser
    );

    if (onBulkAddExpenses) {
      onBulkAddExpenses(recordsToCreate);
    } else {
      recordsToCreate.forEach((r) => onAddExpense(r));
    }

    const count = recordsToCreate.length;
    const totalAmt = bulkTotalAED;

    setRawPasteText('');
    setCustomParsedRows(null);
    setFormSuccess(
      `Bulk Import Complete: Created ${count} expense records totaling ${formatAED(totalAmt)} for project ${currentProject.id}.`
    );
    setTimeout(() => setFormSuccess(null), 5000);
  };

  // Load sample Excel TSV data
  const handleLoadSampleData = () => {
    setRawPasteText(SAMPLE_EXCEL_EXPENSE_DATA);
  };

  // Copy empty TSV template to clipboard
  const handleCopyTemplate = () => {
    const template = `Date\tCategory\tAmount\tDescription\tVisit #\tReceipt/Ref\n2026-03-01\tLabour\t1200\tAC Technician manpower shift\t1\tTS-01\n2026-03-01\tMaterials\t450\tChemical disinfectant supply\t1\tINV-55`;
    navigator.clipboard.writeText(template);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  // Inline row updates in preview table
  const handleUpdateRowCategory = (index: number, newCat: ActualExpenseRecord['category']) => {
    if (!customParsedRows) return;
    const updated = [...customParsedRows];
    updated[index] = {
      ...updated[index],
      category: newCat,
      categoryConfidence: 'exact',
    };
    setCustomParsedRows(updated);
  };

  const handleUpdateRowAmount = (index: number, newAmount: number) => {
    if (!customParsedRows) return;
    const updated = [...customParsedRows];
    const valid = newAmount > 0 && updated[index].errors.filter((e) => !e.includes('amount')).length === 0;
    updated[index] = {
      ...updated[index],
      amount: newAmount,
      isValid: valid,
      errors: newAmount > 0 ? updated[index].errors.filter((e) => !e.includes('amount')) : [...updated[index].errors, 'Invalid amount'],
    };
    setCustomParsedRows(updated);
  };

  const handleUpdateRowDescription = (index: number, newDesc: string) => {
    if (!customParsedRows) return;
    const updated = [...customParsedRows];
    updated[index] = {
      ...updated[index],
      description: newDesc,
    };
    setCustomParsedRows(updated);
  };

  const handleDeletePreviewRow = (index: number) => {
    if (!customParsedRows) return;
    const updated = customParsedRows.filter((_, idx) => idx !== index);
    setCustomParsedRows(updated);
  };

  if (!currentProject || !analysis) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        No projects available for actual cost tracking.
      </div>
    );
  }

  // Category badge styling helper
  const getCategoryBadgeClass = (cat: ActualExpenseRecord['category']) => {
    switch (cat) {
      case 'Labour':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Materials':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Transportation':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Equipment':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Subcontractor':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Other':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Module Title & Project Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Actual Project Cost & Profit Variance
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Track real job expenses, compare against estimated budget, log individual receipts or bulk-paste raw data from Excel (Section 9).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Project selector dropdown */}
          <div className="flex-1 md:w-80">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Select Active Project
            </label>
            <select
              aria-label="Select Active Project"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.id}] {p.customerName} - {p.projectName.slice(0, 30)}...
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => exportVarianceReport(projects, actualExpenses)}
            className="self-end px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Variance Report</span>
          </button>
        </div>
      </div>

      {formSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{formSuccess}</span>
          </div>
          <button
            onClick={() => setFormSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Special Warnings: Budget Overrun & Provisional Result (Section 9) */}
      {analysis.isOverBudget && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex items-start gap-3 text-red-900">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider">
              Budget Overrun Detected ({analysis.variancePercentage.toFixed(1)}% Exceeded)
            </h4>
            <p className="text-xs text-red-800 mt-0.5 leading-relaxed">
              Actual expenses ({formatAED(analysis.actualTotalCost)}) have surpassed the approved estimated budget ({formatAED(currentProject.estimatedTotalCost)}) by <strong className="font-mono">{formatAED(analysis.actualTotalCost - currentProject.estimatedTotalCost)}</strong>.
            </p>
          </div>
        </div>
      )}

      {analysis.isProvisional && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5 text-blue-900 text-xs">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Provisional Accounting Result:</strong> This project is currently in status <strong>{currentProject.status}</strong>. Actual profit margin is calculated against recognized project revenue to date, rather than comparing full contract price with incomplete expenses.
          </p>
        </div>
      )}

      {/* Contract Period & Revenue Recognition Controls (Section 9 Requirement) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Revenue Recognition & Invoicing Status
            </h3>
            <p className="text-xs text-slate-500">
              For AMC projects, match recognized revenue with the completed period / visits. An unpaid invoice is not automatic earned revenue.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveRevenue}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold self-start sm:self-auto"
          >
            Update Revenue Values
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 block mb-1">Contract Quoted Price</span>
            <span className="text-base font-bold text-slate-900">
              {formatAED(currentProject.quotedSellingPrice)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {currentProject.contractType} ({currentProject.numberOfVisits} visits total)
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Recognized Revenue Before VAT (AED) *
            </label>
            <input
              type="number"
              min="0"
              value={recognizedRevInput}
              onChange={(e) => setRecognizedRevInput(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-emerald-800 bg-white"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Earned for visits performed
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Invoiced Amount Before VAT (AED)
            </label>
            <input
              type="number"
              min="0"
              value={invoicedInput}
              onChange={(e) => setInvoicedInput(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 bg-white"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Billed to customer so far
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Collected Amount Cash (AED)
            </label>
            <input
              type="number"
              min="0"
              value={collectedInput}
              onChange={(e) => setCollectedInput(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 bg-white"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Cash received in bank
            </span>
          </div>
        </div>
      </div>

      {/* Variance Analysis Cards (Estimated vs Actual) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Estimated Total Cost */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
            Estimated Budget
          </span>
          <span className="text-xl font-bold text-slate-900">
            {formatAED(currentProject.estimatedTotalCost)}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Pre-project estimate</span>
        </div>

        {/* Actual Total Cost */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
            Actual Total Cost
          </span>
          <span className={`text-xl font-black ${analysis.isOverBudget ? 'text-red-700' : 'text-slate-900'}`}>
            {formatAED(analysis.actualTotalCost)}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">
            {allCurrentProjectExpenses.length} expense entries logged
          </span>
        </div>

        {/* Cost Variance (Savings vs Overrun) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
            Cost Variance
          </span>
          <span className={`text-xl font-black ${analysis.varianceCost >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {analysis.varianceCost >= 0 ? `+${formatAED(analysis.varianceCost)}` : formatAED(analysis.varianceCost)}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">
            {analysis.varianceCost >= 0 ? 'Within budget' : 'Over budget'}
          </span>
        </div>

        {/* Actual Profit & Margin */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
            Actual Project Profit
          </span>
          <span className={`text-xl font-black ${analysis.actualProjectProfit < 0 ? 'text-red-700' : 'text-blue-700'}`}>
            {formatAED(analysis.actualProjectProfit)}
          </span>
          <span className="text-[11px] font-bold text-emerald-700 block mt-1">
            Margin: {analysis.actualProfitMargin.toFixed(1)}% {analysis.isProvisional ? '(Provisional)' : ''}
          </span>
        </div>
      </div>

      {/* Cost By Category Breakdown Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Actual Expenses Incurred by Cost Category ({currentProject.id})
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
          {Object.entries(analysis.actualCostByCategory).map(([cat, amt]) => (
            <div key={cat} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-600 block mb-1">{cat}</span>
              <span className="text-sm font-bold text-slate-900">{formatAED(amt)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Expense Recording Section: Tabbed between Single Form & Bulk Excel Paste */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Entry Mode Switcher Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-2 gap-2">
          <button
            type="button"
            onClick={() => setEntryMode('single')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              entryMode === 'single'
                ? 'bg-white text-purple-700 shadow-xs border border-purple-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Single Record Form</span>
          </button>

          <button
            type="button"
            onClick={() => setEntryMode('bulk')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              entryMode === 'bulk'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-purple-700 hover:bg-slate-100'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>Bulk Paste from Excel / CSV</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
              entryMode === 'bulk' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
            }`}>
              Auto-Parser
            </span>
          </button>
        </div>

        {/* MODE 1: Single Expense Form */}
        {entryMode === 'single' && (
          <form onSubmit={handleCreateExpense} className="p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-purple-600" />
                Record New Project Expense / Receipt Entry
              </h4>
              <span className="text-xs text-slate-400">
                Entered By: {currentUser.name} ({currentUser.role})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Category *</label>
                <select
                  aria-label="Expense Category"
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                >
                  <option value="Labour">Labour</option>
                  <option value="Materials">Chemicals / Materials</option>
                  <option value="Transportation">Transportation / Salik</option>
                  <option value="Equipment">Equipment / Assets</option>
                  <option value="Subcontractor">Subcontractor / Lab</option>
                  <option value="Other">Other Direct Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Amount (AED) *</label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  required
                  value={expenseAmount || ''}
                  onChange={(e) => setExpenseAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Visit Number</label>
                <input
                  type="number"
                  min="1"
                  value={visitNumber}
                  onChange={(e) => setVisitNumber(parseInt(e.target.value) || 1)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Receipt / Ref #</label>
                <input
                  type="text"
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  placeholder="e.g. RCPT-2026-99"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  Log Expense
                </button>
              </div>

              <div className="sm:col-span-6">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Description / Notes *
                </label>
                <input
                  type="text"
                  required
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  placeholder="Describe work performed, material batch consumed, or vendor invoice details..."
                />
              </div>
            </div>
          </form>
        )}

        {/* MODE 2: Bulk Paste from Excel / CSV */}
        {entryMode === 'bulk' && (
          <div className="p-5 space-y-5">
            {/* Header / Instructions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <ClipboardPaste className="w-4 h-4 text-purple-600" />
                    Bulk Create Expenses from Excel / CSV Raw Data
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-bold">
                    Target: {currentProject.id}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Copy rows directly from Excel or Google Sheets (Tab-separated) or CSV and paste below. The system automatically detects amounts, dates, and maps categories.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSampleData}
                  className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Load realistic demo Excel rows"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Insert Sample Excel Data</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyTemplate}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Copy blank spreadsheet header to clipboard"
                >
                  {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTemplate ? 'Copied!' : 'Copy TSV Header'}</span>
                </button>

                {rawPasteText && (
                  <button
                    type="button"
                    onClick={() => {
                      setRawPasteText('');
                      setCustomParsedRows(null);
                    }}
                    className="px-2.5 py-1.5 text-slate-500 hover:text-red-600 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Category Auto-Classification Rules Help Pill */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                <span>Automatic Category Recognition Engine:</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
                <div className="p-1.5 bg-white rounded border border-slate-200">
                  <strong className="text-blue-700 block">Labour</strong>
                  <span className="text-slate-400 text-[10px]">staff, technician, manpower, overtime, crew</span>
                </div>
                <div className="p-1.5 bg-white rounded border border-slate-200">
                  <strong className="text-amber-700 block">Materials</strong>
                  <span className="text-slate-400 text-[10px]">chemical, coil cleaner, biocide, consumable, parts</span>
                </div>
                <div className="p-1.5 bg-white rounded border border-slate-200">
                  <strong className="text-purple-700 block">Transportation</strong>
                  <span className="text-slate-400 text-[10px]">van, fuel, petrol, Salik toll, logistics, freight</span>
                </div>
                <div className="p-1.5 bg-white rounded border border-slate-200">
                  <strong className="text-cyan-700 block">Equipment</strong>
                  <span className="text-slate-400 text-[10px]">vacuum, machine, rental, tool, generator, harness</span>
                </div>
                <div className="p-1.5 bg-white rounded border border-slate-200">
                  <strong className="text-rose-700 block">Subcontractor</strong>
                  <span className="text-slate-400 text-[10px]">third-party, lab test, swab analysis, specialist</span>
                </div>
                <div className="p-1.5 bg-white rounded border border-slate-200">
                  <strong className="text-slate-700 block">Other</strong>
                  <span className="text-slate-400 text-[10px]">municipality permit, disposal fee, admin, misc</span>
                </div>
              </div>
            </div>

            {/* Raw Data Text Area */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Paste Clipboard Raw Text Here (Excel / Sheets / CSV):
                </label>
                <span className="text-[11px] text-slate-400">
                  Expected Columns: Date [Tab] Category [Tab] Amount [Tab] Description [Tab] Visit# [Tab] Ref#
                </span>
              </div>
              <textarea
                value={rawPasteText}
                onChange={(e) => setRawPasteText(e.target.value)}
                rows={6}
                placeholder={`Date\tCategory\tAmount\tDescription\tVisit #\tReceipt/Ref\n2026-03-02\tLabour\t1850.00\tAC Duct Cleaning & sanitization team\t1\tTS-2026-088\n2026-03-02\tMaterials\t640.50\tNon-acid coil cleaner 20L + EPA approved bio-sanitizer\t1\tINV-CHEM-941`}
                className="w-full px-3.5 py-2.5 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden bg-slate-900 text-slate-100 placeholder:text-slate-500 selection:bg-purple-600 leading-relaxed"
              />
            </div>

            {/* Parsing Metrics & Breakdown */}
            {parseResult && parseResult.rows.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                    <span className="text-[11px] font-semibold text-purple-700 block">
                      Rows Detected
                    </span>
                    <span className="text-xl font-black text-purple-900">
                      {parseResult.rows.length}
                    </span>
                    <span className="text-[10px] text-purple-600 block mt-0.5">
                      Delimiter: {parseResult.detectedDelimiter} {parseResult.hasHeaderRow ? '(Header Ignored)' : ''}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-[11px] font-semibold text-emerald-700 block">
                      Valid Ready Records
                    </span>
                    <span className="text-xl font-black text-emerald-900">
                      {validPreviewRows.length}
                    </span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5">
                      Ready to bulk create
                    </span>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <span className="text-[11px] font-semibold text-blue-700 block">
                      Total Expense Amount
                    </span>
                    <span className="text-xl font-black text-blue-900">
                      {formatAED(bulkTotalAED)}
                    </span>
                    <span className="text-[10px] text-blue-600 block mt-0.5">
                      To be logged into {currentProject.id}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                      Detected Categories:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(bulkCategoryCounts).map(([cat, cnt]) => (
                        <span key={cat} className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${getCategoryBadgeClass(cat as any)}`}>
                          {cnt}x {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Interactive Live Preview Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-purple-600" />
                      Parsed Rows Preview ({activePreviewRows.length} entries)
                    </h5>
                    <span className="text-[11px] text-slate-500">
                      Review, adjust categories, or remove entries before clicking Import.
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="p-2.5 text-center w-12">#</th>
                          <th className="p-2.5 w-28">Date</th>
                          <th className="p-2.5 w-40">Parsed Category</th>
                          <th className="p-2.5">Description</th>
                          <th className="p-2.5 text-right w-32">Amount (AED)</th>
                          <th className="p-2.5 text-center w-20">Visit #</th>
                          <th className="p-2.5 w-32">Ref #</th>
                          <th className="p-2.5 text-center w-16">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {activePreviewRows.map((row, idx) => (
                          <tr
                            key={row.id}
                            className={`transition-colors ${
                              !row.isValid ? 'bg-red-50/60' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="p-2.5 text-center font-mono text-[11px] text-slate-400">
                              {row.rowIndex}
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              <span className="font-medium text-slate-800">{row.date}</span>
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              <select
                                aria-label="Parsed Category"
                                value={row.category}
                                onChange={(e) => handleUpdateRowCategory(idx, e.target.value as any)}
                                className={`px-2 py-1 rounded text-[11px] font-bold border ${getCategoryBadgeClass(row.category)} bg-white focus:outline-hidden`}
                              >
                                <option value="Labour">Labour</option>
                                <option value="Materials">Materials</option>
                                <option value="Transportation">Transportation</option>
                                <option value="Equipment">Equipment</option>
                                <option value="Subcontractor">Subcontractor</option>
                                <option value="Other">Other</option>
                              </select>
                              {row.categoryConfidence === 'mapped' && (
                                <span className="ml-1 text-[10px] text-slate-400 font-normal" title="Auto-mapped from keyword">
                                  ⚡
                                </span>
                              )}
                            </td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                aria-label="Row Description"
                                value={row.description}
                                onChange={(e) => handleUpdateRowDescription(idx, e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-slate-50/50 hover:bg-white focus:bg-white focus:border-purple-500"
                              />
                              {row.warnings.length > 0 && (
                                <span className="text-[10px] text-amber-600 block mt-0.5">
                                  {row.warnings.join('; ')}
                                </span>
                              )}
                              {row.errors.length > 0 && (
                                <span className="text-[10px] text-red-600 font-bold block mt-0.5">
                                  {row.errors.join('; ')}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-slate-400 font-mono text-[11px]">AED</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  aria-label="Row Amount"
                                  value={row.amount || ''}
                                  onChange={(e) => handleUpdateRowAmount(idx, parseFloat(e.target.value) || 0)}
                                  className={`w-24 text-right px-1.5 py-1 font-bold text-xs border rounded ${
                                    row.amount <= 0 ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-300 text-slate-900'
                                  }`}
                                />
                              </div>
                            </td>
                            <td className="p-2.5 text-center whitespace-nowrap">
                              <span className="font-semibold text-slate-700">Visit {row.visitNumber}</span>
                            </td>
                            <td className="p-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {row.receiptOrRefNumber}
                            </td>
                            <td className="p-2.5 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleDeletePreviewRow(idx)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                                title="Remove row from import"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Commit Action Footer */}
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-slate-600">
                      Ready to bulk create <strong className="text-slate-900">{validPreviewRows.length}</strong> expense records for <strong className="text-purple-700">{currentProject.projectName}</strong>.
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleCommitBulkImport}
                        disabled={validPreviewRows.length === 0}
                        className={`w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all ${
                          validPreviewRows.length > 0
                            ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer hover:shadow-md'
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>
                          Import {validPreviewRows.length} Expenses (Total: {formatAED(bulkTotalAED)})
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expenses Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Recorded Project Expenses Log ({projectExpenses.length} Records)
            </h4>
            <p className="text-[11px] text-slate-500">
              Post-award actual costs logged for project [{currentProject.id}].
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Filter by Category"
                value={expenseTableCategoryFilter}
                onChange={(e) => setExpenseTableCategoryFilter(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded-lg text-xs bg-white font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="All">All Categories</option>
                <option value="Labour">Labour</option>
                <option value="Materials">Materials</option>
                <option value="Transportation">Transportation</option>
                <option value="Equipment">Equipment</option>
                <option value="Subcontractor">Subcontractor</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
              Total Actuals: {formatAED(analysis.actualTotalCost)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3 text-center">Visit #</th>
                <th className="p-3">Category</th>
                <th className="p-3">Description</th>
                <th className="p-3">Receipt / Doc Ref</th>
                <th className="p-3">Entered By</th>
                <th className="p-3 text-right">Amount (AED)</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {projectExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 whitespace-nowrap font-medium text-slate-700">{exp.date}</td>
                  <td className="p-3 text-center font-bold text-slate-800">Visit {exp.visitNumber || 1}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded font-semibold text-[11px] border ${getCategoryBadgeClass(exp.category)}`}>
                      {exp.category}
                    </span>
                  </td>
                  <td className="p-3 max-w-xs">{exp.description}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-600">{exp.receiptOrRefNumber || '-'}</td>
                  <td className="p-3 text-slate-500 whitespace-nowrap">{exp.enteredBy}</td>
                  <td className="p-3 text-right font-bold text-slate-900 whitespace-nowrap">
                    {formatAED(exp.amount)}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteExpense(exp.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {projectExpenses.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                    {expenseTableCategoryFilter !== 'All' 
                      ? `No expenses found under category "${expenseTableCategoryFilter}" for this project.`
                      : 'No actual expenses recorded for this project yet. Use the single entry form or bulk Excel paste above to log expenses.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
