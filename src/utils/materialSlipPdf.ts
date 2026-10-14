/**
 * ABC LLC - Material Issue Slip & Requisition PDF Generator
 * Creates an official, downloadable A4 PDF Material Issue Slip with
 * Project Number, Sales Person, Job Address, editable Material items,
 * and Authorized Person Signature blocks.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MaterialIssueRecord } from '../types';
import { formatAED } from './calculator';

/**
 * Generate and download an official ABC Material Issue Slip PDF
 */
export function generateMaterialIssueSlipPDF(issue: MaterialIssueRecord): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 14;
  let currentY = 14;

  // --- TOP HEADER BAR ---
  // Deep corporate blue bar
  doc.setFillColor(15, 41, 66); // #0f2942 deep ABC navy
  doc.rect(margin, currentY, pageWidth - margin * 2, 24, 'F');

  // Company Name & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ABC ENVIRONMENTAL PROTECTION SERVICES CO. LLC', margin + 6, currentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(220, 235, 252);
  doc.text('P.O. Box 28211, Dubai, UAE | Tel: +971 4 347 1122 | TRN: 100023456700003', margin + 6, currentY + 14);
  doc.text('Central Stores & Logistics Division | ISO 9001, 14001 & 45001 Certified', margin + 6, currentY + 19);

  // Document Badge on Right
  doc.setFillColor(234, 179, 8); // Gold accent
  doc.rect(pageWidth - margin - 52, currentY + 4, 46, 16, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('MATERIAL ISSUE SLIP', pageWidth - margin - 29, currentY + 10.5, { align: 'center' });
  doc.setFontSize(7.5);
  doc.text('STORE GATE PASS', pageWidth - margin - 29, currentY + 15, { align: 'center' });

  currentY += 28;

  // --- DOCUMENT METADATA STRIP ---
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.rect(margin, currentY, pageWidth - margin * 2, 12, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('SLIP NUMBER:', margin + 4, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(issue.id || 'MIS-TEMP', margin + 30, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('DATE OF ISSUE:', margin + 75, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(issue.issueDate || new Date().toISOString().split('T')[0], margin + 103, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('STATUS:', margin + 138, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // emerald
  doc.text((issue.status || 'ISSUED').toUpperCase(), margin + 155, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, margin + 4, currentY + 9.5);

  currentY += 16;

  // --- PROJECT & JOB INFORMATION (BOX 1) ---
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, currentY, pageWidth - margin * 2, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 41, 66);
  doc.text('PROJECT, CUSTOMER & SITE LOCATION PARTICULARS', margin + 4, currentY + 4.8);

  currentY += 7;

  // Information Grid Box
  const boxHeight = 36;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.rect(margin, currentY, pageWidth - margin * 2, boxHeight, 'D');

  const col1X = margin + 4;
  const col2X = margin + (pageWidth - margin * 2) / 2 + 2;

  // Column 1 - Project Number, Job Name, Customer
  let rowY = currentY + 5.5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Project Number:', col1X, rowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 132, 199); // sky-600
  doc.text(issue.projectNumber || issue.projectId || 'N/A', col1X + 28, rowY);

  rowY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Customer / Client:', col1X, rowY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const custName = issue.customerName || 'Direct Project Client';
  doc.text(custName.length > 34 ? custName.substring(0, 32) + '...' : custName, col1X + 28, rowY);

  rowY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Job / Project Name:', col1X, rowY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const projName = issue.projectName || 'Site Environmental Execution Scope';
  doc.text(projName.length > 34 ? projName.substring(0, 32) + '...' : projName, col1X + 28, rowY);

  rowY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Job Ref / Notes:', col1X, rowY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const notesText = issue.notes || 'Materials issued per operations schedule';
  doc.text(notesText.length > 34 ? notesText.substring(0, 32) + '...' : notesText, col1X + 28, rowY);

  // Column 2 - Sales Person, Address for the Job
  rowY = currentY + 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Sales Person:', col2X, rowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(issue.salespersonName || 'Unassigned / Operations', col2X + 28, rowY);

  rowY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Address for Job:', col2X, rowY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const jobAddress = issue.jobAddress || 'Site Address per Project Scope Document';
  // Split long address over 2 lines
  const splitAddress = doc.splitTextToSize(jobAddress, (pageWidth - margin * 2) / 2 - 32);
  doc.text(splitAddress, col2X + 28, rowY);

  currentY += boxHeight + 6;

  // --- MATERIAL ITEMS TABLE ---
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, pageWidth - margin * 2, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 41, 66);
  doc.text('MATERIAL / CHEMICAL PRODUCT SPECIFICATION & QUANTITY', margin + 4, currentY + 4.8);

  currentY += 8;

  const tableData = [
    [
      '1',
      issue.itemName,
      issue.itemCode || issue.storeItemId || 'GEN-MAT',
      `${issue.quantityIssued} ${issue.unit}`,
      formatAED(issue.unitCost),
      formatAED(issue.totalConsumptionCost || (issue.quantityIssued * issue.unitCost)),
      issue.notes || 'Full package dispatched'
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Material / Product Description', 'Store Code / SKU', 'Qty Issued', 'Unit Cost', 'Total Value', 'Batch / Remarks']],
    body: tableData,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [15, 41, 66],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 54 },
      2: { cellWidth: 30 },
      3: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 20 },
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [15, 23, 42],
      overflow: 'linebreak',
    },
    foot: [
      [
        '',
        'TOTAL MATERIAL VALUATION (EXCL. VAT)',
        '',
        `${issue.quantityIssued} ${issue.unit}`,
        '',
        formatAED(issue.totalConsumptionCost || (issue.quantityIssued * issue.unitCost)),
        'Approved'
      ]
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 41, 66],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
    }
  });

  // Calculate position after table
  const finalY = (doc as any).lastAutoTable?.finalY || currentY + 35;
  currentY = finalY + 7;

  // --- WAREHOUSE RETURN & GOVERNANCE POLICY ---
  doc.setFillColor(254, 252, 232); // amber-50
  doc.setDrawColor(254, 240, 138); // amber-200
  doc.rect(margin, currentY, pageWidth - margin * 2, 14, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(161, 98, 7); // amber-700
  doc.text('MANDATORY STORE COMPLIANCE & MATERIAL RECONCILIATION POLICY:', margin + 4, currentY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(113, 63, 18);
  doc.text('1. Materials are issued solely for the authorized project number & site location specified above.', margin + 4, currentY + 7.5);
  doc.text('2. All surplus, unused, or defective materials must be returned to Central Store within 24 hours of job completion with a signed Return Voucher.', margin + 4, currentY + 10.5);

  currentY += 19;

  // --- THREE FORMAL SIGNATURE BOXES ---
  // 1. Issued By (Store Keeper)
  // 2. Received By (Site Supervisor / Transporter)
  // 3. Authorized Person Signature (Operations Manager / Approver)
  const boxWidth = (pageWidth - margin * 2 - 8) / 3;
  const sigBoxHeight = 44;

  // Box 1: Store In-Charge
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, currentY, boxWidth, sigBoxHeight, 'D');

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currentY, boxWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 41, 66);
  doc.text('1. ISSUED BY (STORE KEEPER)', margin + 3, currentY + 4.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Name:', margin + 3, currentY + 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(issue.issuedBy || 'Store Controller', margin + 14, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Date:', margin + 3, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(issue.issueDate || new Date().toISOString().split('T')[0], margin + 14, currentY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Signature:', margin + 3, currentY + 23);
  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 3, currentY + 38, margin + boxWidth - 3, currentY + 38);
  doc.setFontSize(6.5);
  doc.text('(Warehouse & Logistics In-Charge)', margin + 3, currentY + 41.5);

  // Box 2: Received By
  const box2X = margin + boxWidth + 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.rect(box2X, currentY, boxWidth, sigBoxHeight, 'D');

  doc.setFillColor(248, 250, 252);
  doc.rect(box2X, currentY, boxWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 41, 66);
  doc.text('2. RECEIVED BY (SITE SUPERVISOR)', box2X + 3, currentY + 4.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Name:', box2X + 3, currentY + 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(issue.receivedBy || 'Site Supervisor / Driver', box2X + 14, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Date:', box2X + 3, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(issue.issueDate || '___ / ___ / 2026', box2X + 14, currentY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Signature:', box2X + 3, currentY + 23);
  doc.setDrawColor(148, 163, 184);
  doc.line(box2X + 3, currentY + 38, box2X + boxWidth - 3, currentY + 38);
  doc.setFontSize(6.5);
  doc.text('(Site Receiver / Delivery Vehicle Lead)', box2X + 3, currentY + 41.5);

  // Box 3: Authorized Person Signature
  const box3X = margin + (boxWidth * 2) + 8;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.rect(box3X, currentY, boxWidth, sigBoxHeight, 'D');

  // Highlight authorized bar in navy
  doc.setFillColor(15, 41, 66);
  doc.rect(box3X, currentY, boxWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('3. AUTHORIZED SIGNATURE & STAMP', box3X + 3, currentY + 4.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Name:', box3X + 3, currentY + 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(issue.authorizedBy || 'Ahmed Al-Mansoor', box3X + 14, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Role:', box3X + 3, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text('Operations Manager', box3X + 14, currentY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Signature & Stamp:', box3X + 3, currentY + 22);

  // Stamp Box Indicator
  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1, 1], 0);
  doc.rect(box3X + boxWidth - 21, currentY + 20, 18, 16, 'D');
  doc.setLineDashPattern([], 0);
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  doc.text('OFFICIAL', box3X + boxWidth - 12, currentY + 26.5, { align: 'center' });
  doc.text('STAMP', box3X + boxWidth - 12, currentY + 30.5, { align: 'center' });

  doc.setDrawColor(148, 163, 184);
  doc.line(box3X + 3, currentY + 38, box3X + boxWidth - 23, currentY + 38);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('(Authorized Signatory)', box3X + 3, currentY + 41.5);

  currentY += sigBoxHeight + 8;

  // --- FOOTER BRANDING STRIP ---
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('ABC Environmental Protection Services Co. LLC — Official Material Requisition Document | Valid without alteration', margin, currentY + 4);
  doc.text('Page 1 of 1', pageWidth - margin, currentY + 4, { align: 'right' });

  return doc;
}

/**
 * Triggers instant browser download of the Material Issue Slip PDF
 */
export function downloadMaterialIssueSlip(issue: MaterialIssueRecord): void {
  const doc = generateMaterialIssueSlipPDF(issue);
  const cleanId = (issue.id || 'MIS-TEMP').replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = `ABC_Material_Issue_Slip_${cleanId}.pdf`;
  doc.save(filename);
}

/**
 * Opens Material Issue Slip in a new print window
 */
export function printMaterialIssueSlip(issue: MaterialIssueRecord): void {
  const doc = generateMaterialIssueSlipPDF(issue);
  const blobUrl = doc.output('bloburl');
  const printWindow = window.open(blobUrl);
  if (printWindow) {
    printWindow.focus();
  }
}
