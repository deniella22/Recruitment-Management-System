import ExcelJS from 'exceljs';
import { StudentRecord } from '../src/types.js';

export async function generateStudentRecordsExcel(students: StudentRecord[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sisters of Mary School';
  workbook.lastModifiedBy = 'Sisters of Mary School – Recruitment System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Recruitment Records', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  // Define complete columns matching the Official Recruitment Personal Information Form
  const columns = [
    { header: 'Status / Remarks', key: 'remarks', width: 16 },
    { header: 'LRN (12 Digits)', key: 'lrn', width: 16 },
    { header: 'Last Name / Surname', key: 'lastName', width: 20 },
    { header: 'First Name', key: 'firstName', width: 20 },
    { header: 'Middle Name', key: 'middleName', width: 18 },
    { header: 'Birthdate', key: 'birthdate', width: 14 },
    { header: 'Age', key: 'age', width: 8 },
    { header: 'Sex / Gender', key: 'gender', width: 12 },
    { header: 'Sitio / Street', key: 'sitioStreet', width: 22 },
    { header: 'Barangay', key: 'barangay', width: 18 },
    { header: 'Municipality / City', key: 'municipality', width: 20 },
    { header: 'Province', key: 'province', width: 18 },
    { header: 'Full Home Address', key: 'address', width: 32 },
    { header: 'Elementary School Graduated', key: 'elementarySchool', width: 28 },
    { header: 'School Address', key: 'schoolAddress', width: 24 },
    { header: 'Report Card (SY)', key: 'reportCardSy', width: 20 },
    { header: 'Grading Period', key: 'grading', width: 15 },
    { header: 'Current Grade', key: 'currentGrade', width: 15 },
    { header: 'Old Graduate Remarks', key: 'oldGraduateRemarks', width: 22 },
    { header: "Father's Full Name", key: 'fatherName', width: 22 },
    { header: "Father's Occupation", key: 'fatherOccupation', width: 20 },
    { header: "Mother's Full Name", key: 'motherName', width: 22 },
    { header: "Mother's Occupation", key: 'motherOccupation', width: 20 },
    { header: "Guardian's Full Name", key: 'guardianName', width: 22 },
    { header: "Guardian's Relationship", key: 'guardianRelation', width: 20 },
    { header: "Guardian's Occupation", key: 'guardianOccupation', width: 20 },
    { header: 'Cellphone Number', key: 'cellphoneNumber', width: 18 },
    { header: 'Cellphone Owner', key: 'cellphoneOwner', width: 18 },
    { header: 'Messenger Account', key: 'messengerAccount', width: 22 },
    { header: 'Messenger Owner', key: 'messengerOwner', width: 18 },
    { header: 'PSA Birth Certificate', key: 'birthCertificatePsa', width: 18 },
    { header: "PSA Father's Name & Age", key: 'psaFatherNameAge', width: 24 },
    { header: "Father's Religion", key: 'fatherReligion', width: 18 },
    { header: "PSA Mother's Name & Age", key: 'psaMotherNameAge', width: 24 },
    { header: "Mother's Religion", key: 'motherReligion', width: 18 },
    { header: 'Birth Order', key: 'birthOrder', width: 12 },
    { header: 'Number of Children', key: 'numberOfChildren', width: 16 },
    { header: 'Baptized Catholic', key: 'baptizedCatholic', width: 16 },
    { header: 'Other Denomination', key: 'denomination', width: 18 },
    { header: 'Confirmed Catholic', key: 'confirmedCatholic', width: 16 },
    { header: 'Siblings Breakdown', key: 'siblingsSummary', width: 36 },
    { header: 'Parish / Place', key: 'parishPlace', width: 22 },
    { header: 'Parish Priest', key: 'parishPriest', width: 22 },
    { header: 'Exam Score', key: 'examScore', width: 12 },
    { header: 'Health Status', key: 'healthStatus', width: 22 },
    { header: 'Additional Notes', key: 'additionalNotes', width: 28 },
    { header: 'Student Signature Confirmed', key: 'studentSignature', width: 22 },
  ];

  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  // Style Header Row (Row 1) - Classic Navy/Maroon Institutional Theme
  const headerRow = worksheet.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }, // Rich SMS Navy Blue #1E3A8A
    };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF3B82F6' } },
      left: { style: 'thin', color: { argb: 'FF3B82F6' } },
      bottom: { style: 'medium', color: { argb: 'FF172554' } },
      right: { style: 'thin', color: { argb: 'FF3B82F6' } },
    };
  });

  // Populate Student Rows
  students.forEach((s, idx) => {
    // Format Birthdate as MM/DD/YYYY
    const bDate = s.birthdate || s.birthday || '';
    let formattedBirthday = bDate;
    if (bDate && bDate.includes('-')) {
      const parts = bDate.split('-');
      if (parts.length === 3) {
        formattedBirthday = `${parts[1]}/${parts[2]}/${parts[0]}`;
      }
    }

    // Format siblings breakdown string
    let siblingsSummary = '';
    if (Array.isArray(s.siblings) && s.siblings.length > 0) {
      siblingsSummary = s.siblings
        .map((sib, i) => `${i + 1}. ${sib.name || 'Unnamed'} (${sib.age ? `${sib.age}yo` : 'Age N/A'}) ${sib.remarks ? `- ${sib.remarks}` : ''}`)
        .join('; ');
    } else if (s.numSiblings) {
      siblingsSummary = `${s.numSiblings} sibling(s) indicated`;
    }

    const row = worksheet.addRow({
      remarks: s.remarks || 'B - PENDING',
      lrn: String(s.lrn || '').trim(),
      lastName: s.lastName || s.surname || '',
      firstName: s.firstName || '',
      middleName: s.middleName || '',
      birthdate: formattedBirthday,
      age: s.age !== undefined && s.age !== null && s.age !== '' ? s.age : '',
      gender: s.gender || 'Female',
      sitioStreet: s.sitioStreet || '',
      barangay: s.barangay || '',
      municipality: s.municipality || '',
      province: s.province || '',
      address: s.address || '',
      elementarySchool: s.elementarySchool || s.school || '',
      schoolAddress: s.schoolAddress || '',
      reportCardSy: s.reportCardSy || '',
      grading: s.grading || '',
      currentGrade: s.currentGrade || 'Grade 6',
      oldGraduateRemarks: s.oldGraduateRemarks || '',
      fatherName: s.fatherName || '',
      fatherOccupation: s.fatherOccupation || '',
      motherName: s.motherName || '',
      motherOccupation: s.motherOccupation || '',
      guardianName: s.guardianName || '',
      guardianRelation: s.guardianRelation || '',
      guardianOccupation: s.guardianOccupation || '',
      cellphoneNumber: s.cellphoneNumber || '',
      cellphoneOwner: s.cellphoneOwner || '',
      messengerAccount: s.messengerAccount || '',
      messengerOwner: s.messengerOwner || '',
      birthCertificatePsa: s.birthCertificatePsa || '',
      psaFatherNameAge: s.psaFatherNameAge || '',
      fatherReligion: s.fatherReligion || '',
      psaMotherNameAge: s.psaMotherNameAge || '',
      motherReligion: s.motherReligion || '',
      birthOrder: s.birthOrder || 1,
      numberOfChildren: s.numberOfChildren || (s.numSiblings ? Number(s.numSiblings) + 1 : 1),
      baptizedCatholic: s.baptizedCatholic || 'Yes',
      denomination: s.denomination || '',
      confirmedCatholic: s.confirmedCatholic || 'Yes',
      siblingsSummary,
      parishPlace: s.parishPlace || '',
      parishPriest: s.parishPriest || '',
      examScore: typeof s.examScore === 'number' ? s.examScore : Number(s.examScore) || 0,
      healthStatus: s.healthStatus || 'Normal / Fit for schooling',
      additionalNotes: s.additionalNotes || '',
      studentSignature: s.studentSignature || 'Signed / Confirmed',
    });

    row.height = 22;

    const isEven = idx % 2 === 0;
    const bgArgb = isEven ? 'FFFFFFFF' : 'FFF8FAFC'; // Clean zebra striping

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1F2937' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgArgb },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Status column (col 1)
      if (colNumber === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (cell.value === 'A - PASS') {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
        } else {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB45309' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        }
      } else if (colNumber === 2) {
        // LRN column - strictly string format
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.numFmt = '@';
      } else if (colNumber === 6 || colNumber === 8 || colNumber === 36 || colNumber === 37) {
        // Birthdate, Gender, Birth Order, Number of Children
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNumber === 7 || colNumber === 44) {
        // Age & Exam Score
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      }
    });
  });

  // Enable Auto-Filter over the data range
  const lastRow = Math.max(students.length + 1, 2);
  worksheet.autoFilter = `A1:AV${lastRow}`;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
