import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StudentRecord, SystemSettings } from '../types';

export interface PdfExportOptions {
  title?: string;
  subtitle?: string;
  statusFilter?: string;
  academicYear?: string;
  schoolName?: string;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Exports a list of student records to an official PDF report document
 */
export async function exportStudentsToPdf(
  students: StudentRecord[],
  systemSettings?: SystemSettings,
  options?: PdfExportOptions
): Promise<void> {
  const schoolName = options?.schoolName || systemSettings?.schoolName || 'Sisters of Mary School-Girlstown, Inc.';
  const academicYear = options?.academicYear || systemSettings?.academicYear || 'SY 2026-2027 Recruitment';
  const orientation = options?.orientation || 'landscape';
  const filterTitle = options?.statusFilter && options.statusFilter !== 'ALL' 
    ? ` (${options.statusFilter.toUpperCase()})`
    : '';

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Try loading logo into base64 image if available
  let logoImg: HTMLImageElement | null = null;
  const logoUrl = systemSettings?.schoolLogoUrl || '/school_logo.png';
  try {
    logoImg = await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = logoUrl;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  } catch {
    logoImg = null;
  }

  // Draw Header Banner
  doc.setFillColor(30, 58, 138); // Navy Blue (#1E3A8A)
  doc.rect(0, 0, pageWidth, 28, 'F');

  // School Logo
  if (logoImg) {
    try {
      doc.addImage(logoImg, 'PNG', 12, 4, 20, 20);
    } catch {
      // Ignore image rendering error
    }
  }

  // Header Titles
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const textX = logoImg ? 36 : 14;
  doc.text(schoolName.toUpperCase(), textX, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(219, 234, 254); // Light blue
  doc.text(`STUDENT RECRUITMENT & ADMISSION EVALUATION REPORT — ${academicYear.toUpperCase()}${filterTitle}`, textX, 17);

  doc.setFontSize(8);
  doc.setTextColor(191, 219, 254);
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Generated on: ${dateStr}`, textX, 23);

  // Statistics Summary Strip (Below Header)
  const passCount = students.filter((s) => s.remarks === 'A - PASS').length;
  const pendingCount = students.filter((s) => s.remarks === 'B - PENDING').length;
  const passRate = students.length > 0 ? Math.round((passCount / students.length) * 100) : 0;

  doc.setFillColor(248, 250, 252); // Slate-50
  doc.rect(0, 28, pageWidth, 11, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(0, 39, pageWidth, 39);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Total Applicants: ${students.length}`, 14, 35);
  
  doc.setTextColor(21, 128, 61); // Green
  doc.text(`Passed (A): ${passCount}`, 65, 35);
  
  doc.setTextColor(180, 83, 9); // Amber
  doc.text(`Pending (B): ${pendingCount}`, 110, 35);

  doc.setTextColor(30, 58, 138); // Blue
  doc.text(`Passing Rate: ${passRate}%`, 160, 35);

  // Prepare Table Rows
  const tableData = students.map((s, idx) => {
    let formattedBirthday = s.birthday || '-';
    if (s.birthday && s.birthday.includes('-')) {
      const parts = s.birthday.split('-');
      if (parts.length === 3) formattedBirthday = `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    const fullName = `${s.surname}, ${s.firstName} ${s.middleName || ''}`.trim();
    return [
      String(idx + 1),
      String(s.lrn || '-'),
      fullName,
      formattedBirthday,
      String(s.elementarySchool || 'N/A'),
      String(s.examScore ?? 0),
      s.remarks === 'A - PASS' ? 'A (PASS)' : 'B (PENDING)',
      s.address || '-',
      s.guardianName || s.motherName || s.fatherName || '-',
    ];
  });

  // Generate AutoTable
  autoTable(doc, {
    startY: 42,
    head: [[
      '#',
      'LRN',
      'Student Full Name',
      'Birthday',
      'Elementary School',
      'Exam',
      'Status',
      'Address',
      'Parent / Guardian',
    ]],
    body: tableData,
    theme: 'striped',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
      textColor: [31, 41, 55],
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 45, halign: 'left', fontStyle: 'bold' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 50, halign: 'left' },
      5: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      7: { cellWidth: 45, halign: 'left' },
      8: { cellWidth: 35, halign: 'left' },
    },
    didParseCell: (data) => {
      // Color remark column cells
      if (data.section === 'body' && data.column.index === 6) {
        const text = String(data.cell.raw);
        if (text.includes('PASS')) {
          data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fillColor = [220, 252, 231];
        } else {
          data.cell.styles.textColor = [154, 52, 18];
          data.cell.styles.fillColor = [254, 243, 199];
        }
      }
    },
    didDrawPage: (data) => {
      // Footer on every page
      const pageCount = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : 1;
      const currentPage = data.pageNumber;

      doc.setDrawColor(226, 232, 240);
      doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`${schoolName} — Confidential Official Admission Records`, 14, pageHeight - 5.5);
      doc.text(`Page ${currentPage} of ${pageCount}`, pageWidth - 32, pageHeight - 5.5);
    },
    margin: { left: 14, right: 14, bottom: 16 },
  });

  const filterSuffix = options?.statusFilter && options.statusFilter !== 'ALL'
    ? `_${options.statusFilter.replace(/[^a-zA-Z0-9]/g, '')}`
    : '';
  const filename = `SMS_Admission_Report_${new Date().toISOString().slice(0, 10)}${filterSuffix}.pdf`;
  doc.save(filename);
}

/**
 * Exports a single student's complete official admission profile sheet to PDF
 */
export async function exportStudentProfilePdf(
  student: StudentRecord,
  systemSettings?: SystemSettings
): Promise<void> {
  const schoolName = systemSettings?.schoolName || 'Sisters of Mary School-Girlstown, Inc.';
  const academicYear = systemSettings?.academicYear || 'SY 2026-2027 Recruitment';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Try loading logo
  let logoImg: HTMLImageElement | null = null;
  const logoUrl = systemSettings?.schoolLogoUrl || '/school_logo.png';
  try {
    logoImg = await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = logoUrl;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  } catch {
    logoImg = null;
  }

  // Header Banner
  doc.setFillColor(30, 58, 138); // #1E3A8A
  doc.rect(0, 0, pageWidth, 32, 'F');

  if (logoImg) {
    try {
      doc.addImage(logoImg, 'PNG', 14, 5, 22, 22);
    } catch {
      // fallback
    }
  }

  const textX = logoImg ? 40 : 14;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(schoolName.toUpperCase(), textX, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(219, 234, 254);
  doc.text('OFFICIAL APPLICANT ADMISSION & INFORMATION RECORD', textX, 19);

  doc.setFontSize(8);
  doc.setTextColor(191, 219, 254);
  doc.text(`Academic Period: ${academicYear} | Document Ref: ${student.id}`, textX, 25);

  // Student Title & Admission Status Box
  let curY = 40;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, curY, pageWidth - 28, 20, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  const fullName = `${student.surname}, ${student.firstName} ${student.middleName || ''}`.trim();
  doc.text(fullName, 20, curY + 9);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`LRN: ${student.lrn || 'N/A'}  |  School: ${student.elementarySchool || 'N/A'}`, 20, curY + 15);

  // Status Badge in card
  const isPass = student.remarks === 'A - PASS';
  doc.setFillColor(isPass ? 220 : 254, isPass ? 252 : 243, isPass ? 231 : 199);
  doc.roundedRect(pageWidth - 62, curY + 4, 44, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(isPass ? 22 : 154, isPass ? 101 : 52, isPass ? 52 : 18);
  doc.text(isPass ? 'STATUS: A (PASS)' : 'STATUS: B (PENDING)', pageWidth - 40, curY + 11.5, { align: 'center' });

  curY += 26;

  // Demographics Section
  autoTable(doc, {
    startY: curY,
    head: [['I. APPLICANT PERSONAL & ADMISSION INFORMATION', '']],
    body: [
      ['Learner Reference Number (LRN)', student.lrn || '-'],
      ['Complete Name', fullName],
      ['Date of Birth', student.birthday || '-'],
      ['Residential Address', student.address || '-'],
      ['Origin Elementary School', student.elementarySchool || '-'],
      ['Entrance Examination Score', `${student.examScore ?? 0} pts (out of ${systemSettings?.maxExamScore || 100})`],
      ['Admission Status & Remarks', student.remarks || 'B - PENDING'],
      ['General Health Status', student.healthStatus || 'Good / Normal'],
    ],
    theme: 'plain',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 65, fontStyle: 'bold', textColor: [51, 65, 85] },
      1: { cellWidth: 117, textColor: [15, 23, 42] },
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    margin: { left: 14, right: 14 },
  });

  curY = (doc as any).lastAutoTable.finalY + 6;

  // Family Background Section
  autoTable(doc, {
    startY: curY,
    head: [['II. FAMILY & GUARDIAN PROFILE', '']],
    body: [
      ["Father's Full Name", student.fatherName || '-'],
      ["Father's Occupation", student.fatherOccupation || '-'],
      ["Mother's Full Name", student.motherName || '-'],
      ["Mother's Occupation", student.motherOccupation || '-'],
      ["Legal Guardian's Name", student.guardianName || '-'],
      ["Guardian's Occupation", student.guardianOccupation || '-'],
      ['Number of Siblings', String(student.numSiblings ?? 0)],
    ],
    theme: 'plain',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 65, fontStyle: 'bold', textColor: [51, 65, 85] },
      1: { cellWidth: 117, textColor: [15, 23, 42] },
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    margin: { left: 14, right: 14 },
  });

  curY = (doc as any).lastAutoTable.finalY + 10;

  // Official Signature / Verification Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, curY, pageWidth - 28, 38, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('OFFICIAL VERIFICATION & ADMISSION RECORD CERTIFICATION', 20, curY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'This certifies that the candidate above has been properly evaluated in accordance with the admission standards and recruitment policies of Sisters of Mary School-Girlstown, Inc.',
    20,
    curY + 11,
    { maxWidth: pageWidth - 40 }
  );

  // Signature Lines
  doc.setDrawColor(148, 163, 184);
  doc.line(24, curY + 30, 80, curY + 30);
  doc.line(pageWidth - 80, curY + 30, pageWidth - 24, curY + 30);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Admissions / Evaluator Signature', 30, curY + 34);
  doc.text('Authorized School Administrator', pageWidth - 76, curY + 34);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`${schoolName} | Student Admission Record | ${student.lrn}`, 14, pageHeight - 6);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 45, pageHeight - 6);

  const cleanSN = (student.surname || 'Student').replace(/[^a-zA-Z0-9]/g, '');
  const cleanFN = (student.firstName || '').replace(/[^a-zA-Z0-9]/g, '');
  const filename = `SMS_Profile_${cleanSN}_${cleanFN}_${student.lrn || 'Record'}.pdf`;
  doc.save(filename);
}

/**
 * Exports Feeder Schools Summary to PDF
 */
export async function exportSchoolsSummaryPdf(
  students: StudentRecord[],
  systemSettings?: SystemSettings
): Promise<void> {
  const schoolName = systemSettings?.schoolName || 'Sisters of Mary School-Girlstown, Inc.';
  const academicYear = systemSettings?.academicYear || 'SY 2026-2027 Recruitment';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Draw Header Banner
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(schoolName.toUpperCase(), 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(219, 234, 254);
  doc.text(`FEEDER ELEMENTARY SCHOOLS RECRUITMENT SUMMARY — ${academicYear.toUpperCase()}`, 14, 17);

  doc.setFontSize(8);
  doc.setTextColor(191, 219, 254);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`, 14, 23);

  // Group by School
  const schoolMap: Record<string, { total: number; pass: number; pending: number }> = {};
  students.forEach((s) => {
    const sch = s.elementarySchool?.trim() || 'Unspecified School';
    if (!schoolMap[sch]) schoolMap[sch] = { total: 0, pass: 0, pending: 0 };
    schoolMap[sch].total += 1;
    if (s.remarks === 'A - PASS') schoolMap[sch].pass += 1;
    else schoolMap[sch].pending += 1;
  });

  const schoolRows = Object.entries(schoolMap)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, counts], idx) => {
      const rate = counts.total > 0 ? Math.round((counts.pass / counts.total) * 100) : 0;
      return [
        String(idx + 1),
        name,
        String(counts.total),
        String(counts.pass),
        String(counts.pending),
        `${rate}%`,
      ];
    });

  autoTable(doc, {
    startY: 34,
    head: [['#', 'Elementary School Name', 'Total Applicants', 'PASS (A)', 'PENDING (B)', 'Pass Rate']],
    body: schoolRows,
    theme: 'striped',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 85, halign: 'left', fontStyle: 'bold' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 22, halign: 'center', fontStyle: 'bold', textColor: [22, 101, 52] },
      4: { cellWidth: 22, halign: 'center', fontStyle: 'bold', textColor: [180, 83, 9] },
      5: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [30, 58, 138] },
    },
    didDrawPage: (data) => {
      const pageCount = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : 1;
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`${schoolName} — Feeder Schools Report`, 14, pageHeight - 6);
      doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth - 30, pageHeight - 6);
    },
    margin: { left: 14, right: 14, bottom: 15 },
  });

  const filename = `SMS_Feeder_Schools_Summary_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
