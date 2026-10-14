/**
 * ABC LLC - Master Project Costing Form
 * Implements Section 4 (Project Info), Section 5 (Cost Breakdown Categories A to G),
 * Section 10 (Store & Materials Integration), and Role-based editing permissions.
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  Building, 
  User, 
  Calendar, 
  MapPin, 
  Clock, 
  Shield, 
  FileText,
  DollarSign,
  Package,
  Truck,
  Wrench,
  Users,
  Percent,
  Layers,
  ArrowRight,
  Archive,
  ArchiveRestore,
  Paperclip,
  Image as ImageIcon,
  UploadCloud,
  FileCheck
} from 'lucide-react';
import { 
  ProjectCosting, 
  Customer, 
  StoreInventoryItem, 
  UserProfile, 
  AppSettings,
  LabourCostItem,
  MaterialCostItem,
  TransportCostItem,
  EquipmentCostItem,
  SubcontractorCostItem,
  PricingMethod
} from '../types';
import { 
  calculateProjectEstimatedCosts, 
  calculateLabourItemTotal, 
  calculateMaterialItemTotal,
  calculateTransportItemTotal,
  calculateEquipmentItemTotal,
  calculateSubcontractorItemTotal,
  formatAED 
} from '../utils/calculator';
import { PricingCalculator } from './PricingCalculator';
import { ProjectAttachmentsSection } from './ProjectAttachmentsSection';

interface CostingFormProps {
  project: ProjectCosting;
  customers: Customer[];
  inventory: StoreInventoryItem[];
  settings: AppSettings;
  currentUser: UserProfile;
  onSave: (updatedProject: ProjectCosting, actionMessage: string) => void;
  onPrepareQuotation: (project: ProjectCosting) => void;
  onOpenExplainer: () => void;
  onCancel: () => void;
}

export const CostingForm: React.FC<CostingFormProps> = ({
  project,
  customers,
  inventory,
  settings,
  currentUser,
  onSave,
  onPrepareQuotation,
  onOpenExplainer,
  onCancel,
}) => {
  // Form State
  const [formData, setFormData] = useState<ProjectCosting>({ ...project });
  const [activeSection, setActiveSection] = useState<'info' | 'costs' | 'pricing' | 'attachments'>('costs');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Sync state if incoming project changes
  useEffect(() => {
    setFormData({ ...project });
  }, [project.id]);

  // Role permissions
  const canApprove = currentUser.role === 'Administrator' || currentUser.role === 'Approver/Management';
  const canEditPricing = currentUser.role !== 'Store User';

  // Recalculate estimated cost totals in real-time
  const computedCosts = calculateProjectEstimatedCosts(
    formData.labourCosts,
    formData.materialCosts,
    formData.transportCosts,
    formData.equipmentCosts,
    formData.subcontractorCosts,
    formData.overheadContingency
  );

  // Update computed totals inside formData whenever line items change
  const syncTotals = (updates: Partial<ProjectCosting>) => {
    const nextState = { ...formData, ...updates };
    const nextComputed = calculateProjectEstimatedCosts(
      nextState.labourCosts,
      nextState.materialCosts,
      nextState.transportCosts,
      nextState.equipmentCosts,
      nextState.subcontractorCosts,
      nextState.overheadContingency
    );

    // If quoted price was exactly equal to recommended price before, maintain link
    let quotedPrice = nextState.quotedSellingPrice;
    if (quotedPrice === 0 || quotedPrice === formData.recommendedSellingPrice) {
      // Recalculate recommended
      if (nextState.pricingMethod === 'markup') {
        quotedPrice = Number((nextComputed.estimatedTotalCost * (1 + nextState.targetPercentage / 100)).toFixed(2));
      } else {
        const denom = 1 - nextState.targetPercentage / 100;
        quotedPrice = denom > 0 ? Number((nextComputed.estimatedTotalCost / denom).toFixed(2)) : nextComputed.estimatedTotalCost;
      }
    }

    const recommendedPrice = nextState.pricingMethod === 'markup'
      ? Number((nextComputed.estimatedTotalCost * (1 + nextState.targetPercentage / 100)).toFixed(2))
      : (1 - nextState.targetPercentage / 100 > 0 ? Number((nextComputed.estimatedTotalCost / (1 - nextState.targetPercentage / 100)).toFixed(2)) : nextComputed.estimatedTotalCost);

    const expectedProfit = quotedPrice - nextComputed.estimatedTotalCost;
    const expectedMargin = quotedPrice > 0 ? (expectedProfit / quotedPrice) * 100 : 0;
    const expectedMarkup = nextComputed.estimatedTotalCost > 0 ? (expectedProfit / nextComputed.estimatedTotalCost) * 100 : 0;
    const vatAmount = Number(((quotedPrice * (nextState.vatRate || 5)) / 100).toFixed(2));
    const finalQuotationTotal = Number((quotedPrice + vatAmount).toFixed(2));

    setFormData({
      ...nextState,
      directLabourTotal: nextComputed.directLabourTotal,
      materialChemicalTotal: nextComputed.materialChemicalTotal,
      transportationTotal: nextComputed.transportationTotal,
      equipmentTotal: nextComputed.equipmentTotal,
      subcontractorTotal: nextComputed.subcontractorTotal,
      overheadTotal: nextComputed.overheadTotal,
      contingencyTotal: nextComputed.contingencyTotal,
      estimatedTotalCost: nextComputed.estimatedTotalCost,
      recommendedSellingPrice: recommendedPrice,
      quotedSellingPrice: quotedPrice,
      expectedProfit: Number(expectedProfit.toFixed(2)),
      expectedProfitMarginPercentage: Number(expectedMargin.toFixed(2)),
      expectedMarkupPercentage: Number(expectedMarkup.toFixed(2)),
      vatAmount,
      finalQuotationTotal,
    });
  };

  // Customer selection auto-fill
  const handleCustomerChange = (customerId: string) => {
    const cust = customers.find(c => c.id === customerId);
    if (cust) {
      setFormData(prev => ({
        ...prev,
        customerId: cust.id,
        customerName: cust.name,
        contactPerson: cust.contactPerson,
        contactPhone: cust.phone,
        siteLocation: cust.location,
      }));
    }
  };

  // Category A: Labour Cost Handlers
  const addLabourRow = () => {
    const newItem: LabourCostItem = {
      id: `L-${Date.now()}`,
      technicianRole: 'Senior Technician',
      teamName: 'Team 1',
      workersCount: 2,
      hoursOrDaysPerVisit: 8,
      ratePerUnit: 40.00,
      unitType: 'Hour',
      visitsMultiplier: formData.numberOfVisits || 1,
      total: 640.00,
    };
    newItem.total = calculateLabourItemTotal(newItem);
    syncTotals({ labourCosts: [...formData.labourCosts, newItem] });
  };

  const updateLabourRow = (index: number, updates: Partial<LabourCostItem>) => {
    const list = [...formData.labourCosts];
    const updated = { ...list[index], ...updates };
    updated.total = calculateLabourItemTotal(updated);
    list[index] = updated;
    syncTotals({ labourCosts: list });
  };

  const removeLabourRow = (index: number) => {
    const list = formData.labourCosts.filter((_, i) => i !== index);
    syncTotals({ labourCosts: list });
  };

  // Category B: Material & Chemical Handlers (Section 10 integration)
  const addMaterialRow = () => {
    const newItem: MaterialCostItem = {
      id: `M-${Date.now()}`,
      name: 'ABC Approved Chemical',
      chemicalOrAssetType: 'Chemical',
      unit: 'litres',
      quantity: 10,
      unitPurchaseCost: 25.00,
      total: 250.00,
    };
    newItem.total = calculateMaterialItemTotal(newItem);
    syncTotals({ materialCosts: [...formData.materialCosts, newItem] });
  };

  const selectStoreInventoryForMaterial = (index: number, storeItemId: string) => {
    const item = inventory.find(i => i.id === storeItemId);
    if (!item) return;
    const list = [...formData.materialCosts];
    const updated: MaterialCostItem = {
      ...list[index],
      storeItemId: item.id,
      name: item.name,
      chemicalOrAssetType: item.category,
      unit: item.unit as any,
      unitPurchaseCost: item.averageUnitCost,
      stockAvailable: item.currentStock - item.reservedStock,
    };
    updated.total = calculateMaterialItemTotal(updated);
    list[index] = updated;
    syncTotals({ materialCosts: list });
  };

  const updateMaterialRow = (index: number, updates: Partial<MaterialCostItem>) => {
    const list = [...formData.materialCosts];
    const updated = { ...list[index], ...updates };
    updated.total = calculateMaterialItemTotal(updated);
    list[index] = updated;
    syncTotals({ materialCosts: list });
  };

  const removeMaterialRow = (index: number) => {
    const list = formData.materialCosts.filter((_, i) => i !== index);
    syncTotals({ materialCosts: list });
  };

  // Category C: Transportation Handlers
  const addTransportRow = () => {
    const newItem: TransportCostItem = {
      id: `T-${Date.now()}`,
      description: 'Service Vehicle Trips & Tolls (Salik)',
      type: 'vehicle_rental',
      visitsOrTrips: formData.numberOfVisits || 1,
      ratePerTrip: 120.00,
      total: 120.00,
    };
    newItem.total = calculateTransportItemTotal(newItem);
    syncTotals({ transportCosts: [...formData.transportCosts, newItem] });
  };

  const updateTransportRow = (index: number, updates: Partial<TransportCostItem>) => {
    const list = [...formData.transportCosts];
    const updated = { ...list[index], ...updates };
    updated.total = calculateTransportItemTotal(updated);
    list[index] = updated;
    syncTotals({ transportCosts: list });
  };

  const removeTransportRow = (index: number) => {
    const list = formData.transportCosts.filter((_, i) => i !== index);
    syncTotals({ transportCosts: list });
  };

  // Category D: Equipment Handlers
  const addEquipmentRow = () => {
    const newItem: EquipmentCostItem = {
      id: `E-${Date.now()}`,
      equipmentName: 'Specialized Machine Usage',
      type: 'usage_charge',
      quantity: 1,
      durationUnits: 1,
      unitType: 'Days',
      ratePerUnit: 100.00,
      total: 100.00,
    };
    newItem.total = calculateEquipmentItemTotal(newItem);
    syncTotals({ equipmentCosts: [...formData.equipmentCosts, newItem] });
  };

  const updateEquipmentRow = (index: number, updates: Partial<EquipmentCostItem>) => {
    const list = [...formData.equipmentCosts];
    const updated = { ...list[index], ...updates };
    updated.total = calculateEquipmentItemTotal(updated);
    list[index] = updated;
    syncTotals({ equipmentCosts: list });
  };

  const removeEquipmentRow = (index: number) => {
    const list = formData.equipmentCosts.filter((_, i) => i !== index);
    syncTotals({ equipmentCosts: list });
  };

  // Category E: Subcontractor Handlers
  const addSubcontractorRow = () => {
    const newItem: SubcontractorCostItem = {
      id: `S-${Date.now()}`,
      serviceOrVendor: 'Dubai Municipality Approved Lab / Subcontractor',
      scopeOfWork: 'Water sample microbiological analysis',
      amount: 500.00,
      permitOrLabFee: true,
    };
    newItem.total = calculateSubcontractorItemTotal(newItem);
    syncTotals({ subcontractorCosts: [...formData.subcontractorCosts, newItem] });
  };

  const updateSubcontractorRow = (index: number, updates: Partial<SubcontractorCostItem>) => {
    const list = [...formData.subcontractorCosts];
    const updated = { ...list[index], ...updates };
    list[index] = updated;
    syncTotals({ subcontractorCosts: list });
  };

  const removeSubcontractorRow = (index: number) => {
    const list = formData.subcontractorCosts.filter((_, i) => i !== index);
    syncTotals({ subcontractorCosts: list });
  };

  // Category F: Overhead & Contingency Handler
  const updateOverheadContingency = (updates: any) => {
    const updatedConfig = { ...formData.overheadContingency, ...updates };
    syncTotals({ overheadContingency: updatedConfig });
  };

  // Save action
  const handleSaveDraft = () => {
    onSave(formData, `Costing saved as Draft by ${currentUser.name}`);
    setSaveSuccessMsg('Project Costing successfully saved to cloud storage.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleSubmitForReview = () => {
    const updated = { ...formData, status: 'Under Review' as const };
    onSave(updated, `Costing submitted for Management Review by ${currentUser.name}`);
  };

  const handleApproveCosting = () => {
    const updated = {
      ...formData,
      status: 'Approved' as const,
      approvedBy: currentUser.name,
      approvedAt: new Date().toISOString(),
    };
    onSave(updated, `Pricing & Costing approved by ${currentUser.name}`);
  };

  // Archive / Unarchive Handler
  const handleToggleArchive = () => {
    if (formData.isArchived) {
      const updated: ProjectCosting = {
        ...formData,
        isArchived: false,
        archivedAt: undefined,
        archivedBy: undefined,
      };
      setFormData(updated);
      onSave(updated, `Project unarchived / restored to active list by ${currentUser.name}`);
      setSaveSuccessMsg('Project restored from archive and returned to active list.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } else {
      const confirmArchive = window.confirm(
        `Archive project "${formData.projectName || formData.id}"?\n\nIt will be hidden from the active dashboard view but will remain safely preserved in the database for historical reporting, and can be viewed via the "Show Archived Projects" toggle.`
      );
      if (!confirmArchive) return;

      const updated: ProjectCosting = {
        ...formData,
        isArchived: true,
        archivedAt: new Date().toISOString(),
        archivedBy: currentUser.name,
      };
      setFormData(updated);
      onSave(updated, `Project archived by ${currentUser.name}`);
      setSaveSuccessMsg('Project moved to archive.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner & Quick Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold bg-slate-900 text-white px-2.5 py-1 rounded-md">
              {formData.id}
            </span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${
              formData.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
              formData.status === 'Won' ? 'bg-blue-100 text-blue-800' :
              formData.status === 'Under Review' ? 'bg-amber-100 text-amber-800' :
              formData.status === 'Completed' ? 'bg-purple-100 text-purple-800' :
              'bg-slate-100 text-slate-700'
            }`}>
              Status: {formData.status}
            </span>
            {formData.isArchived && (
              <span className="text-xs bg-slate-200 text-slate-800 font-bold px-2.5 py-1 rounded-md flex items-center gap-1 border border-slate-300">
                <Archive className="w-3 h-3 text-slate-600" />
                Archived
              </span>
            )}
            <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded">
              {formData.division}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            {formData.projectName || 'Untitled Project Costing'}
          </h2>
          <p className="text-xs text-slate-500">
            Customer: {formData.customerName || 'Select Customer'} | Ref: {formData.projectReference}
          </p>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveSection('info')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeSection === 'info' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Project Info
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('costs')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeSection === 'costs' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Cost Breakdown (A–G)
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('pricing')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeSection === 'pricing' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3. Pricing & VAT
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('attachments')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeSection === 'attachments' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5 text-blue-600" />
              <span>4. Photos & Documents</span>
              {(formData.attachments?.length || 0) > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold border border-blue-200">
                  {formData.attachments?.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </button>

          {formData.status === 'Draft' && (
            <button
              type="button"
              onClick={handleSubmitForReview}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Submit for Review</span>
            </button>
          )}

          {canApprove && (formData.status === 'Draft' || formData.status === 'Under Review') && (
            <button
              type="button"
              onClick={handleApproveCosting}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Approve Pricing</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onPrepareQuotation(formData)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span>Prepare Quotation</span>
          </button>

          {/* Archive / Unarchive Action */}
          <button
            type="button"
            onClick={handleToggleArchive}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors border ${
              formData.isArchived
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title={formData.isArchived ? 'Restore project to active dashboard' : 'Archive project from active dashboard'}
          >
            {formData.isArchived ? (
              <>
                <ArchiveRestore className="w-4 h-4 text-amber-700" />
                <span>Unarchive</span>
              </>
            ) : (
              <>
                <Archive className="w-4 h-4 text-slate-600" />
                <span>Archive</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Archived Banner Notification */}
      {formData.isArchived && (
        <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-slate-600 shrink-0" />
            <span>
              <strong>Archived Project:</strong> This project was archived{formData.archivedAt ? ` on ${new Date(formData.archivedAt).toLocaleDateString()}` : ''}{formData.archivedBy ? ` by ${formData.archivedBy}` : ''}. It is hidden from the active dashboard view but remains fully preserved in the database for historical reporting.
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleArchive}
            className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs shrink-0 flex items-center gap-1"
          >
            <ArchiveRestore className="w-3.5 h-3.5 text-slate-600" />
            <span>Restore to Active</span>
          </button>
        </div>
      )}

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* SECTION 4: PROJECT INFORMATION FORM */}
      {activeSection === 'info' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Project Information & Scope</h3>
              <p className="text-xs text-slate-500">
                Customer, division, schedule, and contract structure (Section 4)
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">ID: {formData.id}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Project Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="e.g. Dubai Marina Mall HVAC Duct Decontamination"
              />
            </div>

            {/* Project Reference */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project Reference / Job Code *
              </label>
              <input
                type="text"
                value={formData.projectReference}
                onChange={(e) => setFormData({ ...formData, projectReference: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="e.g. DMM-ENV-2026"
              />
            </div>

            {/* Existing Customer Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer *
              </label>
              <select
                aria-label="Customer"
                value={formData.customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="">Select Existing Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Contact Person */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Site Location */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Site Location (UAE)
              </label>
              <input
                type="text"
                value={formData.siteLocation}
                onChange={(e) => setFormData({ ...formData, siteLocation: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="e.g. Mall of the Emirates, Food Court Level 1, Barsha, Dubai"
              />
            </div>

            {/* Division */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ABC Division *
              </label>
              <select
                aria-label="ABC Division"
                value={formData.division}
                onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {settings.divisions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Service Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Service Type
              </label>
              <input
                type="text"
                value={formData.serviceType}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="e.g. Kitchen Exhaust Hood Cleaning"
              />
            </div>

            {/* Contract Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contract Type *
              </label>
              <select
                aria-label="Contract Type"
                value={formData.contractType}
                onChange={(e) => setFormData({ ...formData, contractType: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="One-Time">One-Time Service</option>
                <option value="AMC">Annual Maintenance Contract (AMC)</option>
                <option value="Recurring">Recurring Service Contract</option>
                <option value="Project-Based">Project-Based</option>
              </select>
            </div>

            {/* Number of Visits */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Number of Visits *
              </label>
              <input
                type="number"
                min="1"
                value={formData.numberOfVisits}
                onChange={(e) => {
                  const visits = Math.max(1, parseInt(e.target.value) || 1);
                  setFormData({ ...formData, numberOfVisits: visits });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Estimated Duration */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estimated Project Duration
              </label>
              <input
                type="text"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="e.g. 2 Days or 12 Months (Monthly)"
              />
            </div>

            {/* Salesperson */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Salesperson Name
              </label>
              <input
                type="text"
                value={formData.salespersonName}
                onChange={(e) => setFormData({ ...formData, salespersonName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Salesperson Contact */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Salesperson Phone
              </label>
              <input
                type="text"
                value={formData.salespersonPhone}
                onChange={(e) => setFormData({ ...formData, salespersonPhone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Expected Completion Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expected Completion Date
              </label>
              <input
                type="date"
                value={formData.expectedCompletionDate}
                onChange={(e) => setFormData({ ...formData, expectedCompletionDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Quotation Validity */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quotation Validity (Days)
              </label>
              <input
                type="number"
                min="7"
                max="180"
                value={formData.quotationValidityDays}
                onChange={(e) => setFormData({ ...formData, quotationValidityDays: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Archive Status Info */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dashboard Visibility & Archive Status
              </label>
              <div className="flex items-center justify-between py-2 px-3 border border-slate-300 rounded-lg bg-slate-50 text-xs">
                <span className={`font-bold flex items-center gap-1.5 ${formData.isArchived ? 'text-amber-800' : 'text-emerald-700'}`}>
                  <Archive className="w-3.5 h-3.5" />
                  {formData.isArchived ? 'Archived (Hidden from Active)' : 'Active (Visible on Dashboard)'}
                </span>
                <button
                  type="button"
                  onClick={handleToggleArchive}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  {formData.isArchived ? 'Unarchive' : 'Archive'}
                </button>
              </div>
            </div>

            {/* Internal Remarks */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Internal Remarks & Special Site Instructions
              </label>
              <textarea
                rows={2}
                value={formData.internalRemarks}
                onChange={(e) => setFormData({ ...formData, internalRemarks: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="Add confidential notes, night-shift constraints, gate pass instructions, or client preferences..."
              />
            </div>

            {/* Project File Attachments & Site Photos Preview Card */}
            <div className="md:col-span-3 bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Site Photos, Layouts & Attached Documents
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Associate site condition photos, floor plans, gate passes, and client specification sheets.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    {formData.attachments?.length || 0} {(formData.attachments?.length || 0) === 1 ? 'Attachment' : 'Attachments'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSection('attachments')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload & Manage Files</span>
                  </button>
                </div>
              </div>

              {/* Quick Thumbnail Strip */}
              {(formData.attachments && formData.attachments.length > 0) ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1">
                  {formData.attachments.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setActiveSection('attachments')}
                      className="group relative bg-white border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-xs transition-all"
                    >
                      <div className="h-16 bg-slate-100 flex items-center justify-center overflow-hidden">
                        {item.type.startsWith('image/') ? (
                          <img
                            src={item.dataUrl}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <FileText className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                      <div className="p-1.5 bg-white">
                        <p className="text-[10px] font-bold text-slate-800 truncate" title={item.name}>
                          {item.name}
                        </p>
                        <span className="text-[9px] text-slate-400 block truncate">
                          {item.category}
                        </span>
                      </div>
                    </div>
                  ))}
                  {formData.attachments.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setActiveSection('attachments')}
                      className="h-full min-h-[90px] border border-dashed border-slate-300 rounded-lg bg-white hover:bg-blue-50/50 flex flex-col items-center justify-center p-2 text-center text-xs font-bold text-blue-600 transition-colors"
                    >
                      <span>+{formData.attachments.length - 6} More</span>
                      <span className="text-[10px] text-slate-400 font-normal">View All</span>
                    </button>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => setActiveSection('attachments')}
                  className="py-3 px-4 border border-dashed border-slate-300 rounded-lg bg-white/70 hover:bg-blue-50/40 text-center cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  <UploadCloud className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-600">
                    No files attached yet. <strong className="text-blue-600 hover:underline">Click to attach site photos or documents</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveSection('attachments')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Paperclip className="w-3.5 h-3.5 text-blue-600" />
              <span>Attach Photos & Documents ({formData.attachments?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('costs')}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-500 shadow-xs cursor-pointer ml-auto"
            >
              <span>Next: Cost Breakdown (Categories A to G)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SECTION 5: COST BREAKDOWN CATEGORIES A TO G */}
      {activeSection === 'costs' && (
        <div className="space-y-6">
          {/* CATEGORY A: LABOUR COST */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">
                    A
                  </span>
                  Labour Cost
                </h3>
                <p className="text-xs text-slate-500">
                  Technicians, teams, workers count, working hours/days, and cost rate per unit
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-slate-900">
                  Subtotal: {formatAED(computedCosts.directLabourTotal)}
                </span>
                <button
                  type="button"
                  onClick={addLabourRow}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Worker / Team</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Technician Role / Grade</th>
                    <th className="p-2.5">Team Name</th>
                    <th className="p-2.5 text-center">Workers</th>
                    <th className="p-2.5 text-center">Hours / Days</th>
                    <th className="p-2.5">Unit</th>
                    <th className="p-2.5">Rate (AED)</th>
                    <th className="p-2.5 text-center">Visits</th>
                    <th className="p-2.5 text-right">Total (AED)</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {formData.labourCosts.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.technicianRole}
                          onChange={(e) => updateLabourRow(idx, { technicianRole: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                          placeholder="e.g. HVAC Lead Technician"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.teamName}
                          onChange={(e) => updateLabourRow(idx, { teamName: e.target.value })}
                          className="w-24 px-2 py-1 border border-slate-300 rounded text-xs"
                          placeholder="Team Alpha"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.workersCount}
                          onChange={(e) => updateLabourRow(idx, { workersCount: parseInt(e.target.value) || 1 })}
                          className="w-14 px-2 py-1 border border-slate-300 rounded text-xs text-center font-semibold"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={item.hoursOrDaysPerVisit}
                          onChange={(e) => updateLabourRow(idx, { hoursOrDaysPerVisit: parseFloat(e.target.value) || 0 })}
                          className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-center font-semibold"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          aria-label="Unit Type"
                          value={item.unitType}
                          onChange={(e) => updateLabourRow(idx, { unitType: e.target.value as any })}
                          className="px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                        >
                          <option value="Hour">Hour</option>
                          <option value="Day">Day</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.ratePerUnit}
                          onChange={(e) => updateLabourRow(idx, { ratePerUnit: parseFloat(e.target.value) || 0 })}
                          className="w-20 px-2 py-1 border border-slate-300 rounded text-xs font-semibold"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.visitsMultiplier}
                          onChange={(e) => updateLabourRow(idx, { visitsMultiplier: parseInt(e.target.value) || 1 })}
                          className="w-14 px-2 py-1 border border-slate-300 rounded text-xs text-center font-semibold"
                        />
                      </td>
                      <td className="p-2 text-right font-bold text-slate-900">
                        {formatAED(item.total)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeLabourRow(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {formData.labourCosts.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-slate-400 italic">
                        No labour entries. Click "Add Worker / Team" to add estimated labour.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CATEGORY B: MATERIALS & CHEMICALS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">
                    B
                  </span>
                  Materials & Chemicals (Store Integration)
                </h3>
                <p className="text-xs text-slate-500">
                  Select materials from existing stock records or enter project-specific items
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-slate-900">
                  Subtotal: {formatAED(computedCosts.materialChemicalTotal)}
                </span>
                <button
                  type="button"
                  onClick={addMaterialRow}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Material</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Pick From Store / Material Name</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Unit</th>
                    <th className="p-2.5 text-center">Qty Required</th>
                    <th className="p-2.5">Unit Cost (AED)</th>
                    <th className="p-2.5">Stock Status</th>
                    <th className="p-2.5 text-right">Total (AED)</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {formData.materialCosts.map((item, idx) => {
                    const isLowStock = item.stockAvailable !== undefined && item.stockAvailable < item.quantity;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="p-2 min-w-[200px]">
                          <div className="space-y-1">
                            <select
                              aria-label="Pick From Store Inventory"
                              value={item.storeItemId || ''}
                              onChange={(e) => selectStoreInventoryForMaterial(idx, e.target.value)}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white text-slate-700"
                            >
                              <option value="">-- Choose From Store Catalog --</option>
                              {inventory.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                  [{inv.sku}] {inv.name} (Stock: {inv.currentStock} {inv.unit})
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateMaterialRow(idx, { name: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-medium"
                              placeholder="Material / Chemical Name"
                            />
                          </div>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.chemicalOrAssetType}
                            onChange={(e) => updateMaterialRow(idx, { chemicalOrAssetType: e.target.value })}
                            className="w-24 px-2 py-1 border border-slate-300 rounded text-xs"
                            placeholder="Type"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            aria-label="Unit of Measurement"
                            value={item.unit}
                            onChange={(e) => updateMaterialRow(idx, { unit: e.target.value as any })}
                            className="px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                          >
                            <option value="litres">litres</option>
                            <option value="kilograms">kilograms</option>
                            <option value="pieces">pieces</option>
                            <option value="boxes">boxes</option>
                            <option value="drums">drums</option>
                            <option value="cans">cans</option>
                            <option value="units">units</option>
                            <option value="packs">packs</option>
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="0.1"
                            step="0.5"
                            value={item.quantity}
                            onChange={(e) => updateMaterialRow(idx, { quantity: parseFloat(e.target.value) || 0 })}
                            className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-center font-bold"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={item.unitPurchaseCost}
                            onChange={(e) => updateMaterialRow(idx, { unitPurchaseCost: parseFloat(e.target.value) || 0 })}
                            className="w-20 px-2 py-1 border border-slate-300 rounded text-xs font-semibold"
                          />
                        </td>
                        <td className="p-2">
                          {item.stockAvailable !== undefined ? (
                            isLowStock ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                                <AlertCircle className="w-3 h-3" />
                                Low ({item.stockAvailable} avail)
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                In Stock ({item.stockAvailable})
                              </span>
                            )
                          ) : (
                            <span className="text-[11px] text-slate-400">Non-catalog</span>
                          )}
                        </td>
                        <td className="p-2 text-right font-bold text-slate-900">
                          {formatAED(item.total)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeMaterialRow(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {formData.materialCosts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-slate-400 italic">
                        No materials added. Click "Add Material" or pick from the store catalog.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CATEGORY C: TRANSPORTATION & SITE EXPENSES */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-black">
                    C
                  </span>
                  Transportation & Site Expenses
                </h3>
                <p className="text-xs text-slate-500">
                  Vehicle transport, fuel, parking, tolls (Salik), gate passes, and accommodation
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-slate-900">
                  Subtotal: {formatAED(computedCosts.transportationTotal)}
                </span>
                <button
                  type="button"
                  onClick={addTransportRow}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded-lg transition-colors border border-cyan-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Transport Entry</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5">Expense Type</th>
                    <th className="p-2.5 text-center">Visits / Trips</th>
                    <th className="p-2.5">Rate / Cost per Trip (AED)</th>
                    <th className="p-2.5 text-right">Total (AED)</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {formData.transportCosts.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateTransportRow(idx, { description: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                          placeholder="e.g. Tanker Haulage to Al Aweer"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          aria-label="Transport Expense Type"
                          value={item.type}
                          onChange={(e) => updateTransportRow(idx, { type: e.target.value as any })}
                          className="px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                        >
                          <option value="vehicle_rental">Vehicle / Van</option>
                          <option value="fuel">Fuel / Petrol</option>
                          <option value="salik_tolls">Salik Tolls</option>
                          <option value="parking">Parking Fees</option>
                          <option value="gate_pass">Site Gate Pass</option>
                          <option value="accommodation">Accommodation</option>
                          <option value="other">Other Site Expense</option>
                        </select>
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.visitsOrTrips}
                          onChange={(e) => updateTransportRow(idx, { visitsOrTrips: parseInt(e.target.value) || 1 })}
                          className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-center font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={item.ratePerTrip}
                          onChange={(e) => updateTransportRow(idx, { ratePerTrip: parseFloat(e.target.value) || 0 })}
                          className="w-24 px-2 py-1 border border-slate-300 rounded text-xs font-semibold"
                        />
                      </td>
                      <td className="p-2 text-right font-bold text-slate-900">
                        {formatAED(item.total)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeTransportRow(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {formData.transportCosts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400 italic">
                        No transport lines entered. Click "Add Transport Entry".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CATEGORY D: EQUIPMENT & ASSETS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-black">
                    D
                  </span>
                  Equipment & Assets
                </h3>
                <p className="text-xs text-slate-500">
                  Rental, usage charge, or allocated depreciation. Anti-double counting enforced.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-slate-900">
                  Subtotal: {formatAED(computedCosts.equipmentTotal)}
                </span>
                <button
                  type="button"
                  onClick={addEquipmentRow}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Equipment</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Equipment Name / Machine</th>
                    <th className="p-2.5">Charging Method</th>
                    <th className="p-2.5 text-center">Duration</th>
                    <th className="p-2.5">Unit</th>
                    <th className="p-2.5">Rate per Unit (AED)</th>
                    <th className="p-2.5 text-right">Total (AED)</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {formData.equipmentCosts.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.equipmentName}
                          onChange={(e) => updateEquipmentRow(idx, { equipmentName: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                          placeholder="e.g. High Pressure Jetting Machine"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          aria-label="Equipment Charging Method"
                          value={item.type}
                          onChange={(e) => updateEquipmentRow(idx, { type: e.target.value as any })}
                          className="px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                        >
                          <option value="rental">Third-Party Rental</option>
                          <option value="usage_charge">Usage Charge</option>
                          <option value="allocated_depreciation">Allocated Depreciation</option>
                          <option value="other">Other Asset Expense</option>
                        </select>
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.durationUnits}
                          onChange={(e) => updateEquipmentRow(idx, { durationUnits: parseFloat(e.target.value) || 0 })}
                          className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-center font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          aria-label="Duration Unit Type"
                          value={item.unitType}
                          onChange={(e) => updateEquipmentRow(idx, { unitType: e.target.value as any })}
                          className="px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                        >
                          <option value="Days">Days</option>
                          <option value="Hours">Hours</option>
                          <option value="Weeks">Weeks</option>
                          <option value="Months">Months</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={item.ratePerUnit}
                          onChange={(e) => updateEquipmentRow(idx, { ratePerUnit: parseFloat(e.target.value) || 0 })}
                          className="w-24 px-2 py-1 border border-slate-300 rounded text-xs font-semibold"
                        />
                      </td>
                      <td className="p-2 text-right font-bold text-slate-900">
                        {formatAED(item.total)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeEquipmentRow(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {formData.equipmentCosts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-400 italic">
                        No equipment lines entered. Click "Add Equipment".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Anti Double Count Callout */}
            <div className="bg-purple-50/60 border border-purple-200 rounded-lg p-2.5 text-[11px] text-purple-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-700 shrink-0" />
              <span>
                <strong>Cost Accounting Rule:</strong> Never count an owned asset's full capital purchase price and its project usage charge together for the same job.
              </span>
            </div>
          </div>

          {/* CATEGORY E: SUBCONTRACTORS & OTHER DIRECT COSTS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-black">
                    E
                  </span>
                  Subcontractor & Other Direct Costs
                </h3>
                <p className="text-xs text-slate-500">
                  Third-party services, municipality lab testing, waste tipping, and official permits
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-slate-900">
                  Subtotal: {formatAED(computedCosts.subcontractorTotal)}
                </span>
                <button
                  type="button"
                  onClick={addSubcontractorRow}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Subcontractor / Lab Fee</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Vendor / Service Provider</th>
                    <th className="p-2.5">Scope of Work / Deliverable</th>
                    <th className="p-2.5 text-center">Permit / Lab Fee?</th>
                    <th className="p-2.5 text-right">Amount (AED)</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {formData.subcontractorCosts.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.serviceOrVendor}
                          onChange={(e) => updateSubcontractorRow(idx, { serviceOrVendor: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-medium"
                          placeholder="e.g. DM Certified Water Lab"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.scopeOfWork}
                          onChange={(e) => updateSubcontractorRow(idx, { scopeOfWork: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                          placeholder="e.g. Legionella bacteriological culture test"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={item.permitOrLabFee}
                          onChange={(e) => updateSubcontractorRow(idx, { permitOrLabFee: e.target.checked })}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={item.amount}
                          onChange={(e) => updateSubcontractorRow(idx, { amount: parseFloat(e.target.value) || 0 })}
                          className="w-28 px-2 py-1 border border-slate-300 rounded text-xs text-right font-bold text-slate-900"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeSubcontractorRow(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {formData.subcontractorCosts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                        No subcontractor or lab fees entered. Click "Add Subcontractor / Lab Fee".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CATEGORY F: OVERHEAD & CONTINGENCY */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-xs font-black">
                  F
                </span>
                Overhead & Contingency Allocation
              </h3>
              <p className="text-xs text-slate-500">
                Applied to direct costs base: {formatAED(computedCosts.directCostsBase)}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Overhead Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Allocated Overhead</span>
                  <span className="text-xs font-bold text-slate-900">
                    {formatAED(computedCosts.overheadTotal)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    aria-label="Overhead Type"
                    value={formData.overheadContingency.overheadType}
                    onChange={(e) => updateOverheadContingency({ overheadType: e.target.value as any })}
                    className="px-2 py-1.5 border border-slate-300 rounded text-xs bg-white font-medium"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (AED)</option>
                  </select>
                  {formData.overheadContingency.overheadType === 'percentage' ? (
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        step="0.5"
                        value={formData.overheadContingency.overheadRate}
                        onChange={(e) => updateOverheadContingency({ overheadRate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs font-bold"
                      />
                      <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={formData.overheadContingency.overheadAmount}
                      onChange={(e) => updateOverheadContingency({ overheadAmount: parseFloat(e.target.value) || 0 })}
                      className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs font-bold"
                      placeholder="AED"
                    />
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Applied to direct costs base ({formatAED(computedCosts.directCostsBase)})
                </p>
              </div>

              {/* Contingency Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Contingency Buffer</span>
                  <span className="text-xs font-bold text-slate-900">
                    {formatAED(computedCosts.contingencyTotal)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    aria-label="Contingency Type"
                    value={formData.overheadContingency.contingencyType}
                    onChange={(e) => updateOverheadContingency({ contingencyType: e.target.value as any })}
                    className="px-2 py-1.5 border border-slate-300 rounded text-xs bg-white font-medium"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (AED)</option>
                  </select>
                  {formData.overheadContingency.contingencyType === 'percentage' ? (
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="0.5"
                        value={formData.overheadContingency.contingencyRate}
                        onChange={(e) => updateOverheadContingency({ contingencyRate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs font-bold"
                      />
                      <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={formData.overheadContingency.contingencyAmount}
                      onChange={(e) => updateOverheadContingency({ contingencyAmount: parseFloat(e.target.value) || 0 })}
                      className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs font-bold"
                      placeholder="AED"
                    />
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Protects against unforeseen site complications & safety delays
                </p>
              </div>
            </div>
          </div>

          {/* CATEGORY G: ESTIMATED TOTAL PROJECT COST SUMMARY BANNER */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 rounded-2xl shadow-md">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-blue-300 font-bold block mb-1">
                  Category G: Total Project Cost
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {formatAED(computedCosts.estimatedTotalCost)}
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Labour ({formatAED(computedCosts.directLabourTotal)}) + Materials ({formatAED(computedCosts.materialChemicalTotal)}) + Transport ({formatAED(computedCosts.transportationTotal)}) + Equipment ({formatAED(computedCosts.equipmentTotal)}) + Subcontractor ({formatAED(computedCosts.subcontractorTotal)}) + Overhead & Contingency ({formatAED(computedCosts.overheadTotal + computedCosts.contingencyTotal)})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveSection('pricing')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
              >
                <span>Proceed to Pricing & Quotation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6 & 8: PRICING ENGINE & UAE VAT */}
      {activeSection === 'pricing' && (
        <div className="space-y-6">
          <PricingCalculator
            estimatedTotalCost={computedCosts.estimatedTotalCost}
            pricingMethod={formData.pricingMethod}
            setPricingMethod={(method) => syncTotals({ pricingMethod: method })}
            targetPercentage={formData.targetPercentage}
            setTargetPercentage={(pct) => syncTotals({ targetPercentage: pct })}
            quotedSellingPrice={formData.quotedSellingPrice}
            setQuotedSellingPrice={(price) => syncTotals({ quotedSellingPrice: price })}
            vatRate={formData.vatRate || settings.vatRate}
            onOpenExplainer={onOpenExplainer}
            canEditPricing={canEditPricing}
          />

          <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl border border-slate-200 gap-3">
            <button
              type="button"
              onClick={() => setActiveSection('costs')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              ← Back to Cost Breakdown
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setActiveSection('attachments')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Paperclip className="w-4 h-4 text-blue-600" />
                <span>Site Photos & Docs ({(formData.attachments?.length || 0)})</span>
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => onPrepareQuotation(formData)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Generate Official Quotation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: SITE PHOTOS & ATTACHED DOCUMENTS */}
      {activeSection === 'attachments' && (
        <div className="space-y-6">
          <ProjectAttachmentsSection
            attachments={formData.attachments || []}
            onChange={(newAttachments) => setFormData(prev => ({ ...prev, attachments: newAttachments }))}
            currentUser={currentUser}
          />

          <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl border border-slate-200 gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSection('info')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                ← 1. Project Info
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('costs')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                ← 2. Cost Breakdown
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Project Record</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('pricing')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>3. Pricing & VAT →</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
