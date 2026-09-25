import ExcelJS from 'exceljs';
import { StudentRecord } from '../src/types.js';
import { calculateAgeFromBirthdate } from '../src/lib/dateUtils.js';
import { sortStudents, getTestingCenterName, resolveAdmissionStatus } from '../src/lib/studentSorting.js';

export async function generateStudentRecordsExcel(students: StudentRecord[]): Promise<Buffer> {
  // Always sort students using exact required hierarchy:
  // 1. PRIMARY: Testing Center / Place (A–Z)
  // 2. SECONDARY: Admission Status (Passed -> Conditional -> Pending -> Failed)
  // 3. TERTIARY: Student Name (Last Name / Surname, then First Name A–Z)
  const sortedStudents = sortStudents(students, 'testingCenter', 'asc');

  const schoolName = 'Sisters of Mary of Banneux, Inc.';
  const workbook = new ExcelJS.Workbook();
  workbook.creator = schoolName;
  workbook.lastModifiedBy = `${schoolName} – Recruitment System`;
  workbook.created = new Date();
  workbook.title = `${schoolName} - Student Recruitment Records`;
  workbook.subject = 'Official Student Recruitment Records';
  workbook.company = schoolName;

  // Single organized worksheet with frozen header row and clearly highlighted Testing Center sections
  const worksheet = workbook.addWorksheet('Recruitment Records', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }],
  });

  worksheet.headerFooter.oddHeader = `&C&B${schoolName}&B\nOfficial Student Recruitment Personal Information Records`;
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
    { header: 'Old Graduate Remarks', key: 'oldGraduateRemarks', width: 32 },
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
    bannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    bannerCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    bannerCell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF3B82F6' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FF3B82F6' } },
    };
    currentRowNum++;

    // Section Sub-Header Row
    const subHeaderRow = worksheet.getRow(currentRowNum);
    subHeaderRow.height = 24;
    columns.forEach((col, cIdx) => {
      const cell = subHeaderRow.getCell(cIdx + 1);
      cell.value = col.header;
      cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF334155' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        bottom: { style: 'thin', color: { argb: 'FF0F172A' } },
        right: { style: 'thin', color: { argb: 'FF334155' } },
      };
    });
    currentRowNum++;

    // Student Rows for this Testing Center
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
        globalStudentIndex,
        resolvedStatus,
        s.remarks || (resolvedStatus === 'Passed' ? 'Passed' : resolvedStatus),
        String(s.lrn || '').trim(),
        (s.lastName || s.surname || '').trim(),
        (s.firstName || '').trim(),
        (s.middleName || '').trim(),
        formattedBirthday,
        calculatedAge,
        s.gender || 'Female',
        s.sitioStreet || '',
        s.barangay || '',
        s.municipality || '',
        s.province || '',
        s.address || '',
        s.elementarySchool || s.school || '',
        s.schoolAddress || '',
        s.reportCardSy || '',
        s.grading || '',
        s.currentGrade || 'Grade 6',
        s.oldGraduateRemarks || '',
        s.fatherName || '',
        s.fatherOccupation || '',
        s.fatherAge !== undefined && s.fatherAge !== null ? String(s.fatherAge) : '',
        s.motherName || '',
        s.motherOccupation || '',
        s.motherAge !== undefined && s.motherAge !== null ? String(s.motherAge) : '',
        s.guardianName || '',
        s.guardianRelation || '',
        s.guardianOccupation || '',
        s.guardianAge !== undefined && s.guardianAge !== null ? String(s.guardianAge) : '',
        s.cellphoneNumber || '',
        s.cellphoneOwner || '',
        s.messengerAccount || '',
        s.messengerOwner || '',
        s.documentsSubmitted && s.documentsSubmitted.length > 0
          ? s.documentsSubmitted.join(', ')
          : s.birthCertificatePsa || '',
        s.psaFatherNameAge || '',
        s.fatherReligion || '',
        s.psaMotherNameAge || '',
        s.motherReligion || '',
        s.birthOrder || 1,
        s.numberOfChildren || (s.numSiblings ? Number(s.numSiblings) + 1 : 1),
        s.baptizedCatholic || 'Yes',
        s.denomination || '',
        s.confirmedCatholic || 'Yes',
        siblingsSummary,
        s.parishPlace || '',
        s.parishPriest || '',
        typeof s.examScore === 'number' ? s.examScore : Number(s.examScore) || 0,
        s.healthStatus || 'Normal / Fit for schooling',
        s.testingCenterProvince === 'Others'
          ? s.testingCenterProvinceOther || 'Others'
          : s.testingCenterProvince || '',
        s.testingCenterLocation || '',
        s.additionalNotes || '',
        s.studentSignature || 'Signed / Confirmed',
      ];

      const row = worksheet.getRow(currentRowNum);
      row.height = 22;

      const isEven = sIdx % 2 === 0;
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

        if (colIdx === 0) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.numFmt = '#,##0';
        } else if (colIdx === 1) {
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
            cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF92400E' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
          }
        } else if (colIdx === 2) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (val === 'A - PASS' || val === 'Passed') {
            cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF166534' } };
          } else if (val === 'Failed') {
            cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF991B1B' } };
          } else {
            cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF92400E' } };
          }
        } else if (colIdx === 3) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.numFmt = '@';
        } else if (colIdx === 4) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
        } else if (colIdx === 7) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colIdx === 8) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        } else if (colIdx === 9) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colIdx === 17 || colIdx === 18 || colIdx === 19) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colIdx === 31) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.numFmt = '@';
        } else if (colIdx === 40 || colIdx === 41) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        } else if (colIdx === 42 || colIdx === 44) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colIdx === 48) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
        } else if (colIdx === 53) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });

      currentRowNum++;
      globalStudentIndex++;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
