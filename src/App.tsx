/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ProjectCosting, 
  StoreInventoryItem, 
  Customer, 
  ActualExpenseRecord, 
  MaterialIssueRecord, 
  AppSettings, 
  AuditLogEntry, 
  UserProfile 
} from './types';
import { 
  loadProjects, 
  saveProjects, 
  loadStoreInventory, 
  saveStoreInventory, 
  loadCustomers, 
  saveCustomers, 
  loadActualExpenses, 
  saveActualExpenses, 
  loadMaterialIssues, 
  saveMaterialIssues, 
  loadSettings, 
  saveSettings, 
  loadAuditLogs, 
  logAuditAction, 
  loadCurrentUser, 
  saveCurrentUser, 
  resetAllDataToDefault 
} from './utils/storage';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { CostingForm } from './components/CostingForm';
import { ActualsTracker } from './components/ActualsTracker';
import { StoreIntegration } from './components/StoreIntegration';
import { QuotationView } from './components/QuotationView';
import { ReportsView } from './components/ReportsView';
import { MarkupMarginExplainer } from './components/MarkupMarginExplainer';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  // Global Data State
  const [projects, setProjects] = useState<ProjectCosting[]>(loadProjects);
  const [inventory, setInventory] = useState<StoreInventoryItem[]>(loadStoreInventory);
  const [customers, setCustomers] = useState<Customer[]>(loadCustomers);
  const [actualExpenses, setActualExpenses] = useState<ActualExpenseRecord[]>(loadActualExpenses);
  const [materialIssues, setMaterialIssues] = useState<MaterialIssueRecord[]>(loadMaterialIssues);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(loadAuditLogs);
  const [currentUser, setCurrentUser] = useState<UserProfile>(loadCurrentUser);

  // Navigation & Active Project Selection
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');

  // Global search deep linking state
  const [storeSearchTerm, setStoreSearchTerm] = useState<string>('');
  const [storeSelectedItemId, setStoreSelectedItemId] = useState<string>('');
  const [storeAutoOpenIssue, setStoreAutoOpenIssue] = useState<boolean>(false);

  // Modals
  const [isExplainerOpen, setIsExplainerOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Sync Current User changes
  const handleUserChange = (user: UserProfile) => {
    setCurrentUser(user);
    saveCurrentUser(user);
    logAuditAction(user.name, user.role, 'ROLE_SWITCH', `Simulated login as ${user.name} (${user.role})`);
    setAuditLogs(loadAuditLogs());
  };

  // Currently active project object
  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  // Save/Update Project Costing
  const handleSaveProject = (updatedProject: ProjectCosting, actionMsg: string) => {
    const nextProjects = projects.map((p) => (p.id === updatedProject.id ? updatedProject : p));
    setProjects(nextProjects);
    saveProjects(nextProjects);
    logAuditAction(currentUser.name, currentUser.role, 'PROJECT_COSTING_UPDATE', `${updatedProject.id}: ${actionMsg}`);
    setAuditLogs(loadAuditLogs());
  };

  // Create New Project Costing Draft (optional customer pre-fill)
  const handleNewCosting = (prefillCustomer?: Customer) => {
    const targetCust = prefillCustomer || customers[0];
    const newId = `ABC-PC-2026-${String(projects.length + 1).padStart(3, '0')}`;
    const newProject: ProjectCosting = {
      id: newId,
      projectReference: `ABC-REF-${Date.now().toString().slice(-4)}`,
      projectName: prefillCustomer ? `Costing - ${targetCust.name}` : 'New Project Service Costing',
      customerId: targetCust?.id || '',
      customerName: targetCust?.name || '',
      contactPerson: targetCust?.contactPerson || '',
      contactPhone: targetCust?.phone || '',
      siteLocation: targetCust?.location || 'Dubai, UAE',
      division: settings.divisions[0] || 'Enviro Tech Division',
      serviceType: 'Specialized Environmental Maintenance',
      salespersonName: currentUser.name,
      salespersonPhone: '+971 50 123 4567',
      startDate: new Date().toISOString().split('T')[0],
      expectedCompletionDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      numberOfVisits: 1,
      estimatedDuration: '1 Day',
      contractType: 'One-Time',
      quotationValidityDays: 30,
      status: 'Draft',
      internalRemarks: '',

      labourCosts: [
        {
          id: `L-${Date.now()}`,
          technicianRole: 'Senior Technician',
          teamName: 'Team 1',
          workersCount: 2,
          hoursOrDaysPerVisit: 8,
          ratePerUnit: 40.00,
          unitType: 'Hour',
          visitsMultiplier: 1,
          total: 640.00,
        }
      ],
      materialCosts: [],
      transportCosts: [
        {
          id: `T-${Date.now()}`,
          description: 'Service Vehicle Trips & Salik',
          type: 'vehicle_rental',
          visitsOrTrips: 1,
          ratePerTrip: 100.00,
          total: 100.00,
        }
      ],
      equipmentCosts: [],
      subcontractorCosts: [],
      overheadContingency: {
        overheadType: 'percentage',
        overheadRate: 10,
        overheadAmount: 74.00,
        overheadBase: 'direct_costs',
        contingencyType: 'fixed',
        contingencyRate: 0,
        contingencyAmount: 100.00,
        contingencyBase: 'direct_costs',
      },

      directLabourTotal: 640.00,
      materialChemicalTotal: 0,
      transportationTotal: 100.00,
      equipmentTotal: 0,
      subcontractorTotal: 0,
      otherDirectCostsTotal: 0,
      overheadTotal: 74.00,
      contingencyTotal: 100.00,
      estimatedTotalCost: 914.00,

      pricingMethod: 'margin',
      targetPercentage: 25.0,
      recommendedSellingPrice: 1218.67,
      quotedSellingPrice: 1250.00,
      expectedProfit: 336.00,
      expectedMarkupPercentage: 36.76,
      expectedProfitMarginPercentage: 26.88,

      vatRate: settings.vatRate,
      vatAmount: 62.50,
      finalQuotationTotal: 1312.50,

      invoicedAmountBeforeVat: 0,
      collectedAmountBeforeVat: 0,
      recognizedRevenueBeforeVat: 0,

      scopeOfWork: [
        'Execution of approved environmental scope per ABC procedures',
        'Post-service audit inspection and official Dubai Municipality compliant documentation'
      ],
      quotationPaymentTerms: '30 days from invoice date',
      quotationExclusions: [
        'Civil alterations, high-level scaffolding beyond 3.5m, major structural replacements'
      ],
      quotationPreparedBy: currentUser.name,
      quotationDate: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextProjects = [newProject, ...projects];
    setProjects(nextProjects);
    saveProjects(nextProjects);
    setSelectedProjectId(newId);
    setActiveTab('costing');
    logAuditAction(currentUser.name, currentUser.role, 'PROJECT_CREATED', `Created new project costing draft ${newId}`);
    setAuditLogs(loadAuditLogs());
  };

  // Add Actual Expense
  const handleAddExpense = (expense: ActualExpenseRecord) => {
    const nextExpenses = [expense, ...actualExpenses];
    setActualExpenses(nextExpenses);
    saveActualExpenses(nextExpenses);
    logAuditAction(currentUser.name, currentUser.role, 'EXPENSE_RECORDED', `Logged ${expense.category} expense of AED ${expense.amount} for ${expense.projectId}`);
    setAuditLogs(loadAuditLogs());
  };

  // Bulk Add Actual Expenses (e.g. from Excel raw data paste)
  const handleBulkAddExpenses = (expensesToAdd: ActualExpenseRecord[]) => {
    if (!expensesToAdd.length) return;
    const nextExpenses = [...expensesToAdd, ...actualExpenses];
    setActualExpenses(nextExpenses);
    saveActualExpenses(nextExpenses);
    const totalAED = expensesToAdd.reduce((sum, e) => sum + e.amount, 0);
    logAuditAction(
      currentUser.name,
      currentUser.role,
      'BULK_EXPENSES_RECORDED',
      `Bulk created ${expensesToAdd.length} expense records (AED ${totalAED.toFixed(2)}) for ${expensesToAdd[0]?.projectId || 'project'}`
    );
    setAuditLogs(loadAuditLogs());
  };

  // Delete Actual Expense
  const handleDeleteExpense = (expenseId: string) => {
    const nextExpenses = actualExpenses.filter((e) => e.id !== expenseId);
    setActualExpenses(nextExpenses);
    saveActualExpenses(nextExpenses);
    logAuditAction(currentUser.name, currentUser.role, 'EXPENSE_DELETED', `Deleted expense record ${expenseId}`);
    setAuditLogs(loadAuditLogs());
  };

  // Update Project Revenue parameters
  const handleUpdateProjectRevenue = (
    projectId: string,
    recognizedRevenue: number,
    invoiced: number,
    collected: number
  ) => {
    const nextProjects = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          recognizedRevenueBeforeVat: recognizedRevenue,
          invoicedAmountBeforeVat: invoiced,
          collectedAmountBeforeVat: collected,
        };
      }
      return p;
    });
    setProjects(nextProjects);
    saveProjects(nextProjects);
    logAuditAction(currentUser.name, currentUser.role, 'REVENUE_RECOGNITION_UPDATE', `Updated revenue recognition parameters for ${projectId}`);
    setAuditLogs(loadAuditLogs());
  };

  // Store: Issue Material to Project
  const handleIssueMaterial = (record: MaterialIssueRecord) => {
    // 1. Add issue record
    const nextIssues = [record, ...materialIssues];
    setMaterialIssues(nextIssues);
    saveMaterialIssues(nextIssues);

    // 2. Safely deduct unreserved stock from store inventory
    const nextInventory = inventory.map((inv) => {
      if (inv.id === record.storeItemId) {
        const nextCurrent = Math.max(0, inv.currentStock - record.quantityIssued);
        return {
          ...inv,
          currentStock: nextCurrent,
        };
      }
      return inv;
    });
    setInventory(nextInventory);
    saveStoreInventory(nextInventory);

    // 3. Automatically append actual expense under 'Materials' for that project
    const newExpense: ActualExpenseRecord = {
      id: `ACT-ISS-${Date.now()}`,
      projectId: record.projectId,
      date: record.issueDate,
      category: 'Materials',
      quantity: record.quantityIssued,
      amount: record.totalConsumptionCost,
      description: `Store Issue [${record.id}]: ${record.itemName} (${record.quantityIssued} ${record.unit})`,
      enteredBy: currentUser.name,
      enteredByRole: currentUser.role,
      receiptOrRefNumber: record.id,
      isApproved: true,
    };
    const nextExpenses = [newExpense, ...actualExpenses];
    setActualExpenses(nextExpenses);
    saveActualExpenses(nextExpenses);

    logAuditAction(currentUser.name, currentUser.role, 'STORE_MATERIAL_ISSUED', `Issued ${record.quantityIssued} ${record.unit} of ${record.itemName} to ${record.projectId}`);
    setAuditLogs(loadAuditLogs());
  };

  // Store: Reconcile Material Returns & Wastage
  const handleReconcileIssue = (
    issueId: string,
    used: number,
    returned: number,
    wasted: number
  ) => {
    let returnedItemStoreId = '';
    let returnedItemQty = 0;

    const nextIssues = materialIssues.map((iss) => {
      if (iss.id === issueId) {
        returnedItemStoreId = iss.storeItemId;
        returnedItemQty = returned;
        const totalCost = Number(((used + wasted) * iss.unitCost).toFixed(2));
        return {
          ...iss,
          quantityUsed: used,
          quantityReturned: returned,
          quantityWasted: wasted,
          totalConsumptionCost: totalCost,
          status: 'Reconciled' as const,
        };
      }
      return iss;
    });

    setMaterialIssues(nextIssues);
    saveMaterialIssues(nextIssues);

    // Return undamaged stock to store inventory
    if (returnedItemQty > 0 && returnedItemStoreId) {
      const nextInventory = inventory.map((inv) => {
        if (inv.id === returnedItemStoreId) {
          return {
            ...inv,
            currentStock: inv.currentStock + returnedItemQty,
          };
        }
        return inv;
      });
      setInventory(nextInventory);
      saveStoreInventory(nextInventory);
    }

    logAuditAction(currentUser.name, currentUser.role, 'MATERIAL_RECONCILED', `Reconciled ${issueId}: returned ${returned} back to store.`);
    setAuditLogs(loadAuditLogs());
  };

  // Save Settings
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    logAuditAction(currentUser.name, currentUser.role, 'SETTINGS_UPDATED', `Updated VAT rate to ${newSettings.vatRate}% and company details.`);
    setAuditLogs(loadAuditLogs());
  };

  // Reset to Baseline Demo Data
  const handleResetData = () => {
    if (window.confirm('Reset all ABC Costing data to baseline initial demonstration state?')) {
      resetAllDataToDefault();
      setProjects(loadProjects());
      setInventory(loadStoreInventory());
      setCustomers(loadCustomers());
      setActualExpenses(loadActualExpenses());
      setMaterialIssues(loadMaterialIssues());
      setSettings(loadSettings());
      setAuditLogs(loadAuditLogs());
      setSelectedProjectId(loadProjects()[0]?.id || '');
      setActiveTab('dashboard');
    }
  };

  // Toggle archive status of project
  const handleToggleArchiveProject = (projectToToggle: ProjectCosting) => {
    const isNowArchived = !projectToToggle.isArchived;
    const updated: ProjectCosting = {
      ...projectToToggle,
      isArchived: isNowArchived,
      archivedAt: isNowArchived ? new Date().toISOString() : undefined,
      archivedBy: isNowArchived ? currentUser.name : undefined,
    };
    handleSaveProject(
      updated,
      isNowArchived ? `Archived by ${currentUser.name}` : `Restored from archive by ${currentUser.name}`
    );
  };

  // Global Search handlers
  const handleGlobalSelectProject = (project: ProjectCosting, targetTab?: string) => {
    setSelectedProjectId(project.id);
    setActiveTab(targetTab || 'costing');
  };

  const handleGlobalSelectCustomer = (customer: Customer, action: 'view' | 'new-costing' = 'view') => {
    if (action === 'new-costing') {
      handleNewCosting(customer);
      setActiveTab('costing');
    } else {
      const found = projects.find((p) => p.customerId === customer.id);
      if (found) {
        setSelectedProjectId(found.id);
        setActiveTab('costing');
      } else {
        handleNewCosting(customer);
        setActiveTab('costing');
      }
    }
  };

  const handleGlobalSelectMaterial = (item: StoreInventoryItem, action: 'view' | 'issue' = 'view') => {
    setStoreSearchTerm(item.name);
    setStoreSelectedItemId(item.id);
    setStoreAutoOpenIssue(action === 'issue');
    setActiveTab('store');
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 font-sans antialiased flex flex-col">
      {/* Header with Branding, Role Switcher, Global Search, and Main Nav */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        setCurrentUser={handleUserChange}
        onOpenNewCosting={handleNewCosting}
        onOpenExplainer={() => setIsExplainerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onResetData={handleResetData}
        projects={projects}
        customers={customers}
        inventory={inventory}
        onSelectProject={handleGlobalSelectProject}
        onSelectCustomer={handleGlobalSelectCustomer}
        onSelectMaterial={handleGlobalSelectMaterial}
      />

      {/* Main Module Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            projects={projects}
            actualExpenses={actualExpenses}
            userRole={currentUser.role}
            onSelectProject={(p) => {
              setSelectedProjectId(p.id);
              setActiveTab('costing');
            }}
            onNewCosting={handleNewCosting}
            onOpenActuals={(pId) => {
              setSelectedProjectId(pId);
              setActiveTab('actuals');
            }}
            onPrepareQuotation={(p) => {
              setSelectedProjectId(p.id);
              setActiveTab('quotations');
            }}
            onOpenExplainer={() => setIsExplainerOpen(true)}
            onToggleArchive={handleToggleArchiveProject}
          />
        )}

        {activeTab === 'costing' && (
          <CostingForm
            project={activeProject}
            customers={customers}
            inventory={inventory}
            settings={settings}
            currentUser={currentUser}
            onSave={handleSaveProject}
            onPrepareQuotation={(p) => {
              setSelectedProjectId(p.id);
              setActiveTab('quotations');
            }}
            onOpenExplainer={() => setIsExplainerOpen(true)}
            onCancel={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'actuals' && (
          <ActualsTracker
            projects={projects}
            actualExpenses={actualExpenses}
            currentUser={currentUser}
            initialProjectId={selectedProjectId}
            onAddExpense={handleAddExpense}
            onBulkAddExpenses={handleBulkAddExpenses}
            onDeleteExpense={handleDeleteExpense}
            onUpdateProjectRevenue={handleUpdateProjectRevenue}
          />
        )}

        {activeTab === 'store' && (
          <StoreIntegration
            inventory={inventory}
            materialIssues={materialIssues}
            projects={projects}
            currentUser={currentUser}
            onIssueMaterial={handleIssueMaterial}
            onReconcileIssue={handleReconcileIssue}
            initialSearchTerm={storeSearchTerm}
            initialSelectedItemId={storeSelectedItemId}
            autoOpenIssueModal={storeAutoOpenIssue}
          />
        )}

        {activeTab === 'quotations' && (
          <QuotationView
            project={activeProject}
            settings={settings}
            currentUser={currentUser}
            onUpdateProject={handleSaveProject}
            onBackToCosting={() => setActiveTab('costing')}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            projects={projects}
            actualExpenses={actualExpenses}
            materialIssues={materialIssues}
            inventory={inventory}
          />
        )}
      </main>

      {/* Section 6 & 7 Markup vs Profit Margin Explainer Modal */}
      <MarkupMarginExplainer
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
      />

      {/* Settings & VAT Config Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        auditLogs={auditLogs}
        currentUser={currentUser}
      />
    </div>
  );
}
