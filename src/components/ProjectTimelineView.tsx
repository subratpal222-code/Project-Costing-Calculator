/**
 * ABC LLC - Project Scheduling & Overlap Timeline (Gantt View)
 * Displays projects based on start and expected completion dates,
 * highlights concurrent resource demands, detects scheduling overlaps,
 * and provides daily concurrency load analytics.
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  FileSpreadsheet,
  FileText,
  Building,
  CheckCircle2,
  CalendarRange,
  Zap,
  Info,
  Maximize2,
  Users,
  X,
  ExternalLink
} from 'lucide-react';
import { ProjectCosting, Division, ProjectStatus } from '../types';
import { formatAED } from '../utils/calculator';

interface ProjectTimelineViewProps {
  projects: ProjectCosting[];
  onSelectProject: (project: ProjectCosting) => void;
  onOpenActuals: (projectId: string) => void;
  onPrepareQuotation: (project: ProjectCosting) => void;
}

// Division palette colors
const DIVISION_COLORS: Record<string, { bg: string; border: string; text: string; bar: string }> = {
  'Enviro Tech Division': {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-800',
    bar: 'from-blue-600 to-indigo-600',
  },
  'Grease Trap Division': {
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    text: 'text-emerald-800',
    bar: 'from-emerald-600 to-teal-600',
  },
  'Chem Tech Division': {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-800',
    bar: 'from-amber-600 to-orange-600',
  },
  'Home Care Division': {
    bg: 'bg-purple-50',
    border: 'border-purple-300',
    text: 'text-purple-800',
    bar: 'from-purple-600 to-pink-600',
  },
  'Pest Control Division': {
    bg: 'bg-rose-50',
    border: 'border-rose-300',
    text: 'text-rose-800',
    bar: 'from-rose-600 to-red-600',
  },
};

const DEFAULT_DIVISION_COLOR = {
  bg: 'bg-slate-50',
  border: 'border-slate-300',
  text: 'text-slate-800',
  bar: 'from-slate-600 to-slate-700',
};

// Status palette colors
const STATUS_COLORS: Record<ProjectStatus, { bg: string; text: string; bar: string }> = {
  'Draft': { bg: 'bg-slate-100', text: 'text-slate-700', bar: 'from-slate-500 to-slate-600' },
  'Under Review': { bg: 'bg-amber-100', text: 'text-amber-800', bar: 'from-amber-500 to-amber-600' },
  'Approved': { bg: 'bg-emerald-100', text: 'text-emerald-800', bar: 'from-emerald-500 to-teal-600' },
  'Quoted': { bg: 'bg-blue-100', text: 'text-blue-800', bar: 'from-blue-500 to-indigo-600' },
  'Won': { bg: 'bg-cyan-100', text: 'text-cyan-800', bar: 'from-cyan-500 to-blue-600' },
  'Lost': { bg: 'bg-rose-100', text: 'text-rose-800', bar: 'from-rose-500 to-rose-600' },
  'Completed': { bg: 'bg-purple-100', text: 'text-purple-800', bar: 'from-purple-500 to-indigo-600' },
};

// Date helper functions
function parseDateString(dateStr?: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateReadable(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDaysBetween(d1: Date, d2: Date): number {
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

function addDays(d: Date, days: number): Date {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

interface OverlapInfo {
  conflictingProject: ProjectCosting;
  overlapDays: number;
  overlapStartDate: string;
  overlapEndDate: string;
  isSameDivision: boolean;
}

interface ProjectTimelineMeta {
  project: ProjectCosting;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  overlaps: OverlapInfo[];
  overlapCount: number;
  hasSameDivisionConflict: boolean;
}

export const ProjectTimelineView: React.FC<ProjectTimelineViewProps> = ({
  projects,
  onSelectProject,
  onOpenActuals,
  onPrepareQuotation,
}) => {
  // Timeline zoom & navigation states
  const [zoomRange, setZoomRange] = useState<'30d' | '90d' | '180d' | 'all'>('90d');
  const [dateOffsetDays, setDateOffsetDays] = useState<number>(0);
  const [colorBy, setColorBy] = useState<'division' | 'status'>('division');
  const [groupBy, setGroupBy] = useState<'none' | 'division' | 'status'>('none');
  const [onlyOverlaps, setOnlyOverlaps] = useState<boolean>(false);
  const [selectedInspectionProject, setSelectedInspectionProject] = useState<ProjectCosting | null>(null);

  // Today reference (October 14, 2026 based on app current date)
  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => formatDateISO(today), [today]);

  // Compute parsed project metadata with overlap detection
  const projectMetas = useMemo<ProjectTimelineMeta[]>(() => {
    // 1. Initial normalization
    const initial = projects.map((p) => {
      let start = parseDateString(p.startDate);
      let end = parseDateString(p.expectedCompletionDate);
      if (end < start) {
        end = new Date(start);
      }
      const duration = Math.max(1, getDaysBetween(start, end) + 1);
      return {
        project: p,
        startDate: start,
        endDate: end,
        durationDays: duration,
        overlaps: [] as OverlapInfo[],
        overlapCount: 0,
        hasSameDivisionConflict: false,
      };
    });

    // 2. Pairwise overlap calculation
    for (let i = 0; i < initial.length; i++) {
      const a = initial[i];
      const aStartUtc = Date.UTC(a.startDate.getFullYear(), a.startDate.getMonth(), a.startDate.getDate());
      const aEndUtc = Date.UTC(a.endDate.getFullYear(), a.endDate.getMonth(), a.endDate.getDate());

      for (let j = 0; j < initial.length; j++) {
        if (i === j) continue;
        const b = initial[j];
        const bStartUtc = Date.UTC(b.startDate.getFullYear(), b.startDate.getMonth(), b.startDate.getDate());
        const bEndUtc = Date.UTC(b.endDate.getFullYear(), b.endDate.getMonth(), b.endDate.getDate());

        // Check date interval intersection: max(startA, startB) <= min(endA, endB)
        const overlapStartUtc = Math.max(aStartUtc, bStartUtc);
        const overlapEndUtc = Math.min(aEndUtc, bEndUtc);

        if (overlapStartUtc <= overlapEndUtc) {
          const overlapDays = Math.round((overlapEndUtc - overlapStartUtc) / (1000 * 60 * 60 * 24)) + 1;
          const isSameDiv = a.project.division === b.project.division;
          
          const overlapStart = new Date(overlapStartUtc);
          const overlapEnd = new Date(overlapEndUtc);

          a.overlaps.push({
            conflictingProject: b.project,
            overlapDays,
            overlapStartDate: formatDateISO(overlapStart),
            overlapEndDate: formatDateISO(overlapEnd),
            isSameDivision: isSameDiv,
          });

          if (isSameDiv) {
            a.hasSameDivisionConflict = true;
          }
        }
      }
      a.overlapCount = a.overlaps.length;
    }

    // Sort by start date ascending
    return initial.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [projects]);

  // Total projects with overlaps count
  const totalProjectsWithOverlaps = useMemo(() => {
    return projectMetas.filter((m) => m.overlapCount > 0).length;
  }, [projectMetas]);

  // Determine overall date window
  const { minTimelineDate, maxTimelineDate, totalTimelineDays } = useMemo(() => {
    if (projectMetas.length === 0) {
      const start = addDays(today, -7);
      const end = addDays(today, 60);
      return {
        minTimelineDate: start,
        maxTimelineDate: end,
        totalTimelineDays: getDaysBetween(start, end) + 1,
      };
    }

    let minDate = new Date(today);
    let maxDate = new Date(today);

    // Find earliest and latest dates across all projects
    for (const m of projectMetas) {
      if (m.startDate < minDate) minDate = new Date(m.startDate);
      if (m.endDate > maxDate) maxDate = new Date(m.endDate);
    }

    if (zoomRange === 'all') {
      const paddedMin = addDays(minDate, -5 + dateOffsetDays);
      const paddedMax = addDays(maxDate, 14 + dateOffsetDays);
      return {
        minTimelineDate: paddedMin,
        maxTimelineDate: paddedMax,
        totalTimelineDays: Math.max(14, getDaysBetween(paddedMin, paddedMax) + 1),
      };
    }

    const durationDays = zoomRange === '30d' ? 35 : zoomRange === '90d' ? 95 : 185;
    // Anchor around today + dateOffsetDays
    const startAnchor = addDays(today, -7 + dateOffsetDays);
    const endAnchor = addDays(startAnchor, durationDays);

    return {
      minTimelineDate: startAnchor,
      maxTimelineDate: endAnchor,
      totalTimelineDays: durationDays + 1,
    };
  }, [projectMetas, zoomRange, dateOffsetDays, today]);

  // Generate day-by-day column headers & daily concurrency histogram data
  const { timelineDays, dailyConcurrency, peakConcurrency } = useMemo(() => {
    const days: { date: Date; iso: string; label: string; dayNum: number; isWeekend: boolean; isToday: boolean }[] = [];
    const concurrency: Record<string, { count: number; projectIds: string[]; projectNames: string[] }> = {};
    let peak = 0;

    for (let i = 0; i < totalTimelineDays; i++) {
      const d = addDays(minTimelineDate, i);
      const iso = formatDateISO(d);
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Fri & Sat in UAE / weekend
      const isToday = iso === todayISO;

      days.push({
        date: d,
        iso,
        label: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        dayNum: d.getDate(),
        isWeekend,
        isToday,
      });

      concurrency[iso] = { count: 0, projectIds: [], projectNames: [] };
    }

    // Populate daily concurrency count
    for (const meta of projectMetas) {
      const startIso = formatDateISO(meta.startDate);
      const endIso = formatDateISO(meta.endDate);

      for (const d of days) {
        if (d.iso >= startIso && d.iso <= endIso) {
          concurrency[d.iso].count++;
          concurrency[d.iso].projectIds.push(meta.project.id);
          concurrency[d.iso].projectNames.push(meta.project.projectName);
          if (concurrency[d.iso].count > peak) {
            peak = concurrency[d.iso].count;
          }
        }
      }
    }

    return {
      timelineDays: days,
      dailyConcurrency: concurrency,
      peakConcurrency: peak,
    };
  }, [minTimelineDate, totalTimelineDays, todayISO, projectMetas]);

  // Grouped or filtered metas based on user selection
  const displayedMetas = useMemo(() => {
    let list = projectMetas;
    if (onlyOverlaps) {
      list = list.filter((m) => m.overlapCount > 0);
    }
    return list;
  }, [projectMetas, onlyOverlaps]);

  // Month intervals for header
  const monthIntervals = useMemo(() => {
    const months: { name: string; year: number; startIndex: number; dayCount: number }[] = [];
    let currentMonth = -1;
    let currentYear = -1;
    let currentStartIndex = 0;
    let currentCount = 0;

    timelineDays.forEach((d, idx) => {
      const m = d.date.getMonth();
      const y = d.date.getFullYear();
      if (m !== currentMonth || y !== currentYear) {
        if (currentMonth !== -1) {
          const dateRef = new Date(currentYear, currentMonth, 1);
          months.push({
            name: dateRef.toLocaleDateString('en-US', { month: 'short' }),
            year: currentYear,
            startIndex: currentStartIndex,
            dayCount: currentCount,
          });
        }
        currentMonth = m;
        currentYear = y;
        currentStartIndex = idx;
        currentCount = 1;
      } else {
        currentCount++;
      }
    });

    if (currentCount > 0) {
      const dateRef = new Date(currentYear, currentMonth, 1);
      months.push({
        name: dateRef.toLocaleDateString('en-US', { month: 'short' }),
        year: currentYear,
        startIndex: currentStartIndex,
        dayCount: currentCount,
      });
    }

    return months;
  }, [timelineDays]);

  // Grouped structure if groupBy is selected
  const groupedSections = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', title: 'All Projects', items: displayedMetas }];
    }
    if (groupBy === 'division') {
      const groups: Record<string, ProjectTimelineMeta[]> = {};
      for (const m of displayedMetas) {
        const div = m.project.division || 'Other';
        if (!groups[div]) groups[div] = [];
        groups[div].push(m);
      }
      return Object.entries(groups).map(([div, items]) => ({
        key: div,
        title: div,
        items,
      }));
    }
    if (groupBy === 'status') {
      const groups: Record<string, ProjectTimelineMeta[]> = {};
      for (const m of displayedMetas) {
        const st = m.project.status;
        if (!groups[st]) groups[st] = [];
        groups[st].push(m);
      }
      return Object.entries(groups).map(([st, items]) => ({
        key: st,
        title: `${st} (${items.length})`,
        items,
      }));
    }
    return [{ key: 'all', title: 'All Projects', items: displayedMetas }];
  }, [groupBy, displayedMetas]);

  // Width per day calculation (px)
  const dayColumnWidth = zoomRange === '30d' ? 36 : zoomRange === '90d' ? 24 : 16;
  const timelineContentWidth = timelineDays.length * dayColumnWidth;

  // Calculate project bar position on the grid
  const getBarPosition = (meta: ProjectTimelineMeta) => {
    const startDiff = getDaysBetween(minTimelineDate, meta.startDate);
    const endDiff = getDaysBetween(minTimelineDate, meta.endDate);

    const left = startDiff * dayColumnWidth;
    const width = Math.max(dayColumnWidth, (endDiff - startDiff + 1) * dayColumnWidth);

    return { left, width };
  };

  // Today marker offset in px
  const todayMarkerOffset = useMemo(() => {
    const diff = getDaysBetween(minTimelineDate, today);
    if (diff < 0 || diff >= totalTimelineDays) return null;
    return diff * dayColumnWidth + dayColumnWidth / 2;
  }, [minTimelineDate, today, totalTimelineDays, dayColumnWidth]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Top Banner & Overlap Intelligence Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-600/30 border border-purple-500/40 text-purple-300 text-[11px] font-bold tracking-wide uppercase">
                <CalendarRange className="w-3.5 h-3.5" />
                Schedule Gantt & Overlap Analyzer
              </span>
              <span className="text-xs text-slate-400">
                {displayedMetas.length} Scheduled Project{displayedMetas.length === 1 ? '' : 's'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Project Timeline & Resource Concurrency</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
              Visualizes project execution spans from start to expected completion date, helping operations prevent crew bottlenecks and overlapping site commitments.
            </p>
          </div>

          {/* Overlap Summary KPIs */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Overlap KPI */}
            <div className={`px-3.5 py-2 rounded-xl border flex items-center gap-2.5 ${
              totalProjectsWithOverlaps > 0
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
            }`}>
              <div className={`p-1.5 rounded-lg ${
                totalProjectsWithOverlaps > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {totalProjectsWithOverlaps > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                  Scheduling Overlaps
                </div>
                <div className="text-sm font-black">
                  {totalProjectsWithOverlaps} Project{totalProjectsWithOverlaps === 1 ? '' : 's'} Overlapping
                </div>
              </div>
            </div>

            {/* Peak Concurrency KPI */}
            <div className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-200 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Peak Concurrency
                </div>
                <div className="text-sm font-black text-white">
                  {peakConcurrency} Simultaneous Project{peakConcurrency === 1 ? '' : 's'}
                </div>
              </div>
            </div>

            {/* Overlap Filter Toggle Button */}
            <button
              onClick={() => setOnlyOverlaps(!onlyOverlaps)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                onlyOverlaps
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-2 ring-amber-400/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Show only projects with overlapping dates"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{onlyOverlaps ? 'Showing Overlaps Only' : 'Filter Overlaps Only'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Zoom, Date Steppers, Color & Group By */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Date Stepper and Range Preset */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Offset Steppers */}
          <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={() => setDateOffsetDays((prev) => prev - (zoomRange === '30d' ? 14 : 30))}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
              title="Step backward in time"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDateOffsetDays(0)}
              className="px-2.5 py-1 text-slate-700 font-bold hover:bg-slate-100 rounded transition-colors"
              title="Reset view centered on Today"
            >
              Today
            </button>
            <button
              onClick={() => setDateOffsetDays((prev) => prev + (zoomRange === '30d' ? 14 : 30))}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
              title="Step forward in time"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Date range label */}
          <div className="text-slate-600 font-medium hidden sm:inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {formatDateReadable(minTimelineDate)} – {formatDateReadable(maxTimelineDate)}
            </span>
          </div>

          {/* Zoom Presets */}
          <div className="inline-flex bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={() => { setZoomRange('30d'); setDateOffsetDays(0); }}
              className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                zoomRange === '30d' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => { setZoomRange('90d'); setDateOffsetDays(0); }}
              className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                zoomRange === '90d' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3 Months
            </button>
            <button
              onClick={() => { setZoomRange('180d'); setDateOffsetDays(0); }}
              className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                zoomRange === '180d' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              6 Months
            </button>
            <button
              onClick={() => { setZoomRange('all'); setDateOffsetDays(0); }}
              className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                zoomRange === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fit All
            </button>
          </div>
        </div>

        {/* Right: Grouping & Color Options */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Group By */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Group:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-semibold focus:outline-hidden"
            >
              <option value="none">Flat List (Date Sorted)</option>
              <option value="division">By Division</option>
              <option value="status">By Project Status</option>
            </select>
          </div>

          {/* Color by */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Color:</span>
            <div className="inline-flex bg-white border border-slate-200 rounded-lg p-0.5">
              <button
                onClick={() => setColorBy('division')}
                className={`px-2 py-0.5 rounded font-semibold ${
                  colorBy === 'division' ? 'bg-slate-800 text-white' : 'text-slate-600'
                }`}
              >
                Division
              </button>
              <button
                onClick={() => setColorBy('status')}
                className={`px-2 py-0.5 rounded font-semibold ${
                  colorBy === 'status' ? 'bg-slate-800 text-white' : 'text-slate-600'
                }`}
              >
                Status
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlap Alert Notice Banner if any detected */}
      {totalProjectsWithOverlaps > 0 && !onlyOverlaps && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Resource Scheduling Alert:</strong> {totalProjectsWithOverlaps} projects share overlapping execution dates. Yellow/amber pills highlight concurrent commitments. Click any bar to inspect conflicting projects.
            </span>
          </div>
          <button
            onClick={() => setOnlyOverlaps(true)}
            className="text-amber-800 font-bold hover:underline shrink-0 ml-3"
          >
            Show Only Overlaps
          </button>
        </div>
      )}

      {/* Main Gantt Canvas with Sticky Left Sidebar */}
      <div className="overflow-x-auto relative max-h-[640px] overflow-y-auto">
        <div className="inline-flex min-w-full">
          {/* Left Column: Fixed Project Info Panel */}
          <div className="w-[280px] sm:w-[320px] shrink-0 sticky left-0 z-20 bg-white border-r border-slate-200 shadow-[4px_0_12px_rgba(0,0,0,0.03)]">
            {/* Header placeholder matching timeline header height */}
            <div className="h-[76px] bg-slate-100 border-b border-slate-200 p-3 flex flex-col justify-end">
              <div className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center justify-between">
                <span>Project & Customer</span>
                <span>Duration</span>
              </div>
            </div>

            {/* Project Rows (matching right Gantt bar rows) */}
            {groupedSections.map((sec) => (
              <React.Fragment key={`left-${sec.key}`}>
                {groupBy !== 'none' && (
                  <div className="bg-slate-100/90 px-3 py-1.5 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-700 sticky top-[76px] z-10 flex items-center justify-between">
                    <span>{sec.title}</span>
                    <span className="text-[10px] text-slate-500 font-normal">{sec.items.length} items</span>
                  </div>
                )}
                {sec.items.map((m) => {
                  const isSelected = selectedInspectionProject?.id === m.project.id;
                  const divCol = DIVISION_COLORS[m.project.division] || DEFAULT_DIVISION_COLOR;

                  return (
                    <div
                      key={`left-row-${m.project.id}`}
                      onClick={() => setSelectedInspectionProject(m.project)}
                      className={`h-[60px] p-2.5 border-b border-slate-100 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50/90 border-l-4 border-l-blue-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 text-[11px] truncate">
                            {m.project.id}
                          </span>
                          {m.overlapCount > 0 && (
                            <span
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                                m.hasSameDivisionConflict
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                              title={`${m.overlapCount} overlapping project(s). ${m.hasSameDivisionConflict ? 'Same division conflict!' : ''}`}
                            >
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {m.overlapCount}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-700 truncate" title={m.project.projectName}>
                          {m.project.projectName}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                          <span className="truncate">{m.project.customerName}</span>
                          <span>•</span>
                          <span className={divCol.text}>{m.project.division.replace(' Division', '')}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-slate-800 text-[11px]">
                          {m.durationDays}d
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatAED(m.project.quotedSellingPrice)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}

            {displayedMetas.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                No matching projects to display.
              </div>
            )}
          </div>

          {/* Right Gantt Canvas Area */}
          <div
            className="flex-1 relative bg-white"
            style={{ width: `${timelineContentWidth}px`, minWidth: `${timelineContentWidth}px` }}
          >
            {/* Top Date Header (Month Row + Day Row) */}
            <div className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200">
              {/* Month Blocks */}
              <div className="h-[36px] flex border-b border-slate-200">
                {monthIntervals.map((m, idx) => (
                  <div
                    key={`month-${idx}`}
                    className="border-r border-slate-200 px-2 flex items-center justify-between text-xs font-black text-slate-700 bg-slate-100/80"
                    style={{ width: `${m.dayCount * dayColumnWidth}px` }}
                  >
                    <span>{m.name} {m.year}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{m.dayCount} days</span>
                  </div>
                ))}
              </div>

              {/* Day / Date Ticks */}
              <div className="h-[40px] flex">
                {timelineDays.map((d, idx) => (
                  <div
                    key={`day-${idx}`}
                    className={`border-r border-slate-200/80 flex flex-col items-center justify-center text-[10px] shrink-0 transition-colors ${
                      d.isToday
                        ? 'bg-blue-600 text-white font-bold'
                        : d.isWeekend
                        ? 'bg-slate-200/60 text-slate-500'
                        : 'text-slate-600'
                    }`}
                    style={{ width: `${dayColumnWidth}px` }}
                    title={`${d.iso}${d.isToday ? ' (Today)' : ''}`}
                  >
                    <span className="text-[9px] uppercase leading-none opacity-80">{d.label}</span>
                    <span className="font-extrabold leading-tight">{d.dayNum}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Today Vertical Reference Line across entire canvas */}
            {todayMarkerOffset !== null && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-15 border-l-2 border-dashed border-red-500"
                style={{ left: `${todayMarkerOffset}px` }}
              >
                <div className="sticky top-[78px] -translate-x-1/2 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                  Today
                </div>
              </div>
            )}

            {/* Daily Grid Background Columns */}
            <div className="absolute inset-0 top-[76px] flex pointer-events-none">
              {timelineDays.map((d, idx) => (
                <div
                  key={`grid-col-${idx}`}
                  className={`border-r border-slate-100 h-full shrink-0 ${
                    d.isWeekend ? 'bg-slate-50/50' : ''
                  }`}
                  style={{ width: `${dayColumnWidth}px` }}
                />
              ))}
            </div>

            {/* Gantt Project Rows */}
            <div className="relative z-1">
              {groupedSections.map((sec) => (
                <React.Fragment key={`right-${sec.key}`}>
                  {groupBy !== 'none' && (
                    <div className="h-[29px] bg-slate-50/90 border-b border-slate-200" />
                  )}
                  {sec.items.map((m) => {
                    const isSelected = selectedInspectionProject?.id === m.project.id;
                    const { left, width } = getBarPosition(m);

                    // Color scheme
                    const divCol = DIVISION_COLORS[m.project.division] || DEFAULT_DIVISION_COLOR;
                    const statCol = STATUS_COLORS[m.project.status] || STATUS_COLORS['Draft'];
                    const barGradient = colorBy === 'division' ? divCol.bar : statCol.bar;

                    return (
                      <div
                        key={`bar-row-${m.project.id}`}
                        className={`h-[60px] border-b border-slate-100 relative flex items-center transition-colors ${
                          isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/40'
                        }`}
                      >
                        {/* Project Bar */}
                        <div
                          onClick={() => setSelectedInspectionProject(m.project)}
                          className={`absolute h-[38px] rounded-xl bg-gradient-to-r ${barGradient} text-white shadow-xs p-1.5 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md ${
                            m.overlapCount > 0
                              ? m.hasSameDivisionConflict
                                ? 'ring-2 ring-rose-500 ring-offset-1'
                                : 'ring-2 ring-amber-400 ring-offset-1'
                              : ''
                          } ${isSelected ? 'ring-3 ring-blue-500 ring-offset-2' : ''}`}
                          style={{
                            left: `${left}px`,
                            width: `${width}px`,
                            minWidth: `${Math.max(28, dayColumnWidth)}px`,
                          }}
                          title={`${m.project.projectName} (${m.project.startDate} to ${m.project.expectedCompletionDate})`}
                        >
                          {/* Inner bar content */}
                          <div className="flex items-center gap-1.5 truncate pr-1">
                            {m.overlapCount > 0 && (
                              <span
                                className={`p-0.5 rounded-full shrink-0 ${
                                  m.hasSameDivisionConflict ? 'bg-rose-900 text-rose-200' : 'bg-amber-900 text-amber-200'
                                }`}
                                title={`${m.overlapCount} overlaps detected`}
                              >
                                <AlertTriangle className="w-3 h-3" />
                              </span>
                            )}
                            <span className="font-mono font-bold text-[11px] truncate">
                              {m.project.id}
                            </span>
                            <span className="text-[10px] opacity-90 truncate hidden sm:inline">
                              • {m.project.projectName}
                            </span>
                          </div>

                          <div className="shrink-0 text-[10px] font-black bg-black/20 px-1.5 py-0.5 rounded ml-1">
                            {m.durationDays}d
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Concurrency Load Histogram */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs mb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600" />
            <span className="font-bold text-slate-800">Resource Load & Daily Concurrency Heatmap:</span>
            <span className="text-slate-500">
              Peak {peakConcurrency} project{peakConcurrency === 1 ? '' : 's'} scheduled simultaneously
            </span>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px] text-slate-600">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 inline-block" />
              <span>0 Idle</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
              <span>1 Single</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
              <span>2 Overlap</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-600 inline-block" />
              <span>3+ High Concurrency</span>
            </div>
          </div>
        </div>

        {/* Mini heat bars row */}
        <div className="flex items-end gap-0.5 h-8 w-full overflow-x-auto pb-1">
          {timelineDays.map((d, idx) => {
            const count = dailyConcurrency[d.iso]?.count || 0;
            const heightPercent = peakConcurrency > 0 ? Math.max(15, (count / peakConcurrency) * 100) : 10;
            const barBg =
              count === 0
                ? 'bg-slate-200'
                : count === 1
                ? 'bg-blue-500'
                : count === 2
                ? 'bg-amber-500'
                : 'bg-rose-600';

            return (
              <div
                key={`hist-${idx}`}
                className="flex-1 min-w-[6px] h-full flex flex-col justify-end group relative"
              >
                <div
                  className={`w-full rounded-t-xs transition-all ${barBg} group-hover:opacity-80`}
                  style={{ height: count === 0 ? '4px' : `${heightPercent}%` }}
                />
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-xl z-30 whitespace-nowrap pointer-events-none">
                  <div className="font-bold text-amber-300">{d.iso}</div>
                  <div>{count} Active Project{count === 1 ? '' : 's'}</div>
                  {dailyConcurrency[d.iso]?.projectIds.length > 0 && (
                    <div className="text-slate-300 text-[9px] mt-0.5 max-w-[200px] truncate">
                      {dailyConcurrency[d.iso].projectIds.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Project Overlap Details Modal / Drawer */}
      {selectedInspectionProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono px-2 py-0.5 rounded bg-blue-600 text-white text-xs font-bold">
                    {selectedInspectionProject.id}
                  </span>
                  <span className="text-xs text-slate-300">
                    Ref: {selectedInspectionProject.projectReference}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-semibold">
                    {selectedInspectionProject.division}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  {selectedInspectionProject.projectName}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Client: <strong className="text-white">{selectedInspectionProject.customerName}</strong> • Location: {selectedInspectionProject.siteLocation || 'Dubai, UAE'}
                </p>
              </div>

              <button
                onClick={() => setSelectedInspectionProject(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Schedule Dates Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Start Date</span>
                  <span className="text-xs font-black text-slate-800">
                    {selectedInspectionProject.startDate}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Completion Date</span>
                  <span className="text-xs font-black text-slate-800">
                    {selectedInspectionProject.expectedCompletionDate}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Visits / Duration</span>
                  <span className="text-xs font-black text-slate-800">
                    {selectedInspectionProject.numberOfVisits} visit(s) ({selectedInspectionProject.estimatedDuration || 'N/A'})
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Quoted Price</span>
                  <span className="text-xs font-black text-emerald-600">
                    {formatAED(selectedInspectionProject.quotedSellingPrice)}
                  </span>
                </div>
              </div>

              {/* Overlap Intelligence Section */}
              {(() => {
                const meta = projectMetas.find((m) => m.project.id === selectedInspectionProject.id);
                const overlaps = meta?.overlaps || [];

                return (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <AlertTriangle className={`w-4 h-4 ${overlaps.length > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
                        Scheduling Overlap Analysis ({overlaps.length} conflict{overlaps.length === 1 ? '' : 's'})
                      </h4>
                      {meta?.hasSameDivisionConflict && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                          Critical: Same Division Crew Conflict
                        </span>
                      )}
                    </div>

                    {overlaps.length === 0 ? (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          <strong>No scheduling conflicts:</strong> This project window does not overlap with any other scheduled projects in the registry. Logistics and crew availability are unconstrained.
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {overlaps.map((ov, index) => {
                          const cp = ov.conflictingProject;
                          return (
                            <div
                              key={`conflict-${index}`}
                              className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                                ov.isSameDivision
                                  ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                                  : 'bg-amber-50/70 border-amber-200 text-amber-950'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-mono font-bold text-slate-900">
                                    {cp.id}
                                  </span>
                                  <span className="font-semibold text-slate-700 truncate">
                                    {cp.projectName}
                                  </span>
                                  {ov.isSameDivision && (
                                    <span className="px-1.5 py-0.2 rounded bg-rose-200 text-rose-800 text-[9px] font-extrabold uppercase">
                                      Same Crew
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-600 flex items-center gap-2">
                                  <span>Client: {cp.customerName}</span>
                                  <span>•</span>
                                  <span>Window: {cp.startDate} to {cp.expectedCompletionDate}</span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="inline-block px-2 py-0.5 rounded-lg bg-white/80 font-bold text-[11px] border border-slate-200 shadow-2xs">
                                  ⚡ {ov.overlapDays} Overlapping Day{ov.overlapDays === 1 ? '' : 's'}
                                </span>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {ov.overlapStartDate} to {ov.overlapEndDate}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-xs text-slate-500">
                Created by Sales: {selectedInspectionProject.salespersonName || 'Unassigned'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const p = selectedInspectionProject;
                    setSelectedInspectionProject(null);
                    onSelectProject(p);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Costing Form</span>
                </button>
                <button
                  onClick={() => {
                    const id = selectedInspectionProject.id;
                    setSelectedInspectionProject(null);
                    onOpenActuals(id);
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Track Expenses</span>
                </button>
                <button
                  onClick={() => {
                    const p = selectedInspectionProject;
                    setSelectedInspectionProject(null);
                    onPrepareQuotation(p);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Prepare Quotation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
