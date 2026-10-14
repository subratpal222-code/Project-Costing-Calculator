/**
 * ABC LLC - Application Settings & Security Audit Log Modal
 * Implements Section 8 (Configurable UAE VAT rate), Section 3 (Dynamic divisions),
 * and Section 13 (Role-based security & audit logs).
 */

import React, { useState } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  X, 
  Percent, 
  Building2, 
  FileText, 
  Plus, 
  Trash2, 
  Clock, 
  User, 
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { AppSettings, AuditLogEntry, UserProfile } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  auditLogs: AuditLogEntry[];
  currentUser: UserProfile;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  auditLogs,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'vat' | 'divisions' | 'company' | 'audit'>('vat');
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [newDivision, setNewDivision] = useState('');
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAdmin = currentUser.role === 'Administrator';

  const handleAddDivision = () => {
    if (!newDivision.trim()) return;
    if (formData.divisions.includes(newDivision.trim())) {
      alert('This division already exists.');
      return;
    }
    setFormData({
      ...formData,
      divisions: [...formData.divisions, newDivision.trim()],
    });
    setNewDivision('');
  };

  const handleRemoveDivision = (divisionToRemove: string) => {
    if (formData.divisions.length <= 1) {
      alert('At least one division must be retained.');
      return;
    }
    setFormData({
      ...formData,
      divisions: formData.divisions.filter((d) => d !== divisionToRemove),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only Administrators can modify core VAT and company configurations.');
      return;
    }
    onSaveSettings(formData);
    setSaveSuccess('Configuration successfully saved and applied.');
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">ABC System Configuration & Audit</h2>
              <p className="text-xs text-slate-400">
                UAE VAT compliance, dynamic divisions, and security log
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 px-6 pt-3 gap-6 text-xs font-bold bg-slate-50">
          <button
            onClick={() => setActiveTab('vat')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'vat' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Percent className="w-4 h-4" />
            <span>UAE VAT Rate (Section 8)</span>
          </button>
          <button
            onClick={() => setActiveTab('divisions')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'divisions' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Divisions Setup (Section 3)</span>
          </button>
          <button
            onClick={() => setActiveTab('company')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'company' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Company & TRN</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Audit Trail (Section 13)</span>
          </button>
        </div>

        <div className="p-6 max-h-[65vh] overflow-y-auto">
          {saveSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {!isAdmin && activeTab !== 'audit' && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Read-Only Mode:</strong> Logged in as <strong>{currentUser.role}</strong>. Only <strong>Administrator</strong> can alter corporate tax or division parameters.
              </span>
            </div>
          )}

          {/* TAB 1: UAE VAT RATE */}
          {activeTab === 'vat' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 leading-relaxed">
                <p>
                  <strong>Section 8 Requirement:</strong> The UAE Value Added Tax (VAT) rate must be configurable by an authorized administrator (default 5.0%). The system automatically excludes VAT collections from gross profit calculations.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Applicable UAE VAT Rate (%)
                </label>
                <div className="relative w-48">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    disabled={!isAdmin}
                    value={formData.vatRate}
                    onChange={(e) => setFormData({ ...formData, vatRate: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-white"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Standard FTA rate for services delivered inside the United Arab Emirates.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operating Currency Code
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.currency}
                  className="w-48 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-slate-100 text-slate-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Standardized on UAE Dirham (AED).
                </p>
              </div>

              {isAdmin && (
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Save VAT Settings
                  </button>
                </div>
              )}
            </form>
          )}

          {/* TAB 2: DIVISIONS SETUP */}
          {activeTab === 'divisions' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                Manage ABC operational divisions. New divisions can be added seamlessly without reprogramming (Section 3).
              </div>

              {isAdmin && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDivision}
                    onChange={(e) => setNewDivision(e.target.value)}
                    placeholder="Enter new division name (e.g. Marine Tank Cleaning Division)"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddDivision}
                    className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              )}

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Active Division Name</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {formData.divisions.map((d) => (
                      <tr key={d} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800">{d}</td>
                        <td className="p-3 text-right">
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDivision(d)}
                              className="text-red-500 hover:text-red-700 p-1 rounded"
                              title="Delete division"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isAdmin && (
                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Save Divisions
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COMPANY & TRN */}
          {activeTab === 'company' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company Legal Name</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tax Registration Number (TRN)
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={formData.trn}
                    onChange={(e) => setFormData({ ...formData, trn: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Official Address</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={formData.companyAddress}
                    onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telephone</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    disabled={!isAdmin}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {isAdmin && (
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Save Company Profile
                  </button>
                </div>
              )}
            </form>
          )}

          {/* TAB 4: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
                <span>Recent Financial Audit Trail Entries ({auditLogs.length})</span>
                <span className="font-mono text-[10px]">Security Rule Section 13</span>
              </div>

              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                        {log.role}
                      </span>
                    </div>
                    <div className="text-slate-800">
                      <strong>{log.user}</strong> performed <strong>{log.action}</strong>
                    </div>
                    <p className="text-slate-600 text-[11px]">{log.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
