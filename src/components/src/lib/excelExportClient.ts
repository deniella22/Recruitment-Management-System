import ExcelJS from 'exceljs';
import { StudentRecord, SystemSettings } from '../types';

export interface ExcelExportOptions {
  title?: string;
  statusFilter?: string;
  academicYear?: string;
  schoolName?: string;
}

export async function exportStudentsToExcel(
  students: StudentRecord[],
  systemSettings?: SystemSettings,
  options?: ExcelExportOptions
): Promise<void> {
  const schoolName = options?.schoolName || systemSettings?.schoolName || 'Sisters of Mary School-Girlstown, Inc.';
  const academicYear = options?.academicYear || systemSettings?.academicYear || 'SY 2026-2027 Recruitment';
  const filterLabel = options?.statusFilter && options.statusFilter !== 'ALL' ? `_${options.statusFilter.replace(/[^a-zA-Z0-9]/g, '')}` : '';
  const filename = `SMS_Student_Records_${new Date().toISOString().slice(0, 10)}${filterLabel}.xlsx`;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = schoolName;
  workbook.lastModifiedBy = schoolName;
  workbook.created = new Date();

  // 1. Student Records Sheet
  const worksheet = workbook.addWorksheet('Student Records', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }],
  });

  // School Header Rows (Rows 1-3)
  worksheet.mergeCells('A1:Q1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = schoolName.toUpperCase();
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 30;

  worksheet.mergeCells('A2:Q2');
  const subTitleCell = worksheet.getCell('A2');
  subTitleCell.value = `OFFICIAL STUDENT RECRUITMENT & ADMISSION RECORDS — ${academicYear.toUpperCase()}`;
  subTitleCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 20;

  worksheet.mergeCells('A3:Q3');
  const metaCell = worksheet.getCell('A3');
  const passCount = students.filter((s) => s.remarks === 'A - PASS').length;
  const pendingCount = students.filter((s) => s.remarks === 'B - PENDING').length;
  metaCell.value = `Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })} | Total Records: ${students.length} (PASS: ${passCount} | PENDING: ${pendingCount})`;
  metaCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF374151' } };
  metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(3).height = 18;

  // Define Columns
  const columns = [
    { header: 'No.', key: 'index', width: 6 },
    { header: 'LRN', key: 'lrn', width: 16 },
    { header: 'Surname', key: 'surname', width: 16 },
    { header: 'First Name', key: 'firstName', width: 18 },
    { header: 'Middle Name', key: 'middleName', width: 16 },
    { header: 'Birthday', key: 'birthday', width: 14 },
    { header: 'Score in Exam', key: 'examScore', width: 14 },
    { header: 'Remarks / Status', key: 'remarks', width: 16 },
    { header: 'Elementary School', key: 'elementarySchool', width: 28 },
    { header: 'Address', key: 'address', width: 30 },
    { header: "Father's Name", key: 'fatherName', width: 20 },
    { header: "Father's Occupation", key: 'fatherOccupation', width: 20 },
    { header: "Mother's Name", key: 'motherName', width: 20 },
    { header: "Mother's Occupation", key: 'motherOccupation', width: 20 },
    { header: "Guardian's Name", key: 'guardianName', width: 20 },
    { header: "Guardian's Occupation", key: 'guardianOccupation', width: 20 },
    { header: 'No. of Siblings', key: 'numSiblings', width: 14 },
    { header: 'Health Status', key: 'healthStatus', width: 22 },
  ];

  // Set row 4 headers
  const headerRow = worksheet.getRow(4);
  headerRow.height = 26;
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark Slate
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FF334155' } },
    };
  });

  // Populate Student Rows
  students.forEach((s, idx) => {
    let formattedBirthday = s.birthday || '';
    if (s.birthday && s.birthday.includes('-')) {
      const parts = s.birthday.split('-');
      if (parts.length === 3) {
        formattedBirthday = `${parts[1]}/${parts[2]}/${parts[0]}`;
      }
    }

    const rowNum = idx + 5;
    const row = worksheet.getRow(rowNum);
    row.height = 20;

    const values = [
      idx + 1,
      String(s.lrn || '').trim(),
      s.surname || '',
      s.firstName || '',
      s.middleName || '',
      formattedBirthday,
      typeof s.examScore === 'number' ? s.examScore : Number(s.examScore) || 0,
      s.remarks || 'B - PENDING',
      s.elementarySchool || '',
      s.address || '',
      s.fatherName || '',
      s.fatherOccupation || '',
      s.motherName || '',
      s.motherOccupation || '',
      s.guardianName || '',
      s.guardianOccupation || '',
      typeof s.numSiblings === 'number' ? s.numSiblings : Number(s.numSiblings) || 0,
      s.healthStatus || '',
    ];

    const isEven = idx % 2 === 0;
    const rowBgArgb = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    values.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF1F2937' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgArgb } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Specific column alignments & formats
      if (colIdx === 0) {
        // No.
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colIdx === 1) {
        // LRN (Force text format to avoid scientific notation)
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.numFmt = '@';
      } else if (colIdx === 5) {
        // Birthday
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colIdx === 6) {
        // Exam Score
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0.0';
      } else if (colIdx === 7) {
        // Remarks
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (val === 'A - PASS') {
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF166534' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
        } else {
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF9A3412' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        }
      } else if (colIdx === 16) {
        // Siblings
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
  });

  // Auto-fit widths with limits
  columns.forEach((col, i) => {
    const colNumber = i + 1;
    const worksheetColumn = worksheet.getColumn(colNumber);
    worksheetColumn.width = col.width;
  });

  // Enable Auto-Filter
  const lastRow = Math.max(students.length + 4, 5);
  worksheet.autoFilter = `A4:R${lastRow}`;

  // 2. Summary by Origin Schools Sheet
  const summarySheet = workbook.addWorksheet('Schools Summary', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }],
  });

  summarySheet.mergeCells('A1:E1');
  const sumTitle = summarySheet.getCell('A1');
  sumTitle.value = `${schoolName.toUpperCase()} — FEEDER ELEMENTARY SCHOOLS SUMMARY`;
  sumTitle.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  sumTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  sumTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 26;

  // School aggregate data
  const schoolMap: Record<string, { total: number; pass: number; pending: number }> = {};
  students.forEach((s) => {
    const sch = s.elementarySchool?.trim() || 'Unspecified School';
    if (!schoolMap[sch]) schoolMap[sch] = { total: 0, pass: 0, pending: 0 };
    schoolMap[sch].total += 1;
    if (s.remarks === 'A - PASS') schoolMap[sch].pass += 1;
    else schoolMap[sch].pending += 1;
  });

  const sumHeaders = ['Elementary School Name', 'Total Applicants', 'PASS (A)', 'PENDING (B)', 'Passing Rate (%)'];
  const sumHeaderRow = summarySheet.getRow(3);
  sumHeaderRow.height = 24;
  sumHeaders.forEach((h, idx) => {
    const cell = sumHeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.alignment = { horizontal: idx === 0 ? 'left' : 'center', vertical: 'middle' };
  });

  summarySheet.getColumn(1).width = 35;
  summarySheet.getColumn(2).width = 16;
  summarySheet.getColumn(3).width = 16;
  summarySheet.getColumn(4).width = 16;
  summarySheet.getColumn(5).width = 18;

  let sumRowIdx = 4;
  Object.entries(schoolMap)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([schName, counts]) => {
      const row = summarySheet.getRow(sumRowIdx);
      const rate = counts.total > 0 ? Math.round((counts.pass / counts.total) * 100) : 0;
      row.getCell(1).value = schName;
      row.getCell(2).value = counts.total;
      row.getCell(3).value = counts.pass;
      row.getCell(4).value = counts.pending;
      row.getCell(5).value = `${rate}%`;

      [1, 2, 3, 4, 5].forEach((colNum) => {
        const cell = row.getCell(colNum);
        cell.font = { name: 'Calibri', size: 9.5 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        cell.alignment = { horizontal: colNum === 1 ? 'left' : 'center', vertical: 'middle' };
      });
      sumRowIdx++;
    });

  // Write and trigger download in browser
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
