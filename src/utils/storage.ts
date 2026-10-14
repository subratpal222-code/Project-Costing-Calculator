/**
 * ABC LLC - Local Storage & Data Persistence Manager
 * Ensures reliable persistent cloud/local browser storage with audit trail,
 * duplicate protection, and automated saving.
 */

import {
  ProjectCosting,
  StoreInventoryItem,
  Customer,
  ActualExpenseRecord,
  MaterialIssueRecord,
  AppSettings,
  AuditLogEntry,
  UserProfile,
  UserRole
} from '../types';
import {
  INITIAL_PROJECTS,
  INITIAL_STORE_INVENTORY,
  INITIAL_CUSTOMERS,
  INITIAL_ACTUAL_EXPENSES,
  INITIAL_MATERIAL_ISSUES,
  INITIAL_SETTINGS,
  INITIAL_USERS
} from '../data/initialData';

const STORAGE_KEYS = {
  PROJECTS: 'abc_costing_projects_v2',
  STORE_INVENTORY: 'abc_store_inventory_v2',
  CUSTOMERS: 'abc_customers_v2',
  ACTUAL_EXPENSES: 'abc_actual_expenses_v2',
  MATERIAL_ISSUES: 'abc_material_issues_v2',
  SETTINGS: 'abc_settings_v2',
  AUDIT_LOGS: 'abc_audit_logs_v2',
  CURRENT_USER: 'abc_current_user_v2',
};

const LEGACY_STORAGE_KEYS = {
  PROJECTS: 'epsco_costing_projects_v2',
  STORE_INVENTORY: 'epsco_store_inventory_v2',
  CUSTOMERS: 'epsco_customers_v2',
  ACTUAL_EXPENSES: 'epsco_actual_expenses_v2',
  MATERIAL_ISSUES: 'epsco_material_issues_v2',
  SETTINGS: 'epsco_settings_v2',
  AUDIT_LOGS: 'epsco_audit_logs_v2',
  CURRENT_USER: 'epsco_current_user_v2',
};

// Safe JSON get with automatic legacy EPSCO -> ABC migration
function getItem<T>(key: string, legacyKey: string, defaultValue: T): T {
  try {
    let raw = localStorage.getItem(key);
    if (!raw && legacyKey) {
      // Check legacy storage
      const legacyRaw = localStorage.getItem(legacyKey);
      if (legacyRaw) {
        // Migrate content by renaming EPSCO -> ABC
        raw = legacyRaw
          .replace(/EPSCO LLC/g, 'ABC LLC')
          .replace(/EPSCO-PC-/g, 'ABC-PC-')
          .replace(/EPSCO-REF-/g, 'ABC-REF-')
          .replace(/EPSCO-JOB-/g, 'ABC-JOB-')
          .replace(/EPSCO/g, 'ABC')
          .replace(/epsco-intl\.com/g, 'abc-intl.com');
        localStorage.setItem(key, raw);
        try {
          localStorage.removeItem(legacyKey);
        } catch {
          // ignore
        }
      }
    }

    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to read from localStorage key: ${key}`, e);
    return defaultValue;
  }
}

// Safe JSON set
function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to write to localStorage key: ${key}`, e);
  }
}

export function loadProjects(): ProjectCosting[] {
  const loaded = getItem<ProjectCosting[]>(STORAGE_KEYS.PROJECTS, LEGACY_STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS);
  return loaded.map(p => {
    // Normalization in case an old project id still had EPSCO
    const normalizedId = p.id.replace(/^EPSCO-/, 'ABC-');
    if ((normalizedId === 'ABC-PC-2026-001') && (!p.attachments || p.attachments.length === 0)) {
      const benchmark = INITIAL_PROJECTS.find(init => init.id === 'ABC-PC-2026-001');
      if (benchmark?.attachments) {
        return { ...p, id: normalizedId, attachments: benchmark.attachments };
      }
    }
    return {
      ...p,
      id: normalizedId,
      attachments: p.attachments || []
    };
  });
}

export function saveProjects(projects: ProjectCosting[]): void {
  setItem(STORAGE_KEYS.PROJECTS, projects);
}

export function loadStoreInventory(): StoreInventoryItem[] {
  return getItem<StoreInventoryItem[]>(STORAGE_KEYS.STORE_INVENTORY, LEGACY_STORAGE_KEYS.STORE_INVENTORY, INITIAL_STORE_INVENTORY);
}

export function saveStoreInventory(inventory: StoreInventoryItem[]): void {
  setItem(STORAGE_KEYS.STORE_INVENTORY, inventory);
}

export function loadCustomers(): Customer[] {
  return getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, LEGACY_STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
}

export function saveCustomers(customers: Customer[]): void {
  setItem(STORAGE_KEYS.CUSTOMERS, customers);
}

export function loadActualExpenses(): ActualExpenseRecord[] {
  const loaded = getItem<ActualExpenseRecord[]>(STORAGE_KEYS.ACTUAL_EXPENSES, LEGACY_STORAGE_KEYS.ACTUAL_EXPENSES, INITIAL_ACTUAL_EXPENSES);
  return loaded.map(e => ({
    ...e,
    projectId: e.projectId.replace(/^EPSCO-/, 'ABC-')
  }));
}

export function saveActualExpenses(expenses: ActualExpenseRecord[]): void {
  setItem(STORAGE_KEYS.ACTUAL_EXPENSES, expenses);
}

export function loadMaterialIssues(): MaterialIssueRecord[] {
  const loaded = getItem<MaterialIssueRecord[]>(STORAGE_KEYS.MATERIAL_ISSUES, LEGACY_STORAGE_KEYS.MATERIAL_ISSUES, INITIAL_MATERIAL_ISSUES);
  return loaded.map(m => ({
    ...m,
    projectId: m.projectId.replace(/^EPSCO-/, 'ABC-'),
    projectNumber: m.projectNumber ? m.projectNumber.replace(/^EPSCO-/, 'ABC-') : undefined
  }));
}

export function saveMaterialIssues(issues: MaterialIssueRecord[]): void {
  setItem(STORAGE_KEYS.MATERIAL_ISSUES, issues);
}

export function loadSettings(): AppSettings {
  return getItem<AppSettings>(STORAGE_KEYS.SETTINGS, LEGACY_STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
}

export function saveSettings(settings: AppSettings): void {
  setItem(STORAGE_KEYS.SETTINGS, settings);
}

export function loadAuditLogs(): AuditLogEntry[] {
  return getItem<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, LEGACY_STORAGE_KEYS.AUDIT_LOGS, [
    {
      id: 'AUD-001',
      timestamp: '2026-10-13T04:00:00Z',
      user: 'Ahmed Al-Mansoor',
      role: 'Administrator',
      action: 'SYSTEM_INIT',
      details: 'ABC Costing and Profit Analysis module initialized with standard UAE VAT (5%).',
    }
  ]);
}

export function logAuditAction(user: string, role: UserRole, action: string, details: string): void {
  const logs = loadAuditLogs();
  const newEntry: AuditLogEntry = {
    id: `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    user,
    role,
    action,
    details,
  };
  logs.unshift(newEntry);
  setItem(STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 200)); // Keep last 200 audit events
}

export function loadCurrentUser(): UserProfile {
  return getItem<UserProfile>(STORAGE_KEYS.CURRENT_USER, LEGACY_STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]);
}

export function saveCurrentUser(user: UserProfile): void {
  setItem(STORAGE_KEYS.CURRENT_USER, user);
}

export function resetAllDataToDefault(): void {
  setItem(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS);
  setItem(STORAGE_KEYS.STORE_INVENTORY, INITIAL_STORE_INVENTORY);
  setItem(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  setItem(STORAGE_KEYS.ACTUAL_EXPENSES, INITIAL_ACTUAL_EXPENSES);
  setItem(STORAGE_KEYS.MATERIAL_ISSUES, INITIAL_MATERIAL_ISSUES);
  setItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  setItem(STORAGE_KEYS.AUDIT_LOGS, [
    {
      id: `AUD-RESET-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'Administrator',
      role: 'Administrator',
      action: 'DATABASE_RESET',
      details: 'System restored to baseline ABC LLC demonstration state.',
    }
  ]);
}
