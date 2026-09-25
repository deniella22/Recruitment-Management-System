import ExcelJS from 'exceljs';
import { StudentRecord, SystemSettings } from '../types';
import { calculateAgeFromBirthdate } from './dateUtils';
import { sortStudents, getTestingCenterName, resolveAdmissionStatus } from './studentSorting';

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
  // Always sort students using exact required hierarchy:
  // 1. PRIMARY: Testing Center / Place (A–Z)
  // 2. SECONDARY: Admission Status (Passed -> Conditional -> Pending -> Failed)
  // 3. TERTIARY: Student Name (Last Name / Surname, then First Name A–Z)
  const sortedStudents = sortStudents(students, 'testingCenter', 'asc');

  const schoolName = options?.schoolName || systemSettings?.schoolName || 'Sisters of Mary of Banneux, Inc.';
  const academicYear = options?.academicYear || systemSettings?.academicYear || 'SY 2026-2027 Recruitment';
  const filterLabel = options?.statusFilter && options.statusFilter !== 'ALL'
    ? `_${options.statusFilter.replace(/[^a-zA-Z0-9]/g, '')}`
    : '';
  const filename = `SMS_Recruitment_Records_${new Date().toISOString().slice(0, 10)}${filterLabel}.xlsx`;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = schoolName;
  workbook.lastModifiedBy = schoolName;
  workbook.created = new Date();
  workbook.title = `${schoolName} - Student Recruitment Records`;
  workbook.subject = `Recruitment Records (${academicYear})`;
  workbook.company = schoolName;

  // 1. Student Records Sheet (Organized Testing Center Report)
  const worksheet = workbook.addWorksheet('Recruitment Records', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }],
  });

  worksheet.headerFooter.oddHeader = `&C&B${schoolName}&B\nStudent Recruitment Personal Information Records — ${academicYear}`;
  worksheet.headerFooter.oddFooter = `&LGenerated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}&RPage &P of &N`;

  const columns = [
    { header: 'No.', key: 'index', width: 7 },
    { header: 'Admission Status', key: 'admissionStatus', width: 18 },
    { header: 'Status / Remarks', key: 'remarks', width: 18 },
    { header: 'LRN (12 Digits)', key: 'lrn', width: 18 },
    { header: 'Last Name / Surname', key: 'lastName', width: 22 },
    { header: 'First Name', key: 'firstName', width: 22 },
    { header: 'Middle Name', key: 'middleName', width: 20 },
    { header: 'Birthdate', key: 'birthdate', width: 15 },
    { header: 'Age', key: 'age', width: 9 },
    { header: 'Sex / Gender', key: 'gender', width: 14 },
    { header: 'Sitio / Street', key: 'sitioStreet', width: 24 },
    { header: 'Barangay', key: 'barangay', width: 20 },
    { header: 'Municipality / City', key: 'municipality', width: 22 },
    { header: 'Province', key: 'province', width: 20 },
    { header: 'Full Home Address', key: 'address', width: 36 },
    { header: 'Elementary School Graduated', key: 'elementarySchool', width: 32 },
    { header: 'School Address', key: 'schoolAddress', width: 26 },
    { header: 'Report Card (SY)', key: 'reportCardSy', width: 20 },
    { header: 'Grading Period', key: 'grading', width: 16 },
    { header: 'Current Grade', key: 'currentGrade', width: 16 },
    { header: 'If Elementary Graduate – Year Graduated', key: 'oldGraduateRemarks', width: 32 },
    { header: "Father's Full Name", key: 'fatherName', width: 24 },
    { header: "Father's Occupation", key: 'fatherOccupation', width: 22 },
    { header: "Father's Age", key: 'fatherAge', width: 14 },
    { header: "Mother's Full Name", key: 'motherName', width: 24 },
    { header: "Mother's Occupation", key: 'motherOccupation', width: 22 },
    { header: "Mother's Age", key: 'motherAge', width: 14 },
    { header: "Guardian's Full Name", key: 'guardianName', width: 24 },
    { header: "Guardian's Relationship", key: 'guardianRelation', width: 22 },
    { header: "Guardian's Occupation", key: 'guardianOccupation', width: 22 },
    { header: "Guardian's Age", key: 'guardianAge', width: 14 },
    { header: 'Cellphone Number', key: 'cellphoneNumber', width: 20 },
    { header: 'Cellphone Owner', key: 'cellphoneOwner', width: 20 },
    { header: 'Messenger Account', key: 'messengerAccount', width: 24 },
    { header: 'Messenger Owner', key: 'messengerOwner', width: 20 },
    { header: 'Documents Submitted', key: 'birthCertificatePsa', width: 30 },
    { header: "PSA Father's Name & Age", key: 'psaFatherNameAge', width: 26 },
    { header: "Father's Religion", key: 'fatherReligion', width: 18 },
    { header: "PSA Mother's Name & Age", key: 'psaMotherNameAge', width: 26 },
    { header: "Mother's Religion", key: 'motherReligion', width: 18 },
    { header: 'Birth Order', key: 'birthOrder', width: 12 },
    { header: 'Number of Children', key: 'numberOfChildren', width: 16 },
    { header: 'Baptized Catholic', key: 'baptizedCatholic', width: 16 },
    { header: 'Other Denomination', key: 'denomination', width: 20 },
    { header: 'Confirmed Catholic', key: 'confirmedCatholic', width: 16 },
    { header: 'Siblings Breakdown', key: 'siblingsSummary', width: 40 },
    { header: 'Parish / Place', key: 'parishPlace', width: 24 },
    { header: 'Parish Priest', key: 'parishPriest', width: 24 },
    { header: 'Exam Score', key: 'examScore', width: 14 },
    { header: 'Health Status', key: 'healthStatus', width: 24 },
    { header: 'Testing Center Province', key: 'testingCenterProvince', width: 24 },
    { header: 'Testing Center Location', key: 'testingCenterLocation', width: 30 },
    { header: 'Additional Notes', key: 'additionalNotes', width: 30 },
    { header: 'Student Signature Confirmed', key: 'studentSignature', width: 22 },
  ];

  const totalCols = columns.length;

  // Set column widths
  columns.forEach((col, i) => {
    const colNumber = i + 1;
    worksheet.getColumn(colNumber).width = col.width;
  });

  // Top Frozen Main Column Header (Row 1)
  const mainHeaderRow = worksheet.getRow(1);
  mainHeaderRow.height = 30;
  columns.forEach((col, idx) => {
    const cell = mainHeaderRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF3B82F6' } },
      left: { style: 'thin', color: { argb: 'FF3B82F6' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FF3B82F6' } },
    };
  });

  // Group sorted students by Testing Center (Alphabetical A–Z)
  const centerGroups = new Map<string, StudentRecord[]>();
  for (const s of sortedStudents) {
    const center = getTestingCenterName(s) || 'UNASSIGNED TESTING CENTER';
    if (!centerGroups.has(center)) {
      centerGroups.set(center, []);
    }
    centerGroups.get(center)!.push(s);
  }

  let currentRowNum = 2;
  let globalStudentIndex = 1;

  for (const [centerName, groupStudents] of centerGroups.entries()) {
    // Optional spacing row before next testing center section (if not the first section)
    if (currentRowNum > 2) {
      const spacerRow = worksheet.getRow(currentRowNum);
      spacerRow.height = 10;
      currentRowNum++;
    }

    // SECTION HEADER ROW: Highlighted across the entire width of the table
    worksheet.mergeCells(currentRowNum, 1, currentRowNum, totalCols);
    const sectionHeaderRow = worksheet.getRow(currentRowNum);
    sectionHeaderRow.height = 32;

    const bannerCell = sectionHeaderRow.getCell(1);
    bannerCell.value = `📍  ${centerName.toUpperCase()}   —   [ TESTING CENTER  •  ${groupStudents.length} ${
      groupStudents.length === 1 ? 'APPLICANT' : 'APPLICANTS'
    } ]`;
    bannerCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    bannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Deep institutional navy
    bannerCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    bannerCell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF3B82F6' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FF3B82F6' } },
    };
    currentRowNum++;

    // Section Sub-Header Row (Matching user example: No. | Admission Status | Status / Remarks | LRN | Last Name | First Name ...)
    const subHeaderRow = worksheet.getRow(currentRowNum);
    subHeaderRow.height = 24;
    columns.forEach((col, cIdx) => {
      const cell = subHeaderRow.getCell(cIdx + 1);
      cell.value = col.header;
      cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Slate-800 contrast
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF334155' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        bottom: { style: 'thin', color: { argb: 'FF0F172A' } },
        right: { style: 'thin', color: { argb: 'FF334155' } },
      };
    });
    currentRowNum++;

    // Output student rows for this Testing Center
    groupStudents.forEach((s, sIdx) => {
      const bDate = s.birthdate || s.birthday || '';
      let formattedBirthday = bDate;
      if (bDate && bDate.includes('-')) {
        const parts = bDate.split('-');
        if (parts.length === 3) {
          formattedBirthday = `${parts[1]}/${parts[2]}/${parts[0]}`;
        }
      }

      let siblingsSummary = '';
      if (Array.isArray(s.siblings) && s.siblings.length > 0) {
        siblingsSummary = s.siblings
          .map(
            (sib, i) =>
              `${i + 1}. ${sib.name || 'Unnamed'} (${sib.age ? `${sib.age}yo` : 'Age N/A'}) ${
                sib.remarks ? `- ${sib.remarks}` : ''
              }`
          )
          .join('; ');
      } else if (s.numSiblings) {
        siblingsSummary = `${s.numSiblings} sibling(s) indicated`;
      }

      const calculatedAge = (() => {
        const b = s.birthdate || s.birthday;
        if (b) {
          const calc = calculateAgeFromBirthdate(b);
          if (calc !== null) return calc;
        }
        return s.age !== undefined && s.age !== null && s.age !== '' ? Number(s.age) || s.age : '';
      })();

      const resolvedStatus = resolveAdmissionStatus(s);

      const values = [
        globalStudentIndex, // Col 1: No.
        resolvedStatus, // Col 2: Admission Status (Passed -> Conditional -> Pending -> Failed)
        s.remarks || (resolvedStatus === 'Passed' ? 'Passed' : resolvedStatus), // Col 3: Status / Remarks
        String(s.lrn || '').trim(), // Col 4: LRN (12 Digits)
        (s.lastName || s.surname || '').trim(), // Col 5: Last Name / Surname
        (s.firstName || '').trim(), // Col 6: First Name
        (s.middleName || '').trim(), // Col 7: Middle Name
        formattedBirthday, // Col 8: Birthdate
        calculatedAge, // Col 9: Age
        s.gender || 'Female', // Col 10: Gender
        s.sitioStreet || '', // Col 11: Sitio / Street
        s.barangay || '', // Col 12: Barangay
        s.municipality || '', // Col 13: Municipality / City
        s.province || '', // Col 14: Province
        s.address || '', // Col 15: Full Home Address
        s.elementarySchool || s.school || '', // Col 16: Elementary School
        s.schoolAddress || '', // Col 17: School Address
        s.reportCardSy || '', // Col 18: Report Card (SY)
        s.grading || '', // Col 19: Grading Period
        s.currentGrade || 'Grade 6', // Col 20: Current Grade
        s.oldGraduateRemarks || '', // Col 21: Old Graduate Remarks
        s.fatherName || '', // Col 22: Father's Full Name
        s.fatherOccupation || '', // Col 23: Father's Occupation
        s.fatherAge !== undefined && s.fatherAge !== null ? String(s.fatherAge) : '', // Col 24: Father's Age
        s.motherName || '', // Col 25: Mother's Full Name
        s.motherOccupation || '', // Col 26: Mother's Occupation
        s.motherAge !== undefined && s.motherAge !== null ? String(s.motherAge) : '', // Col 27: Mother's Age
        s.guardianName || '', // Col 28: Guardian's Full Name
        s.guardianRelation || '', // Col 29: Guardian's Relationship
        s.guardianOccupation || '', // Col 30: Guardian's Occupation
        s.guardianAge !== undefined && s.guardianAge !== null ? String(s.guardianAge) : '', // Col 31: Guardian's Age
        s.cellphoneNumber || '', // Col 32: Cellphone Number
        s.cellphoneOwner || '', // Col 33: Cellphone Owner
        s.messengerAccount || '', // Col 34: Messenger Account
        s.messengerOwner || '', // Col 35: Messenger Owner
        s.documentsSubmitted && s.documentsSubmitted.length > 0
          ? s.documentsSubmitted.join(', ')
          : s.birthCertificatePsa || '', // Col 36: Documents Submitted
        s.psaFatherNameAge || '', // Col 37: PSA Father's Name & Age
        s.fatherReligion || '', // Col 38: Father's Religion
        s.psaMotherNameAge || '', // Col 39: PSA Mother's Name & Age
        s.motherReligion || '', // Col 40: Mother's Religion
        s.birthOrder || 1, // Col 41: Birth Order
        s.numberOfChildren || (s.numSiblings ? Number(s.numSiblings) + 1 : 1), // Col 42: Number of Children
        s.baptizedCatholic || 'Yes', // Col 43: Baptized Catholic
        s.denomination || '', // Col 44: Other Denomination
        s.confirmedCatholic || 'Yes', // Col 45: Confirmed Catholic
        siblingsSummary, // Col 46: Siblings Breakdown
        s.parishPlace || '', // Col 47: Parish / Place
        s.parishPriest || '', // Col 48: Parish Priest
        typeof s.examScore === 'number' ? s.examScore : Number(s.examScore) || 0, // Col 49: Exam Score
        s.healthStatus || 'Normal / Fit for schooling', // Col 50: Health Status
        s.testingCenterProvince === 'Others'
          ? s.testingCenterProvinceOther || 'Others'
          : s.testingCenterProvince || '', // Col 51: Testing Center Province
        s.testingCenterLocation || '', // Col 52: Testing Center Location
        s.additionalNotes || '', // Col 53: Additional Notes
        s.studentSignature || 'Signed / Confirmed', // Col 54: Student Signature Confirmed
      ];

      const row = worksheet.getRow(currentRowNum);
      row.height = 22;

      const isEven = sIdx % 2 === 0;
      const rowBgArgb = isEven ? 'FFFFFFFF' : 'FFF8FAFC'; // Clean zebra striping

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

        // Col 1: No.
        if (colIdx === 0) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.numFmt = '#,##0';
        }
        // Col 2: Admission Status (Passed -> Conditional -> Pending -> Failed)
        else if (colIdx === 1) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (val === 'Passed') {
            cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF166534' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
          } else if (val === 'Conditional') {
            cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF0369A1' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
          } else if (val === 'Failed') {
            cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF991B1B' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          } else {
            // Pending
            cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF92400E' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
          }
        }
        // Col 3: Status / Remarks
        else if (colIdx === 2) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (val === 'A - PASS' || val === 'Passed') {
            cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF166534' } };
          } else if (val === 'Failed') {
            cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF991B1B' } };
          } else {
            cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF92400E' } };
          }
        }
        // Col 4: LRN (String format @)
        else if (colIdx === 3) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.numFmt = '@';
        }
        // Col 5: Last Name / Surname (Bold for clear scannability)
        else if (colIdx === 4) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
        }
        // Col 8: Birthdate
        else if (colIdx === 7) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        // Col 9: Age
        else if (colIdx === 8) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        }
        // Col 10: Gender
        else if (colIdx === 9) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        // Col 18: Report Card SY, Col 19: Grading, Col 20: Current Grade
        else if (colIdx === 17 || colIdx === 18 || colIdx === 19) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        // Col 32: Cellphone Number
        else if (colIdx === 31) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.numFmt = '@';
        }
        // Col 41: Birth Order, Col 42: Number of Children
        else if (colIdx === 40 || colIdx === 41) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        }
        // Col 43: Baptized, Col 45: Confirmed
        else if (colIdx === 42 || colIdx === 44) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        // Col 49: Exam Score
        else if (colIdx === 48) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
        }
        // Col 54: Signature
        else if (colIdx === 53) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });

      currentRowNum++;
      globalStudentIndex++;
    });
  }

  // 2. Summary by Origin Schools Sheet (Companion tab for demographic reporting)
  const summarySheet = workbook.addWorksheet('Schools Summary', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }],
  });

  const sumHeaders = [
    { header: 'No.', width: 7 },
    { header: 'Elementary School Name', width: 38 },
    { header: 'Total Applicants', width: 18 },
    { header: 'Passed', width: 14 },
    { header: 'Conditional', width: 14 },
    { header: 'Pending', width: 14 },
    { header: 'Failed', width: 14 },
    { header: 'Passing Rate (%)', width: 18 },
  ];

  sumHeaders.forEach((h, idx) => {
    summarySheet.getColumn(idx + 1).width = h.width;
  });

  const sumHeaderRow = summarySheet.getRow(1);
  sumHeaderRow.height = 30;
  sumHeaders.forEach((h, idx) => {
    const cell = sumHeaderRow.getCell(idx + 1);
    cell.value = h.header;
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { horizontal: idx === 1 ? 'left' : 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF3B82F6' } },
      left: { style: 'thin', color: { argb: 'FF3B82F6' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FF3B82F6' } },
    };
  });

  const schoolMap: Record<
    string,
    { total: number; passed: number; conditional: number; pending: number; failed: number }
  > = {};

  sortedStudents.forEach((s) => {
    const sch = s.elementarySchool?.trim() || s.school?.trim() || 'Unspecified School';
    if (!schoolMap[sch]) {
      schoolMap[sch] = { total: 0, passed: 0, conditional: 0, pending: 0, failed: 0 };
    }
    schoolMap[sch].total += 1;
    const st = resolveAdmissionStatus(s);
    if (st === 'Passed') schoolMap[sch].passed += 1;
    else if (st === 'Conditional') schoolMap[sch].conditional += 1;
    else if (st === 'Failed') schoolMap[sch].failed += 1;
    else schoolMap[sch].pending += 1;
  });

  let sumRowIdx = 2;
  Object.entries(schoolMap)
    .sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]))
    .forEach(([schName, counts], idx) => {
      const row = summarySheet.getRow(sumRowIdx);
      row.height = 22;
      const rate = counts.total > 0 ? Math.round((counts.passed / counts.total) * 100) : 0;
      const isEven = idx % 2 === 0;
      const rowBgArgb = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

      const rowValues = [
        idx + 1,
        schName,
        counts.total,
        counts.passed,
        counts.conditional,
        counts.pending,
        counts.failed,
        `${rate}%`,
      ];

      rowValues.forEach((val, cIdx) => {
        const cell = row.getCell(cIdx + 1);
        cell.value = val;
        cell.font = { name: 'Calibri', size: 9.5 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgArgb } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        if (cIdx === 0 || cIdx >= 2) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (cIdx === 0 || (cIdx >= 2 && cIdx <= 6)) {
            cell.numFmt = '#,##0';
          }
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
        }
      });
      sumRowIdx++;
    });

  // Generate file and trigger download
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
