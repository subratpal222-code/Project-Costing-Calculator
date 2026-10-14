/**
 * ABC LLC - Formal Customer Quotation Module
 * Implements Section 12: Customer-facing quotation strictly hiding internal costs,
 * technician rates, and margin calculations. Includes UAE VAT 5%, Dubai Municipality
 * compliance credentials, and print-ready formal document layout.
 */

import React, { useState } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  CheckCircle, 
  Building2, 
  Phone, 
  Mail, 
  Globe, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Eye, 
  EyeOff,
  Send,
  AlertCircle
} from 'lucide-react';
import { ProjectCosting, AppSettings, UserProfile } from '../types';
import { formatAED } from '../utils/calculator';
import { SubratIQLogo } from './SubratIQLogo';

interface QuotationViewProps {
  project: ProjectCosting;
  settings: AppSettings;
  currentUser: UserProfile;
  onUpdateProject: (updated: ProjectCosting, logMsg: string) => void;
  onBackToCosting: () => void;
}

export const QuotationView: React.FC<QuotationViewProps> = ({
  project,
  settings,
  currentUser,
  onUpdateProject,
  onBackToCosting,
}) => {
  const [quotationNumber, setQuotationNumber] = useState(
    `QT-ABC-${project.id.replace('ABC-PC-', '')}`
  );
  const [quotationDate, setQuotationDate] = useState(
    project.quotationDate || new Date().toISOString().split('T')[0]
  );
  const [showInternalProfitInspector, setShowInternalProfitInspector] = useState(false);
  const [confirmSendModal, setConfirmSendModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Editable quotation terms
  const [scopeItems, setScopeItems] = useState<string[]>(
    project.scopeOfWork && project.scopeOfWork.length > 0
      ? project.scopeOfWork
      : [
          `Complete certified ${project.serviceType} executed per Dubai Municipality Health & Safety standards`,
          `Mobilization of trained technicians with full PPE and specialized technical equipment`,
          `Post-service completion certificate and comprehensive photo audit report`,
        ]
  );

  const [paymentTerms, setPaymentTerms] = useState(
    project.quotationPaymentTerms || '30 days from invoice date / Upon milestone completion'
  );

  const [exclusions, setExclusions] = useState<string[]>(
    project.quotationExclusions && project.quotationExclusions.length > 0
      ? project.quotationExclusions
      : [
          'Major civil modifications, duct structural alterations, or third-party electrical upgrades',
          'Access permits outside standard working hours unless agreed in writing',
        ]
  );

  const handlePrint = () => {
    window.print();
  };

  const handleMarkAsQuoted = () => {
    const updated: ProjectCosting = {
      ...project,
      status: 'Quoted',
      quotationDate,
      scopeOfWork: scopeItems,
      quotationPaymentTerms: paymentTerms,
      quotationExclusions: exclusions,
      quotationPreparedBy: currentUser.name,
    };
    onUpdateProject(updated, `Quotation ${quotationNumber} officially prepared and marked as Quoted by ${currentUser.name}`);
    setConfirmSendModal(false);
    setStatusMessage(`Quotation ${quotationNumber} saved. Project marked as 'Quoted'.`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleMarkWon = () => {
    const updated: ProjectCosting = {
      ...project,
      status: 'Won',
    };
    onUpdateProject(updated, `Project awarded / marked Won by ${currentUser.name}`);
    setStatusMessage(`Congratulations! Project marked as 'Won'.`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Controls Toolbar (Hidden during print) */}
      <div className="print:hidden bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToCosting}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            ← Back to Costing
          </button>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-800">
            {project.id}
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
            project.status === 'Won' ? 'bg-emerald-100 text-emerald-800' :
            project.status === 'Quoted' ? 'bg-blue-100 text-blue-800' :
            'bg-slate-100 text-slate-700'
          }`}>
            {project.status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Internal profit preview toggle (strictly for internal testing) */}
          <button
            onClick={() => setShowInternalProfitInspector(!showInternalProfitInspector)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            title="Inspect internal profit (Never visible on customer print)"
          >
            {showInternalProfitInspector ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showInternalProfitInspector ? 'Hide Internal Audit' : 'Show Internal Audit'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>

          {project.status !== 'Won' && (
            <button
              onClick={() => setConfirmSendModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Confirm & Mark Quoted</span>
            </button>
          )}

          {project.status === 'Quoted' && (
            <button
              onClick={handleMarkWon}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Mark as Won</span>
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className="print:hidden p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Internal Profit Inspector (STRICTLY HIDDEN ON PRINT / ONLY FOR AUTHORIZED INTERNAL USE) */}
      {showInternalProfitInspector && (
        <div className="print:hidden bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-4 text-amber-950 text-xs space-y-2">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5 text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              INTERNAL AUDIT ONLY: Cost & Profit Health Verification
            </span>
            <span className="text-[10px] uppercase bg-amber-200 px-2 py-0.5 rounded text-amber-900">
              CONFIDENTIAL — HIDDEN FROM CUSTOMER
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-2 bg-white rounded-lg border border-amber-200">
              <span className="text-[10px] text-slate-500 block">Estimated Cost:</span>
              <strong className="text-slate-900 font-mono text-sm">{formatAED(project.estimatedTotalCost)}</strong>
            </div>
            <div className="p-2 bg-white rounded-lg border border-amber-200">
              <span className="text-[10px] text-slate-500 block">Quoted Price (Before VAT):</span>
              <strong className="text-slate-900 font-mono text-sm">{formatAED(project.quotedSellingPrice)}</strong>
            </div>
            <div className="p-2 bg-white rounded-lg border border-amber-200">
              <span className="text-[10px] text-slate-500 block">Expected Profit:</span>
              <strong className="text-emerald-700 font-mono text-sm">{formatAED(project.expectedProfit)}</strong>
            </div>
            <div className="p-2 bg-white rounded-lg border border-amber-200">
              <span className="text-[10px] text-slate-500 block">Gross Profit Margin:</span>
              <strong className="text-emerald-700 font-mono text-sm">{project.expectedProfitMarginPercentage.toFixed(2)}%</strong>
              <span className="text-[10px] text-slate-400 block">Markup: {project.expectedMarkupPercentage.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* FORMAL CUSTOMER QUOTATION DOCUMENT (PRINT READY) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 sm:p-12 space-y-8 print:border-none print:shadow-none print:p-0 print:m-0 text-slate-900">
        {/* Header & Logo */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-slate-900 pb-6">
          <div>
            <div className="flex items-center gap-4">
              <div className="p-1 rounded-xl bg-slate-50 border border-slate-200 shadow-xs shrink-0 flex items-center justify-center">
                <SubratIQLogo size={56} variant="icon" />
              </div>
              <div>
                <div className="flex items-baseline tracking-tight leading-none mb-1">
                  <span className="text-xl sm:text-2xl font-black tracking-wider text-slate-900 uppercase font-sans">
                    SUBRAT
                  </span>
                  <span className="ml-1 text-xl sm:text-2xl font-black text-cyan-600">
                    I
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-600">
                    Q
                  </span>
                </div>
                <h1 className="text-base font-bold tracking-tight text-slate-800">
                  {settings.companyName}
                </h1>
                <p className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase">
                  Ideas • Apps • Innovation | Environmental & Specialized Technical Services
                </p>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-600 space-y-0.5">
              <p>{settings.companyAddress}</p>
              <p>Phone: {settings.phone} | Email: {settings.email}</p>
              <p className="font-bold text-slate-900">
                UAE Tax Registration No. (TRN): {settings.trn}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black tracking-widest uppercase rounded">
              COMMERCIAL QUOTATION
            </span>
            <div className="text-xs font-mono font-bold text-slate-800 mt-2">
              Quote Ref: {quotationNumber}
            </div>
            <div className="text-xs text-slate-600">
              Date: <strong>{quotationDate}</strong>
            </div>
            <div className="text-xs text-slate-600">
              Validity: <strong>{project.quotationValidityDays} Days</strong>
            </div>
            <div className="text-xs text-blue-700 font-bold mt-1">
              Division: {project.division}
            </div>
          </div>
        </div>

        {/* Customer & Site Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Customer Details:
            </span>
            <div className="text-sm font-black text-slate-900">{project.customerName}</div>
            <div className="text-slate-700 mt-0.5">Attention: {project.contactPerson}</div>
            <div className="text-slate-600">Contact: {project.contactPhone}</div>
          </div>

          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Project & Site Location:
            </span>
            <div className="text-sm font-bold text-slate-900">{project.projectName}</div>
            <div className="text-slate-700 mt-0.5">Location: {project.siteLocation}</div>
            <div className="text-slate-600">
              Contract Structure: <strong>{project.contractType}</strong> ({project.numberOfVisits} visits total)
            </div>
          </div>
        </div>

        {/* Detailed Scope of Work */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
            1. Scope of Work & Service Methodology
          </h3>
          <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-5">
            {scopeItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed">{item}</li>
            ))}
          </ul>
        </div>

        {/* Quotation Deliverables & Pricing Table (INTERNAL COSTS STRICTLY HIDDEN) */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
            2. Commercial Pricing & Deliverables
          </h3>

          <table className="w-full text-xs text-left border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <th className="p-3 w-12 text-center">Item</th>
                <th className="p-3">Service Description</th>
                <th className="p-3 text-center">Visits</th>
                <th className="p-3 text-right">Amount (AED)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-3 text-center font-bold">1</td>
                <td className="p-3">
                  <div className="font-bold text-slate-900">{project.serviceType}</div>
                  <div className="text-slate-600 text-[11px] mt-0.5">
                    Execution of specialized scope per specifications for {project.projectName} at {project.siteLocation}.
                  </div>
                </td>
                <td className="p-3 text-center font-semibold">
                  {project.numberOfVisits} {project.numberOfVisits > 1 ? 'Visits' : 'Visit'}
                </td>
                <td className="p-3 text-right font-bold text-slate-900">
                  {formatAED(project.quotedSellingPrice, false)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Pricing Totals Box (Section 8: Clear Subtotal, VAT 5%, and Total) */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-80 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="font-medium text-slate-600">Subtotal (Excl. VAT):</span>
                <span className="font-bold text-slate-900">{formatAED(project.quotedSellingPrice)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="font-medium text-slate-600">Applicable UAE VAT ({project.vatRate || 5}%):</span>
                <span className="font-bold text-slate-900">{formatAED(project.vatAmount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b-2 border-slate-900 text-sm bg-slate-50 px-2 rounded">
                <span className="font-black text-slate-900">Total Quotation (Incl. VAT):</span>
                <span className="font-black text-blue-900">{formatAED(project.finalQuotationTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Associated Site Evidence & Documentation (If any attachments present) */}
        {project.attachments && project.attachments.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 flex items-center justify-between">
              <span>3. Associated Site Evidence & Attached Documentation</span>
              <span className="text-[11px] font-normal text-slate-500">
                {project.attachments.length} {project.attachments.length === 1 ? 'file attached' : 'files attached'}
              </span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {project.attachments.map((att) => (
                <div key={att.id} className="border border-slate-200 rounded-lg p-2 bg-slate-50/50 flex flex-col justify-between">
                  <div className="h-20 bg-slate-100 rounded overflow-hidden flex items-center justify-center mb-1.5 border border-slate-200">
                    {att.type.startsWith('image/') ? (
                      <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="p-2 text-center text-slate-500">
                        <FileText className="w-6 h-6 mx-auto mb-1 text-blue-600" />
                        <span className="text-[10px] font-mono block truncate max-w-[100px]">{att.name}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-800 line-clamp-1">{att.name}</span>
                    <span className="text-[9px] text-blue-700 font-semibold block">{att.category}</span>
                    {att.notes && <p className="text-[9px] text-slate-500 italic mt-0.5 line-clamp-1">"{att.notes}"</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Commercial Terms & Conditions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs border-t border-slate-200 pt-4">
          <div>
            <h4 className="font-bold uppercase tracking-wider text-slate-800 mb-1">
              Payment Terms & Validity:
            </h4>
            <p className="text-slate-600 leading-relaxed">• Payment: {paymentTerms}</p>
            <p className="text-slate-600 leading-relaxed">• Quotation validity: {project.quotationValidityDays} days from date of issuance.</p>
            <p className="text-slate-600 leading-relaxed">• All amounts in UAE Dirhams (AED).</p>
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-wider text-slate-800 mb-1">
              Exclusions & Site Assumptions:
            </h4>
            <ul className="text-slate-600 space-y-1 list-disc pl-4">
              {exclusions.map((exc, i) => (
                <li key={i}>{exc}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Official Signature Block */}
        <div className="border-t-2 border-slate-200 pt-6 mt-8 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs">
          <div className="space-y-4">
            <div>
              <span className="text-slate-500 block">Prepared By:</span>
              <strong className="text-slate-900">{project.quotationPreparedBy || currentUser.name}</strong>
              <span className="text-slate-400 block text-[11px]">Sales / Technical Estimator</span>
            </div>
            <div>
              <span className="text-slate-500 block">Authorized Signatory:</span>
              <strong className="text-slate-900">{project.quotationApprovedBy || 'Management Executive'}</strong>
              <span className="text-slate-400 block text-[11px]">ABC LLC, UAE</span>
            </div>
          </div>

          <div className="p-4 border border-dashed border-slate-300 rounded-xl text-center w-56 text-slate-400 text-[11px]">
            Official Company Stamp & Signature
            <div className="h-12 flex items-center justify-center font-serif italic text-slate-300">
              [ ABC LLC DUBAI SEAL ]
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL BEFORE OFFICIALLY MARKING QUOTED */}
      {confirmSendModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Confirm Quotation Preparation
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to officially finalize this quotation for <strong>{project.customerName}</strong> with quoted total of <strong>{formatAED(project.finalQuotationTotal)}</strong> (incl. VAT)?
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              Note: This action updates status to <strong>Quoted</strong>. The proposal will not be automatically emailed without sales authorization.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmSendModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkAsQuoted}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                Confirm & Mark Quoted
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
