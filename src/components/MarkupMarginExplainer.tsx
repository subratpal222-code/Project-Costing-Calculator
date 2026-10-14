/**
 * ABC LLC - Markup vs. Profit Margin Explainer & Benchmark Verification
 * Implements Section 6 & 7 of the Master Prompt specifications with interactive sandbox.
 */

import React, { useState } from 'react';
import { 
  Calculator, 
  HelpCircle, 
  ArrowRight, 
  CheckCircle2, 
  Percent, 
  Coins, 
  Scale, 
  X,
  BookOpen
} from 'lucide-react';
import { formatAED, calculateByMarkup, calculateByMargin } from '../utils/calculator';

interface MarkupMarginExplainerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarkupMarginExplainer: React.FC<MarkupMarginExplainerProps> = ({
  isOpen,
  onClose,
}) => {
  const [sandboxCost, setSandboxCost] = useState<number>(1000);
  const [sandboxPercentage, setSandboxPercentage] = useState<number>(25);

  if (!isOpen) return null;

  // Real calculations
  const markupResult = calculateByMarkup(sandboxCost, sandboxPercentage);
  const marginResult = calculateByMargin(sandboxCost, sandboxPercentage);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-700/50 rounded-xl border border-blue-400/30">
              <Scale className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Markup on Cost vs. Target Profit Margin</h2>
              <p className="text-sm text-cyan-200">
                Official ABC Financial Calculation Guide & Section 7 Benchmark
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Section 7 Official Benchmark Callout */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-blue-950 uppercase tracking-wider">
                  Section 7 Official Benchmark Test (AED 1,000 Baseline)
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  For an estimated project cost of <span className="font-bold text-slate-900">AED 1,000.00</span>:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Markup card */}
                  <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                        Method 1: 25% Markup on Cost
                      </span>
                      <Percent className="w-4 h-4 text-amber-600" />
                    </div>
                    <ul className="text-xs space-y-1.5 text-slate-700">
                      <li>• <strong>Selling Price:</strong> AED 1,250.00</li>
                      <li>• <strong>Profit:</strong> AED 250.00</li>
                      <li>• <strong>Profit Margin:</strong> 20.00%</li>
                      <li>• <em>Applied to the base cost of AED 1,000</em></li>
                    </ul>
                  </div>

                  {/* Margin card */}
                  <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                        Method 2: 25% Target Margin
                      </span>
                      <Coins className="w-4 h-4 text-emerald-600" />
                    </div>
                    <ul className="text-xs space-y-1.5 text-slate-700">
                      <li>• <strong>Selling Price:</strong> AED 1,333.33</li>
                      <li>• <strong>Profit:</strong> AED 333.33</li>
                      <li>• <strong>Profit Margin:</strong> 25.00%</li>
                      <li>• <strong>Equivalent Markup:</strong> ~33.33%</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mathematical Formulas Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
              <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-black">
                  1
                </span>
                Markup on Cost Formula
              </h4>
              <p className="text-xs text-slate-600 mb-3">
                Markup represents the percentage added on top of your estimated costs.
              </p>
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 space-y-1">
                <div>Selling Price = Cost × (1 + Markup% / 100)</div>
                <div>Profit = Selling Price − Cost</div>
                <div>Profit Margin% = (Profit / Selling Price) × 100</div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Common for simple trade work where you want a direct multiple over labor & materials.
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
              <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                  2
                </span>
                Target Profit Margin Formula
              </h4>
              <p className="text-xs text-slate-600 mb-3">
                Profit Margin represents what percentage of the final invoice is gross profit.
              </p>
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 space-y-1">
                <div>Selling Price = Cost / (1 − Target Margin% / 100)</div>
                <div>Profit = Selling Price − Cost</div>
                <div>Markup% = (Profit / Cost) × 100</div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Standard in corporate ABC accounting. Safeguards true gross margins regardless of project scale.
              </p>
            </div>
          </div>

          {/* Live Interactive Sandbox */}
          <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-600" />
                Live Interactive Sandbox
              </h4>
              <button
                onClick={() => {
                  setSandboxCost(1000);
                  setSandboxPercentage(25);
                }}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Reset to AED 1,000 Benchmark
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estimated Total Cost (AED)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">AED</span>
                  <input
                    type="number"
                    min="1"
                    value={sandboxCost}
                    onChange={(e) => setSandboxCost(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full pl-12 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="99.9"
                    step="0.5"
                    value={sandboxPercentage}
                    onChange={(e) => setSandboxPercentage(Math.min(99.9, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                </div>
              </div>
            </div>

            {/* Sandbox Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse bg-white rounded-lg overflow-hidden border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3">Pricing Metric</th>
                    <th className="p-3 text-amber-800 bg-amber-50/50">Method 1: {sandboxPercentage}% Markup</th>
                    <th className="p-3 text-emerald-800 bg-emerald-50/50">Method 2: {sandboxPercentage}% Margin</th>
                    <th className="p-3 text-indigo-900 bg-indigo-50/50">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-3 font-medium text-slate-700">Recommended Selling Price (before VAT)</td>
                    <td className="p-3 font-bold text-slate-900">{formatAED(markupResult.sellingPrice)}</td>
                    <td className="p-3 font-bold text-emerald-700">{formatAED(marginResult.sellingPrice)}</td>
                    <td className="p-3 font-semibold text-indigo-700">
                      +{formatAED(marginResult.sellingPrice - markupResult.sellingPrice)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-slate-700">Expected Profit (AED)</td>
                    <td className="p-3 font-semibold text-slate-900">{formatAED(markupResult.profit)}</td>
                    <td className="p-3 font-semibold text-emerald-700">{formatAED(marginResult.profit)}</td>
                    <td className="p-3 font-semibold text-indigo-700">
                      +{formatAED(marginResult.profit - markupResult.profit)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-slate-700">Effective Profit Margin %</td>
                    <td className="p-3 font-medium text-amber-700">{markupResult.marginPercentage.toFixed(2)}%</td>
                    <td className="p-3 font-bold text-emerald-700">{marginResult.marginPercentage.toFixed(2)}%</td>
                    <td className="p-3 text-slate-500">Target Margin Achieved</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-slate-700">Effective Markup %</td>
                    <td className="p-3 font-bold text-amber-700">{markupResult.markupPercentage.toFixed(2)}%</td>
                    <td className="p-3 font-medium text-emerald-700">{marginResult.markupPercentage.toFixed(2)}%</td>
                    <td className="p-3 text-slate-500">Requires higher cost multiple</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
