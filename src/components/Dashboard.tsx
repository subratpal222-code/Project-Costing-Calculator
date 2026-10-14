/**
 * ABC LLC - Executive & Operations Costing Dashboard
 * Implements Section 11: Summary metric cards, budget overrun alerts,
 * low-profit warnings, approval pipelines, and searchable project table.
 */

import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Search, 
  Filter, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Download, 
  Plus, 
  ArrowUpDown, 
  Eye, 
  FileText, 
  FileSpreadsheet,
  Building,
  TrendingDown,
  Sparkles,
  Archive,
  ArchiveRestore,
  PieChart as PieChartIcon,
  BarChart3,
  ChevronRight,
  Info,
  SlidersHorizontal,
  ExternalLink,
  Paperclip,
  List,
  CalendarRange,
  Calendar
} from 'lucide-react';
import { ProjectTimelineView } from './ProjectTimelineView';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { ProjectCosting, ActualExpenseRecord, UserRole } from '../types';
import { formatAED, formatPercent } from '../utils/calculator';
import { exportProjectsToExcel, exportSingleProjectCostSheet } from '../utils/exportUtils';
import { SubratIQLogo } from './SubratIQLogo';

interface DashboardProps {
  projects: ProjectCosting[];
  actualExpenses: ActualExpenseRecord[];
  userRole: UserRole;
  onSelectProject: (project: ProjectCosting) => void;
  onNewCosting: () => void;
  onOpenActuals: (projectId: string) => void;
  onPrepareQuotation: (project: ProjectCosting) => void;
  onOpenExplainer: () => void;
  onToggleArchive?: (project: ProjectCosting) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  actualExpenses,
  userRole,
  onSelectProject,
  onNewCosting,
  onOpenActuals,
  onPrepareQuotation,
  onOpenExplainer,
  onToggleArchive,
}) => {
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [contractTypeFilter, setContractTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [alertFilter, setAlertFilter] = useState<'ALL' | 'OVERRUN' | 'LOW_MARGIN' | 'PENDING_APPROVAL'>('ALL');
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // Compute map of project actual expenses
  const actualCostMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const exp of actualExpenses) {
      map[exp.projectId] = (map[exp.projectId] || 0) + (Number(exp.amount) || 0);
    }
    return map;
  }, [actualExpenses]);

  // Executive Metric Aggregations
  const stats = useMemo(() => {
    const activeProjects = projects.filter((p) => !p.isArchived);
    const archivedCount = projects.filter((p) => p.isArchived).length;
    const totalProjects = activeProjects.length;
    let totalEstCost = 0;
    let totalQuotedSelling = 0;
    let totalExpectedProfit = 0;
    let totalActualCosts = 0;
    let overrunCount = 0;
    let lowMarginCount = 0;
    let pendingApprovalCount = 0;

    for (const p of activeProjects) {
      totalEstCost += p.estimatedTotalCost || 0;
      totalQuotedSelling += p.quotedSellingPrice || 0;
      totalExpectedProfit += p.expectedProfit || 0;

      const actCost = actualCostMap[p.id] || 0;
      totalActualCosts += actCost;

      // Budget Overrun condition
      if (actCost > p.estimatedTotalCost && p.estimatedTotalCost > 0) {
        overrunCount++;
      }

      // Low / Negative profit condition (<15% margin or profit <= 0)
      if (p.expectedProfitMarginPercentage < 15 || p.expectedProfit <= 0) {
        lowMarginCount++;
      }

      // Pending approval
      if (p.status === 'Under Review' || p.status === 'Draft') {
        pendingApprovalCount++;
      }
    }

    const avgMargin = totalQuotedSelling > 0 ? (totalExpectedProfit / totalQuotedSelling) * 100 : 0;

    return {
      totalProjects,
      archivedCount,
      totalEstCost,
      totalQuotedSelling,
      totalExpectedProfit,
      avgMargin,
      totalActualCosts,
      overrunCount,
      lowMarginCount,
      pendingApprovalCount,
    };
  }, [projects, actualCostMap]);

  // Filtered project list
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // By default, hide archived projects unless showArchived toggle is checked
      if (!showArchived && p.isArchived) return false;

      const actCost = actualCostMap[p.id] || 0;
      const isOverrun = actCost > p.estimatedTotalCost && p.estimatedTotalCost > 0;
      const isLowMargin = p.expectedProfitMarginPercentage < 15 || p.expectedProfit <= 0;
      const isPending = p.status === 'Under Review' || p.status === 'Draft';

      if (alertFilter === 'OVERRUN' && !isOverrun) return false;
      if (alertFilter === 'LOW_MARGIN' && !isLowMargin) return false;
      if (alertFilter === 'PENDING_APPROVAL' && !isPending) return false;

      if (divisionFilter !== 'ALL' && p.division !== divisionFilter) return false;
      if (contractTypeFilter !== 'ALL' && p.contractType !== contractTypeFilter) return false;
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;

      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchName = p.projectName.toLowerCase().includes(query);
        const matchId = p.id.toLowerCase().includes(query);
        const matchRef = p.projectReference.toLowerCase().includes(query);
        const matchCust = p.customerName.toLowerCase().includes(query);
        const matchSales = p.salespersonName.toLowerCase().includes(query);
        if (!matchName && !matchId && !matchRef && !matchCust && !matchSales) {
          return false;
        }
      }

      return true;
    });
  }, [projects, actualCostMap, showArchived, alertFilter, divisionFilter, contractTypeFilter, statusFilter, searchTerm]);

  // View mode for Project Register vs Timeline & Overlap Gantt
  const [projectViewMode, setProjectViewMode] = useState<'table' | 'timeline'>('table');

  // Compute number of projects with scheduling overlaps in the filtered list
  const overlapCount = useMemo(() => {
    let count = 0;
    const list = filteredProjects;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      const aStart = a.startDate;
      const aEnd = a.expectedCompletionDate || a.startDate;
      let hasConflict = false;
      for (let j = 0; j < list.length; j++) {
        if (i === j) continue;
        const b = list[j];
        const bStart = b.startDate;
        const bEnd = b.expectedCompletionDate || b.startDate;
        if (aStart && aEnd && bStart && bEnd) {
          if (aStart <= bEnd && bStart <= aEnd) {
            hasConflict = true;
            break;
          }
        }
      }
      if (hasConflict) count++;
    }
    return count;
  }, [filteredProjects]);

  // Unique divisions for filter dropdown
  const divisions = useMemo(() => {
    return Array.from(new Set(projects.map((p) => p.division)));
  }, [projects]);

  // Selected project for interactive chart visualization
  const [selectedChartProjectId, setSelectedChartProjectId] = useState<string>(
    projects[0]?.id || ''
  );
  const [chartViewMode, setChartViewMode] = useState<'both' | 'pie' | 'bar'>('both');

  // Currently selected project object for charts
  const selectedChartProject = useMemo(() => {
    return projects.find((p) => p.id === selectedChartProjectId) || projects[0] || null;
  }, [projects, selectedChartProjectId]);

  // Actual expenses for selected project broken down by category
  const selectedProjectActualsByCategory = useMemo(() => {
    if (!selectedChartProject) {
      return { Labour: 0, Materials: 0, Transportation: 0, Equipment: 0, Subcontractor: 0, Other: 0, Total: 0 };
    }
    const records = actualExpenses.filter((e) => e.projectId === selectedChartProject.id);
    const byCat = { Labour: 0, Materials: 0, Transportation: 0, Equipment: 0, Subcontractor: 0, Other: 0, Total: 0 };
    for (const r of records) {
      const amt = Number(r.amount) || 0;
      if (r.category === 'Labour') byCat.Labour += amt;
      else if (r.category === 'Materials') byCat.Materials += amt;
      else if (r.category === 'Transportation') byCat.Transportation += amt;
      else if (r.category === 'Equipment') byCat.Equipment += amt;
      else if (r.category === 'Subcontractor') byCat.Subcontractor += amt;
      else byCat.Other += amt;
      byCat.Total += amt;
    }
    return byCat;
  }, [selectedChartProject, actualExpenses]);

  // Distribution Pie/Donut Chart Data for the selected project
  const costDistributionData = useMemo(() => {
    if (!selectedChartProject) return [];
    const p = selectedChartProject;
    const directLabour = p.directLabourTotal || 0;
    const materialChemical = p.materialChemicalTotal || 0;
    const transport = p.transportationTotal || 0;
    const equipment = p.equipmentTotal || 0;
    const subcontractor = (p.subcontractorTotal || 0) + (p.otherDirectCostsTotal || 0);
    const overheadContingency = (p.overheadTotal || 0) + (p.contingencyTotal || 0);

    const raw = [
      { name: 'Labor Cost', shortName: 'Labor', value: directLabour, color: '#2563eb', category: 'Labour' },
      { name: 'Materials & Chemicals', shortName: 'Material', value: materialChemical, color: '#10b981', category: 'Materials' },
      { name: 'Transportation & Site', shortName: 'Transport', value: transport, color: '#f59e0b', category: 'Transportation' },
      { name: 'Equipment & Assets', shortName: 'Equipment', value: equipment, color: '#8b5cf6', category: 'Equipment' },
      { name: 'Subcontractor & Other', shortName: 'Subcontractor', value: subcontractor, color: '#ec4899', category: 'Subcontractor' },
      { name: 'Overhead & Contingency', shortName: 'Overhead', value: overheadContingency, color: '#64748b', category: 'Overhead' },
    ];

    return raw.filter((item) => item.value > 0);
  }, [selectedChartProject]);

  // Category Comparison Bar Chart Data (Estimated vs Actual)
  const categoryComparisonData = useMemo(() => {
    if (!selectedChartProject) return [];
    const p = selectedChartProject;
    const act = selectedProjectActualsByCategory;

    return [
      {
        name: 'Labor',
        Estimated: p.directLabourTotal || 0,
        Actual: act.Labour,
      },
      {
        name: 'Material',
        Estimated: p.materialChemicalTotal || 0,
        Actual: act.Materials,
      },
      {
        name: 'Transport',
        Estimated: p.transportationTotal || 0,
        Actual: act.Transportation,
      },
      {
        name: 'Equipment',
        Estimated: p.equipmentTotal || 0,
        Actual: act.Equipment,
      },
      {
        name: 'Subcontractor',
        Estimated: (p.subcontractorTotal || 0) + (p.otherDirectCostsTotal || 0),
        Actual: act.Subcontractor + act.Other,
      },
    ];
  }, [selectedChartProject, selectedProjectActualsByCategory]);

  // Percentages helper for selected project categories
  const categoryPercentages = useMemo(() => {
    if (!selectedChartProject || selectedChartProject.estimatedTotalCost <= 0) {
      return { labour: 0, material: 0, transport: 0, equipment: 0, other: 0 };
    }
    const tot = selectedChartProject.estimatedTotalCost;
    return {
      labour: ((selectedChartProject.directLabourTotal || 0) / tot) * 100,
      material: ((selectedChartProject.materialChemicalTotal || 0) / tot) * 100,
      transport: ((selectedChartProject.transportationTotal || 0) / tot) * 100,
      equipment: ((selectedChartProject.equipmentTotal || 0) / tot) * 100,
      other: ((((selectedChartProject.subcontractorTotal || 0) + (selectedChartProject.otherDirectCostsTotal || 0) + (selectedChartProject.overheadTotal || 0) + (selectedChartProject.contingencyTotal || 0))) / tot) * 100,
    };
  }, [selectedChartProject]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Welcome & Section 7 Benchmark Callout Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="p-1.5 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-inner shrink-0 hidden sm:flex items-center justify-center">
            <SubratIQLogo size={56} variant="icon" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded bg-blue-600/80 text-xs font-semibold tracking-wide uppercase">
                SUBRAT IQ • ABC Operations
              </span>
              <span className="text-xs text-slate-400">Currency: AED (Dirhams)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Project Costing, Profit Analysis & Quotation Calculator
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Pre-quotation cost accounting, dynamic markup vs target margin calculation, and post-award actual expense tracking across all ABC divisions.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenExplainer}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-800/80 hover:bg-blue-700 text-cyan-200 text-xs font-semibold rounded-xl border border-blue-600 transition-colors shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Markup vs Margin Guide</span>
          </button>
          <button
            onClick={() => exportProjectsToExcel(projects)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-600 transition-colors shadow-xs"
            title="Download full project register as Excel (.xlsx)"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={onNewCosting}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>New Costing</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards (Section 11) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Costed */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Projects</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.totalProjects}
            {stats.archivedCount > 0 && (
              <span className="text-xs font-normal text-slate-500 ml-1.5">
                ({stats.archivedCount} archived)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Costed: <span className="font-semibold text-slate-700">{formatAED(stats.totalEstCost)}</span>
          </p>
        </div>

        {/* Quoted Selling Value */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Quoted Selling Value</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{formatAED(stats.totalQuotedSelling)}</div>
          <p className="text-xs text-slate-500 mt-1">Before VAT (AED)</p>
        </div>

        {/* Expected Profit & Avg Margin */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Expected Total Profit</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700">{formatAED(stats.totalExpectedProfit)}</div>
          <p className="text-xs text-slate-500 mt-1">
            Avg Margin: <span className="font-bold text-emerald-600">{stats.avgMargin.toFixed(1)}%</span>
          </p>
        </div>

        {/* Actual Costs Incurred */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Actual Costs Incurred</span>
            <FileSpreadsheet className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-900">{formatAED(stats.totalActualCosts)}</div>
          <p className="text-xs text-slate-500 mt-1">Logged expenses across active jobs</p>
        </div>
      </div>

      {/* Critical Alert Filters & Schedule Intelligence (Section 11) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Budget Overrun Alert */}
        <div
          onClick={() => setAlertFilter(alertFilter === 'OVERRUN' ? 'ALL' : 'OVERRUN')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
            alertFilter === 'OVERRUN'
              ? 'bg-red-50 border-red-400 ring-2 ring-red-400 shadow-xs'
              : 'bg-white border-slate-200 hover:border-red-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 text-red-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Budget Overrun Alerts</div>
              <div className="text-[11px] text-slate-500">Actual cost &gt; estimated cost</div>
            </div>
          </div>
          <span className="text-sm font-black px-2.5 py-0.5 rounded-full bg-red-100 text-red-800">
            {stats.overrunCount}
          </span>
        </div>

        {/* Low Margin Alert */}
        <div
          onClick={() => setAlertFilter(alertFilter === 'LOW_MARGIN' ? 'ALL' : 'LOW_MARGIN')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
            alertFilter === 'LOW_MARGIN'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400 shadow-xs'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Low / Negative Profit Alerts</div>
              <div className="text-[11px] text-slate-500">Margin &lt; 15% or zero profit</div>
            </div>
          </div>
          <span className="text-sm font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
            {stats.lowMarginCount}
          </span>
        </div>

        {/* Pending Approval Alert */}
        <div
          onClick={() => setAlertFilter(alertFilter === 'PENDING_APPROVAL' ? 'ALL' : 'PENDING_APPROVAL')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
            alertFilter === 'PENDING_APPROVAL'
              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400 shadow-xs'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Pending Approvals</div>
              <div className="text-[11px] text-slate-500">Drafts & Under Review</div>
            </div>
          </div>
          <span className="text-sm font-black px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
            {stats.pendingApprovalCount}
          </span>
        </div>

        {/* Scheduling Overlaps & Timeline Quick Link */}
        <div
          onClick={() => {
            setProjectViewMode('timeline');
            const el = document.getElementById('project-view-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
            projectViewMode === 'timeline'
              ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400 shadow-xs'
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
          title="Switch to timeline Gantt view to visualize scheduling overlaps"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
              <CalendarRange className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Scheduling Overlaps</div>
              <div className="text-[11px] text-slate-500">Timeline & Gantt view</div>
            </div>
          </div>
          <span className={`text-sm font-black px-2.5 py-0.5 rounded-full ${
            overlapCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
          }`}>
            {overlapCount}
          </span>
        </div>
      </div>

      {/* Interactive Project Cost Distribution & Visual Analytics Section (Charts) */}
      <div id="project-cost-charts" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
        {/* Visualizer Header */}
        <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Project Cost Distribution & Category Analysis
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 tracking-wide">
                  Recharts Visualizer
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Visual analysis of cost allocation across <strong>Labor</strong>, <strong>Material & Chemicals</strong>, <strong>Transportation</strong>, and Equipment for selected project.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
            {/* Project Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-xs w-full sm:w-auto">
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Selected:</span>
              <select
                aria-label="Select Project for Cost Visualization"
                value={selectedChartProject?.id || ''}
                onChange={(e) => setSelectedChartProjectId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer max-w-[260px] truncate"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} • {p.projectName} ({p.customerName})
                  </option>
                ))}
              </select>
            </div>

            {/* Chart View Mode Tabs */}
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setChartViewMode('both')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  chartViewMode === 'both' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Both Charts
              </button>
              <button
                onClick={() => setChartViewMode('pie')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  chartViewMode === 'pie' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PieChartIcon className="w-3.5 h-3.5" />
                <span>Donut</span>
              </button>
              <button
                onClick={() => setChartViewMode('bar')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  chartViewMode === 'bar' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Bar Chart</span>
              </button>
            </div>
          </div>
        </div>

        {/* Selected Project Snapshot Bar */}
        {selectedChartProject && (
          <div className="px-5 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-mono font-bold text-cyan-400">{selectedChartProject.id}</span>
              <span className="font-semibold text-slate-100">{selectedChartProject.projectName}</span>
              <span className="text-slate-400">• {selectedChartProject.customerName}</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-300 text-[10px] font-bold">
                {selectedChartProject.division}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                {selectedChartProject.contractType} ({selectedChartProject.numberOfVisits} visits)
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium">
              <div>
                <span className="text-slate-400 text-[11px] mr-1">Total Cost:</span>
                <span className="font-bold text-white">{formatAED(selectedChartProject.estimatedTotalCost)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] mr-1">Quoted:</span>
                <span className="font-bold text-emerald-400">{formatAED(selectedChartProject.quotedSellingPrice)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] mr-1">Margin:</span>
                <span className="font-bold text-cyan-400">{selectedChartProject.expectedProfitMarginPercentage.toFixed(1)}%</span>
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  onClick={() => onSelectProject(selectedChartProject)}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold transition-colors"
                >
                  Edit Costing
                </button>
                <button
                  onClick={() => onOpenActuals(selectedChartProject.id)}
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-bold transition-colors"
                >
                  Track Expenses
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Charts Body */}
        {selectedChartProject ? (
          <div className="p-5 space-y-6">
            {costDistributionData.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Info className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">No cost breakdown items recorded for this project yet.</p>
                <p className="text-xs text-slate-400 mt-1">Open the Costing Form to add Labour, Materials, Transport, and Equipment entries.</p>
                <button
                  onClick={() => onSelectProject(selectedChartProject)}
                  className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition-colors"
                >
                  Add Cost Items Now
                </button>
              </div>
            ) : (
              <div className={`grid gap-6 ${chartViewMode === 'both' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
                {/* 1. Donut / Pie Chart: Distribution across categories */}
                {(chartViewMode === 'both' || chartViewMode === 'pie') && (
                  <div className={`${chartViewMode === 'both' ? 'lg:col-span-5' : 'w-full'} bg-slate-50/70 p-4 rounded-xl border border-slate-200/80`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <PieChartIcon className="w-4 h-4 text-blue-600" />
                          Cost Category Share (%)
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Proportional distribution of AED {formatAED(selectedChartProject.estimatedTotalCost)}
                        </p>
                      </div>
                    </div>

                    <div className="h-[250px] w-full relative">
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={costDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {costDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0];
                                const total = selectedChartProject?.estimatedTotalCost || 1;
                                const percent = (((Number(data.value) || 0) / total) * 100).toFixed(1);
                                return (
                                  <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs backdrop-blur-sm">
                                    <div className="font-bold flex items-center gap-2">
                                      <span
                                        className="w-2.5 h-2.5 rounded-full inline-block"
                                        style={{ backgroundColor: (data.payload as { color?: string })?.color || '#2563eb' }}
                                      />
                                      <span>{data.name}</span>
                                    </div>
                                    <div className="text-sm font-black text-slate-100 mt-1">
                                      {formatAED(Number(data.value) || 0)}
                                    </div>
                                    <div className="text-cyan-400 font-semibold text-[11px] mt-0.5">
                                      {percent}% of Total Budget
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Donut center stat */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Est.</span>
                        <span className="text-sm font-black text-slate-800">
                          {formatAED(selectedChartProject.estimatedTotalCost)}
                        </span>
                      </div>
                    </div>

                    {/* Donut Legend */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200">
                      {costDistributionData.map((item) => {
                        const pct = ((item.value / (selectedChartProject.estimatedTotalCost || 1)) * 100).toFixed(1);
                        return (
                          <div key={item.name} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-white border border-slate-100 shadow-2xs">
                            <div className="flex items-center gap-1.5 truncate pr-1">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="font-semibold text-slate-700 truncate text-[11px]">{item.shortName}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-slate-900 block text-[11px]">{formatAED(item.value)}</span>
                              <span className="text-[10px] text-slate-400">{pct}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Bar Chart: Category Breakdown & Estimated vs Actual */}
                {(chartViewMode === 'both' || chartViewMode === 'bar') && (
                  <div className={`${chartViewMode === 'both' ? 'lg:col-span-7' : 'w-full'} bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4 text-emerald-600" />
                          Category Cost Breakdown (Estimated vs. Incurred)
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Direct comparison of planned budget vs actual logged expenses in AED
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 text-blue-700 font-semibold">
                          <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
                          Estimated Budget
                        </span>
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                          Actual Logged
                        </span>
                      </div>
                    </div>

                    <div className="h-[250px] w-full pt-2">
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={categoryComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                          <YAxis
                            stroke="#64748b"
                            fontSize={10}
                            tickLine={false}
                            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                          />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs backdrop-blur-sm">
                                    <div className="font-bold text-cyan-400 mb-1.5 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                                      <span>{label} Category Breakdown</span>
                                    </div>
                                    {payload.map((entry, index: number) => (
                                      <div key={`entry-${index}`} className="flex items-center justify-between gap-4 py-0.5">
                                        <span className="flex items-center gap-1.5 text-slate-300">
                                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
                                          {entry.name}:
                                        </span>
                                        <span className="font-bold text-white">{formatAED(Number(entry.value) || 0)}</span>
                                      </div>
                                    ))}
                                    {payload.length >= 2 && (
                                      <div className="mt-1.5 pt-1.5 border-t border-slate-700 flex items-center justify-between text-[11px]">
                                        <span className="text-slate-400">Variance:</span>
                                        {(() => {
                                          const est = Number(payload[0]?.value) || 0;
                                          const act = Number(payload[1]?.value) || 0;
                                          const diff = act - est;
                                          return (
                                            <span className={`font-bold ${diff > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                              {diff > 0 ? `+${formatAED(diff)} (Overrun)` : `${formatAED(diff)} (Within Budget)`}
                                            </span>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="Estimated" fill="#2563eb" name="Estimated Budget (AED)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Actual" fill="#10b981" name="Actual Incurred (AED)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200 mt-2 flex items-center justify-between">
                      <span>Total Actual Expenses Logged: <strong className="text-slate-800">{formatAED(selectedProjectActualsByCategory.Total)}</strong></span>
                      <button
                        onClick={() => onOpenActuals(selectedChartProject.id)}
                        className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 hover:underline"
                      >
                        <span>Open Actuals Expense Log</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Core Category KPI Highlights Cards (Labor, Material, Transport, Equipment/Other) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              {/* Labor Highlight */}
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 shadow-2xs">
                <div className="flex items-center justify-between text-blue-800 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Labor Cost</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-200 text-blue-900">
                    {categoryPercentages.labour.toFixed(1)}%
                  </span>
                </div>
                <div className="text-lg font-black text-blue-950">
                  {formatAED(selectedChartProject.directLabourTotal || 0)}
                </div>
                <div className="text-[11px] text-blue-700 mt-0.5 flex items-center justify-between">
                  <span>{selectedChartProject.labourCosts?.length || 0} crew roles</span>
                  <span>{selectedChartProject.numberOfVisits} visits</span>
                </div>
              </div>

              {/* Material Highlight */}
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-2xs">
                <div className="flex items-center justify-between text-emerald-800 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Material & Chem.</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-200 text-emerald-900">
                    {categoryPercentages.material.toFixed(1)}%
                  </span>
                </div>
                <div className="text-lg font-black text-emerald-950">
                  {formatAED(selectedChartProject.materialChemicalTotal || 0)}
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5 flex items-center justify-between">
                  <span>{selectedChartProject.materialCosts?.length || 0} items budgeted</span>
                  <span>Store synced</span>
                </div>
              </div>

              {/* Transport Highlight */}
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 shadow-2xs">
                <div className="flex items-center justify-between text-amber-800 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Transport & Site</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-200 text-amber-900">
                    {categoryPercentages.transport.toFixed(1)}%
                  </span>
                </div>
                <div className="text-lg font-black text-amber-950">
                  {formatAED(selectedChartProject.transportationTotal || 0)}
                </div>
                <div className="text-[11px] text-amber-700 mt-0.5 flex items-center justify-between">
                  <span>{selectedChartProject.transportCosts?.length || 0} logistics items</span>
                  <span>Fuel & Tolls</span>
                </div>
              </div>

              {/* Equipment, Overhead & Other Highlight */}
              <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 shadow-2xs">
                <div className="flex items-center justify-between text-purple-800 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Equip. & Overheads</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-purple-200 text-purple-900">
                    {(categoryPercentages.equipment + categoryPercentages.other).toFixed(1)}%
                  </span>
                </div>
                <div className="text-lg font-black text-purple-950">
                  {formatAED(
                    (selectedChartProject.equipmentTotal || 0) +
                    (selectedChartProject.subcontractorTotal || 0) +
                    (selectedChartProject.overheadTotal || 0) +
                    (selectedChartProject.contingencyTotal || 0)
                  )}
                </div>
                <div className="text-[11px] text-purple-700 mt-0.5 flex items-center justify-between">
                  <span>Rentals & Subcontractors</span>
                  <span>Contingency</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Project View Section Header & View Switcher */}
      <div id="project-view-section" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Project Registry & Schedule Operations</span>
          </h2>
          <p className="text-xs text-slate-500">
            {projectViewMode === 'table'
              ? 'Complete project costing register, approval statuses, financial margins, and quick actions'
              : 'Gantt schedule timeline plotting start and completion dates with automated overlap conflict detection'}
          </p>
        </div>

        {/* View Switcher Toggle */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
          <button
            onClick={() => setProjectViewMode('table')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              projectViewMode === 'table'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-4 h-4 text-blue-600" />
            <span>Table Register</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
              {filteredProjects.length}
            </span>
          </button>

          <button
            onClick={() => setProjectViewMode('timeline')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              projectViewMode === 'timeline'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarRange className="w-4 h-4 text-purple-600" />
            <span>Schedule Timeline</span>
            {overlapCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center gap-0.5" title={`${overlapCount} projects have overlapping dates`}>
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                {overlapCount} Overlaps
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                {filteredProjects.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by customer, project ID, reference, salesperson, or keyword..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Division Filter */}
          <select
            aria-label="Filter by Division"
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-hidden"
          >
            <option value="ALL">All Divisions</option>
            {divisions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Contract Type */}
          <select
            aria-label="Filter by Contract Type"
            value={contractTypeFilter}
            onChange={(e) => setContractTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-hidden"
          >
            <option value="ALL">All Contract Types</option>
            <option value="One-Time">One-Time</option>
            <option value="AMC">AMC (Annual)</option>
            <option value="Recurring">Recurring</option>
            <option value="Project-Based">Project-Based</option>
          </select>

          {/* Status */}
          <select
            aria-label="Filter by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Under Review">Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Quoted">Quoted</option>
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
            <option value="Completed">Completed</option>
          </select>

          {/* Toggle: Show Archived Projects */}
          <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors shrink-0 select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
            />
            <Archive className="w-3.5 h-3.5 text-slate-500" />
            <span>Show Archived Projects</span>
            {stats.archivedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
                {stats.archivedCount}
              </span>
            )}
          </label>
        </div>

        {alertFilter !== 'ALL' && (
          <div className="flex items-center justify-between text-xs bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700">
            <span>
              Showing filter: <strong>{alertFilter.replace('_', ' ')}</strong> ({filteredProjects.length} matching)
            </span>
            <button
              onClick={() => setAlertFilter('ALL')}
              className="font-bold text-blue-600 hover:underline"
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>

      {/* Projects View: Timeline Gantt vs Table Register */}
      {projectViewMode === 'timeline' ? (
        <ProjectTimelineView
          projects={filteredProjects}
          onSelectProject={onSelectProject}
          onOpenActuals={onOpenActuals}
          onPrepareQuotation={onPrepareQuotation}
        />
      ) : (
        /* Projects Table (Section 11) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="p-3">Project ID</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Division</th>
                <th className="p-3 text-right">Estimated Cost</th>
                <th className="p-3 text-right">Selling Price</th>
                <th className="p-3 text-right">Expected Profit</th>
                <th className="p-3 text-center">Profit Margin %</th>
                <th className="p-3 text-right">Actual Cost</th>
                <th className="p-3 text-right">Actual Profit</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProjects.map((p) => {
                const actCost = actualCostMap[p.id] || 0;
                const isOverrun = actCost > p.estimatedTotalCost && p.estimatedTotalCost > 0;
                const revenue = p.recognizedRevenueBeforeVat || (p.status === 'Completed' ? p.quotedSellingPrice : 0);
                const actualProfit = revenue > 0 ? revenue - actCost : (p.quotedSellingPrice - actCost);
                const isLowMargin = p.expectedProfitMarginPercentage < 15 || p.expectedProfit <= 0;

                const isSelectedForChart = selectedChartProject?.id === p.id;

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      isSelectedForChart
                        ? 'bg-blue-50/70 border-l-4 border-l-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Project ID */}
                    <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onSelectProject(p)}
                          className="hover:text-blue-600 hover:underline text-left font-bold"
                        >
                          {p.id}
                        </button>
                        {isSelectedForChart && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-blue-600 text-white tracking-wider">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block font-normal font-sans">
                        {p.projectReference}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="p-3 max-w-[180px]">
                      <div className="font-bold text-slate-900 truncate" title={p.customerName}>
                        {p.customerName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5" title={p.projectName}>
                        <span className="truncate">{p.projectName}</span>
                        {p.attachments && p.attachments.length > 0 && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] text-blue-700 bg-blue-100/80 px-1.5 py-0.2 rounded font-bold shrink-0 border border-blue-200"
                            title={`${p.attachments.length} attached site photo(s) / document(s)`}
                          >
                            <Paperclip className="w-2.5 h-2.5" />
                            <span>{p.attachments.length}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Division */}
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-semibold">
                        {p.division}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        {p.contractType} ({p.numberOfVisits} visits)
                      </span>
                    </td>

                    {/* Estimated Cost */}
                    <td className="p-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                      {formatAED(p.estimatedTotalCost)}
                    </td>

                    {/* Selling Price */}
                    <td className="p-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatAED(p.quotedSellingPrice)}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        excl. VAT
                      </span>
                    </td>

                    {/* Expected Profit */}
                    <td className="p-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      <span className={p.expectedProfit <= 0 ? 'text-red-600' : 'text-emerald-700'}>
                        {formatAED(p.expectedProfit)}
                      </span>
                    </td>

                    {/* Profit Margin % */}
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                        isLowMargin
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {p.expectedProfitMarginPercentage.toFixed(1)}%
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Markup: {p.expectedMarkupPercentage.toFixed(1)}%
                      </span>
                    </td>

                    {/* Actual Cost */}
                    <td className="p-3 text-right font-semibold whitespace-nowrap">
                      <span className={isOverrun ? 'text-red-700 font-bold' : 'text-slate-700'}>
                        {formatAED(actCost)}
                      </span>
                      {isOverrun && (
                        <span className="block text-[9px] uppercase font-bold text-red-600">
                          OVERRUN
                        </span>
                      )}
                    </td>

                    {/* Actual Profit */}
                    <td className="p-3 text-right font-bold whitespace-nowrap">
                      <span className={actualProfit < 0 ? 'text-red-600' : 'text-slate-800'}>
                        {formatAED(actualProfit)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                        p.status === 'Won' ? 'bg-blue-100 text-blue-800' :
                        p.status === 'Completed' ? 'bg-purple-100 text-purple-800' :
                        p.status === 'Under Review' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {p.status}
                      </span>
                      {p.isArchived && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-200 text-slate-800 border border-slate-300">
                            <Archive className="w-2.5 h-2.5 text-slate-600" />
                            Archived
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedChartProjectId(p.id);
                            const el = document.getElementById('project-cost-charts');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className={`p-1 rounded transition-colors ${
                            isSelectedForChart
                              ? 'text-blue-600 bg-blue-100 font-bold ring-1 ring-blue-300'
                              : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                          title="Visualize Cost Breakdown in Charts"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onSelectProject(p)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Open Costing & Calculator"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenActuals(p.id)}
                          className="p-1 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                          title="Track Actual Expenses"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onPrepareQuotation(p)}
                          className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="Prepare Official Quotation"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => exportSingleProjectCostSheet(p)}
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                          title="Export Cost Sheet (Excel)"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {onToggleArchive && (
                          <button
                            onClick={() => onToggleArchive(p)}
                            className="p-1 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                            title={p.isArchived ? "Restore / Unarchive Project" : "Archive Project"}
                          >
                            {p.isArchived ? (
                              <ArchiveRestore className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <Archive className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400 italic">
                    No project costing records match your search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};
