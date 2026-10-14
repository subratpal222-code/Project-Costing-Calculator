/**
 * ABC LLC - Excel & CSV Financial Reports Export Engine
 * Generates downloadable XLSX workbooks and clean UTF-8 CSV reports.
 */

import * as XLSX from 'xlsx';
import { ProjectCosting, ActualExpenseRecord, StoreInventoryItem } from '../types';

export type ExportFormat = 'xlsx' | 'csv';

/**
 * Universal file saver for browser environments supporting both XLSX and CSV.
 * Uses UTF-8 BOM for CSV to prevent character corruption in Excel.
 */
export function saveExportWorkbook(
  workbook: XLSX.WorkBook,
  baseFileName: string,
  format: ExportFormat = 'xlsx'
): void {
  const dateStr = new Date().toISOString().split('T')[0];
  const safeBase = baseFileName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fullFileName = `${safeBase}_${dateStr}.${format}`;

  if (typeof window === 'undefined') return;

  if (format === 'csv') {
    try {
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const csvContent = XLSX.utils.sheet_to_csv(sheet);
      // Prepend UTF-8 BOM so Microsoft Excel & Google Sheets correctly decode all characters
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fullFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback to SheetJS native CSV exporter
      XLSX.writeFile(workbook, fullFileName, { bookType: 'csv' });
    }
  } else {
    XLSX.writeFile(workbook, fullFileName, { bookType: 'xlsx' });
  }
}

/**
 * Export all projects to a comprehensive Excel workbook or CSV
 */
export function exportProjectsToExcel(
  projects: ProjectCosting[],
  format: ExportFormat = 'xlsx'
): void {
  const data = projects.map((p) => {
    return {
      'Project ID': p.id,
      'Project Ref': p.projectReference,
      'Project Name': p.projectName,
      'Customer': p.customerName,
      'Division': p.division,
      'Contract Type': p.contractType,
      'No. of Visits': p.numberOfVisits,
      'Status': p.status,
      'Direct Labour (AED)': p.directLabourTotal,
      'Materials (AED)': p.materialChemicalTotal,
      'Transport (AED)': p.transportationTotal,
      'Equipment (AED)': p.equipmentTotal,
      'Subcontractor (AED)': p.subcontractorTotal,
      'Overhead (AED)': p.overheadTotal,
      'Contingency (AED)': p.contingencyTotal,
      'Estimated Total Cost (AED)': p.estimatedTotalCost,
      'Pricing Method': p.pricingMethod === 'markup' ? 'Markup on Cost' : 'Target Profit Margin',
      'Target %': `${p.targetPercentage}%`,
      'Quoted Price Before VAT (AED)': p.quotedSellingPrice,
      'Expected Profit (AED)': p.expectedProfit,
      'Expected Profit Margin %': `${p.expectedProfitMarginPercentage}%`,
      'Expected Markup %': `${p.expectedMarkupPercentage}%`,
      'UAE VAT 5% (AED)': p.vatAmount,
      'Final Quote Total with VAT (AED)': p.finalQuotationTotal,
      'Recognized Revenue (AED)': p.recognizedRevenueBeforeVat,
      'Salesperson': p.salespersonName,
      'Archived': p.isArchived ? 'Yes' : 'No',
      'Start Date': p.startDate,
      'Created Date': p.createdAt ? p.createdAt.split('T')[0] : '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ABC Projects Costing');

  saveExportWorkbook(workbook, 'ABC_Projects_Costing_Master', format);
}

/**
 * Export detailed Project Cost Distribution Report (Labor, Material, Transport, Equipment, Subcontractor, Overhead, Contingency shares)
 * Supports both CSV and Excel format.
 */
export function exportProjectCostDistribution(
  projects: ProjectCosting[],
  actualExpenses: ActualExpenseRecord[] = [],
  format: ExportFormat = 'xlsx'
): void {
  const projectRows = projects.map((p) => {
    const expenses = actualExpenses.filter((e) => e.projectId === p.id);
    const actualCost = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalEst = p.estimatedTotalCost || 0;

    const labourShare = totalEst > 0 ? ((p.directLabourTotal || 0) / totalEst) * 100 : 0;
    const materialShare = totalEst > 0 ? ((p.materialChemicalTotal || 0) / totalEst) * 100 : 0;
    const transportShare = totalEst > 0 ? ((p.transportationTotal || 0) / totalEst) * 100 : 0;
    const equipmentShare = totalEst > 0 ? ((p.equipmentTotal || 0) / totalEst) * 100 : 0;
    const subconShare = totalEst > 0 ? ((p.subcontractorTotal || 0) / totalEst) * 100 : 0;
    const overheadShare = totalEst > 0 ? ((p.overheadTotal || 0) / totalEst) * 100 : 0;
    const contingencyShare = totalEst > 0 ? ((p.contingencyTotal || 0) / totalEst) * 100 : 0;

    const variance = totalEst - actualCost;
    const budgetStatus = actualCost > totalEst && totalEst > 0 ? 'OVERRUN' : 'ON TRACK';

    return {
      'Project ID': p.id,
      'Project Ref': p.projectReference,
      'Project Name': p.projectName,
      'Customer': p.customerName,
      'Division': p.division,
      'Contract Type': p.contractType,
      'Status': p.status,
      'Direct Labour (AED)': p.directLabourTotal,
      'Labour Share %': `${labourShare.toFixed(1)}%`,
      'Materials (AED)': p.materialChemicalTotal,
      'Materials Share %': `${materialShare.toFixed(1)}%`,
      'Transportation (AED)': p.transportationTotal,
      'Transportation Share %': `${transportShare.toFixed(1)}%`,
      'Equipment (AED)': p.equipmentTotal,
      'Equipment Share %': `${equipmentShare.toFixed(1)}%`,
      'Subcontractor (AED)': p.subcontractorTotal,
      'Subcontractor Share %': `${subconShare.toFixed(1)}%`,
      'Overheads (AED)': p.overheadTotal,
      'Overheads Share %': `${overheadShare.toFixed(1)}%`,
      'Contingency (AED)': p.contingencyTotal,
      'Contingency Share %': `${contingencyShare.toFixed(1)}%`,
      'Total Estimated Cost (AED)': totalEst,
      'Quoted Price (AED)': p.quotedSellingPrice,
      'Expected Profit (AED)': p.expectedProfit,
      'Profit Margin %': `${p.expectedProfitMarginPercentage}%`,
      'Actual Cost Incurred (AED)': actualCost,
      'Cost Variance (AED)': variance,
      'Budget Status': budgetStatus,
      'Salesperson': p.salespersonName || 'Unassigned',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(projectRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Project Cost Distribution');

  // If XLSX, add a division summary sheet as well
  if (format === 'xlsx') {
    const divMap: Record<
      string,
      {
        count: number;
        labour: number;
        material: number;
        transport: number;
        equipment: number;
        subcon: number;
        overheads: number;
        contingency: number;
        totalEst: number;
        quoted: number;
        profit: number;
        actualCost: number;
      }
    > = {};

    for (const p of projects) {
      if (!divMap[p.division]) {
        divMap[p.division] = {
          count: 0,
          labour: 0,
          material: 0,
          transport: 0,
          equipment: 0,
          subcon: 0,
          overheads: 0,
          contingency: 0,
          totalEst: 0,
          quoted: 0,
          profit: 0,
          actualCost: 0,
        };
      }
      const d = divMap[p.division];
      d.count++;
      d.labour += p.directLabourTotal || 0;
      d.material += p.materialChemicalTotal || 0;
      d.transport += p.transportationTotal || 0;
      d.equipment += p.equipmentTotal || 0;
      d.subcon += p.subcontractorTotal || 0;
      d.overheads += p.overheadTotal || 0;
      d.contingency += p.contingencyTotal || 0;
      d.totalEst += p.estimatedTotalCost || 0;
      d.quoted += p.quotedSellingPrice || 0;
      d.profit += p.expectedProfit || 0;
    }

    for (const exp of actualExpenses) {
      const proj = projects.find((p) => p.id === exp.projectId);
      if (proj && divMap[proj.division]) {
        divMap[proj.division].actualCost += Number(exp.amount) || 0;
      }
    }

    const divisionSummaryRows = Object.entries(divMap).map(([divName, stats]) => {
      const margin = stats.quoted > 0 ? (stats.profit / stats.quoted) * 100 : 0;
      return {
        'Division': divName,
        'Projects Count': stats.count,
        'Direct Labour (AED)': stats.labour,
        'Materials (AED)': stats.material,
        'Transportation (AED)': stats.transport,
        'Equipment (AED)': stats.equipment,
        'Subcontractor (AED)': stats.subcon,
        'Overheads & Contingency (AED)': stats.overheads + stats.contingency,
        'Total Estimated Cost (AED)': stats.totalEst,
        'Quoted Revenue (AED)': stats.quoted,
        'Expected Profit (AED)': stats.profit,
        'Profit Margin %': `${margin.toFixed(1)}%`,
        'Actual Cost Incurred (AED)': stats.actualCost,
      };
    });

    const divSheet = XLSX.utils.json_to_sheet(divisionSummaryRows);
    XLSX.utils.book_append_sheet(workbook, divSheet, 'Division Breakdown');
  }

  saveExportWorkbook(workbook, 'ABC_Project_Cost_Distribution', format);
}

/**
 * Export Actual Expenses Breakdown Report (by selected date range or all)
 * Supports both CSV and Excel format.
 */
export function exportActualExpensesReport(
  expenses: ActualExpenseRecord[],
  projects: ProjectCosting[] = [],
  dateRangeLabel = 'All_Dates',
  format: ExportFormat = 'xlsx'
): void {
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  const rows = expenses.map((exp) => {
    const proj = projectMap.get(exp.projectId);
    return {
      'Expense ID': exp.id,
      'Date': exp.date,
      'Project ID': exp.projectId,
      'Project Reference': proj?.projectReference || exp.projectId,
      'Project Name': proj?.projectName || 'N/A',
      'Customer': proj?.customerName || 'N/A',
      'Division': proj?.division || 'N/A',
      'Category': exp.category,
      'Description': exp.description,
      'Amount (AED)': Number(exp.amount) || 0,
      'Quantity': exp.quantity ?? '',
      'Receipt / Ref No.': exp.receiptOrRefNumber || '',
      'Entered By': exp.enteredBy,
      'Role': exp.enteredByRole,
      'Approval Status': exp.isApproved ? 'Approved' : 'Pending',
      'Visit Number': exp.visitNumber ?? '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Actual Expenses');

  // If XLSX, add a category summary sheet
  if (format === 'xlsx') {
    const catMap: Record<string, { total: number; count: number }> = {};
    let grandTotal = 0;

    for (const exp of expenses) {
      const cat = exp.category || 'Other';
      if (!catMap[cat]) catMap[cat] = { total: 0, count: 0 };
      const amt = Number(exp.amount) || 0;
      catMap[cat].total += amt;
      catMap[cat].count += 1;
      grandTotal += amt;
    }

    const categorySummaryRows = Object.entries(catMap).map(([catName, stats]) => ({
      'Category': catName,
      'Total Amount (AED)': stats.total,
      'Share of Total %': grandTotal > 0 ? `${((stats.total / grandTotal) * 100).toFixed(1)}%` : '0%',
      'Record Count': stats.count,
    }));

    const catSheet = XLSX.utils.json_to_sheet(categorySummaryRows);
    XLSX.utils.book_append_sheet(workbook, catSheet, 'Category Summary');
  }

  const safeLabel = dateRangeLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  saveExportWorkbook(workbook, `ABC_Actual_Expenses_${safeLabel}`, format);
}

/**
 * Export Actual vs Estimated Variance Report
 */
export function exportVarianceReport(
  projects: ProjectCosting[],
  actualExpenses: ActualExpenseRecord[],
  format: ExportFormat = 'xlsx'
): void {
  const rows = projects.map((p) => {
    const expenses = actualExpenses.filter((e) => e.projectId === p.id);
    const actualCost = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const estCost = p.estimatedTotalCost;
    const variance = estCost - actualCost;
    const variancePct = estCost > 0 ? ((actualCost - estCost) / estCost) * 100 : 0;
    const revenue = p.recognizedRevenueBeforeVat || (p.status === 'Completed' ? p.quotedSellingPrice : 0);
    const actualProfit = revenue - actualCost;
    const actualMargin = revenue > 0 ? (actualProfit / revenue) * 100 : 0;

    return {
      'Project ID': p.id,
      'Project Ref': p.projectReference,
      'Customer': p.customerName,
      'Division': p.division,
      'Status': p.status,
      'Estimated Cost (AED)': estCost,
      'Actual Cost (AED)': actualCost,
      'Cost Variance (AED)': variance,
      'Variance %': `${variancePct.toFixed(1)}%`,
      'Budget Status': actualCost > estCost && estCost > 0 ? 'OVERRUN' : 'ON TRACK',
      'Quoted Selling Price (AED)': p.quotedSellingPrice,
      'Recognized Revenue (AED)': revenue,
      'Actual Profit (AED)': actualProfit,
      'Actual Profit Margin %': `${actualMargin.toFixed(1)}%`,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Variance Analysis');

  saveExportWorkbook(workbook, 'ABC_Variance_Analysis', format);
}

/**
 * Export Division Cost & Margin Distribution Summary
 */
export function exportDivisionCostDistribution(
  projects: ProjectCosting[],
  actualExpenses: ActualExpenseRecord[] = [],
  format: ExportFormat = 'xlsx'
): void {
  const divMap: Record<
    string,
    {
      count: number;
      estimatedCost: number;
      quotedRevenue: number;
      expectedProfit: number;
      actualCost: number;
    }
  > = {};

  for (const p of projects) {
    if (!divMap[p.division]) {
      divMap[p.division] = { count: 0, estimatedCost: 0, quotedRevenue: 0, expectedProfit: 0, actualCost: 0 };
    }
    divMap[p.division].count++;
    divMap[p.division].estimatedCost += p.estimatedTotalCost || 0;
    divMap[p.division].quotedRevenue += p.quotedSellingPrice || 0;
    divMap[p.division].expectedProfit += p.expectedProfit || 0;
  }

  for (const exp of actualExpenses) {
    const proj = projects.find((p) => p.id === exp.projectId);
    if (proj && divMap[proj.division]) {
      divMap[proj.division].actualCost += Number(exp.amount) || 0;
    }
  }

  const rows = Object.entries(divMap).map(([division, data]) => {
    const margin = data.quotedRevenue > 0 ? (data.expectedProfit / data.quotedRevenue) * 100 : 0;
    return {
      'ABC Division': division,
      'Projects Count': data.count,
      'Estimated Cost (AED)': data.estimatedCost,
      'Quoted Revenue (AED)': data.quotedRevenue,
      'Expected Profit (AED)': data.expectedProfit,
      'Profit Margin %': `${margin.toFixed(1)}%`,
      'Actual Cost Incurred (AED)': data.actualCost,
      'Variance (AED)': data.estimatedCost - data.actualCost,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Division Profitability');

  saveExportWorkbook(workbook, 'ABC_Division_Profitability', format);
}

/**
 * Export Store Material Inventory Report
 */
export function exportStoreInventoryReport(
  items: StoreInventoryItem[],
  format: ExportFormat = 'xlsx'
): void {
  const rows = items.map((i) => ({
    'SKU': i.sku,
    'Item Name': i.name,
    'Category': i.category,
    'Division': i.division,
    'Unit': i.unit,
    'Current Stock': i.currentStock,
    'Reserved Stock': i.reservedStock,
    'Available Balance': i.currentStock - i.reservedStock,
    'Min Stock Level': i.minStockLevel,
    'Avg Unit Cost (AED)': i.averageUnitCost,
    'Total Stock Value (AED)': Number((i.currentStock * i.averageUnitCost).toFixed(2)),
    'Stock Status': i.currentStock <= i.minStockLevel ? 'LOW STOCK ALERT' : 'HEALTHY',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Store Inventory');

  saveExportWorkbook(workbook, 'ABC_Store_Inventory', format);
}

/**
 * Export a single project detailed cost sheet to Excel
 */
export function exportSingleProjectCostSheet(project: ProjectCosting): void {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    { Field: 'Project ID', Value: project.id },
    { Field: 'Project Reference', Value: project.projectReference },
    { Field: 'Project Name', Value: project.projectName },
    { Field: 'Customer Name', Value: project.customerName },
    { Field: 'Contact Person', Value: project.contactPerson },
    { Field: 'Phone', Value: project.contactPhone },
    { Field: 'Site Location', Value: project.siteLocation },
    { Field: 'Division', Value: project.division },
    { Field: 'Contract Type', Value: project.contractType },
    { Field: 'Visits Count', Value: project.numberOfVisits },
    { Field: 'Status', Value: project.status },
    { Field: 'Estimated Duration', Value: project.estimatedDuration },
    { Field: '------------------', Value: '------------------' },
    { Field: 'Direct Labour Total (AED)', Value: project.directLabourTotal },
    { Field: 'Material & Chemicals Total (AED)', Value: project.materialChemicalTotal },
    { Field: 'Transportation Total (AED)', Value: project.transportationTotal },
    { Field: 'Equipment Total (AED)', Value: project.equipmentTotal },
    { Field: 'Subcontractor Total (AED)', Value: project.subcontractorTotal },
    { Field: 'Overhead Allocated (AED)', Value: project.overheadTotal },
    { Field: 'Contingency Allocated (AED)', Value: project.contingencyTotal },
    { Field: 'ESTIMATED TOTAL COST (AED)', Value: project.estimatedTotalCost },
    { Field: '------------------', Value: '------------------' },
    { Field: 'Pricing Method', Value: project.pricingMethod },
    { Field: 'Target Percentage', Value: `${project.targetPercentage}%` },
    { Field: 'Quoted Selling Price (AED)', Value: project.quotedSellingPrice },
    { Field: 'Expected Profit (AED)', Value: project.expectedProfit },
    { Field: 'Profit Margin %', Value: `${project.expectedProfitMarginPercentage}%` },
    { Field: 'Markup %', Value: `${project.expectedMarkupPercentage}%` },
    { Field: 'UAE VAT 5% (AED)', Value: project.vatAmount },
    { Field: 'FINAL QUOTATION TOTAL (AED)', Value: project.finalQuotationTotal },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Cost Summary');

  // Labour breakdown sheet
  const labourData = project.labourCosts.map((l) => ({
    'Technician Role': l.technicianRole,
    'Team': l.teamName,
    'Workers': l.workersCount,
    'Duration per Visit': `${l.hoursOrDaysPerVisit} ${l.unitType}s`,
    'Rate (AED)': l.ratePerUnit,
    'Visits Multiplier': l.visitsMultiplier,
    'Total (AED)': l.total,
  }));
  if (labourData.length > 0) {
    const labourSheet = XLSX.utils.json_to_sheet(labourData);
    XLSX.utils.book_append_sheet(workbook, labourSheet, 'Labour Cost');
  }

  // Material breakdown sheet
  const materialData = project.materialCosts.map((m) => ({
    'Material / Chemical Name': m.name,
    'Category / Type': m.chemicalOrAssetType,
    'Unit': m.unit,
    'Quantity': m.quantity,
    'Unit Cost (AED)': m.unitPurchaseCost,
    'Total Cost (AED)': m.total,
  }));
  if (materialData.length > 0) {
    const materialSheet = XLSX.utils.json_to_sheet(materialData);
    XLSX.utils.book_append_sheet(workbook, materialSheet, 'Materials & Chemicals');
  }

  // Transport sheet
  const transportData = project.transportCosts.map((t) => ({
    'Description': t.description,
    'Type': t.type,
    'Trips/Visits': t.visitsOrTrips,
    'Rate per Trip (AED)': t.ratePerTrip,
    'Total (AED)': t.total,
  }));
  if (transportData.length > 0) {
    const transportSheet = XLSX.utils.json_to_sheet(transportData);
    XLSX.utils.book_append_sheet(workbook, transportSheet, 'Transportation');
  }

  // Equipment sheet
  const equipmentData = project.equipmentCosts.map((e) => ({
    'Equipment Name': e.equipmentName,
    'Type': e.type,
    'Quantity': e.quantity,
    'Duration': `${e.durationUnits} ${e.unitType}`,
    'Rate per Unit (AED)': e.ratePerUnit,
    'Total (AED)': e.total,
  }));
  if (equipmentData.length > 0) {
    const equipmentSheet = XLSX.utils.json_to_sheet(equipmentData);
    XLSX.utils.book_append_sheet(workbook, equipmentSheet, 'Equipment & Assets');
  }

  // Subcontractor sheet
  const subcontractorData = project.subcontractorCosts.map((s) => ({
    'Vendor / Service': s.serviceOrVendor,
    'Scope of Work': s.scopeOfWork,
    'Amount (AED)': s.amount,
    'Permit / Lab Fee': s.permitOrLabFee ? 'Yes' : 'No',
  }));
  if (subcontractorData.length > 0) {
    const subSheet = XLSX.utils.json_to_sheet(subcontractorData);
    XLSX.utils.book_append_sheet(workbook, subSheet, 'Subcontractors');
  }

  saveExportWorkbook(workbook, `ABC_CostSheet_${project.id}_${project.projectReference}`, 'xlsx');
}
