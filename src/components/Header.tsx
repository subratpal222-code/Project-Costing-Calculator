/**
 * ABC LLC - Header Component
 * Corporate branding, division indicators, user role simulator,
 * global search engine, and primary navigation
 */

import React, { useState } from 'react';
import { 
  Building2, 
  Calculator, 
  FileSpreadsheet, 
  Layers, 
  Package, 
  FileText, 
  BarChart3, 
  ShieldCheck, 
  Settings, 
  HelpCircle,
  PlusCircle,
  RefreshCw,
  UserCheck,
  Search,
  X
} from 'lucide-react';
import { UserProfile, UserRole, ProjectCosting, Customer, StoreInventoryItem } from '../types';
import { INITIAL_USERS } from '../data/initialData';
import { SubratIQLogo } from './SubratIQLogo';
import { GlobalSearchBar } from './GlobalSearchBar';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  onOpenNewCosting: (customer?: Customer) => void;
  onOpenExplainer: () => void;
  onOpenSettings: () => void;
  onResetData: () => void;
  projects: ProjectCosting[];
  customers: Customer[];
  inventory: StoreInventoryItem[];
  onSelectProject: (project: ProjectCosting, targetTab?: string) => void;
  onSelectCustomer: (customer: Customer, action?: 'view' | 'new-costing') => void;
  onSelectMaterial: (item: StoreInventoryItem, action?: 'view' | 'issue') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  setCurrentUser,
  onOpenNewCosting,
  onOpenExplainer,
  onOpenSettings,
  onResetData,
  projects,
  customers,
  inventory,
  onSelectProject,
  onSelectCustomer,
  onSelectMaterial,
}) => {
  const [isMobileSearchVisible, setIsMobileSearchVisible] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'costing', label: 'Costing & Calculator', icon: Calculator },
    { id: 'actuals', label: 'Actuals & Expenses', icon: FileSpreadsheet },
    { id: 'store', label: 'Store & Materials', icon: Package },
    { id: 'quotations', label: 'Quotations', icon: FileText },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  ];

  const handleRoleChange = (roleName: UserRole) => {
    const user = INITIAL_USERS.find(u => u.role === roleName) || {
      id: `USR-${Date.now()}`,
      name: `User (${roleName})`,
      email: `${roleName.toLowerCase().replace(/[^a-z]/g, '')}@abc-intl.com`,
      role: roleName,
    };
    setCurrentUser(user);
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      {/* Top Banner: Corporate Identity, Global Search & Role Switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative p-1 bg-gradient-to-b from-amber-400/20 via-blue-500/20 to-emerald-500/20 rounded-xl border border-slate-700/80 shadow-md shrink-0 flex items-center justify-center">
              <SubratIQLogo size={42} variant="icon" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="flex items-baseline tracking-tight leading-none">
                  <span className="text-base sm:text-xl font-black tracking-wider text-white uppercase font-sans">
                    SUBRAT
                  </span>
                  <span className="ml-0.5 text-base sm:text-xl font-black text-cyan-400">
                    I
                  </span>
                  <span className="text-base sm:text-xl font-black text-emerald-400">
                    Q
                  </span>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded border border-slate-700 hidden sm:inline-block">
                  ABC LLC
                </span>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 font-medium px-1.5 py-0.5 rounded border border-cyan-800/60 hidden xl:inline-block">
                  UAE
                </span>
              </div>
              <p className="text-[11px] text-cyan-300/80 font-medium tracking-wide hidden lg:flex items-center gap-1.5 mt-0.5">
                <span>Ideas</span>
                <span className="text-cyan-400">•</span>
                <span>Apps</span>
                <span className="text-emerald-400">•</span>
                <span>Innovation</span>
                <span className="text-slate-500 hidden xl:inline">| Costing & Quotation Calculator</span>
              </p>
            </div>
          </div>

          {/* Global Search Bar (Desktop & Tablet) */}
          <div className="flex-1 max-w-md mx-2 hidden md:block">
            <GlobalSearchBar
              projects={projects}
              customers={customers}
              inventory={inventory}
              onSelectProject={onSelectProject}
              onSelectCustomer={onSelectCustomer}
              onSelectMaterial={onSelectMaterial}
            />
          </div>

          {/* Quick Actions & Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Mobile Search Toggle Button */}
            <button
              onClick={() => setIsMobileSearchVisible(!isMobileSearchVisible)}
              className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              title="Toggle Global Search"
              aria-label="Search projects, customers, materials"
            >
              {isMobileSearchVisible ? <X className="w-4 h-4 text-cyan-400" /> : <Search className="w-4 h-4 text-cyan-400" />}
            </button>

            {/* Markup vs Margin Guide Button */}
            <button
              onClick={onOpenExplainer}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-cyan-950/80 text-cyan-300 hover:bg-cyan-900 border border-cyan-800/60 transition-colors shadow-xs"
              title="Open Section 7 Benchmark & Formula Guide"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="hidden xl:inline">Markup vs. Margin</span>
              <span className="xl:hidden hidden sm:inline">Guide</span>
            </button>

            {/* New Costing Action */}
            <button
              onClick={() => onOpenNewCosting()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">New Costing</span>
            </button>

            {/* Role Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-slate-400 hidden xl:inline">Role:</span>
              <select
                aria-label="User Role"
                value={currentUser.role}
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                className="bg-transparent text-white font-medium focus:outline-hidden cursor-pointer text-xs"
              >
                <option value="Administrator" className="bg-slate-800 text-white">Administrator</option>
                <option value="Accounts/Finance" className="bg-slate-800 text-white">Accounts/Finance</option>
                <option value="Operations/Project Manager" className="bg-slate-800 text-white">Operations/PM</option>
                <option value="Sales Coordinator" className="bg-slate-800 text-white">Sales Coord</option>
                <option value="Store User" className="bg-slate-800 text-white">Store User</option>
                <option value="Approver/Management" className="bg-slate-800 text-white">Approver</option>
              </select>
            </div>

            {/* Settings & Reset */}
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Application Settings & VAT Config"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={onResetData}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
              title="Reset Demo Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mobile Search Row (Shown when toggled on small screens) */}
        {isMobileSearchVisible && (
          <div className="md:hidden pb-3 pt-1 border-t border-slate-800">
            <GlobalSearchBar
              projects={projects}
              customers={customers}
              inventory={inventory}
              onSelectProject={(p, tab) => {
                onSelectProject(p, tab);
                setIsMobileSearchVisible(false);
              }}
              onSelectCustomer={(c, act) => {
                onSelectCustomer(c, act);
                setIsMobileSearchVisible(false);
              }}
              onSelectMaterial={(m, act) => {
                onSelectMaterial(m, act);
                setIsMobileSearchVisible(false);
              }}
            />
          </div>
        )}

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 border-t border-slate-800/80 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
