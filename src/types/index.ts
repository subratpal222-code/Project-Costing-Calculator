/**
 * ABC LLC - Project Costing, Profit Analysis & Quotation Calculator
 * Domain Types and Interfaces
 */

export type Division = 
  | 'Enviro Tech Division'
  | 'Grease Trap Division'
  | 'Chem Tech Division'
  | 'Home Care Division'
  | 'Pest Control Division'
  | string;

export type ContractType = 'One-Time' | 'AMC' | 'Recurring' | 'Project-Based';

export type ProjectStatus = 
  | 'Draft'
  | 'Under Review'
  | 'Approved'
  | 'Quoted'
  | 'Won'
  | 'Lost'
  | 'Completed';

export type PricingMethod = 'markup' | 'margin';

export type UserRole = 
  | 'Administrator'
  | 'Accounts/Finance'
  | 'Operations/Project Manager'
  | 'Sales Coordinator'
  | 'Store User'
  | 'Approver/Management';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  division?: Division;
}

// Category A: Labour Cost Line Item
export interface LabourCostItem {
  id: string;
  technicianRole: string;
  teamName: string;
  workersCount: number;
  hoursOrDaysPerVisit: number;
  ratePerUnit: number; // AED per hour or day
  unitType: 'Hour' | 'Day';
  visitsMultiplier: number; // Usually matches project visits or specific visit count
  total: number;
}

// Category B: Material and Chemicals Line Item
export interface MaterialCostItem {
  id: string;
  name: string;
  chemicalOrAssetType: string;
  storeItemId?: string; // Optional link to Store catalog
  unit: 'litres' | 'kilograms' | 'pieces' | 'boxes' | 'drums' | 'cans' | 'units' | 'packs';
  quantity: number;
  unitPurchaseCost: number; // AED
  total: number;
  stockAvailable?: number;
  notes?: string;
}

// Category C: Transportation & Site Expenses
export interface TransportCostItem {
  id: string;
  description: string;
  type: 'vehicle_rental' | 'fuel' | 'parking' | 'salik_tolls' | 'accommodation' | 'gate_pass' | 'other';
  visitsOrTrips: number;
  ratePerTrip: number;
  total: number;
}

// Category D: Equipment & Assets
export interface EquipmentCostItem {
  id: string;
  equipmentName: string;
  type: 'rental' | 'usage_charge' | 'allocated_depreciation' | 'other';
  quantity: number;
  durationUnits: number; // e.g., 2 days or 10 hours
  unitType: 'Days' | 'Hours' | 'Weeks' | 'Months';
  ratePerUnit: number;
  total: number;
  preventDoubleCountWarning?: string;
}

// Category E: Subcontractor and Other Direct Costs
export interface SubcontractorCostItem {
  id: string;
  serviceOrVendor: string;
  scopeOfWork: string;
  amount: number;
  total?: number;
  permitOrLabFee: boolean;
  notes?: string;
}

// Category F: Overhead & Contingency Configuration
export interface OverheadContingencyConfig {
  overheadType: 'percentage' | 'fixed';
  overheadRate: number; // e.g. 10%
  overheadAmount: number; // calculated or fixed AED
  overheadBase: 'direct_costs';

  contingencyType: 'percentage' | 'fixed';
  contingencyRate: number; // e.g. 5%
  contingencyAmount: number; // calculated or fixed AED
  contingencyBase: 'direct_costs';
}

// Actual Project Expense Record
export interface ActualExpenseRecord {
  id: string;
  projectId: string;
  date: string;
  category: 'Labour' | 'Materials' | 'Transportation' | 'Equipment' | 'Subcontractor' | 'Other';
  quantity?: number;
  amount: number; // AED
  description: string;
  enteredBy: string;
  enteredByRole: UserRole;
  receiptOrRefNumber?: string;
  isApproved: boolean;
  visitNumber?: number;
}

// Store Inventory Item
export interface StoreInventoryItem {
  id: string;
  sku: string;
  itemCode?: string;
  name: string;
  category: 'Chemical' | 'Consumable' | 'Equipment Asset' | 'Safety / PPE' | 'Tool';
  division: Division;
  unit: 'litres' | 'kilograms' | 'pieces' | 'boxes' | 'drums' | 'cans' | 'units' | 'packs';
  currentStock: number;
  reservedStock: number;
  minStockLevel: number;
  averageUnitCost: number; // AED
  unitCost?: number;
  lastPurchaseDate?: string;
}

// Store Material Issue Tracking
export interface MaterialIssueRecord {
  id: string;
  projectId: string; // Target Project ID (or custom ref)
  projectNumber?: string; // Project Number / Job Reference (Editable)
  projectName?: string; // Job / Project Name
  customerName?: string; // Customer / Client Name
  salespersonName?: string; // Sales Person (Editable)
  jobAddress?: string; // Address for the Job (Editable)
  storeItemId: string;
  itemCode?: string; // Item SKU / Catalog Code (Editable)
  itemName: string; // Material / Product Name (Editable)
  issueDate: string;
  quantityIssued: number;
  quantityUsed: number;
  quantityReturned: number;
  quantityWasted: number;
  unit: string;
  unitCost: number;
  totalConsumptionCost: number; // (quantityUsed + quantityWasted) * unitCost
  issuedBy: string;
  receivedBy?: string; // Transporter / Site Supervisor
  authorizedBy?: string; // Authorized Person / Operations Manager for Signature
  authorizedSignatureDate?: string;
  notes?: string;
  status: 'Issued' | 'Reconciled' | 'Returned';
}

// Customer Profile
export interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  location: string;
  industry: string;
  taxRegistrationNumber?: string;
}

// Audit Log Entry
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  details: string;
}

// Main Project Costing Record
export interface ProjectCosting {
  id: string; // e.g., ABC-PC-2026-001
  projectReference: string;
  projectName: string;
  
  // Customer details
  customerId: string;
  customerName: string;
  contactPerson: string;
  contactPhone: string;
  siteLocation: string;

  // Project details
  division: Division;
  serviceType: string;
  salespersonName: string;
  salespersonPhone: string;
  startDate: string;
  expectedCompletionDate: string;
  numberOfVisits: number;
  estimatedDuration: string; // e.g., "3 Days", "12 Months (Monthly)"
  contractType: ContractType;
  quotationValidityDays: number;
  status: ProjectStatus;
  internalRemarks: string;

  // Cost Breakdown Items
  labourCosts: LabourCostItem[];
  materialCosts: MaterialCostItem[];
  transportCosts: TransportCostItem[];
  equipmentCosts: EquipmentCostItem[];
  subcontractorCosts: SubcontractorCostItem[];
  overheadContingency: OverheadContingencyConfig;

  // Calculated Estimated Costs
  directLabourTotal: number;
  materialChemicalTotal: number;
  transportationTotal: number;
  equipmentTotal: number;
  subcontractorTotal: number;
  otherDirectCostsTotal: number;
  overheadTotal: number;
  contingencyTotal: number;
  estimatedTotalCost: number; // AED before VAT

  // Pricing & Profit
  pricingMethod: PricingMethod; // 'markup' | 'margin'
  targetPercentage: number; // e.g., 25%
  recommendedSellingPrice: number; // Calculated according to method
  quotedSellingPrice: number; // Actual quoted price (defaults to recommended, can be adjusted)
  expectedProfit: number; // Selling Price - Total Cost
  expectedMarkupPercentage: number;
  expectedProfitMarginPercentage: number;

  // UAE VAT Details
  vatRate: number; // Default 5.0
  vatAmount: number; // quotedSellingPrice * (vatRate / 100)
  finalQuotationTotal: number; // quotedSellingPrice + vatAmount

  // Revenue & Invoicing (for actual profit tracking)
  invoicedAmountBeforeVat: number;
  collectedAmountBeforeVat: number;
  recognizedRevenueBeforeVat: number;

  // Quotation Specifics (for printable quote)
  scopeOfWork: string[];
  quotationPaymentTerms: string;
  quotationExclusions: string[];
  quotationPreparedBy?: string;
  quotationApprovedBy?: string;
  quotationDate?: string;

  // Project Attachments & Site Photos
  attachments?: ProjectAttachment[];

  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvalRemarks?: string;
  approvedBy?: string;
  approvedAt?: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
}

// Project File Attachment & Site Photo Record
export type AttachmentCategory = 
  | 'Site Photo (Before)'
  | 'Site Photo (After)'
  | 'Site Survey / Layout'
  | 'Gate Pass / Safety Permit'
  | 'Client Specification'
  | 'Inspection Report'
  | 'Other Document';

export interface ProjectAttachment {
  id: string;
  name: string;
  size: number; // in bytes
  type: string; // MIME type e.g. 'image/jpeg', 'application/pdf', etc.
  category: AttachmentCategory;
  dataUrl: string; // Data URI (Base64) or local Object URL
  uploadedAt: string;
  uploadedBy?: string;
  notes?: string;
}

// App Settings Configuration
export interface AppSettings {
  vatRate: number;
  currency: string;
  divisions: string[];
  companyName: string;
  companyAddress: string;
  trn: string;
  phone: string;
  email: string;
  website: string;
}
