/**
 * ABC LLC - Financial Reports & Profitability Analytics
 * Implements Section 15: Downloadable Excel & CSV workbooks, project cost distribution breakdown,
 * actual expenses category breakdown with donut chart, division profitability, and variance reports.
 */

import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Download, 
  FileSpreadsheet, 
  FileText,
  PieChart as PieChartIcon, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  User, 
  Calendar, 
  DollarSign,
  AlertTriangle,
  Filter,
  RotateCcw,
  Users,
  Package,
  Truck,
  Wrench,
  Tag,
  ChevronDown,
  ChevronUp,
  Receipt,
  CheckCircle2,
  Layers,
  FileDown,
  X,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import { 
  ProjectCosting, 
  ActualExpenseRecord, 
  MaterialIssueRecord, 
  StoreInventoryItem 
} from '../types';
import { formatAED, formatPercent } from '../utils/calculator';
import { 
  exportProjectsToExcel, 
  exportProjectCostDistribution,
  exportVarianceReport, 
  exportDivisionCostDistribution,
  exportStoreInventoryReport,
  exportActualExpensesReport,
  ExportFormat
} from '../utils/exportUtils';

interface ReportsViewProps {
  projects: ProjectCosting[];
  actualExpenses: ActualExpenseRecord[];
  materialIssues: MaterialIssueRecord[];
  inventory: StoreInventoryItem[];
}

interface CategoryConfig {
  label: string;
  color: string;
  bgLight: string;
  borderColor: string;
  textColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  Labor: {
    label: 'Labor',
    color: '#2563eb', // Blue-600
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    icon: Users,
  },
  Material: {
    label: 'Material',
    color: '#059669', // Emerald-600
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    icon: Package,
  },
  Transport: {
    label: 'Transport',
    color: '#d97706', // Amber-600
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    icon: Truck,
  },
  Equipment: {
    label: 'Equipment',
    color: '#7c3aed', // Purple-600
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    icon: Wrench,
  },
  Subcontractor: {
    label: 'Subcontractor',
    color: '#e11d48', // Rose-600
    bgLight: 'bg-rose-50',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-700',
    icon: Building2,
  },
  Other: {
    label: 'Other',
    color: '#64748b', // Slate-500
    bgLight: 'bg-slate-50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-700',
    icon: Tag,
  },
};

function normalizeCategoryKey(rawCategory: string): string {
  const lower = (rawCategory || '').toLowerCase();
  if (lower.includes('labour') || lower.includes('labor')) return 'Labor';
  if (lower.includes('material')) return 'Material';
  if (lower.includes('transport')) return 'Transport';
  if (lower.includes('equip')) return 'Equipment';
  if (lower.includes('subcon')) return 'Subcontractor';
  return 'Other';
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      name: string;
      value: number;
      percentage: number;
      count: number;
      color: string;
    };
  }>;
}

const CustomExpenseTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-xs text-white px-3.5 py-2.5 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-[170px] z-50">
        <div className="flex items-center gap-2 font-bold text-slate-100">
          <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: data.color }} />
          <span>{data.name} Expenses</span>
        </div>
        <div className="text-sm font-black text-white">
          {formatAED(data.value)}
        </div>
        <div className="flex items-center justify-between text-slate-300 text-[11px] pt-1.5 border-t border-slate-800">
          <span>Share: <strong className="text-emerald-400">{data.percentage.toFixed(1)}%</strong></span>
          <span className="text-slate-400">{data.count} {data.count === 1 ? 'entry' : 'entries'}</span>
        </div>
      </div>
    );
  }
  return null;
};

export const ReportsView: React.FC<ReportsViewProps> = ({
  projects,
  actualExpenses,
  materialIssues,
  inventory,
}) => {
  // Date Range and Filter State for Actual Expenses Donut Breakdown
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [activeDatePreset, setActiveDatePreset] = useState<string>('ALL');
  const [showItemizedExpenses, setShowItemizedExpenses] = useState<boolean>(false);

  // Export Center Modal & Notification States
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportModalReportType, setExportModalReportType] = useState<
    'cost_distribution' | 'actual_expenses' | 'variance' | 'division' | 'master_projects' | 'inventory'
  >('cost_distribution');
  const [exportModalScope, setExportModalScope] = useState<'filtered' | 'all'>('filtered');
  const [exportModalFormat, setExportModalFormat] = useState<ExportFormat>('xlsx');
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Map of project id to project for quick lookup
  const projectMap = useMemo(() => {
    return new Map(projects.map((p) => [p.id, p]));
  }, [projects]);

  // Quick Preset Handlers
  const applyDatePreset = (preset: string) => {
    setActiveDatePreset(preset);
    const now = new Date();
    const currentYear = now.getFullYear();

    switch (preset) {
      case 'ALL':
        setStartDate('');
        setEndDate('');
        break;
      case 'THIS_MONTH': {
        const firstDay = new Date(currentYear, now.getMonth(), 1);
        const lastDay = new Date(currentYear, now.getMonth() + 1, 0);
        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(lastDay.toISOString().split('T')[0]);
        break;
      }
      case 'LAST_30_DAYS': {
        const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        setStartDate(past30.toISOString().split('T')[0]);
        setEndDate(now.toISOString().split('T')[0]);
        break;
      }
      case 'OCT_2026':
        setStartDate('2026-10-01');
        setEndDate('2026-10-31');
        break;
      case 'NOV_2026':
        setStartDate('2026-11-01');
        setEndDate('2026-11-30');
        break;
      case 'Q4_2026':
        setStartDate('2026-10-01');
        setEndDate('2026-12-31');
        break;
      default:
        break;
    }
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setActiveDatePreset('CUSTOM');
    setStartDate(start);
    setEndDate(end);
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedProjectFilter('ALL');
    setSelectedCategoryFilter('ALL');
    setActiveDatePreset('ALL');
  };

  // Filtered actual expenses based on selected date range and project filter
  const filteredExpenses = useMemo(() => {
    return actualExpenses.filter((exp) => {
      // Project filter
      if (selectedProjectFilter !== 'ALL' && exp.projectId !== selectedProjectFilter) {
        return false;
      }
      // Date filter (string comparison YYYY-MM-DD)
      const expDate = exp.date ? exp.date.substring(0, 10) : '';
      if (startDate && expDate && expDate < startDate) {
        return false;
      }
      if (endDate && expDate && expDate > endDate) {
        return false;
      }
      return true;
    });
  }, [actualExpenses, startDate, endDate, selectedProjectFilter]);

  // Expenses filtered further by category (for itemized list)
  const itemizedListExpenses = useMemo(() => {
    if (selectedCategoryFilter === 'ALL') return filteredExpenses;
    return filteredExpenses.filter(
      (exp) => normalizeCategoryKey(exp.category) === selectedCategoryFilter
    );
  }, [filteredExpenses, selectedCategoryFilter]);

  // Category breakdown aggregation
  const { categoryData, totalFilteredExpenses, topCategory } = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {
      Labor: { total: 0, count: 0 },
      Material: { total: 0, count: 0 },
      Transport: { total: 0, count: 0 },
      Equipment: { total: 0, count: 0 },
      Subcontractor: { total: 0, count: 0 },
      Other: { total: 0, count: 0 },
    };

    let grandTotal = 0;

    for (const exp of filteredExpenses) {
      const cat = normalizeCategoryKey(exp.category);
      if (!map[cat]) {
        map[cat] = { total: 0, count: 0 };
      }
      const amt = Number(exp.amount) || 0;
      map[cat].total += amt;
      map[cat].count += 1;
      grandTotal += amt;
    }

    const order = ['Labor', 'Material', 'Transport', 'Equipment', 'Subcontractor', 'Other'];
    const data = order
      .map((name) => {
        const item = map[name] || { total: 0, count: 0 };
        const pct = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0;
        return {
          name,
          value: item.total,
          count: item.count,
          percentage: pct,
          color: CATEGORY_CONFIG[name]?.color || '#64748b',
        };
      })
      .filter((item) => item.value > 0);

    // Find top category
    let top: { name: string; percentage: number; value: number } | null = null;
    for (const item of data) {
      if (!top || item.value > top.value) {
        top = item;
      }
    }

    return {
      categoryData: data,
      totalFilteredExpenses: grandTotal,
      topCategory: top,
    };
  }, [filteredExpenses]);

  // Aggregate Overall Project Cost Distribution across all Cost Categories
  const overallCostDistribution = useMemo(() => {
    let totalLabour = 0;
    let totalMaterial = 0;
    let totalTransport = 0;
    let totalEquipment = 0;
    let totalSubcontractor = 0;
    let totalOverhead = 0;
    let totalContingency = 0;
    let totalEstimatedCost = 0;
    let totalQuotedPrice = 0;
    let totalExpectedProfit = 0;

    for (const p of projects) {
      totalLabour += p.directLabourTotal || 0;
      totalMaterial += p.materialChemicalTotal || 0;
      totalTransport += p.transportationTotal || 0;
      totalEquipment += p.equipmentTotal || 0;
      totalSubcontractor += p.subcontractorTotal || 0;
      totalOverhead += p.overheadTotal || 0;
      totalContingency += p.contingencyTotal || 0;
      totalEstimatedCost += p.estimatedTotalCost || 0;
      totalQuotedPrice += p.quotedSellingPrice || 0;
      totalExpectedProfit += p.expectedProfit || 0;
    }

    const getShare = (amount: number) =>
      totalEstimatedCost > 0 ? (amount / totalEstimatedCost) * 100 : 0;

    return {
      totalEstimatedCost,
      totalQuotedPrice,
      totalExpectedProfit,
      overallProfitMargin:
        totalQuotedPrice > 0 ? (totalExpectedProfit / totalQuotedPrice) * 100 : 0,
      categories: [
        {
          key: 'Labour',
          label: 'Direct Labour',
          amount: totalLabour,
          share: getShare(totalLabour),
          color: '#2563eb',
          icon: Users,
        },
        {
          key: 'Material',
          label: 'Materials & Chemicals',
          amount: totalMaterial,
          share: getShare(totalMaterial),
          color: '#059669',
          icon: Package,
        },
        {
          key: 'Transport',
          label: 'Transportation',
          amount: totalTransport,
          share: getShare(totalTransport),
          color: '#d97706',
          icon: Truck,
        },
        {
          key: 'Equipment',
          label: 'Equipment & Machinery',
          amount: totalEquipment,
          share: getShare(totalEquipment),
          color: '#7c3aed',
          icon: Wrench,
        },
        {
          key: 'Subcontractor',
          label: 'Subcontractors & Testing',
          amount: totalSubcontractor,
          share: getShare(totalSubcontractor),
          color: '#e11d48',
          icon: Building2,
        },
        {
          key: 'Overhead',
          label: 'Overheads & Admin',
          amount: totalOverhead,
          share: getShare(totalOverhead),
          color: '#0891b2',
          icon: DollarSign,
        },
        {
          key: 'Contingency',
          label: 'Contingency Reserve',
          amount: totalContingency,
          share: getShare(totalContingency),
          color: '#64748b',
          icon: AlertTriangle,
        },
      ],
    };
  }, [projects]);

  // Aggregate Division-wise Profitability
  const divisionStats = useMemo(() => {
    const map: Record<string, {
      count: number;
      estimatedCost: number;
      quotedRevenue: number;
      expectedProfit: number;
      actualCost: number;
    }> = {};

    for (const p of projects) {
      if (!map[p.division]) {
        map[p.division] = { count: 0, estimatedCost: 0, quotedRevenue: 0, expectedProfit: 0, actualCost: 0 };
      }
      map[p.division].count++;
      map[p.division].estimatedCost += p.estimatedTotalCost || 0;
      map[p.division].quotedRevenue += p.quotedSellingPrice || 0;
      map[p.division].expectedProfit += p.expectedProfit || 0;
    }

    // Add actual expenses to divisions
    for (const exp of actualExpenses) {
      const proj = projectMap.get(exp.projectId);
      if (proj && map[proj.division]) {
        map[proj.division].actualCost += Number(exp.amount) || 0;
      }
    }

    return Object.entries(map).map(([division, data]) => {
      const margin = data.quotedRevenue > 0 ? (data.expectedProfit / data.quotedRevenue) * 100 : 0;
      return {
        division,
        ...data,
        margin,
      };
    });
  }, [projects, actualExpenses, projectMap]);

  // Aggregate Salesperson Performance
  const salespersonStats = useMemo(() => {
    const map: Record<string, {
      count: number;
      quotedValue: number;
      expectedProfit: number;
    }> = {};

    for (const p of projects) {
      const name = p.salespersonName || 'Unassigned';
      if (!map[name]) {
        map[name] = { count: 0, quotedValue: 0, expectedProfit: 0 };
      }
      map[name].count++;
      map[name].quotedValue += p.quotedSellingPrice || 0;
      map[name].expectedProfit += p.expectedProfit || 0;
    }

    return Object.entries(map).map(([name, data]) => {
      const margin = data.quotedValue > 0 ? (data.expectedProfit / data.quotedValue) * 100 : 0;
      return {
        name,
        ...data,
        margin,
      };
    });
  }, [projects]);

  // Date range label for file exports
  const dateRangeLabel = useMemo(() => {
    if (startDate && endDate) return `${startDate}_to_${endDate}`;
    if (startDate) return `from_${startDate}`;
    if (endDate) return `until_${endDate}`;
    return 'All_Time';
  }, [startDate, endDate]);

  // Central trigger handler for downloads
  const handleDownload = (
    type: 'cost_distribution' | 'actual_expenses' | 'variance' | 'division' | 'master_projects' | 'inventory',
    format: ExportFormat,
    scope: 'filtered' | 'all' = 'filtered'
  ) => {
    let reportTitle = '';
    switch (type) {
      case 'cost_distribution':
        exportProjectCostDistribution(projects, actualExpenses, format);
        reportTitle = `Project Cost Distribution (.${format})`;
        break;
      case 'actual_expenses': {
        const targetExpenses = scope === 'filtered' ? filteredExpenses : actualExpenses;
        const targetLabel = scope === 'filtered' ? dateRangeLabel : 'All_Dates';
        exportActualExpensesReport(targetExpenses, projects, targetLabel, format);
        reportTitle = `Actual Expenses Report (.${format})`;
        break;
      }
      case 'variance':
        exportVarianceReport(projects, actualExpenses, format);
        reportTitle = `Budget Variance Analysis (.${format})`;
        break;
      case 'division':
        exportDivisionCostDistribution(projects, actualExpenses, format);
        reportTitle = `Division Profitability Breakdown (.${format})`;
        break;
      case 'master_projects':
        exportProjectsToExcel(projects, format);
        reportTitle = `Projects Master File (.${format})`;
        break;
      case 'inventory':
        exportStoreInventoryReport(inventory, format);
        reportTitle = `Store Material Inventory (.${format})`;
        break;
    }

    setExportSuccessMessage(`Generated ${reportTitle}`);
    setTimeout(() => {
      setExportSuccessMessage(null);
    }, 4500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {exportSuccessMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Export Completed</div>
            <div className="text-[11px] text-slate-300">{exportSuccessMessage}</div>
          </div>
          <button
            onClick={() => setExportSuccessMessage(null)}
            className="ml-2 text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Export Hub Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Financial Reports & Profitability Analytics
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Export project cost distribution and expense reports as clean CSV or multi-tab Excel workbooks.
          </p>
        </div>

        {/* Global Export Hub Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Export Center Modal Launcher */}
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>Export Center</span>
            <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider">
              CSV & Excel
            </span>
          </button>

          {/* Quick Download: Cost Distribution (Dropdown or dual actions) */}
          <div className="inline-flex rounded-xl shadow-2xs border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <span className="px-2 py-1.5 text-slate-600 font-bold flex items-center gap-1 text-[11px]">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Cost Dist:
            </span>
            <button
              type="button"
              onClick={() => handleDownload('cost_distribution', 'xlsx')}
              className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-700 rounded-lg font-bold text-[11px] border border-slate-200/60 shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
              title="Download Project Cost Distribution as Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
              <span>XLSX</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownload('cost_distribution', 'csv')}
              className="px-2 py-1 hover:bg-blue-50 text-blue-700 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer ml-0.5"
              title="Download Project Cost Distribution as CSV (.csv)"
            >
              <FileText className="w-3 h-3 text-blue-600" />
              <span>CSV</span>
            </button>
          </div>

          {/* Quick Download: Actual Expenses */}
          <div className="inline-flex rounded-xl shadow-2xs border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <span className="px-2 py-1.5 text-slate-600 font-bold flex items-center gap-1 text-[11px]">
              <Receipt className="w-3.5 h-3.5 text-purple-600" />
              Expenses:
            </span>
            <button
              type="button"
              onClick={() => handleDownload('actual_expenses', 'xlsx', 'filtered')}
              className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-700 rounded-lg font-bold text-[11px] border border-slate-200/60 shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
              title="Download Filtered Actual Expenses as Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
              <span>XLSX</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownload('actual_expenses', 'csv', 'filtered')}
              className="px-2 py-1 hover:bg-blue-50 text-blue-700 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer ml-0.5"
              title="Download Filtered Actual Expenses as CSV (.csv)"
            >
              <FileText className="w-3 h-3 text-blue-600" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: PROJECT COST DISTRIBUTION OVERVIEW & CATEGORY SHARES */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/70 via-white to-blue-50/20">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Project Cost Distribution & Breakdown
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                  {projects.length} Costed Projects
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Comprehensive aggregation of Direct Labour, Materials, Transport, Equipment, Subcontractors, Overheads, and Contingency.
              </p>
            </div>
          </div>

          {/* Export Cost Distribution as CSV or Excel */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownload('cost_distribution', 'xlsx')}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Export all project cost distribution categories to Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Cost Distribution (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownload('cost_distribution', 'csv')}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Export project cost distribution breakdown to CSV format (.csv)"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Cost Distribution (.csv)</span>
            </button>
          </div>
        </div>

        {/* Cost Distribution Metric Highlights */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Estimated Cost
              </span>
              <div className="text-xl font-black text-slate-900 mt-0.5">
                {formatAED(overallCostDistribution.totalEstimatedCost)}
              </div>
              <span className="text-[11px] text-slate-500">
                Across {projects.length} active costing sheets
              </span>
            </div>

            <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                Quoted Selling Value
              </span>
              <div className="text-xl font-black text-emerald-900 mt-0.5">
                {formatAED(overallCostDistribution.totalQuotedPrice)}
              </div>
              <span className="text-[11px] text-emerald-700 font-medium">
                Before UAE VAT 5%
              </span>
            </div>

            <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
                Target Gross Profit
              </span>
              <div className="text-xl font-black text-blue-900 mt-0.5">
                {formatAED(overallCostDistribution.totalExpectedProfit)}
              </div>
              <span className="text-[11px] text-blue-700 font-medium">
                Overall Margin: {overallCostDistribution.overallProfitMargin.toFixed(1)}%
              </span>
            </div>

            <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block">
                Total Actual Incurred
              </span>
              <div className="text-xl font-black text-purple-900 mt-0.5">
                {formatAED(
                  actualExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
                )}
              </div>
              <span className="text-[11px] text-purple-700 font-medium">
                {actualExpenses.length} total expense items logged
              </span>
            </div>
          </div>

          {/* Cost Category Share Distribution Bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Cost Driver Distribution Proportions
              </span>
              <span className="text-slate-500 text-[11px]">
                Direct Labour, Materials, Transport, Equipment, Subcontractor & Overheads
              </span>
            </div>

            {/* Stacked Proportional Bar */}
            <div className="h-4 w-full rounded-full bg-slate-100 flex overflow-hidden shadow-inner">
              {overallCostDistribution.categories.map((cat) => {
                if (cat.share <= 0) return null;
                return (
                  <div
                    key={cat.key}
                    style={{
                      width: `${cat.share}%`,
                      backgroundColor: cat.color,
                    }}
                    className="h-full transition-all duration-300 relative group cursor-pointer"
                    title={`${cat.label}: ${formatAED(cat.amount)} (${cat.share.toFixed(1)}%)`}
                  />
                );
              })}
            </div>
          </div>

          {/* Cost Driver Grid Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-1">
            {overallCostDistribution.categories.map((cat) => {
              const IconComponent = cat.icon;
              return (
                <div
                  key={cat.key}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                    >
                      <IconComponent className="w-3 h-3" />
                    </span>
                    <span
                      className="text-[10px] font-black px-1.5 py-0.2 rounded"
                      style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                    >
                      {cat.share.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-700 truncate" title={cat.label}>
                    {cat.label}
                  </div>
                  <div className="text-xs font-black text-slate-900 mt-0.5">
                    {formatAED(cat.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: ACTUAL EXPENSES CATEGORY BREAKDOWN DONUT CHART & EXPENSE REPORTS EXPORT */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all">
        {/* Card Header & Controls */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-blue-50/30 space-y-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xs shrink-0">
                <PieChartIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Actual Expenses Category Breakdown
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 tracking-wide">
                    Donut Analytics
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visual distribution of actual site expenditures across Labor, Material, Transport, and Equipment with CSV/Excel export.
                </p>
              </div>
            </div>

            {/* Quick Export Action Buttons for Expenses: Both CSV and Excel */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownload('actual_expenses', 'xlsx', 'filtered')}
                disabled={filteredExpenses.length === 0}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                title="Download itemized expenses matching the current filters to Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Expenses (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload('actual_expenses', 'csv', 'filtered')}
                disabled={filteredExpenses.length === 0}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                title="Download itemized expenses matching the current filters to CSV (.csv)"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Expenses (.csv)</span>
              </button>
            </div>
          </div>

          {/* Interactive Date Range & Filters Toolbar */}
          <div className="pt-2 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 border-t border-slate-200/60">
            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Range:
              </span>
              {[
                { id: 'ALL', label: 'All Dates' },
                { id: 'OCT_2026', label: 'Oct 2026' },
                { id: 'NOV_2026', label: 'Nov 2026' },
                { id: 'Q4_2026', label: 'Q4 2026' },
                { id: 'LAST_30_DAYS', label: 'Past 30 Days' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyDatePreset(preset.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all text-xs cursor-pointer ${
                    activeDatePreset === preset.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers & Project Filter */}
            <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
              {/* Start Date */}
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium text-[11px]">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
                  className="bg-transparent border-0 text-slate-800 font-semibold text-xs focus:ring-0 p-0 cursor-pointer"
                />
              </div>

              {/* End Date */}
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium text-[11px]">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
                  className="bg-transparent border-0 text-slate-800 font-semibold text-xs focus:ring-0 p-0 cursor-pointer"
                />
              </div>

              {/* Project Filter */}
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={selectedProjectFilter}
                  onChange={(e) => setSelectedProjectFilter(e.target.value)}
                  className="bg-transparent border-0 text-slate-800 font-semibold text-xs focus:ring-0 p-0 cursor-pointer max-w-[150px] truncate"
                >
                  <option value="ALL">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectReference} - {p.customerName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset Button */}
              {(startDate || endDate || selectedProjectFilter !== 'ALL' || selectedCategoryFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-2 py-1 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Clear all filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Donut Chart Visualizer & Category Metric Cards */}
        <div className="p-5">
          {/* Summary Metric Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Filtered Expenses
              </span>
              <div className="text-xl font-black text-slate-900 mt-0.5">
                {formatAED(totalFilteredExpenses)}
              </div>
              <span className="text-[11px] text-slate-500">
                {filteredExpenses.length} logged expense entries
              </span>
            </div>

            <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200/70">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
                Primary Cost Driver
              </span>
              <div className="text-xl font-black text-blue-900 mt-0.5">
                {topCategory ? topCategory.name : 'N/A'}
              </div>
              <span className="text-[11px] text-blue-700 font-medium">
                {topCategory ? `${topCategory.percentage.toFixed(1)}% of filtered total` : 'No expenses in range'}
              </span>
            </div>

            <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/70">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                Active Date Range
              </span>
              <div className="text-xs font-black text-emerald-900 mt-1 truncate">
                {startDate && endDate
                  ? `${startDate} → ${endDate}`
                  : startDate
                  ? `From ${startDate}`
                  : endDate
                  ? `Until ${endDate}`
                  : 'All Incurred Expenses'}
              </div>
              <span className="text-[11px] text-emerald-700 font-medium">
                {selectedProjectFilter === 'ALL'
                  ? 'Across all projects'
                  : projectMap.get(selectedProjectFilter)?.projectReference || 'Single project'}
              </span>
            </div>

            <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-200/70">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block">
                Average Per Entry
              </span>
              <div className="text-xl font-black text-purple-900 mt-0.5">
                {formatAED(
                  filteredExpenses.length > 0 ? totalFilteredExpenses / filteredExpenses.length : 0
                )}
              </div>
              <span className="text-[11px] text-purple-700 font-medium">
                {categoryData.length} active cost categories
              </span>
            </div>
          </div>

          {/* Main Visualizer Area: Donut Chart on Left, Category Detail Cards on Right */}
          {totalFilteredExpenses > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Donut Chart with Centered Total Callout (5 cols) */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 bg-gradient-to-b from-slate-50/50 to-white rounded-2xl border border-slate-100 relative">
                <div className="w-full h-[280px] relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={72}
                        outerRadius={105}
                        paddingAngle={3}
                        stroke="#ffffff"
                        strokeWidth={2}
                      >
                        {categoryData.map((entry) => (
                          <Cell
                            key={`donut-cell-${entry.name}`}
                            fill={entry.color}
                            className="cursor-pointer transition-opacity hover:opacity-85"
                            onClick={() => {
                              setSelectedCategoryFilter(
                                selectedCategoryFilter === entry.name ? 'ALL' : entry.name
                              );
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomExpenseTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered Donut Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Total Incurred
                    </span>
                    <span className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                      {formatAED(totalFilteredExpenses)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {filteredExpenses.length} entries
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  <span>Click slice or card to filter itemized table</span>
                </div>
              </div>

              {/* Category Breakdown Cards with Progress Bars (7 cols) */}
              <div className="lg:col-span-7 space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Category Distribution (Labor, Material, Transport, Equipment)
                  </span>
                  <span className="text-xs text-slate-500">
                    {selectedCategoryFilter !== 'ALL' ? (
                      <span className="font-bold text-blue-600">
                        Showing {selectedCategoryFilter}{' '}
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryFilter('ALL')}
                          className="underline hover:text-slate-800 ml-1 cursor-pointer"
                        >
                          (Clear)
                        </button>
                      </span>
                    ) : (
                      'All categories'
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {['Labor', 'Material', 'Transport', 'Equipment', 'Subcontractor', 'Other'].map(
                    (catKey) => {
                      const cfg = CATEGORY_CONFIG[catKey];
                      const IconComp = cfg.icon;
                      const catItem = categoryData.find((c) => c.name === catKey);
                      const amount = catItem ? catItem.value : 0;
                      const count = catItem ? catItem.count : 0;
                      const pct = catItem ? catItem.percentage : 0;
                      const isSelected = selectedCategoryFilter === catKey;

                      return (
                        <div
                          key={catKey}
                          onClick={() => {
                            setSelectedCategoryFilter(isSelected ? 'ALL' : catKey);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/40 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                              >
                                <IconComp className="w-3.5 h-3.5" />
                              </span>
                              <span className="text-xs font-bold text-slate-900">{cfg.label}</span>
                            </div>
                            <span
                              className="text-[11px] font-extrabold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                            >
                              {pct.toFixed(1)}%
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between text-xs mb-1.5">
                            <span className="text-sm font-black text-slate-900">
                              {formatAED(amount)}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {count} {count === 1 ? 'record' : 'records'}
                            </span>
                          </div>

                          {/* Mini Progress Bar */}
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(pct, 100)}%`,
                                backgroundColor: cfg.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Empty State for Selected Date Range */
            <div className="py-12 px-4 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Actual Expenses Found in Selected Range</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                There are no recorded actual expenses between {startDate || 'earliest'} and {endDate || 'latest'}{' '}
                {selectedProjectFilter !== 'ALL' ? `for project ${selectedProjectFilter}` : ''}.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset to All Time</span>
              </button>
            </div>
          )}

          {/* Collapsible / Expandable Itemized Expenses Table */}
          {filteredExpenses.length > 0 && (
            <div className="mt-6 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowItemizedExpenses(!showItemizedExpenses)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-blue-600" />
                  <span>
                    {showItemizedExpenses ? 'Hide' : 'View'} Itemized Expense Log ({itemizedListExpenses.length}{' '}
                    {itemizedListExpenses.length === 1 ? 'record' : 'records'})
                  </span>
                  {showItemizedExpenses ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                <div className="flex items-center gap-3">
                  {selectedCategoryFilter !== 'ALL' && (
                    <span className="text-xs text-slate-500">
                      Filtered to: <strong className="text-slate-800">{selectedCategoryFilter}</strong>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownload('actual_expenses', 'csv', 'filtered')}
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Log (.csv)</span>
                  </button>
                </div>
              </div>

              {showItemizedExpenses && (
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Project Ref</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5">Receipt / Ref</th>
                        <th className="p-2.5">Entered By</th>
                        <th className="p-2.5 text-right">Amount (AED)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {itemizedListExpenses.map((exp) => {
                        const catKey = normalizeCategoryKey(exp.category);
                        const cfg = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG.Other;
                        const proj = projectMap.get(exp.projectId);

                        return (
                          <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2.5 text-slate-600 font-medium whitespace-nowrap">
                              {exp.date}
                            </td>
                            <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">
                              <div>{proj?.projectReference || exp.projectId}</div>
                              <div className="text-[10px] font-normal text-slate-500 truncate max-w-[140px]">
                                {proj?.customerName}
                              </div>
                            </td>
                            <td className="p-2.5">
                              <span
                                className="px-2 py-0.5 rounded-md font-bold text-[10px] inline-flex items-center gap-1"
                                style={{
                                  backgroundColor: `${cfg.color}15`,
                                  color: cfg.color,
                                }}
                              >
                                {cfg.label}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-700 font-medium">
                              {exp.description}
                            </td>
                            <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                              {exp.receiptOrRefNumber || '—'}
                            </td>
                            <td className="p-2.5 text-slate-600">
                              <div>{exp.enteredBy}</div>
                              <div className="text-[10px] text-slate-400">{exp.enteredByRole}</div>
                            </td>
                            <td className="p-2.5 text-right font-black text-slate-900 whitespace-nowrap">
                              {formatAED(Number(exp.amount) || 0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-black text-slate-900">
                      <tr>
                        <td colSpan={6} className="p-2.5 text-right text-xs uppercase">
                          Filtered Subtotal:
                        </td>
                        <td className="p-2.5 text-right text-sm font-black text-slate-900">
                          {formatAED(
                            itemizedListExpenses.reduce(
                              (sum, e) => sum + (Number(e.amount) || 0),
                              0
                            )
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: DIVISION-WISE PROFITABILITY BREAKDOWN */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Division-Wise Profitability Breakdown
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 mr-2 hidden sm:inline">All amounts in AED</span>
            <button
              type="button"
              onClick={() => handleDownload('division', 'xlsx')}
              className="px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border border-emerald-200"
              title="Download Division Profitability as Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
              <span>XLSX</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownload('division', 'csv')}
              className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
              title="Download Division Profitability as CSV (.csv)"
            >
              <Download className="w-3 h-3 text-slate-600" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">ABC Division</th>
                <th className="p-3 text-center">Projects</th>
                <th className="p-3 text-right">Estimated Cost</th>
                <th className="p-3 text-right">Quoted Revenue</th>
                <th className="p-3 text-right">Expected Profit</th>
                <th className="p-3 text-center">Profit Margin %</th>
                <th className="p-3 text-right">Actual Cost Incurred</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {divisionStats.map((row) => (
                <tr key={row.division} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-bold text-slate-900">{row.division}</td>
                  <td className="p-3 text-center font-semibold text-slate-700">{row.count}</td>
                  <td className="p-3 text-right font-medium text-slate-700">{formatAED(row.estimatedCost)}</td>
                  <td className="p-3 text-right font-bold text-slate-900">{formatAED(row.quotedRevenue)}</td>
                  <td className="p-3 text-right font-black text-emerald-700">{formatAED(row.expectedProfit)}</td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded-full font-bold text-[11px] bg-emerald-100 text-emerald-800">
                      {row.margin.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-3 text-right font-semibold text-purple-900">{formatAED(row.actualCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: SALESPERSON PERFORMANCE BREAKDOWN */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            Salesperson-Wise Project Profitability
          </h3>
          <span className="text-xs text-slate-400">All amounts in AED</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Sales Coordinator / Estimator</th>
                <th className="p-3 text-center">Projects Costed</th>
                <th className="p-3 text-right">Quoted Sales Value</th>
                <th className="p-3 text-right">Expected Gross Profit</th>
                <th className="p-3 text-center">Average Profit Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {salespersonStats.map((row) => (
                <tr key={row.name} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-bold text-slate-900">{row.name}</td>
                  <td className="p-3 text-center font-semibold text-slate-700">{row.count}</td>
                  <td className="p-3 text-right font-bold text-slate-900">{formatAED(row.quotedValue)}</td>
                  <td className="p-3 text-right font-black text-emerald-700">{formatAED(row.expectedProfit)}</td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded-full font-bold text-[11px] bg-blue-100 text-blue-800">
                      {row.margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 5: MATERIAL CONSUMPTION & WAREHOUSE VALUE SUMMARY */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-600" />
            Store Material Consumption by Project
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload('inventory', 'xlsx')}
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Inventory (.xlsx)</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => handleDownload('inventory', 'csv')}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Inventory (.csv)</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Issue Date</th>
                <th className="p-3">Project Ref</th>
                <th className="p-3">Material Name</th>
                <th className="p-3 text-center">Quantity Used</th>
                <th className="p-3 text-right">Consumption Value (AED)</th>
                <th className="p-3">Issued By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {materialIssues.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="p-3 text-slate-600">{m.issueDate}</td>
                  <td className="p-3 font-mono font-bold text-slate-800">{m.projectId}</td>
                  <td className="p-3 font-semibold text-slate-900">{m.itemName}</td>
                  <td className="p-3 text-center font-bold text-slate-900">{m.quantityUsed} {m.unit}</td>
                  <td className="p-3 text-right font-black text-slate-900">{formatAED(m.totalConsumptionCost)}</td>
                  <td className="p-3 text-slate-500">{m.issuedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: COMPREHENSIVE EXPORT REPORTS CENTER */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
                  <FileDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Financial Reports Export Center
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select report type and choose CSV or multi-tab Excel format.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Step 1: Select Report Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  1. Select Report Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'cost_distribution',
                      title: 'Project Cost Distribution',
                      desc: 'Labor, Material, Transport, Equipment shares & margins',
                      icon: Layers,
                      badge: `${projects.length} projects`,
                    },
                    {
                      id: 'actual_expenses',
                      title: 'Actual Expense Reports',
                      desc: 'Incurred expenditures log with dates & receipt refs',
                      icon: Receipt,
                      badge: `${actualExpenses.length} entries`,
                    },
                    {
                      id: 'variance',
                      title: 'Budget Variance Analysis',
                      desc: 'Estimated vs actual costs with overrun flags',
                      icon: TrendingDown,
                      badge: 'Audit ready',
                    },
                    {
                      id: 'division',
                      title: 'Division Profitability',
                      desc: 'Breakdown of cost, revenue, and gross profit by division',
                      icon: Building2,
                      badge: `${divisionStats.length} divisions`,
                    },
                    {
                      id: 'master_projects',
                      title: 'Full Projects Master',
                      desc: 'Complete project costings with VAT and selling prices',
                      icon: FileSpreadsheet,
                      badge: 'All fields',
                    },
                    {
                      id: 'inventory',
                      title: 'Store Material Inventory',
                      desc: 'Warehouse stock levels, valuations, and SKU balances',
                      icon: Package,
                      badge: `${inventory.length} items`,
                    },
                  ].map((r) => {
                    const IconC = r.icon;
                    const isSelected = exportModalReportType === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() =>
                          setExportModalReportType(
                            r.id as
                              | 'cost_distribution'
                              | 'actual_expenses'
                              | 'variance'
                              | 'division'
                              | 'master_projects'
                              | 'inventory'
                          )
                        }
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/30 shadow-2xs'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                                isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              <IconC className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-xs font-bold text-slate-900">{r.title}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">{r.badge}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 pl-8 leading-snug">{r.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Scope (conditional for expenses) */}
              {exportModalReportType === 'actual_expenses' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    2. Data Range & Filter Scope
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setExportModalScope('filtered')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        exportModalScope === 'filtered'
                          ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900">
                        Active Filter ({filteredExpenses.length} records)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {startDate && endDate
                          ? `${startDate} to ${endDate}`
                          : 'Currently selected range & project'}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExportModalScope('all')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        exportModalScope === 'all'
                          ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900">
                        All Incurred ({actualExpenses.length} records)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Complete historical expense log across all projects
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Choose Format (Excel or CSV) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  {exportModalReportType === 'actual_expenses' ? '3.' : '2.'} File Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setExportModalFormat('xlsx')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      exportModalFormat === 'xlsx'
                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/30'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        exportModalFormat === 'xlsx'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">Excel Workbook (.xlsx)</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Multi-tab formatted workbook with category summaries
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setExportModalFormat('csv')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      exportModalFormat === 'csv'
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/30'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        exportModalFormat === 'csv' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">Comma-Separated (.csv)</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Universal UTF-8 plain text for Excel, Google Sheets, or BI
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                Encoded in UTF-8 with AED currency values
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDownload(exportModalReportType, exportModalFormat, exportModalScope);
                    setShowExportModal(false);
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    Download {exportModalFormat.toUpperCase()} File
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
