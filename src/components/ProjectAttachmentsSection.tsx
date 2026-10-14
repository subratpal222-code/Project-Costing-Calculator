/**
 * ABC LLC - Project File Attachments & Site Photos Manager
 * Allows users to associate site photos, floor plans, gate passes, and documents
 * with a project costing record, stored as local data URIs and object URLs.
 */

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import {
  UploadCloud,
  File,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Eye,
  Download,
  Trash2,
  Plus,
  X,
  Check,
  AlertCircle,
  Maximize2,
  Filter,
  Calendar,
  User,
  Shield,
  FileCheck,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { ProjectAttachment, AttachmentCategory, UserProfile } from '../types';

interface ProjectAttachmentsSectionProps {
  attachments: ProjectAttachment[];
  onChange: (attachments: ProjectAttachment[]) => void;
  currentUser?: UserProfile;
  readOnly?: boolean;
}

const CATEGORIES: AttachmentCategory[] = [
  'Site Photo (Before)',
  'Site Photo (After)',
  'Site Survey / Layout',
  'Gate Pass / Safety Permit',
  'Client Specification',
  'Inspection Report',
  'Other Document'
];

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const getCategoryBadgeStyle = (category: AttachmentCategory): string => {
  switch (category) {
    case 'Site Photo (Before)':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Site Photo (After)':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Site Survey / Layout':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Gate Pass / Safety Permit':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Client Specification':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'Inspection Report':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

// SVG Sample Generator for 1-click realistic demo attachments
const SAMPLE_BEFORE_PHOTO_DATA = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <rect width="800" height="600" fill="url(#grid)" opacity="0.3"/>
  
  <!-- Duct Structure -->
  <path d="M 120 150 L 680 150 L 620 420 L 180 420 Z" fill="#475569" stroke="#94a3b8" stroke-width="4"/>
  <path d="M 220 200 L 580 200 L 540 370 L 260 370 Z" fill="#334155" stroke="#64748b" stroke-width="2"/>
  
  <!-- Contamination / Grease texture -->
  <ellipse cx="360" cy="270" rx="90" ry="45" fill="#78350f" opacity="0.7"/>
  <ellipse cx="440" cy="290" rx="70" ry="35" fill="#451a03" opacity="0.8"/>
  <circle cx="310" cy="310" r="30" fill="#92400e" opacity="0.6"/>
  <circle cx="490" cy="260" r="25" fill="#713f12" opacity="0.7"/>

  <!-- Inspection overlay badge -->
  <rect x="30" y="30" width="340" height="90" rx="10" fill="#dc2626" opacity="0.9"/>
  <text x="50" y="65" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff">SITE INSPECTION PHOTO</text>
  <text x="50" y="95" font-family="Arial, sans-serif" font-size="14" fill="#fee2e2">CONDITION: PRE-CLEANING CONTAMINATION</text>
  
  <!-- Stamp -->
  <rect x="520" y="490" width="250" height="80" rx="8" fill="#1e1e1e" opacity="0.85" stroke="#e2e8f0" stroke-width="1"/>
  <text x="535" y="520" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#38bdf8">ABC LLC ENVIRO-TECH</text>
  <text x="535" y="540" font-family="Arial, sans-serif" font-size="11" fill="#94a3b8">AHU #04 Supply Plenum</text>
  <text x="535" y="558" font-family="Arial, sans-serif" font-size="10" fill="#64748b">Geo-Ref: Dubai, UAE | 10:15 AM</text>
</svg>
`)}`;

const SAMPLE_AFTER_PHOTO_DATA = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bgClean" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#022c22"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bgClean)"/>
  
  <!-- Clean Metallic Duct -->
  <path d="M 120 150 L 680 150 L 620 420 L 180 420 Z" fill="#94a3b8" stroke="#cbd5e1" stroke-width="4"/>
  <path d="M 220 200 L 580 200 L 540 370 L 260 370 Z" fill="#cbd5e1" stroke="#f8fafc" stroke-width="2"/>
  <line x1="220" y1="200" x2="380" y2="350" stroke="#ffffff" stroke-width="6" opacity="0.6"/>
  <line x1="290" y1="200" x2="450" y2="350" stroke="#ffffff" stroke-width="4" opacity="0.8"/>

  <!-- Sanitized Badge -->
  <rect x="30" y="30" width="340" height="90" rx="10" fill="#059669" opacity="0.9"/>
  <text x="50" y="65" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff">DECONTAMINATED &amp; SANITIZED</text>
  <text x="50" y="95" font-family="Arial, sans-serif" font-size="14" fill="#d1fae5">PASSED NADCA / ABC QA SPEC</text>

  <!-- Stamp -->
  <rect x="520" y="490" width="250" height="80" rx="8" fill="#1e1e1e" opacity="0.85" stroke="#e2e8f0" stroke-width="1"/>
  <text x="535" y="520" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#34d399">ABC QUALITY VERIFIED</text>
  <text x="535" y="540" font-family="Arial, sans-serif" font-size="11" fill="#94a3b8">Post-Treatment Coil &amp; Vane</text>
  <text x="535" y="558" font-family="Arial, sans-serif" font-size="10" fill="#64748b">Compliant with Dubai Mun. Std.</text>
</svg>
`)}`;

const SAMPLE_PERMIT_DATA = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#f8fafc"/>
  <rect x="40" y="40" width="720" height="520" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="40" y="40" width="720" height="80" rx="12" fill="#1e3a8a"/>
  <text x="80" y="90" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#ffffff">FACILITY SECURITY &amp; HOT WORK PERMIT</text>
  <text x="80" y="160" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#1e293b">Project: Mall HVAC &amp; Exhaust Duct Decontamination</text>
  <text x="80" y="195" font-family="Arial, sans-serif" font-size="13" fill="#475569">Permit Number: UAE-GP-2026-9921</text>
  <text x="80" y="225" font-family="Arial, sans-serif" font-size="13" fill="#475569">Contractor: ABC LLC (Enviro Tech Division)</text>
  <text x="80" y="255" font-family="Arial, sans-serif" font-size="13" fill="#475569">Access Time: 23:00 to 06:00 (Night Shift Clearance)</text>
  <text x="80" y="285" font-family="Arial, sans-serif" font-size="13" fill="#475569">Authorized Safety Lead: Ahmed Al-Mansoor / Site Team Alpha</text>

  <rect x="80" y="340" width="640" height="150" rx="8" fill="#f1f5f9" stroke="#94a3b8" stroke-dasharray="4 4"/>
  <text x="110" y="380" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#0f172a">SAFETY CONTROL REQUIREMENTS:</text>
  <text x="110" y="410" font-family="Arial, sans-serif" font-size="12" fill="#334155">&#x2714; Chemical SDS sheets available at security gate</text>
  <text x="110" y="435" font-family="Arial, sans-serif" font-size="12" fill="#334155">&#x2714; Full PPE mandatory: Respirators, safety goggles, harness for riser shaft</text>
  <text x="110" y="460" font-family="Arial, sans-serif" font-size="12" fill="#334155">&#x2714; Negative pressure HEPA containment installed</text>

  <rect x="520" y="440" width="180" height="60" rx="6" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
  <text x="545" y="475" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#15803d">PERMIT APPROVED</text>
</svg>
`)}`;

export const ProjectAttachmentsSection: React.FC<ProjectAttachmentsSectionProps> = ({
  attachments = [],
  onChange,
  currentUser,
  readOnly = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AttachmentCategory>('Site Photo (Before)');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [notesInput, setNotesInput] = useState('');
  const [previewItem, setPreviewItem] = useState<ProjectAttachment | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File size calculation
  const totalBytes = attachments.reduce((sum, item) => sum + (item.size || 0), 0);
  const photosCount = attachments.filter(a => a.type.startsWith('image/')).length;
  const docsCount = attachments.length - photosCount;

  // Process incoming files into base64 data URIs
  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);

    const files = Array.from(fileList);
    const newAttachments: ProjectAttachment[] = [];
    let processed = 0;

    files.forEach((file) => {
      // 10 MB per file limit warning
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(`File "${file.name}" exceeds the 10MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = (e.target?.result as string) || URL.createObjectURL(file);
        
        // Auto-detect category if user hasn't explicitly customized
        let assignedCategory: AttachmentCategory = selectedCategory;
        if (file.type.startsWith('image/')) {
          if (assignedCategory !== 'Site Photo (Before)' && assignedCategory !== 'Site Photo (After)') {
            assignedCategory = 'Site Photo (Before)';
          }
        } else if (file.name.toLowerCase().includes('permit') || file.name.toLowerCase().includes('pass')) {
          assignedCategory = 'Gate Pass / Safety Permit';
        } else if (file.name.toLowerCase().includes('spec') || file.name.toLowerCase().includes('scope')) {
          assignedCategory = 'Client Specification';
        } else if (file.name.toLowerCase().includes('report') || file.name.toLowerCase().includes('survey')) {
          assignedCategory = 'Inspection Report';
        }

        const newAttachment: ProjectAttachment = {
          id: `ATT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          category: assignedCategory,
          dataUrl,
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentUser?.name || 'Authorized Project Engineer',
          notes: notesInput.trim() ? notesInput.trim() : undefined
        };

        newAttachments.push(newAttachment);
        processed++;

        if (processed === files.length) {
          const updated = [...attachments, ...newAttachments];
          onChange(updated);
          setSuccessNotice(`Successfully attached ${newAttachments.length} file(s) to project record.`);
          setTimeout(() => setSuccessNotice(null), 4000);
          setNotesInput('');
        }
      };

      reader.onerror = () => {
        setUploadError(`Error reading file "${file.name}".`);
      };

      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!readOnly) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!readOnly && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    if (readOnly) return;
    const itemToRemove = attachments.find(a => a.id === id);
    if (window.confirm(`Remove attachment "${itemToRemove?.name || 'this file'}" from project?`)) {
      onChange(attachments.filter(a => a.id !== id));
      if (previewItem?.id === id) {
        setPreviewItem(null);
      }
    }
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    if (readOnly) return;
    const updated = attachments.map(item => item.id === id ? { ...item, notes } : item);
    onChange(updated);
  };

  const handleUpdateCategory = (id: string, category: AttachmentCategory) => {
    if (readOnly) return;
    const updated = attachments.map(item => item.id === id ? { ...item, category } : item);
    onChange(updated);
  };

  // 1-Click demo attachments loader
  const handleAddSampleAttachments = () => {
    const demoItems: ProjectAttachment[] = [
      {
        id: `ATT-DEMO-01`,
        name: 'site_inspection_ahu04_pre_clean.svg',
        size: 3420,
        type: 'image/svg+xml',
        category: 'Site Photo (Before)',
        dataUrl: SAMPLE_BEFORE_PHOTO_DATA,
        uploadedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        uploadedBy: currentUser?.name || 'Suresh Kumar',
        notes: 'Pre-service duct inspection showing particulate accumulation on plenum blades.'
      },
      {
        id: `ATT-DEMO-02`,
        name: 'duct_decontaminated_verification.svg',
        size: 2980,
        type: 'image/svg+xml',
        category: 'Site Photo (After)',
        dataUrl: SAMPLE_AFTER_PHOTO_DATA,
        uploadedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        uploadedBy: currentUser?.name || 'Suresh Kumar',
        notes: 'Post-chemical decontamination verification following NADCA standards.'
      },
      {
        id: `ATT-DEMO-03`,
        name: 'mall_night_shift_security_permit.svg',
        size: 3150,
        type: 'image/svg+xml',
        category: 'Gate Pass / Safety Permit',
        dataUrl: SAMPLE_PERMIT_DATA,
        uploadedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        uploadedBy: currentUser?.name || 'Fatima Al-Zahra',
        notes: 'Approved Dubai Mall night shift hot-work & security access permit.'
      }
    ];

    // Filter out duplicates if already added
    const toAdd = demoItems.filter(demo => !attachments.some(a => a.id === demo.id));
    if (toAdd.length === 0) {
      alert('Sample photos and permits are already present in this project record.');
      return;
    }
    onChange([...attachments, ...toAdd]);
    setSuccessNotice(`Added ${toAdd.length} verified sample inspection photo(s) & documents.`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Filter attachments
  const filteredAttachments = attachments.filter((item) => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'photos') return item.type.startsWith('image/');
    if (filterCategory === 'documents') return !item.type.startsWith('image/');
    return item.category === filterCategory;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-blue-50/30">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Paperclip className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Project Files, Site Photos &amp; Documents
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-600 text-white">
                  {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Attach site condition photos, AutoCAD/PDF layouts, gate passes, and client specification sheets to this costing record.
              </p>
            </div>
          </div>
        </div>

        {/* Metrics & Sample loader */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-medium border border-slate-200 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Photos: <strong>{photosCount}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Docs: <strong>{docsCount}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Total: <strong>{formatFileSize(totalBytes)}</strong></span>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={handleAddSampleAttachments}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Add pre-formatted verified site photos and safety permits for testing"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Add Demo Photos</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Alerts / Feedback */}
        {uploadError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{uploadError}</span>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="ml-auto text-rose-600 hover:text-rose-900 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {successNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Upload Zone (Drag & Drop + Options) */}
        {!readOnly && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Drag and Drop Box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`lg:col-span-2 border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-600 bg-blue-50/80 scale-[0.99]'
                  : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/60 bg-slate-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                onChange={handleInputChange}
                className="hidden"
                aria-label="Upload project files"
              />

              <div className="w-12 h-12 mb-3 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
                <UploadCloud className="w-6 h-6" />
              </div>

              <p className="text-sm font-bold text-slate-800">
                Click to browse or drag and drop files here
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Supports Site Photos (JPG, PNG, WEBP, SVG), Engineering Drawings, Safety Gate Passes, Client Specifications &amp; Reports (PDF, Word, Excel, CSV) up to 10MB each.
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-medium">
                  Site Photos
                </span>
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-medium">
                  Floor Plans / CAD
                </span>
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-medium">
                  Safety Gate Pass
                </span>
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-medium">
                  Client Spec Sheets
                </span>
              </div>
            </div>

            {/* Upload Preset Metadata Form */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Pre-Upload Settings
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Default Category for Next Upload
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value as AttachmentCategory)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      aria-label="Default Category"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Default Note / Location Tag (Optional)
                    </label>
                    <input
                      type="text"
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      placeholder="e.g. Ground Floor AHU Room, Duct Access Door #2"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Select Files to Attach</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterCategory === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Files ({attachments.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('photos')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                filterCategory === 'photos'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Site Photos ({photosCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('documents')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                filterCategory === 'documents'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Documents &amp; Permits ({docsCount})</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Files are stored safely with project state and persist across sessions.</span>
          </div>
        </div>

        {/* Attachments Grid / List */}
        {filteredAttachments.length === 0 ? (
          <div className="p-12 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <Paperclip className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">No attachments found in this category</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {attachments.length === 0
                ? 'Upload site inspection photos, client technical scopes, or safety permits to attach them to this project costing.'
                : 'Try selecting a different filter tab above or upload new attachments.'}
            </p>
            {!readOnly && attachments.length === 0 && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload First Attachment</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddSampleAttachments}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Load Sample Photos</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAttachments.map((item) => {
              const isImage = item.type.startsWith('image/');
              return (
                <div
                  key={item.id}
                  className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                >
                  {/* Thumbnail / Header Preview */}
                  <div className="relative bg-slate-900 h-44 overflow-hidden flex items-center justify-center border-b border-slate-100">
                    {isImage ? (
                      <img
                        src={item.dataUrl}
                        alt={item.name}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => setPreviewItem(item)}
                        loading="lazy"
                      />
                    ) : (
                      <div
                        onClick={() => setPreviewItem(item)}
                        className="w-full h-full bg-slate-50 flex flex-col items-center justify-center p-4 text-center cursor-pointer group-hover:bg-blue-50/30 transition-colors"
                      >
                        <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl mb-2 shadow-xs">
                          {item.type.includes('pdf') ? (
                            <FileCheck className="w-8 h-8 text-rose-600" />
                          ) : (
                            <FileText className="w-8 h-8 text-blue-600" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[200px]">
                          {item.name}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {formatFileSize(item.size)}
                        </span>
                      </div>
                    )}

                    {/* Quick action buttons on hover */}
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setPreviewItem(item)}
                        className="p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg backdrop-blur-xs transition-colors"
                        title="Quick View / Inspect"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={item.dataUrl}
                        download={item.name}
                        className="p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg backdrop-blur-xs transition-colors"
                        title="Download to device"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(item.id)}
                          className="p-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg backdrop-blur-xs transition-colors"
                          title="Delete attachment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Category pill on thumbnail */}
                    <div className="absolute bottom-2 left-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shadow-xs ${getCategoryBadgeStyle(item.category)}`}>
                        {item.category}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2 bg-white">
                    <div>
                      <h5
                        className="text-xs font-bold text-slate-900 truncate"
                        title={item.name}
                      >
                        {item.name}
                      </h5>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                        <span>{formatFileSize(item.size)}</span>
                        <span>{new Date(item.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Category Selector (editable) */}
                    {!readOnly ? (
                      <div>
                        <select
                          value={item.category}
                          onChange={(e) => handleUpdateCategory(item.id, e.target.value as AttachmentCategory)}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-semibold text-slate-700 focus:ring-1 focus:ring-blue-500"
                          aria-label="Change Category"
                        >
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    {/* Editable Note / Location */}
                    <div>
                      {!readOnly ? (
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                          placeholder="Add photo notes/location..."
                          className="w-full px-2 py-1 border border-slate-200 rounded text-[11px] text-slate-600 focus:bg-white focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                        />
                      ) : item.notes ? (
                        <p className="text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded border border-slate-100 line-clamp-2">
                          "{item.notes}"
                        </p>
                      ) : null}
                    </div>

                    {/* Uploaded By Meta */}
                    {item.uploadedBy && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 truncate max-w-[150px]">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{item.uploadedBy}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
                        >
                          View
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox / High-Res Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${getCategoryBadgeStyle(previewItem.category)}`}>
                  {previewItem.category}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white line-clamp-1">
                    {previewItem.name}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Uploaded by {previewItem.uploadedBy || 'User'} on {new Date(previewItem.uploadedAt).toLocaleString()} ({formatFileSize(previewItem.size)})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewItem.dataUrl}
                  download={previewItem.name}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 bg-slate-950 flex items-center justify-center p-4 overflow-auto min-h-[300px] max-h-[60vh]">
              {previewItem.type.startsWith('image/') ? (
                <img
                  src={previewItem.dataUrl}
                  alt={previewItem.name}
                  className="max-w-full max-h-[58vh] object-contain rounded-lg shadow-lg border border-slate-800"
                />
              ) : (
                <div className="text-center p-8 bg-slate-900 rounded-2xl border border-slate-800 max-w-md text-white">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-blue-900/50 text-blue-400 flex items-center justify-center">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold mb-1">{previewItem.name}</h4>
                  <p className="text-xs text-slate-400 mb-4">
                    Type: {previewItem.type} | Size: {formatFileSize(previewItem.size)}
                  </p>
                  <a
                    href={previewItem.dataUrl}
                    download={previewItem.name}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Document</span>
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer / Notes */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex-1 min-w-[250px]">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Site Notes &amp; Observations
                </label>
                {!readOnly ? (
                  <input
                    type="text"
                    value={previewItem.notes || ''}
                    onChange={(e) => {
                      const newNotes = e.target.value;
                      handleUpdateNotes(previewItem.id, newNotes);
                      setPreviewItem({ ...previewItem, notes: newNotes });
                    }}
                    placeholder="Add specific observations, equipment tags, or site details..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-xs text-slate-700">
                    {previewItem.notes || 'No notes provided for this file.'}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
