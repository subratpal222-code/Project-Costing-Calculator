/**
 * ABC LLC - Global Search Bar Component
 * Unified search engine in the Header to search projects, customers, and store materials by name or ID.
 * Features instant results, entity type filtering, keyboard navigation (Ctrl+K / ⌘K), and direct action links.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  X, 
  Building2, 
  Briefcase, 
  Package, 
  ChevronRight, 
  FileText, 
  FileSpreadsheet, 
  PlusCircle, 
  MapPin, 
  Phone, 
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Command,
  CornerDownLeft
} from 'lucide-react';
import { ProjectCosting, Customer, StoreInventoryItem } from '../types';
import { formatAED } from '../utils/calculator';

export type SearchCategory = 'all' | 'projects' | 'customers' | 'materials';

export interface GlobalSearchBarProps {
  projects: ProjectCosting[];
  customers: Customer[];
  inventory: StoreInventoryItem[];
  onSelectProject: (project: ProjectCosting, targetTab?: string) => void;
  onSelectCustomer: (customer: Customer, action?: 'view' | 'new-costing') => void;
  onSelectMaterial: (item: StoreInventoryItem, action?: 'view' | 'issue') => void;
  className?: string;
}

interface HighlightedTextProps {
  text: string;
  query: string;
}

const HighlightedText: React.FC<HighlightedTextProps> = ({ text, query }) => {
  if (!query || !text) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-amber-300 text-slate-900 rounded-xs px-0.5 font-bold">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  projects,
  customers,
  inventory,
  onSelectProject,
  onSelectCustomer,
  onSelectMaterial,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('all');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener (Ctrl+K or ⌘K or '/')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open search on Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      // If user presses '/' when not focused on another input
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      // Escape closes
      if (e.key === 'Escape' && (isOpen || isMobileModalOpen)) {
        setIsOpen(false);
        setIsMobileModalOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMobileModalOpen]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter Projects
  const matchingProjects = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      return (
        p.id.toLowerCase().includes(q) ||
        p.projectReference.toLowerCase().includes(q) ||
        p.projectName.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        p.division.toLowerCase().includes(q) ||
        p.serviceType.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q) ||
        (p.contactPerson && p.contactPerson.toLowerCase().includes(q))
      );
    });
  }, [projects, query]);

  // Filter Customers
  const matchingCustomers = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      return (
        c.id.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.contactPerson.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    });
  }, [customers, query]);

  // Filter Material Items
  const matchingMaterials = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return inventory.filter((item) => {
      const code = item.itemCode || item.sku || '';
      return (
        item.id.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.unit.toLowerCase().includes(q)
      );
    });
  }, [inventory, query]);

  // Aggregate current list of results based on selected category
  const filteredResults = useMemo(() => {
    type UnifiedResult = 
      | { type: 'project'; data: ProjectCosting }
      | { type: 'customer'; data: Customer }
      | { type: 'material'; data: StoreInventoryItem };

    const items: UnifiedResult[] = [];

    if (selectedCategory === 'all' || selectedCategory === 'projects') {
      matchingProjects.forEach((p) => items.push({ type: 'project', data: p }));
    }
    if (selectedCategory === 'all' || selectedCategory === 'customers') {
      matchingCustomers.forEach((c) => items.push({ type: 'customer', data: c }));
    }
    if (selectedCategory === 'all' || selectedCategory === 'materials') {
      matchingMaterials.forEach((m) => items.push({ type: 'material', data: m }));
    }

    return items;
  }, [selectedCategory, matchingProjects, matchingCustomers, matchingMaterials]);

  // Handle arrow key navigation in results
  const handleKeyDownInInput = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredResults[highlightedIndex];
      if (current) {
        if (current.type === 'project') {
          handleSelectProject(current.data, 'costing');
        } else if (current.type === 'customer') {
          handleSelectCustomer(current.data);
        } else if (current.type === 'material') {
          handleSelectMaterial(current.data, 'view');
        }
      }
    }
  };

  const handleSelectProject = (project: ProjectCosting, tab: string = 'costing') => {
    onSelectProject(project, tab);
    setIsOpen(false);
    setIsMobileModalOpen(false);
  };

  const handleSelectCustomer = (customer: Customer, action: 'view' | 'new-costing' = 'view') => {
    onSelectCustomer(customer, action);
    setIsOpen(false);
    setIsMobileModalOpen(false);
  };

  const handleSelectMaterial = (item: StoreInventoryItem, action: 'view' | 'issue' = 'view') => {
    onSelectMaterial(item, action);
    setIsOpen(false);
    setIsMobileModalOpen(false);
  };

  const totalResultsCount = matchingProjects.length + matchingCustomers.length + matchingMaterials.length;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input Bar (Desktop / Tablet) */}
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4 text-cyan-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDownInInput}
          placeholder="Search projects, customers, materials by name or ID..."
          aria-label="Global Search for projects, customers, and materials"
          className="w-full pl-9 pr-20 py-1.5 text-xs sm:text-sm bg-slate-800/90 hover:bg-slate-800 focus:bg-slate-900 text-white placeholder-slate-400 border border-slate-700 focus:border-cyan-500 rounded-lg outline-hidden transition-all shadow-inner focus:ring-1 focus:ring-cyan-500"
        />

        {/* Clear or Shortcut badge */}
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
          {query ? (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-700/60 transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-700/70 rounded border border-slate-600/80">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown Menu Results */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-md max-h-[80vh] flex flex-col min-w-[320px] sm:min-w-[480px] lg:min-w-[560px]">
          {/* Category Filter Chips Bar */}
          <div className="px-3 py-2 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between text-xs gap-1 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                All ({query.trim() ? totalResultsCount : projects.length + customers.length + inventory.length})
              </button>
              <button
                onClick={() => setSelectedCategory('projects')}
                className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-colors ${
                  selectedCategory === 'projects'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <Briefcase className="w-3 h-3 text-blue-300" />
                Projects ({query.trim() ? matchingProjects.length : projects.length})
              </button>
              <button
                onClick={() => setSelectedCategory('customers')}
                className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-colors ${
                  selectedCategory === 'customers'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <Building2 className="w-3 h-3 text-emerald-300" />
                Customers ({query.trim() ? matchingCustomers.length : customers.length})
              </button>
              <button
                onClick={() => setSelectedCategory('materials')}
                className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-colors ${
                  selectedCategory === 'materials'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <Package className="w-3 h-3 text-amber-300" />
                Materials ({query.trim() ? matchingMaterials.length : inventory.length})
              </button>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-700/50"
              title="Close search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Results List */}
          <div className="overflow-y-auto max-h-[460px] divide-y divide-slate-800/80 p-1.5 space-y-1">
            {query.trim() === '' ? (
              // Empty search state - show quick suggestions and instructions
              <div className="p-4 text-xs text-slate-400">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Quick Finder across ABC LLC Database</span>
                </div>
                <p className="mb-3 text-slate-300 leading-relaxed">
                  Type an ID (e.g. <span className="font-mono text-cyan-300">ABC-PC-2026-001</span>, <span className="font-mono text-emerald-300">CUST-001</span>, <span className="font-mono text-amber-300">CHEM-COIL-01</span>) or name to find projects, clients, or inventory items instantly.
                </p>

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Recent Active Projects
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {projects.slice(0, 4).map((proj) => (
                      <div
                        key={proj.id}
                        onClick={() => handleSelectProject(proj, 'costing')}
                        className="p-2.5 bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/60 cursor-pointer flex items-center justify-between group transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-blue-400">{proj.id}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 font-medium">
                              {proj.division.split(' ')[0]}
                            </span>
                          </div>
                          <div className="text-white text-xs font-medium truncate mt-0.5">{proj.projectName}</div>
                          <div className="text-slate-400 text-[11px] truncate">{proj.customerName}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Press <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">ESC</kbd> to dismiss</span>
                  <span>{projects.length} Projects • {customers.length} Customers • {inventory.length} Stock Materials</span>
                </div>
              </div>
            ) : filteredResults.length === 0 ? (
              // No matches state
              <div className="py-8 px-4 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-80" />
                <h4 className="text-sm font-semibold text-white">No results matched &ldquo;{query}&rdquo;</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  We couldn&rsquo;t find any project, customer, or material with that name or identifier. Try checking for typos or searching by keyword (e.g. &ldquo;Duct&rdquo;, &ldquo;AMC&rdquo;, &ldquo;Dubai&rdquo;, &ldquo;Coil&rdquo;).
                </p>
                <div className="mt-3 flex justify-center gap-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-md border border-slate-700"
                  >
                    Reset Filter (Show All)
                  </button>
                  <button
                    onClick={() => setQuery('')}
                    className="px-3 py-1 bg-cyan-900/60 hover:bg-cyan-800 text-xs text-cyan-300 rounded-md border border-cyan-700/60"
                  >
                    Clear Search
                  </button>
                </div>
              </div>
            ) : (
              // List of Matches
              filteredResults.map((result, idx) => {
                const isSelected = idx === highlightedIndex;

                if (result.type === 'project') {
                  const p = result.data;
                  return (
                    <div
                      key={`p-${p.id}`}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-950/60 border border-blue-600/50' : 'hover:bg-slate-800/70 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1" onClick={() => handleSelectProject(p, 'costing')}>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-900/80 text-blue-300 border border-blue-700/60">
                              <Briefcase className="w-2.5 h-2.5" /> Project
                            </span>
                            <span className="font-mono text-xs font-bold text-cyan-400">
                              <HighlightedText text={p.id} query={query} />
                            </span>
                            {p.projectReference && (
                              <span className="font-mono text-[11px] text-slate-400">
                                Ref: <HighlightedText text={p.projectReference} query={query} />
                              </span>
                            )}
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {p.division}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              p.status === 'Approved' || p.status === 'Won'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}>
                              {p.status}
                            </span>
                          </div>

                          <h4 className="text-sm font-semibold text-white truncate">
                            <HighlightedText text={p.projectName} query={query} />
                          </h4>

                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-500" />
                              <HighlightedText text={p.customerName} query={query} />
                            </span>
                            {p.siteLocation && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate max-w-[150px]">{p.siteLocation}</span>
                              </span>
                            )}
                            <span className="text-emerald-400 font-semibold font-mono">
                              Quoted: {formatAED(p.quotedSellingPrice || p.finalQuotationTotal)}
                            </span>
                          </div>
                        </div>

                        {/* Quick action buttons for project */}
                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectProject(p, 'costing');
                            }}
                            className="px-2 py-1 bg-blue-700/70 hover:bg-blue-600 text-white rounded text-[11px] font-medium transition-colors flex items-center gap-1 shadow-xs"
                            title="Open Costing Sheet"
                          >
                            <FileSpreadsheet className="w-3 h-3" />
                            <span className="hidden sm:inline">Costing</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectProject(p, 'quotations');
                            }}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium transition-colors flex items-center gap-1 border border-slate-700"
                            title="Open Formal Quotation"
                          >
                            <FileText className="w-3 h-3" />
                            <span className="hidden sm:inline">Quote</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectProject(p, 'actuals');
                            }}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium transition-colors border border-slate-700"
                            title="Track Actual Expenses"
                          >
                            <span className="hidden sm:inline">Actuals</span>
                            <ArrowRight className="w-3 h-3 sm:hidden" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (result.type === 'customer') {
                  const c = result.data;
                  const customerProjects = projects.filter((p) => p.customerId === c.id);

                  return (
                    <div
                      key={`c-${c.id}`}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-950/60 border border-emerald-600/50' : 'hover:bg-slate-800/70 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1" onClick={() => handleSelectCustomer(c, 'view')}>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-900/80 text-emerald-300 border border-emerald-700/60">
                              <Building2 className="w-2.5 h-2.5" /> Customer
                            </span>
                            <span className="font-mono text-xs font-bold text-emerald-400">
                              <HighlightedText text={c.id} query={query} />
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {customerProjects.length} linked project{customerProjects.length === 1 ? '' : 's'}
                            </span>
                          </div>

                          <h4 className="text-sm font-semibold text-white truncate">
                            <HighlightedText text={c.name} query={query} />
                          </h4>

                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              Contact: <strong className="text-slate-300 font-normal"><HighlightedText text={c.contactPerson} query={query} /></strong>
                            </span>
                            {c.phone && (
                              <span className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
                                <Phone className="w-3 h-3 text-slate-500" />
                                <HighlightedText text={c.phone} query={query} />
                              </span>
                            )}
                            {c.location && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <MapPin className="w-3 h-3" />
                                <HighlightedText text={c.location} query={query} />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Customer Quick Actions */}
                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCustomer(c, 'view');
                            }}
                            className="px-2 py-1 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded text-[11px] font-medium transition-colors flex items-center gap-1 shadow-xs"
                            title="View Customer Projects"
                          >
                            <Briefcase className="w-3 h-3" />
                            <span>View ({customerProjects.length})</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCustomer(c, 'new-costing');
                            }}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[11px] font-medium transition-colors flex items-center gap-1 border border-slate-700"
                            title="Create New Costing for this Customer"
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span className="hidden sm:inline">New Costing</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (result.type === 'material') {
                  const m = result.data;
                  const isLowStock = m.currentStock <= m.minStockLevel;

                  return (
                    <div
                      key={`m-${m.id}`}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-amber-950/60 border border-amber-600/50' : 'hover:bg-slate-800/70 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1" onClick={() => handleSelectMaterial(m, 'view')}>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-900/80 text-amber-300 border border-amber-700/60">
                              <Package className="w-2.5 h-2.5" /> Material
                            </span>
                            <span className="font-mono text-xs font-bold text-amber-400">
                              <HighlightedText text={m.id} query={query} />
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">
                              Code: <HighlightedText text={m.itemCode || m.sku} query={query} />
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {m.category}
                            </span>
                            {isLowStock && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-semibold animate-pulse">
                                <AlertTriangle className="w-2.5 h-2.5" /> Low Stock
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-semibold text-white truncate">
                            <HighlightedText text={m.name} query={query} />
                          </h4>

                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                            <span className="font-medium text-slate-300">
                              Available: <strong className={isLowStock ? 'text-red-400' : 'text-emerald-400'}>{m.currentStock} {m.unit}</strong> (Min: {m.minStockLevel})
                            </span>
                            <span className="text-cyan-400 font-mono">
                              Unit Cost: {formatAED(m.averageUnitCost ?? m.unitCost ?? 0)}/{m.unit}
                            </span>
                          </div>
                        </div>

                        {/* Material Quick Actions */}
                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectMaterial(m, 'view');
                            }}
                            className="px-2 py-1 bg-amber-700/80 hover:bg-amber-600 text-white rounded text-[11px] font-medium transition-colors flex items-center gap-1 shadow-xs"
                            title="Inspect in Store Inventory"
                          >
                            <Package className="w-3 h-3" />
                            <span>Store</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectMaterial(m, 'issue');
                            }}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded text-[11px] font-medium transition-colors flex items-center gap-1 border border-slate-700"
                            title="Issue this Material to a Project"
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span className="hidden sm:inline">Issue</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return null;
              })
            )}
          </div>

          {/* Footer Guide */}
          <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="px-1 py-0.2 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-400">↑↓</span> navigate
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft className="w-2.5 h-2.5" /> select
              </span>
              <span className="flex items-center gap-1">
                <span className="px-1 py-0.2 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-400">ESC</span> close
              </span>
            </div>
            <span className="text-slate-400 font-mono text-[10px]">
              ABC LLC Database
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
