/**
 * ABC LLC - Store & Material Inventory Integration Module
 * Implements Section 10 of the Master Prompt specifications.
 * Handles inventory catalog, issuing materials against active projects,
 * tracking returns/wastage, insufficient stock alerts, and preventing duplicate deductions.
 */

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRightLeft, 
  FileText, 
  Download, 
  Search, 
  ShieldCheck, 
  RotateCcw,
  Layers,
  Info,
  Printer,
  User,
  MapPin,
  Hash,
  Calendar,
  Building,
  ExternalLink,
  Sparkles,
  Check
} from 'lucide-react';
import { 
  StoreInventoryItem, 
  MaterialIssueRecord, 
  ProjectCosting, 
  UserProfile 
} from '../types';
import { formatAED } from '../utils/calculator';
import { exportStoreInventoryReport } from '../utils/exportUtils';
import { downloadMaterialIssueSlip, printMaterialIssueSlip } from '../utils/materialSlipPdf';

interface StoreIntegrationProps {
  inventory: StoreInventoryItem[];
  materialIssues: MaterialIssueRecord[];
  projects: ProjectCosting[];
  currentUser: UserProfile;
  onIssueMaterial: (record: MaterialIssueRecord) => void;
  onReconcileIssue: (issueId: string, used: number, returned: number, wasted: number) => void;
  initialSearchTerm?: string;
  initialSelectedItemId?: string;
  autoOpenIssueModal?: boolean;
}

export const StoreIntegration: React.FC<StoreIntegrationProps> = ({
  inventory,
  materialIssues,
  projects,
  currentUser,
  onIssueMaterial,
  onReconcileIssue,
  initialSearchTerm,
  initialSelectedItemId,
  autoOpenIssueModal,
}) => {
  // Tabs
  const [activeTab, setActiveTab] = useState<'inventory' | 'issues'>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('ALL');

  // Issue modal / form state
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || 'CUSTOM');
  const [selectedItemId, setSelectedItemId] = useState(inventory[0]?.id || 'CUSTOM');

  // Editable Project / Job fields
  const [formProjectNumber, setFormProjectNumber] = useState(projects[0]?.id || '');
  const [formSalesPerson, setFormSalesPerson] = useState(projects[0]?.salespersonName || currentUser.name || '');
  const [formJobAddress, setFormJobAddress] = useState(projects[0]?.siteLocation || '');
  const [formCustomerName, setFormCustomerName] = useState(projects[0]?.customerName || '');
  const [formProjectName, setFormProjectName] = useState(projects[0]?.projectName || '');

  // Editable Material fields
  const [formItemName, setFormItemName] = useState(inventory[0]?.name || '');
  const [formItemCode, setFormItemCode] = useState(inventory[0]?.sku || '');
  const [formUnit, setFormUnit] = useState<string>(inventory[0]?.unit || 'litres');
  const [formUnitCost, setFormUnitCost] = useState<number>(inventory[0]?.averageUnitCost || 0);
  const [issueQuantity, setIssueQuantity] = useState(1);
  const [issueNotes, setIssueNotes] = useState('');

  // Personnel & Authorization Signatures
  const [formIssuedBy, setFormIssuedBy] = useState(currentUser.name);
  const [formReceivedBy, setFormReceivedBy] = useState('Site Supervisor / Lead Technician');
  const [formAuthorizedBy, setFormAuthorizedBy] = useState('Ahmed Al-Mansoor (Operations Manager)');
  const [formIssueDate, setFormIssueDate] = useState(new Date().toISOString().split('T')[0]);

  // Action status and post-issue PDF preview modal
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [issuedSlipForPreview, setIssuedSlipForPreview] = useState<MaterialIssueRecord | null>(null);

  // Reconciliation modal state
  const [reconcileTarget, setReconcileTarget] = useState<MaterialIssueRecord | null>(null);
  const [reconcileUsed, setReconcileUsed] = useState(0);
  const [reconcileReturned, setReconcileReturned] = useState(0);
  const [reconcileWasted, setReconcileWasted] = useState(0);

  // Sync external search query / item selection from Global Search
  useEffect(() => {
    if (initialSearchTerm !== undefined) {
      setSearchTerm(initialSearchTerm);
    }
    if (initialSelectedItemId) {
      setSelectedItemId(initialSelectedItemId);
      const found = inventory.find(i => i.id === initialSelectedItemId);
      if (found) {
        setFormItemName(found.name);
        setFormItemCode(found.sku || found.itemCode || '');
        setFormUnit(found.unit);
        setFormUnitCost(found.averageUnitCost ?? found.unitCost ?? 0);
      }
    }
    if (autoOpenIssueModal) {
      setShowIssueModal(true);
      setActiveTab('issues');
    }
  }, [initialSearchTerm, initialSelectedItemId, autoOpenIssueModal, inventory]);

  // Filter inventory
  const filteredInventory = inventory.filter((item) => {
    if (divisionFilter !== 'ALL' && item.division !== divisionFilter) return false;
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedInventoryItem = inventory.find((i) => i.id === selectedItemId);

  // Synchronize fields when selecting project from dropdown
  const handleProjectSelectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    if (projectId === 'CUSTOM') {
      setFormProjectNumber('ABC-JOB-' + Math.floor(1000 + Math.random() * 9000));
      setFormSalesPerson(currentUser.name);
      setFormJobAddress('');
      setFormCustomerName('');
      setFormProjectName('');
      return;
    }
    const proj = projects.find((p) => p.id === projectId);
    if (proj) {
      setFormProjectNumber(proj.id);
      setFormSalesPerson(proj.salespersonName || currentUser.name);
      setFormJobAddress(proj.siteLocation || '');
      setFormCustomerName(proj.customerName || '');
      setFormProjectName(proj.projectName || '');
    }
  };

  // Synchronize fields when selecting inventory item from dropdown
  const handleItemSelectChange = (itemId: string) => {
    setSelectedItemId(itemId);
    if (itemId === 'CUSTOM') {
      setFormItemName('');
      setFormItemCode('MAT-CUSTOM');
      setFormUnit('units');
      setFormUnitCost(0);
      return;
    }
    const item = inventory.find((i) => i.id === itemId);
    if (item) {
      setFormItemName(item.name);
      setFormItemCode(item.sku);
      setFormUnit(item.unit);
      setFormUnitCost(item.averageUnitCost);
    }
  };

  // Open modal and pre-populate clean defaults
  const handleOpenIssueModal = () => {
    const defaultProj = projects[0];
    const defaultItem = inventory[0];
    if (defaultProj) {
      setSelectedProjectId(defaultProj.id);
      setFormProjectNumber(defaultProj.id);
      setFormSalesPerson(defaultProj.salespersonName || currentUser.name);
      setFormJobAddress(defaultProj.siteLocation || '');
      setFormCustomerName(defaultProj.customerName || '');
      setFormProjectName(defaultProj.projectName || '');
    } else {
      setSelectedProjectId('CUSTOM');
      setFormProjectNumber('ABC-JOB-001');
      setFormSalesPerson(currentUser.name);
      setFormJobAddress('Dubai Site Location');
      setFormCustomerName('Direct Client');
      setFormProjectName('Site Execution Scope');
    }

    if (defaultItem) {
      setSelectedItemId(defaultItem.id);
      setFormItemName(defaultItem.name);
      setFormItemCode(defaultItem.sku);
      setFormUnit(defaultItem.unit);
      setFormUnitCost(defaultItem.averageUnitCost);
    } else {
      setSelectedItemId('CUSTOM');
      setFormItemName('Disinfectant Concentrate');
      setFormItemCode('MAT-001');
      setFormUnit('litres');
      setFormUnitCost(25);
    }

    setFormIssuedBy(currentUser.name);
    setFormReceivedBy('Site Supervisor / Lead Technician');
    setFormAuthorizedBy('Ahmed Al-Mansoor (Operations Manager)');
    setFormIssueDate(new Date().toISOString().split('T')[0]);
    setIssueQuantity(1);
    setIssueNotes('');
    setShowIssueModal(true);
  };

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItemName.trim() || issueQuantity <= 0) {
      alert('Please enter a valid Material / Product Name and a quantity greater than zero.');
      return;
    }

    if (!formProjectNumber.trim()) {
      alert('Please specify the Project Number.');
      return;
    }

    if (!formSalesPerson.trim()) {
      alert('Please specify the Sales Person.');
      return;
    }

    if (!formJobAddress.trim()) {
      alert('Please specify the Address for the Job.');
      return;
    }

    // Check inventory stock if linked to warehouse catalog
    if (selectedInventoryItem && selectedItemId !== 'CUSTOM') {
      const avail = selectedInventoryItem.currentStock - selectedInventoryItem.reservedStock;
      if (issueQuantity > avail) {
        alert(`Cannot issue ${issueQuantity} ${formUnit}. Available unreserved stock in warehouse is only ${avail} ${selectedInventoryItem.unit}.`);
        return;
      }
    }

    const calculatedTotal = Number((issueQuantity * formUnitCost).toFixed(2));
    const newIssue: MaterialIssueRecord = {
      id: `MIS-${Date.now().toString().slice(-6)}`,
      projectId: selectedProjectId !== 'CUSTOM' ? selectedProjectId : formProjectNumber.trim(),
      projectNumber: formProjectNumber.trim(),
      salespersonName: formSalesPerson.trim(),
      jobAddress: formJobAddress.trim(),
      customerName: formCustomerName.trim() || 'Direct Project Client',
      projectName: formProjectName.trim() || 'Site Execution Scope',
      storeItemId: selectedItemId || 'CUSTOM-MAT',
      itemCode: formItemCode.trim() || 'MAT-001',
      itemName: formItemName.trim(),
      issueDate: formIssueDate || new Date().toISOString().split('T')[0],
      quantityIssued: issueQuantity,
      quantityUsed: issueQuantity, // Default assumes used until reconciled
      quantityReturned: 0,
      quantityWasted: 0,
      unit: formUnit,
      unitCost: formUnitCost,
      totalConsumptionCost: calculatedTotal,
      issuedBy: formIssuedBy.trim() || currentUser.name,
      receivedBy: formReceivedBy.trim() || 'Site Supervisor',
      authorizedBy: formAuthorizedBy.trim() || 'Ahmed Al-Mansoor (Operations Manager)',
      notes: issueNotes.trim(),
      status: 'Issued',
    };

    onIssueMaterial(newIssue);
    setShowIssueModal(false);

    // Automatically trigger official PDF download format for Authorized Person Signature
    try {
      downloadMaterialIssueSlip(newIssue);
    } catch (err) {
      console.error('PDF download error:', err);
    }

    // Open the confirmation & quick PDF actions modal
    setIssuedSlipForPreview(newIssue);
    setActionSuccess(`Material issued successfully! Voucher ${newIssue.id} generated and PDF downloaded for Authorized Signature.`);
    setTimeout(() => setActionSuccess(null), 5000);
  };

  const handleOpenReconcile = (issue: MaterialIssueRecord) => {
    setReconcileTarget(issue);
    setReconcileUsed(issue.quantityUsed);
    setReconcileReturned(issue.quantityReturned);
    setReconcileWasted(issue.quantityWasted);
  };

  const handleReconcileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileTarget) return;

    const total = reconcileUsed + reconcileReturned + reconcileWasted;
    if (total !== reconcileTarget.quantityIssued) {
      alert(`Total of Used (${reconcileUsed}) + Returned (${reconcileReturned}) + Wasted (${reconcileWasted}) must equal the quantity originally issued (${reconcileTarget.quantityIssued}).`);
      return;
    }

    onReconcileIssue(reconcileTarget.id, reconcileUsed, reconcileReturned, reconcileWasted);
    setReconcileTarget(null);
    setActionSuccess('Material reconciliation complete. Unused stock returned to inventory.');
    setTimeout(() => setActionSuccess(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Module Title Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <Package className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Store & Material Inventory Integration
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Link costing estimates to store stock, issue materials to active jobs, and track returns (Section 10).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => exportStoreInventoryReport(inventory)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Stock Excel</span>
          </button>
          <button
            onClick={handleOpenIssueModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Material to Project</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Critical Section 10 Safeguard Notice */}
      <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5 text-emerald-950 text-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Inventory Protection Rule (Section 10):</strong> Preparing or drafting a quotation does <strong>not</strong> deduct inventory from warehouse stock. Stock is only deducted when materials are formally issued by the Store keeper to an active/approved project.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'inventory' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Warehouse Stock Catalog ({inventory.length} SKUs)</span>
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'issues' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Project Material Issues & Reconciliations ({materialIssues.length})</span>
        </button>
      </div>

      {/* TAB 1: INVENTORY CATALOG */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search inventory by SKU, chemical name, or category..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <select
              aria-label="Filter by Division"
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white"
            >
              <option value="ALL">All Divisions</option>
              <option value="Enviro Tech Division">Enviro Tech Division</option>
              <option value="Grease Trap Division">Grease Trap Division</option>
              <option value="Chem Tech Division">Chem Tech Division</option>
              <option value="Pest Control Division">Pest Control Division</option>
              <option value="Home Care Division">Home Care Division</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Item / Chemical Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Division</th>
                    <th className="p-3 text-center">Unit</th>
                    <th className="p-3 text-right">Current Stock</th>
                    <th className="p-3 text-right">Available</th>
                    <th className="p-3 text-right">Min Level</th>
                    <th className="p-3 text-right">Avg Unit Cost (AED)</th>
                    <th className="p-3 text-center">Stock Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredInventory.map((item) => {
                    const available = item.currentStock - item.reservedStock;
                    const isLow = item.currentStock <= item.minStockLevel;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900">{item.sku}</td>
                        <td className="p-3 font-semibold text-slate-900">{item.name}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{item.division}</td>
                        <td className="p-3 text-center font-medium text-slate-700">{item.unit}</td>
                        <td className="p-3 text-right font-bold text-slate-900">{item.currentStock}</td>
                        <td className="p-3 text-right font-black text-emerald-700">{available}</td>
                        <td className="p-3 text-right text-slate-500">{item.minStockLevel}</td>
                        <td className="p-3 text-right font-bold text-slate-900">{formatAED(item.averageUnitCost)}</td>
                        <td className="p-3 text-center">
                          {isLow ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[10px] uppercase">
                              Low Stock Alert
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                              Healthy
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ISSUES & RECONCILIATIONS */}
      {activeTab === 'issues' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Store Material Requisitions & Gate Pass Register</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Official records of issued materials, site dispatch vouchers, and Authorized Signatory slips.
              </p>
            </div>
            <button
              onClick={handleOpenIssueModal}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue New Material</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Slip ID & Date</th>
                  <th className="p-3">Project Number & Client</th>
                  <th className="p-3">Sales Person</th>
                  <th className="p-3">Address for the Job</th>
                  <th className="p-3">Material / Product</th>
                  <th className="p-3 text-center">Issued Qty</th>
                  <th className="p-3 text-right">Value (AED)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Official PDF Slip & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {materialIssues.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      No material issue records found. Click "Issue Material to Project" to generate your first slip.
                    </td>
                  </tr>
                ) : (
                  materialIssues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900">{issue.id}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{issue.issueDate}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-mono font-bold text-blue-700">
                          {issue.projectNumber || issue.projectId}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate max-w-[170px]" title={issue.customerName || issue.projectName}>
                          {issue.customerName || issue.projectName || 'Direct Client'}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{issue.salespersonName || 'Unassigned'}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="text-slate-600 flex items-start gap-1 max-w-[200px]" title={issue.jobAddress}>
                          <MapPin className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 text-[11px]">{issue.jobAddress || 'Site Address per Scope'}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{issue.itemName}</div>
                        <div className="text-[10px] font-mono text-slate-500">
                          SKU: {issue.itemCode || issue.storeItemId}
                        </div>
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="font-bold text-slate-900 px-2 py-0.5 rounded bg-slate-100">
                          {issue.quantityIssued} {issue.unit}
                        </span>
                        {issue.status === 'Reconciled' && (
                          <div className="text-[10px] text-slate-500 mt-1">
                            Used: {issue.quantityUsed} | Ret: {issue.quantityReturned}
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-right font-black text-slate-900 whitespace-nowrap">
                        {formatAED(issue.totalConsumptionCost)}
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          issue.status === 'Reconciled' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {issue.status}
                        </span>
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Official PDF Download Format */}
                          <button
                            type="button"
                            onClick={() => downloadMaterialIssueSlip(issue)}
                            title="Download Official Material Issue Slip (PDF) for Authorized Person Signature"
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md font-bold text-[11px] flex items-center gap-1 transition-colors shadow-2xs"
                          >
                            <Download className="w-3 h-3 text-red-600" />
                            <span>PDF Slip</span>
                          </button>

                          {/* Print Slip */}
                          <button
                            type="button"
                            onClick={() => printMaterialIssueSlip(issue)}
                            title="Open & Print Material Slip"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Reconcile Action */}
                          {issue.status !== 'Reconciled' && (
                            <button
                              type="button"
                              onClick={() => handleOpenReconcile(issue)}
                              className="px-2 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md font-bold text-[10px] transition-colors"
                            >
                              Reconcile
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ISSUE MATERIAL & GENERATE OFFICIAL PDF SLIP */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Package className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Issue Material & Generate Issue Slip</span>
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      PDF Ready
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Editable Project Number, Sales Person, Job Address & Material specs with Authorized Person Signature blocks.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 text-base font-bold flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleIssueSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* SECTION 1: TARGET JOB & PROJECT PARTICULARS (EDITABLE) */}
              <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-blue-600" />
                    <span>1. Project, Job Location & Sales Person Details</span>
                  </span>
                  <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-semibold">
                    All Fields Editable
                  </span>
                </div>

                {/* Quick Auto-fill Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Quick Autofill from Active Project Costing
                  </label>
                  <select
                    aria-label="Target Project Autofill"
                    value={selectedProjectId}
                    onChange={(e) => handleProjectSelectChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.id}] {p.customerName} - {p.projectName}
                      </option>
                    ))}
                    <option value="CUSTOM">+ Custom / Direct Job Site (Enter Manually)</option>
                  </select>
                </div>

                {/* 3-Column Inputs: Project Number, Sales Person, Customer */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Hash className="w-3 h-3 text-slate-400" />
                      <span>Project Number *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formProjectNumber}
                      onChange={(e) => setFormProjectNumber(e.target.value)}
                      placeholder="e.g. ABC-PC-2026-001"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400">Official Job / Costing Ref</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>Sales Person *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formSalesPerson}
                      onChange={(e) => setFormSalesPerson(e.target.value)}
                      placeholder="e.g. Tariq Mansoor"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400">Sales Engineer / In-Charge</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-400" />
                      <span>Customer / Client</span>
                    </label>
                    <input
                      type="text"
                      value={formCustomerName}
                      onChange={(e) => setFormCustomerName(e.target.value)}
                      placeholder="e.g. Dubai Health Authority"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400">Client / Company Name</span>
                  </div>
                </div>

                {/* Address for the Job & Project Scope */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-500" />
                      <span>Address for the Job *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formJobAddress}
                      onChange={(e) => setFormJobAddress(e.target.value)}
                      placeholder="e.g. Al Wasl Hospital, Building B, Dubai"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400">Site location / Building / Delivery floor</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-400" />
                      <span>Job / Project Title</span>
                    </label>
                    <input
                      type="text"
                      value={formProjectName}
                      onChange={(e) => setFormProjectName(e.target.value)}
                      placeholder="e.g. HVAC Duct Decontamination & Disinfection"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400">Scope of Work description</span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: MATERIAL / PRODUCT SPECIFICATION (EDITABLE) */}
              <div className="bg-emerald-50/50 rounded-xl border border-emerald-200/80 p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span>2. Material Product Specification (Editable)</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                    Stock & Custom Supported
                  </span>
                </div>

                {/* Quick Store Catalog Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Select Store Inventory Item (Autofills Details)
                  </label>
                  <select
                    aria-label="Store Inventory Item Autofill"
                    value={selectedItemId}
                    onChange={(e) => handleItemSelectChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        [{item.sku}] {item.name} — Avail: {item.currentStock - item.reservedStock} {item.unit} ({formatAED(item.averageUnitCost)})
                      </option>
                    ))}
                    <option value="CUSTOM">+ Custom / Non-Catalog Material (Type details below)</option>
                  </select>
                </div>

                {/* 3-Column Inputs: Material Name, SKU Code, Unit */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Material / Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formItemName}
                      onChange={(e) => setFormItemName(e.target.value)}
                      placeholder="e.g. Food-Grade Emulsifying Degreaser"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400">Chemical or product description</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Store Code / SKU
                    </label>
                    <input
                      type="text"
                      value={formItemCode}
                      onChange={(e) => setFormItemCode(e.target.value)}
                      placeholder="e.g. GT-DEGREASE-HD"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400">Inventory item reference</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Unit of Measure *
                    </label>
                    <select
                      aria-label="Unit of Measure"
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      <option value="litres">litres</option>
                      <option value="kilograms">kilograms</option>
                      <option value="pieces">pieces</option>
                      <option value="boxes">boxes</option>
                      <option value="drums">drums</option>
                      <option value="cans">cans</option>
                      <option value="units">units</option>
                      <option value="packs">packs</option>
                      <option value="rolls">rolls</option>
                      <option value="sets">sets</option>
                    </select>
                    <span className="text-[10px] text-slate-400">Measurement standard</span>
                  </div>
                </div>

                {/* Valuation & Quantity Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Unit Cost (AED) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formUnitCost}
                      onChange={(e) => setFormUnitCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400">Average cost per unit</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Quantity to Issue ({formUnit}) *
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      required
                      value={issueQuantity}
                      onChange={(e) => setIssueQuantity(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-black text-emerald-800 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <div className="text-[10px] text-slate-500 flex items-center justify-between mt-0.5">
                      {selectedInventoryItem && selectedItemId !== 'CUSTOM' ? (
                        <span>
                          Available: <strong>{selectedInventoryItem.currentStock - selectedInventoryItem.reservedStock}</strong> {selectedInventoryItem.unit}
                        </span>
                      ) : (
                        <span>Custom allocation</span>
                      )}
                    </div>
                  </div>

                  {/* Real-time Total Material Value */}
                  <div className="p-3 bg-white rounded-xl border border-emerald-300 shadow-2xs">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Total Consumption Value
                    </span>
                    <span className="text-base font-black text-emerald-700">
                      {formatAED(issueQuantity * formUnitCost)}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      Auto-appends to Project Actuals
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: REQUISITION, DELIVERY & AUTHORIZED SIGNATURE DETAILS */}
              <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>3. Delivery & Authorized Person Signatures</span>
                  </span>
                  <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded font-semibold">
                    Printed on PDF Slip
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Date of Issue *</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formIssueDate}
                      onChange={(e) => setFormIssueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>Issued By (Store Keeper) *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formIssuedBy}
                      onChange={(e) => setFormIssuedBy(e.target.value)}
                      placeholder="e.g. Rashid Khan"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 bg-white"
                    />
                    <span className="text-[10px] text-slate-400">Store In-Charge</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>Received By (Site Lead)</span>
                    </label>
                    <input
                      type="text"
                      value={formReceivedBy}
                      onChange={(e) => setFormReceivedBy(e.target.value)}
                      placeholder="e.g. Suresh Kumar (Site Supervisor)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 bg-white"
                    />
                    <span className="text-[10px] text-slate-400">Site Receiver / Driver</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-purple-600" />
                      <span>Authorized Person Signature *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formAuthorizedBy}
                      onChange={(e) => setFormAuthorizedBy(e.target.value)}
                      placeholder="e.g. Ahmed Al-Mansoor (Operations Manager)"
                      className="w-full px-3 py-2 border border-purple-300 rounded-lg text-xs font-bold text-purple-900 bg-purple-50/40 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400">
                      Operations Manager / Director name for printed signature & company stamp box
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Notes / Batch Ref / Gate Pass Remarks
                    </label>
                    <input
                      type="text"
                      value={issueNotes}
                      onChange={(e) => setIssueNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 bg-white"
                      placeholder="e.g. Batch #4410 - Dispatched with Supervisor Team"
                    />
                    <span className="text-[10px] text-slate-400">Printed on material issue slip</span>
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <div className="text-xs text-slate-500">
                  Total Value: <strong className="text-slate-900 font-bold">{formatAED(issueQuantity * formUnitCost)}</strong>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowIssueModal(false)}
                    className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-none px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all transform active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>Issue Material & Download PDF Slip</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POST-ISSUE SUCCESS & PDF PREVIEW MODAL */}
      {issuedSlipForPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Material Issued & PDF Slip Ready!
                  </h3>
                  <p className="text-xs text-slate-500">
                    Voucher <span className="font-mono font-bold text-slate-800">{issuedSlipForPreview.id}</span> generated.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIssuedSlipForPreview(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Slip Summary Card */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs space-y-2">
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Project Number:</span>
                <span className="font-mono font-bold text-blue-700">
                  {issuedSlipForPreview.projectNumber || issuedSlipForPreview.projectId}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Sales Person:</span>
                <span className="font-bold text-slate-800">
                  {issuedSlipForPreview.salespersonName || 'Unassigned'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Address for Job:</span>
                <span className="font-medium text-slate-800 text-right max-w-[240px] truncate">
                  {issuedSlipForPreview.jobAddress || 'Site Location'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Material Issued:</span>
                <span className="font-bold text-slate-900">
                  {issuedSlipForPreview.itemName} ({issuedSlipForPreview.quantityIssued} {issuedSlipForPreview.unit})
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Total Consumption:</span>
                <span className="font-black text-emerald-700">
                  {formatAED(issuedSlipForPreview.totalConsumptionCost)}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500 font-medium">Authorized Signatory:</span>
                <span className="font-bold text-purple-800">
                  {issuedSlipForPreview.authorizedBy || 'Operations Manager'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              The official Material Issue Slip was automatically downloaded. You can re-download or print additional copies below for Authorized Person Signature and site gate pass records.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => printMaterialIssueSlip(issuedSlipForPreview)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </button>
              <button
                type="button"
                onClick={() => downloadMaterialIssueSlip(issuedSlipForPreview)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Slip</span>
              </button>
              <button
                type="button"
                onClick={() => setIssuedSlipForPreview(null)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECONCILE USED & RETURNED */}
      {reconcileTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-blue-600" />
                Reconcile Material Usage & Returns
              </h3>
              <button
                onClick={() => setReconcileTarget(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReconcileSubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div><strong>Item:</strong> {reconcileTarget.itemName}</div>
                <div><strong>Project:</strong> {reconcileTarget.projectId}</div>
                <div><strong>Originally Issued:</strong> {reconcileTarget.quantityIssued} {reconcileTarget.unit}</div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Actually Used
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={reconcileUsed}
                    onChange={(e) => setReconcileUsed(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Returned Intact
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={reconcileReturned}
                    onChange={(e) => setReconcileReturned(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Damaged / Wasted
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={reconcileWasted}
                    onChange={(e) => setReconcileWasted(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-amber-700"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Returned items will be added back into warehouse unreserved stock immediately.
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReconcileTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  Submit Reconciliation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
