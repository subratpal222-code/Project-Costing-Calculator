/**
 * ABC LLC - Selling Price & Profit Margin Calculator
 * Handles Method 1 (Markup on Cost), Method 2 (Target Profit Margin),
 * side-by-side scenario presets (10%, 15%, 20%, 25%, 30%, Custom),
 * and UAE VAT (5%) computation.
 */

import React, { useState } from 'react';
import { 
  Calculator, 
  Percent, 
  Coins, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  TrendingUp,
  Receipt,
  Info
} from 'lucide-react';
import { PricingMethod } from '../types';
import { 
  formatAED, 
  calculateByMarkup, 
  calculateByMargin, 
  generatePricingScenarios,
  calculateVatAndTotal 
} from '../utils/calculator';

interface PricingCalculatorProps {
  estimatedTotalCost: number;
  pricingMethod: PricingMethod;
  setPricingMethod: (method: PricingMethod) => void;
  targetPercentage: number;
  setTargetPercentage: (pct: number) => void;
  quotedSellingPrice: number;
  setQuotedSellingPrice: (price: number) => void;
  vatRate: number;
  onOpenExplainer: () => void;
  canEditPricing: boolean;
}

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({
  estimatedTotalCost,
  pricingMethod,
  setPricingMethod,
  targetPercentage,
  setTargetPercentage,
  quotedSellingPrice,
  setQuotedSellingPrice,
  vatRate,
  onOpenExplainer,
  canEditPricing,
}) => {
  const [customScenarioPct, setCustomScenarioPct] = useState<number>(targetPercentage || 25);

  // Calculate current pricing based on selected method
  const calculationResult = pricingMethod === 'markup'
    ? calculateByMarkup(estimatedTotalCost, targetPercentage)
    : calculateByMargin(estimatedTotalCost, targetPercentage);

  // Compute metrics for the actual quoted price
  const actualProfit = quotedSellingPrice - estimatedTotalCost;
  const actualMarkupPct = estimatedTotalCost > 0 ? (actualProfit / estimatedTotalCost) * 100 : 0;
  const actualMarginPct = quotedSellingPrice > 0 ? (actualProfit / quotedSellingPrice) * 100 : 0;

  // Compute UAE VAT
  const vatDetails = calculateVatAndTotal(quotedSellingPrice, vatRate);

  // Scenario presets
  const scenarios = generatePricingScenarios(estimatedTotalCost, customScenarioPct);

  // Profit warnings
  const isNegativeProfit = actualProfit <= 0 && quotedSellingPrice > 0;
  const isLowMargin = actualMarginPct < 15 && actualProfit > 0;

  const handleApplyRecommended = () => {
    if (calculationResult.sellingPrice > 0) {
      setQuotedSellingPrice(calculationResult.sellingPrice);
    }
  };

  const handleApplyScenario = (sellingPrice: number, pct: number) => {
    setTargetPercentage(pct);
    setQuotedSellingPrice(sellingPrice);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      {/* Title & Explainer trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Calculator className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              Selling Price & Profit Margin Engine
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Determine quotation price and review real-time gross profit before issuing customer proposals.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenExplainer}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors self-start sm:self-auto"
        >
          <HelpCircle className="w-4 h-4 text-blue-600" />
          <span>Section 7 Benchmark & Formulas</span>
        </button>
      </div>

      {/* Pricing Method Selector */}
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
          Choose Pricing Method
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Method 1: Markup */}
          <div
            onClick={() => canEditPricing && setPricingMethod('markup')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              pricingMethod === 'markup'
                ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  pricingMethod === 'markup' ? 'border-blue-600 bg-blue-600' : 'border-slate-400'
                }`}>
                  {pricingMethod === 'markup' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                <span className="text-sm font-bold text-slate-900">Method 1: Markup on Cost</span>
              </div>
              <Percent className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-6">
              Selling Price = Cost × (1 + Markup% / 100). Adds a direct multiplier to estimated cost.
            </p>
          </div>

          {/* Method 2: Target Margin */}
          <div
            onClick={() => canEditPricing && setPricingMethod('margin')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              pricingMethod === 'margin'
                ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  pricingMethod === 'margin' ? 'border-blue-600 bg-blue-600' : 'border-slate-400'
                }`}>
                  {pricingMethod === 'margin' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                <span className="text-sm font-bold text-slate-900">Method 2: Target Profit Margin</span>
              </div>
              <Coins className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-6">
              Selling Price = Cost / (1 − Target Margin% / 100). Guarantees the designated percentage of invoice revenue as profit.
            </p>
          </div>
        </div>
      </div>

      {/* Target Percentage & Recommended Price Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        {/* Target Percentage Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            {pricingMethod === 'markup' ? 'Desired Markup (%)' : 'Target Profit Margin (%)'}
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max={pricingMethod === 'margin' ? 99.9 : 1000}
              step="0.5"
              disabled={!canEditPricing}
              value={targetPercentage}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setTargetPercentage(pricingMethod === 'margin' ? Math.min(99.9, Math.max(0, val)) : Math.max(0, val));
              }}
              className="w-full pl-3 pr-8 py-2 text-base font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
          </div>
          {pricingMethod === 'margin' && targetPercentage >= 99 && (
            <p className="text-xs text-red-600 mt-1">Margin must be &lt; 100%.</p>
          )}
        </div>

        {/* Calculated Recommended Price */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Recommended Price (Before VAT)
          </label>
          <div className="py-2 px-3 bg-blue-50 border border-blue-200 rounded-lg text-base font-bold text-blue-900 flex items-center justify-between">
            <span>{formatAED(calculationResult.sellingPrice)}</span>
            <button
              type="button"
              onClick={handleApplyRecommended}
              disabled={!canEditPricing || calculationResult.sellingPrice <= 0}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline disabled:opacity-50"
            >
              Use This
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Cost: {formatAED(estimatedTotalCost)} + Profit: {formatAED(calculationResult.profit)}
          </p>
        </div>

        {/* Quoted Selling Price (Editable by user) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Quoted Selling Price (Before VAT)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">AED</span>
            <input
              type="number"
              min="0"
              step="1"
              disabled={!canEditPricing}
              value={quotedSellingPrice}
              onChange={(e) => setQuotedSellingPrice(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full pl-12 pr-3 py-2 text-base font-black text-slate-900 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Effective Margin: <strong className={actualMarginPct < 15 ? 'text-amber-600' : 'text-emerald-700'}>{actualMarginPct.toFixed(2)}%</strong> (Markup: {actualMarkupPct.toFixed(2)}%)
          </p>
        </div>
      </div>

      {/* Warnings & Alerts */}
      {isNegativeProfit && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-red-800 text-xs">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>
            <strong>Warning: Negative Profit (Project Loss)!</strong> Quoted selling price is lower than the estimated total project cost of {formatAED(estimatedTotalCost)}.
          </span>
        </div>
      )}

      {isLowMargin && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2.5 text-amber-800 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Caution: Low Profit Margin ({actualMarginPct.toFixed(2)}%).</strong> Corporate policy recommends minimum 15% - 20% margin for ABC service contracts.
          </span>
        </div>
      )}

      {/* Side-by-Side Pricing Scenarios Presets (10%, 15%, 20%, 25%, 30%, and Custom) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Pricing Scenarios Comparison (Side-by-Side)
          </h4>
          <span className="text-xs text-slate-500">
            Click any price to apply to quotation
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Scenario</th>
                <th className="p-3 bg-blue-50/60 text-blue-900">Method 1: Markup Selling Price</th>
                <th className="p-3 bg-blue-50/60 text-blue-900">Markup Profit</th>
                <th className="p-3 bg-emerald-50/60 text-emerald-900">Method 2: Margin Selling Price</th>
                <th className="p-3 bg-emerald-50/60 text-emerald-900">Margin Profit</th>
                <th className="p-3 text-center">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {scenarios.map((sc) => {
                const isSelected = targetPercentage === sc.percentage;
                return (
                  <tr
                    key={sc.percentage}
                    className={`hover:bg-slate-50 transition-colors ${
                      isSelected ? 'bg-blue-50/30 font-semibold' : ''
                    }`}
                  >
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[11px]">
                        {sc.label}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] text-blue-600 font-bold uppercase">Active</span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-slate-800">
                      {formatAED(sc.markupMethod.sellingPrice)}
                    </td>
                    <td className="p-3 text-slate-600 font-medium">
                      +{formatAED(sc.markupMethod.profit)} ({sc.markupMethod.marginPercentage.toFixed(1)}% margin)
                    </td>
                    <td className="p-3 font-bold text-emerald-800">
                      {formatAED(sc.marginMethod.sellingPrice)}
                    </td>
                    <td className="p-3 text-emerald-700 font-medium">
                      +{formatAED(sc.marginMethod.profit)} ({sc.marginMethod.marginPercentage.toFixed(1)}% margin)
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleApplyScenario(sc.markupMethod.sellingPrice, sc.percentage)}
                          disabled={!canEditPricing}
                          className="px-2 py-1 text-[10px] font-semibold rounded bg-blue-100 hover:bg-blue-200 text-blue-800 transition-colors"
                          title="Apply Markup Price"
                        >
                          Use Markup
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyScenario(sc.marginMethod.sellingPrice, sc.percentage)}
                          disabled={!canEditPricing}
                          className="px-2 py-1 text-[10px] font-semibold rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors"
                          title="Apply Margin Price"
                        >
                          Use Margin
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* UAE VAT 5% & Final Quotation Summary Card (Section 8) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-cyan-400" />
            <h4 className="text-sm font-bold tracking-tight text-white">
              UAE VAT & Final Customer Quotation Amount
            </h4>
          </div>
          <span className="text-xs bg-cyan-900/80 text-cyan-200 px-2.5 py-0.5 rounded border border-cyan-700 font-medium">
            Standard UAE VAT: {vatRate.toFixed(1)}%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 block mb-1">Selling Price (Before VAT)</span>
            <span className="text-base sm:text-lg font-bold text-white">
              {formatAED(vatDetails.subtotalBeforeVat)}
            </span>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 block mb-1">Expected Profit</span>
            <span className="text-base sm:text-lg font-bold text-emerald-400">
              {formatAED(actualProfit)}
            </span>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 block mb-1">UAE VAT ({vatRate}%)</span>
            <span className="text-base sm:text-lg font-bold text-cyan-300">
              {formatAED(vatDetails.vatAmount)}
            </span>
          </div>

          <div className="p-3 bg-blue-950/80 rounded-xl border border-blue-500/50 shadow-inner">
            <span className="text-[11px] text-blue-300 block mb-1 font-semibold">Total Customer Quotation</span>
            <span className="text-lg sm:text-xl font-black text-cyan-300">
              {formatAED(vatDetails.totalWithVat)}
            </span>
          </div>
        </div>

        {/* Official Section 8 Warning */}
        <div className="flex items-start gap-2 bg-slate-800/50 p-2.5 rounded-lg border border-slate-700 text-xs text-slate-300">
          <Info className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            <strong>Accounting Rule:</strong> VAT collected from the customer ({formatAED(vatDetails.vatAmount)}) is payable to the Federal Tax Authority (FTA) and is <strong>never</strong> treated as company profit.
          </p>
        </div>
      </div>
    </div>
  );
};
