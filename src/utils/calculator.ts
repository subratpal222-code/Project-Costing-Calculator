/**
 * ABC LLC - Financial & Costing Calculation Engine
 * Implements strict accounting formulas for project costing, markups, margins, UAE VAT, and actuals variance.
 */

import {
  LabourCostItem,
  MaterialCostItem,
  TransportCostItem,
  EquipmentCostItem,
  SubcontractorCostItem,
  OverheadContingencyConfig,
  ActualExpenseRecord,
  PricingMethod
} from '../types';

/**
 * Format currency in UAE Dirhams (AED)
 */
export function formatAED(amount: number | undefined | null, includePrefix: boolean = true): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return includePrefix ? 'AED 0.00' : '0.00';
  }
  const formatted = new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return includePrefix ? `AED ${formatted}` : formatted;
}

/**
 * Format percentage with 2 decimals
 */
export function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00%';
  }
  return `${value.toFixed(2)}%`;
}

/**
 * Calculate Labour cost for a single line item
 * Formula: Quantity of Labour (workers * hours/days) * Rate * Visits
 */
export function calculateLabourItemTotal(item: LabourCostItem): number {
  const workers = Number(item.workersCount) || 0;
  const timeUnits = Number(item.hoursOrDaysPerVisit) || 0;
  const rate = Number(item.ratePerUnit) || 0;
  const visits = Number(item.visitsMultiplier) || 1;
  return Number((workers * timeUnits * rate * visits).toFixed(2));
}

/**
 * Calculate Material cost for a single line item
 * Formula: Quantity * Unit Cost
 */
export function calculateMaterialItemTotal(item: MaterialCostItem): number {
  const qty = Number(item.quantity) || 0;
  const cost = Number(item.unitPurchaseCost) || 0;
  return Number((qty * cost).toFixed(2));
}

/**
 * Calculate Transportation line item total
 */
export function calculateTransportItemTotal(item: TransportCostItem): number {
  const trips = Number(item.visitsOrTrips) || 0;
  const rate = Number(item.ratePerTrip) || 0;
  return Number((trips * rate).toFixed(2));
}

/**
 * Calculate Equipment line item total
 */
export function calculateEquipmentItemTotal(item: EquipmentCostItem): number {
  const qty = Number(item.quantity) || 1;
  const duration = Number(item.durationUnits) || 0;
  const rate = Number(item.ratePerUnit) || 0;
  return Number((qty * duration * rate).toFixed(2));
}

/**
 * Calculate Subcontractor line item total
 */
export function calculateSubcontractorItemTotal(item: SubcontractorCostItem): number {
  return Number((Number(item.amount) || 0).toFixed(2));
}

export interface EstimatedCostSummary {
  directLabourTotal: number;
  materialChemicalTotal: number;
  transportationTotal: number;
  equipmentTotal: number;
  subcontractorTotal: number;
  otherDirectCostsTotal: number;
  directCostsBase: number;
  overheadTotal: number;
  contingencyTotal: number;
  estimatedTotalCost: number;
}

/**
 * Compute the complete Estimated Cost Breakdown (Category A to G)
 */
export function calculateProjectEstimatedCosts(
  labourItems: LabourCostItem[],
  materialItems: MaterialCostItem[],
  transportItems: TransportCostItem[],
  equipmentItems: EquipmentCostItem[],
  subcontractorItems: SubcontractorCostItem[],
  overheadContingency: OverheadContingencyConfig
): EstimatedCostSummary {
  const directLabourTotal = labourItems.reduce((acc, item) => acc + calculateLabourItemTotal(item), 0);
  const materialChemicalTotal = materialItems.reduce((acc, item) => acc + calculateMaterialItemTotal(item), 0);
  const transportationTotal = transportItems.reduce((acc, item) => acc + calculateTransportItemTotal(item), 0);
  const equipmentTotal = equipmentItems.reduce((acc, item) => acc + calculateEquipmentItemTotal(item), 0);
  const subcontractorTotal = subcontractorItems.reduce((acc, item) => acc + calculateSubcontractorItemTotal(item), 0);
  const otherDirectCostsTotal = 0; // Reserved for specific ad-hoc direct costs

  // Cost base: Direct Costs (ensures no double-dipping)
  const directCostsBase = directLabourTotal + materialChemicalTotal + transportationTotal + equipmentTotal + subcontractorTotal + otherDirectCostsTotal;

  // Overhead calculation
  let overheadTotal = 0;
  if (overheadContingency.overheadType === 'percentage') {
    const rate = Math.max(0, Number(overheadContingency.overheadRate) || 0);
    overheadTotal = (directCostsBase * rate) / 100;
  } else {
    overheadTotal = Math.max(0, Number(overheadContingency.overheadAmount) || 0);
  }

  // Contingency calculation
  let contingencyTotal = 0;
  if (overheadContingency.contingencyType === 'percentage') {
    const rate = Math.max(0, Number(overheadContingency.contingencyRate) || 0);
    contingencyTotal = (directCostsBase * rate) / 100;
  } else {
    contingencyTotal = Math.max(0, Number(overheadContingency.contingencyAmount) || 0);
  }

  const estimatedTotalCost = directCostsBase + overheadTotal + contingencyTotal;

  return {
    directLabourTotal: Number(directLabourTotal.toFixed(2)),
    materialChemicalTotal: Number(materialChemicalTotal.toFixed(2)),
    transportationTotal: Number(transportationTotal.toFixed(2)),
    equipmentTotal: Number(equipmentTotal.toFixed(2)),
    subcontractorTotal: Number(subcontractorTotal.toFixed(2)),
    otherDirectCostsTotal: Number(otherDirectCostsTotal.toFixed(2)),
    directCostsBase: Number(directCostsBase.toFixed(2)),
    overheadTotal: Number(overheadTotal.toFixed(2)),
    contingencyTotal: Number(contingencyTotal.toFixed(2)),
    estimatedTotalCost: Number(estimatedTotalCost.toFixed(2)),
  };
}

export interface PricingCalculationResult {
  sellingPrice: number;
  profit: number;
  markupPercentage: number;
  marginPercentage: number;
  error?: string;
}

/**
 * Method 1: Markup on Cost
 * Selling Price = Total Project Cost × (1 + Markup Percentage / 100)
 * Profit = Selling Price − Total Project Cost
 * Markup Percentage = (Profit / Total Project Cost) × 100
 * Profit Margin = (Profit / Selling Price) × 100
 */
export function calculateByMarkup(cost: number, markupPercentage: number): PricingCalculationResult {
  if (cost <= 0) {
    return {
      sellingPrice: 0,
      profit: 0,
      markupPercentage,
      marginPercentage: 0,
    };
  }

  const markup = Number(markupPercentage) || 0;
  const sellingPrice = cost * (1 + markup / 100);
  const profit = sellingPrice - cost;
  const marginPercentage = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

  return {
    sellingPrice: Number(sellingPrice.toFixed(2)),
    profit: Number(profit.toFixed(2)),
    markupPercentage: Number(markup.toFixed(2)),
    marginPercentage: Number(marginPercentage.toFixed(2)),
  };
}

/**
 * Method 2: Target Profit Margin
 * Selling Price = Total Project Cost / (1 − Target Profit Margin / 100)
 * Profit = Selling Price − Total Project Cost
 * Profit Margin Percentage = (Profit / Selling Price) × 100
 * Markup Percentage = (Profit / Total Project Cost) × 100
 */
export function calculateByMargin(cost: number, targetMarginPercentage: number): PricingCalculationResult {
  if (cost <= 0) {
    return {
      sellingPrice: 0,
      profit: 0,
      markupPercentage: 0,
      marginPercentage: targetMarginPercentage,
    };
  }

  const margin = Number(targetMarginPercentage) || 0;

  if (margin >= 100) {
    return {
      sellingPrice: cost,
      profit: 0,
      markupPercentage: 0,
      marginPercentage: margin,
      error: 'Target Profit Margin must be strictly less than 100% to avoid division by zero.',
    };
  }

  const denominator = 1 - margin / 100;
  if (denominator <= 0) {
    return {
      sellingPrice: cost,
      profit: 0,
      markupPercentage: 0,
      marginPercentage: margin,
      error: 'Invalid margin percentage.',
    };
  }

  const sellingPrice = cost / denominator;
  const profit = sellingPrice - cost;
  const markupPercentage = (profit / cost) * 100;

  return {
    sellingPrice: Number(sellingPrice.toFixed(2)),
    profit: Number(profit.toFixed(2)),
    markupPercentage: Number(markupPercentage.toFixed(2)),
    marginPercentage: Number(margin.toFixed(2)),
  };
}

export interface PricingScenario {
  percentage: number;
  label: string;
  markupMethod: PricingCalculationResult;
  marginMethod: PricingCalculationResult;
}

/**
 * Generate side-by-side editable pricing scenarios for 10%, 15%, 20%, 25%, 30% and custom
 */
export function generatePricingScenarios(cost: number, customPercentage: number = 25): PricingScenario[] {
  const presets = [10, 15, 20, 25, 30];
  const percentages = Array.from(new Set([...presets, customPercentage])).sort((a, b) => a - b);

  return percentages.map((pct) => {
    return {
      percentage: pct,
      label: `${pct}%`,
      markupMethod: calculateByMarkup(cost, pct),
      marginMethod: calculateByMargin(cost, pct),
    };
  });
}

export interface VatQuotationResult {
  subtotalBeforeVat: number;
  vatRate: number;
  vatAmount: number;
  totalWithVat: number;
}

/**
 * UAE VAT Calculation
 * VAT Amount = VAT-Applicable Selling Price × VAT Rate
 * Customer Quotation Total = Selling Price Before VAT + VAT Amount
 */
export function calculateVatAndTotal(sellingPriceBeforeVat: number, vatRate: number = 5.0): VatQuotationResult {
  const price = Math.max(0, Number(sellingPriceBeforeVat) || 0);
  const rate = Math.max(0, Number(vatRate) || 0);
  const vatAmount = Number(((price * rate) / 100).toFixed(2));
  const totalWithVat = Number((price + vatAmount).toFixed(2));

  return {
    subtotalBeforeVat: price,
    vatRate: rate,
    vatAmount,
    totalWithVat,
  };
}

export interface ActualsProfitAnalysis {
  actualTotalCost: number;
  actualCostByCategory: Record<string, number>;
  expectedProfit: number;
  recognizedRevenue: number;
  invoicedAmount: number;
  collectedAmount: number;
  actualProjectProfit: number;
  actualProfitMargin: number;
  varianceCost: number; // Estimated - Actual (positive = under budget, negative = overrun)
  variancePercentage: number;
  isOverBudget: boolean;
  isLowMargin: boolean;
  isProvisional: boolean;
}

/**
 * Section 9: Actual Project Cost and Profit Tracking
 * Computes actual total costs, recognized profit, budget overruns, and margin health.
 */
export function calculateActualsAndVariance(
  estimatedTotalCost: number,
  quotedSellingPrice: number,
  recognizedRevenueBeforeVat: number,
  invoicedAmountBeforeVat: number,
  collectedAmountBeforeVat: number,
  actualExpenses: ActualExpenseRecord[],
  isProjectCompleted: boolean
): ActualsProfitAnalysis {
  const actualCostByCategory: Record<string, number> = {
    Labour: 0,
    Materials: 0,
    Transportation: 0,
    Equipment: 0,
    Subcontractor: 0,
    Other: 0,
  };

  let actualTotalCost = 0;
  for (const exp of actualExpenses) {
    const amt = Number(exp.amount) || 0;
    actualTotalCost += amt;
    if (actualCostByCategory[exp.category] !== undefined) {
      actualCostByCategory[exp.category] += amt;
    } else {
      actualCostByCategory.Other += amt;
    }
  }

  actualTotalCost = Number(actualTotalCost.toFixed(2));

  // Expected profit
  const expectedProfit = Number((quotedSellingPrice - estimatedTotalCost).toFixed(2));

  // Actual profit based on Recognized Project Revenue (not merely invoices or cash collection)
  const revenueToUse = recognizedRevenueBeforeVat > 0 ? recognizedRevenueBeforeVat : (isProjectCompleted ? quotedSellingPrice : 0);
  const actualProjectProfit = Number((revenueToUse - actualTotalCost).toFixed(2));
  const actualProfitMargin = revenueToUse > 0 ? Number(((actualProjectProfit / revenueToUse) * 100).toFixed(2)) : 0;

  // Variance: Estimated Cost - Actual Cost
  const varianceCost = Number((estimatedTotalCost - actualTotalCost).toFixed(2));
  const variancePercentage = estimatedTotalCost > 0 ? Number(((actualTotalCost - estimatedTotalCost) / estimatedTotalCost * 100).toFixed(2)) : 0;

  const isOverBudget = actualTotalCost > estimatedTotalCost && estimatedTotalCost > 0;
  const isLowMargin = actualProfitMargin < 15 || actualProjectProfit <= 0;
  const isProvisional = !isProjectCompleted;

  return {
    actualTotalCost,
    actualCostByCategory,
    expectedProfit,
    recognizedRevenue: revenueToUse,
    invoicedAmount: invoicedAmountBeforeVat,
    collectedAmount: collectedAmountBeforeVat,
    actualProjectProfit,
    actualProfitMargin,
    varianceCost,
    variancePercentage,
    isOverBudget,
    isLowMargin,
    isProvisional,
  };
}
