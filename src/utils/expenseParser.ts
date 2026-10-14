/**
 * ABC LLC - Bulk Expense Raw Data Parser
 * Parses pasted raw text from Excel, Google Sheets, or CSV files into ActualExpenseRecords.
 * Supports Tab-Separated Values (TSV), Comma-Separated Values (CSV), and Semicolon formats.
 * Automatically classifies and maps expense categories: Labour, Materials, Transportation,
 * Equipment, Subcontractor, Other.
 */

import { ActualExpenseRecord, UserRole } from '../types';

export interface ParsedExpenseRow {
  id: string;
  originalLine: string;
  rowIndex: number;
  date: string;
  category: ActualExpenseRecord['category'];
  categoryConfidence: 'exact' | 'mapped' | 'fallback';
  amount: number;
  description: string;
  visitNumber: number;
  receiptOrRefNumber: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BulkParseResult {
  rows: ParsedExpenseRow[];
  totalValidCount: number;
  totalErrorCount: number;
  totalAmountAED: number;
  categorySummary: Record<ActualExpenseRecord['category'], number>;
  detectedDelimiter: 'tab' | 'comma' | 'semicolon' | 'unknown';
  hasHeaderRow: boolean;
}

/**
 * Normalizes any category string into one of the 6 official expense categories.
 */
export function normalizeExpenseCategory(input: string): {
  category: ActualExpenseRecord['category'];
  confidence: 'exact' | 'mapped' | 'fallback';
} {
  const clean = (input || '').trim();
  const lower = clean.toLowerCase();

  if (!clean) {
    return { category: 'Other', confidence: 'fallback' };
  }

  // Exact matches
  if (clean === 'Labour' || lower === 'labour') return { category: 'Labour', confidence: 'exact' };
  if (clean === 'Materials' || lower === 'materials') return { category: 'Materials', confidence: 'exact' };
  if (clean === 'Transportation' || lower === 'transportation') return { category: 'Transportation', confidence: 'exact' };
  if (clean === 'Equipment' || lower === 'equipment') return { category: 'Equipment', confidence: 'exact' };
  if (clean === 'Subcontractor' || lower === 'subcontractor') return { category: 'Subcontractor', confidence: 'exact' };
  if (clean === 'Other' || lower === 'other') return { category: 'Other', confidence: 'exact' };

  // Mapped patterns
  // 1. Labour
  if (/(labou?r|staff|manpower|technician|tech|crew|worker|overtime|salary|wages|operator|helper|supervisor)/i.test(lower)) {
    return { category: 'Labour', confidence: 'mapped' };
  }

  // 2. Materials
  if (/(material|chemical|consumable|store|part|filter|coil|duct|coating|biocide|degreaser|supply|supplies|sanitizer|gas|refrigerant|glue|tape|gloves|disinfectant)/i.test(lower)) {
    return { category: 'Materials', confidence: 'mapped' };
  }

  // 3. Transportation
  if (/(transport|vehicle|salik|fuel|petrol|diesel|toll|parking|van|pickup|driver|delivery|freight|mileage|trip|car)/i.test(lower)) {
    return { category: 'Transportation', confidence: 'mapped' };
  }

  // 4. Equipment
  if (/(equip|machin|asset|tool|rental|generator|vacuum|scaffold|compressor|harness|hepa|blower|ladder|camera|drill)/i.test(lower)) {
    return { category: 'Equipment', confidence: 'mapped' };
  }

  // 5. Subcontractor
  if (/(subcon|sub-con|subcontractor|lab|laboratory|third[\s-]?party|specialist|thirdparty|testing|test|swab|certificate|cert|external)/i.test(lower)) {
    return { category: 'Subcontractor', confidence: 'mapped' };
  }

  // 6. Other fallback
  return { category: 'Other', confidence: 'fallback' };
}

/**
 * Normalizes various date string formats to YYYY-MM-DD.
 */
export function normalizeDate(input: string, fallbackDate: string): string {
  if (!input || !input.trim()) return fallbackDate;
  const str = input.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  // Try native Date parsing
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {
    // Ignore and fallback
  }

  return fallbackDate;
}

/**
 * Cleans monetary numbers from strings like "AED 1,250.50", "1250", "$300.00".
 */
export function parseCleanNumber(input: string): number {
  if (!input) return 0;
  // Remove currency words, commas, quotes, etc.
  const cleaned = input
    .replace(/[a-zA-Z\$,\s]/g, '')
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Split a delimited line respecting optional quotes.
 */
function splitDelimitedLine(line: string, delimiter: string): string[] {
  if (delimiter === '\t') {
    return line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
  }

  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result;
}

/**
 * Main parser function: converts raw pasted text into structured parsed expense records.
 */
export function parseRawExpenseData(
  rawText: string,
  targetProjectId: string,
  currentUser: { name: string; role: UserRole },
  defaultVisitNumber: number = 1
): BulkParseResult {
  const emptySummary: Record<ActualExpenseRecord['category'], number> = {
    Labour: 0,
    Materials: 0,
    Transportation: 0,
    Equipment: 0,
    Subcontractor: 0,
    Other: 0,
  };

  if (!rawText || !rawText.trim()) {
    return {
      rows: [],
      totalValidCount: 0,
      totalErrorCount: 0,
      totalAmountAED: 0,
      categorySummary: emptySummary,
      detectedDelimiter: 'unknown',
      hasHeaderRow: false,
    };
  }

  // Split lines
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      rows: [],
      totalValidCount: 0,
      totalErrorCount: 0,
      totalAmountAED: 0,
      categorySummary: emptySummary,
      detectedDelimiter: 'unknown',
      hasHeaderRow: false,
    };
  }

  // Detect delimiter from first non-empty line
  const sample = lines[0];
  let delimiter = '\t';
  let detectedType: 'tab' | 'comma' | 'semicolon' | 'unknown' = 'tab';

  if (sample.includes('\t')) {
    delimiter = '\t';
    detectedType = 'tab';
  } else if (sample.includes(',')) {
    delimiter = ',';
    detectedType = 'comma';
  } else if (sample.includes(';')) {
    delimiter = ';';
    detectedType = 'semicolon';
  } else if (sample.includes('|')) {
    delimiter = '|';
    detectedType = 'unknown';
  }

  // Check if first line is a header
  const firstCells = splitDelimitedLine(lines[0], delimiter).map((c) => c.toLowerCase());
  const headerKeywords = ['date', 'category', 'amount', 'cost', 'description', 'desc', 'visit', 'receipt', 'ref', 'item'];
  const matchCount = firstCells.filter((c) => headerKeywords.some((k) => c.includes(k))).length;
  const hasHeaderRow = matchCount >= 2;

  // Header column index mapping
  let colDate = -1;
  let colCategory = -1;
  let colAmount = -1;
  let colDesc = -1;
  let colVisit = -1;
  let colRef = -1;

  if (hasHeaderRow) {
    firstCells.forEach((cell, idx) => {
      if (/date|day|time/i.test(cell) && colDate === -1) colDate = idx;
      else if (/category|type/i.test(cell) && colCategory === -1) colCategory = idx;
      else if (/amount|cost|price|aed|total|val/i.test(cell) && colAmount === -1) colAmount = idx;
      else if (/desc|description|note|detail|particular/i.test(cell) && colDesc === -1) colDesc = idx;
      else if (/visit|trip/i.test(cell) && colVisit === -1) colVisit = idx;
      else if (/receipt|ref|inv|voucher|doc|bill/i.test(cell) && colRef === -1) colRef = idx;
    });
  }

  const dataLines = hasHeaderRow ? lines.slice(1) : lines;
  const today = new Date().toISOString().split('T')[0];

  const parsedRows: ParsedExpenseRow[] = [];
  const categorySummary: Record<ActualExpenseRecord['category'], number> = { ...emptySummary };
  let totalValid = 0;
  let totalError = 0;
  let totalAmount = 0;

  dataLines.forEach((line, index) => {
    const cells = splitDelimitedLine(line, delimiter);
    const errors: string[] = [];
    const warnings: string[] = [];

    let rawDate = '';
    let rawCategory = '';
    let rawAmount = '';
    let rawDesc = '';
    let rawVisit = '';
    let rawRef = '';

    if (hasHeaderRow) {
      if (colDate !== -1 && cells[colDate]) rawDate = cells[colDate];
      if (colCategory !== -1 && cells[colCategory]) rawCategory = cells[colCategory];
      if (colAmount !== -1 && cells[colAmount]) rawAmount = cells[colAmount];
      if (colDesc !== -1 && cells[colDesc]) rawDesc = cells[colDesc];
      if (colVisit !== -1 && cells[colVisit]) rawVisit = cells[colVisit];
      if (colRef !== -1 && cells[colRef]) rawRef = cells[colRef];
    } else {
      // Heuristic fallback based on cell count and types
      // Common formats:
      // 1. Date | Category | Amount | Description | [Visit] | [Ref]
      // 2. Date | Category | Description | Amount | [Visit] | [Ref]
      if (cells.length === 1) {
        // Just an amount or simple entry
        rawAmount = cells[0];
        rawDesc = 'Pasted expense';
      } else if (cells.length === 2) {
        // Category | Amount or Desc | Amount
        if (parseCleanNumber(cells[1]) > 0) {
          rawCategory = cells[0];
          rawAmount = cells[1];
          rawDesc = cells[0];
        } else {
          rawDesc = cells[0];
          rawAmount = cells[1];
        }
      } else if (cells.length >= 3) {
        rawDate = cells[0];
        rawCategory = cells[1];

        // Determine if cells[2] or cells[3] is the amount
        const num2 = parseCleanNumber(cells[2]);
        const num3 = cells[3] ? parseCleanNumber(cells[3]) : 0;

        if (num2 > 0 && (num3 === 0 || isNaN(num3))) {
          // cells[2] is amount, cells[3] is description
          rawAmount = cells[2];
          rawDesc = cells[3] || '';
          if (cells[4]) rawVisit = cells[4];
          if (cells[5]) rawRef = cells[5];
        } else if (num3 > 0) {
          // cells[2] is description, cells[3] is amount
          rawDesc = cells[2];
          rawAmount = cells[3];
          if (cells[4]) rawVisit = cells[4];
          if (cells[5]) rawRef = cells[5];
        } else {
          // Fallback to cells[2] as amount
          rawAmount = cells[2];
          rawDesc = cells[3] || cells[1];
          if (cells[4]) rawVisit = cells[4];
          if (cells[5]) rawRef = cells[5];
        }
      }
    }

    // Process Date
    const normalizedDate = normalizeDate(rawDate, today);
    if (!rawDate) {
      warnings.push(`Date missing, set to today (${today})`);
    }

    // Process Category
    const { category, confidence } = normalizeExpenseCategory(rawCategory || rawDesc);
    if (confidence === 'fallback') {
      warnings.push(`Category could not be matched exactly; assigned to 'Other'`);
    }

    // Process Amount
    const amount = parseCleanNumber(rawAmount);
    if (amount <= 0) {
      errors.push(`Invalid or zero expense amount: "${rawAmount || 'empty'}"`);
    }

    // Process Description
    let description = rawDesc.trim();
    if (!description) {
      description = `${category} expense recorded via bulk import`;
      warnings.push('Description was empty; generated default summary');
    }

    // Process Visit Number
    let visitNum = defaultVisitNumber;
    if (rawVisit) {
      const match = rawVisit.match(/\d+/);
      if (match) {
        visitNum = parseInt(match[0], 10);
      }
    }

    // Process Receipt / Ref
    const receipt = rawRef.trim() || `BLK-${Date.now().toString().slice(-4)}-${index + 1}`;

    const isValid = errors.length === 0 && amount > 0;

    if (isValid) {
      totalValid++;
      totalAmount += amount;
      categorySummary[category] = (categorySummary[category] || 0) + amount;
    } else {
      totalError++;
    }

    parsedRows.push({
      id: `BULK-PREVIEW-${Date.now()}-${index}`,
      originalLine: line,
      rowIndex: index + (hasHeaderRow ? 2 : 1),
      date: normalizedDate,
      category,
      categoryConfidence: confidence,
      amount,
      description,
      visitNumber: visitNum,
      receiptOrRefNumber: receipt,
      isValid,
      errors,
      warnings,
    });
  });

  return {
    rows: parsedRows,
    totalValidCount: totalValid,
    totalErrorCount: totalError,
    totalAmountAED: totalAmount,
    categorySummary,
    detectedDelimiter: detectedType,
    hasHeaderRow,
  };
}

/**
 * Converts parsed valid rows into ready-to-save ActualExpenseRecord objects.
 */
export function convertParsedRowsToRecords(
  rows: ParsedExpenseRow[],
  projectId: string,
  currentUser: { name: string; role: UserRole }
): ActualExpenseRecord[] {
  const now = Date.now();
  return rows
    .filter((r) => r.isValid)
    .map((r, idx) => ({
      id: `ACT-BULK-${now}-${idx + 1}`,
      projectId,
      date: r.date,
      category: r.category,
      quantity: 1,
      amount: r.amount,
      description: r.description,
      enteredBy: currentUser.name,
      enteredByRole: currentUser.role,
      receiptOrRefNumber: r.receiptOrRefNumber,
      isApproved: true,
      visitNumber: r.visitNumber,
    }));
}

/**
 * Realistic sample text from Excel for user demonstration.
 */
export const SAMPLE_EXCEL_EXPENSE_DATA = `Date\tCategory\tAmount\tDescription\tVisit #\tReceipt/Ref
2026-03-02\tLabour\t1850.00\tAC Duct Cleaning & sanitization team (Lead + 2 Techs, 8 hrs)\t1\tTS-2026-088
2026-03-02\tMaterials\t640.50\tNon-acid coil cleaner 20L + EPA approved bio-sanitizer\t1\tINV-CHEM-941
2026-03-03\tTransportation\t180.00\tField service van fuel and 4x Salik toll gate crossings\t1\tSLK-03-112
2026-03-04\tEquipment\t500.00\tHEPA negative air vacuum machine daily rental\t2\tEQ-RNT-402
2026-03-05\tSubcontractor\t950.00\tThird-party microbiological swab testing & lab report\t2\tLAB-SWAB-87
2026-03-06\tOther\t120.00\tDubai Municipality site environmental permit clearance\t2\tMUNI-PM-091`;
