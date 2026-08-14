import ExcelJS from 'exceljs';
import { StudentRecord } from '../src/types.js';

export async function generateStudentRecordsExcel(students: StudentRecord[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sisters of Mary School-Girlstown, Inc.';
  workbook.lastModifiedBy = 'Sisters of Mary School-Girlstown, Inc.';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Student Records', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  // Define exact 17 columns
  const columns = [
    { header: 'Surname', key: 'surname' },
    { header: 'Middle Name', key: 'middleName' },
    { header: 'First Name', key: 'firstName' },
    { header: 'Birthday', key: 'birthday' },
    { header: 'Address', key: 'address' },
    { header: "Father's Name", key: 'fatherName' },
    { header: "Mother's Name", key: 'motherName' },
    { header: "Guardian's Name", key: 'guardianName' },
    { header: 'Score in Exam', key: 'examScore' },
    { header: 'Remarks', key: 'remarks' },
    { header: 'Number of Siblings', key: 'numSiblings' },
    { header: 'LRN', key: 'lrn' },
    { header: "Father's Occupation", key: 'fatherOccupation' },
    { header: "Mother's Occupation", key: 'motherOccupation' },
    { header: "Guardian's Occupation", key: 'guardianOccupation' },
    { header: 'Name of Elementary School', key: 'elementarySchool' },
    { header: 'Health Status', key: 'healthStatus' },
  ];

  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
  }));

  // Style Header Row (Row 1)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
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
      fgColor: { argb: 'FF691B23' }, // Maroon #691B23
    };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF8B222C' } },
      left: { style: 'thin', color: { argb: 'FF8B222C' } },
      bottom: { style: 'medium', color: { argb: 'FF4D1319' } },
      right: { style: 'thin', color: { argb: 'FF8B222C' } },
    };
  });

  // Populate Student Rows
  students.forEach((s, idx) => {
    // Format Birthday as MM/DD/YYYY
    let formattedBirthday = s.birthday;
    if (s.birthday) {
      const parts = s.birthday.split('-');
      if (parts.length === 3) {
        // YYYY-MM-DD -> MM/DD/YYYY
        formattedBirthday = `${parts[1]}/${parts[2]}/${parts[0]}`;
      }
    }

    const row = worksheet.addRow({
      surname: s.surname || '',
      middleName: s.middleName || '',
      firstName: s.firstName || '',
      birthday: formattedBirthday,
      address: s.address || '',
      fatherName: s.fatherName || '',
      motherName: s.motherName || '',
      guardianName: s.guardianName || '',
      examScore: typeof s.examScore === 'number' ? s.examScore : Number(s.examScore) || 0,
      remarks: s.remarks || 'B - PENDING',
      numSiblings: typeof s.numSiblings === 'number' ? s.numSiblings : Number(s.numSiblings) || 0,
      lrn: String(s.lrn || '').trim(), // Ensure string so Excel does NOT format as scientific
      fatherOccupation: s.fatherOccupation || '',
      motherOccupation: s.motherOccupation || '',
      guardianOccupation: s.guardianOccupation || '',
      elementarySchool: s.elementarySchool || '',
      healthStatus: s.healthStatus || '',
    });

    row.height = 22;

    const isEven = idx % 2 === 0;
    const bgArgb = isEven ? 'FFFFFFFF' : 'FFFDF8F8'; // Subtle zebra striping

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1F2937' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgArgb },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };

      // Alignment and types
      if (colNumber === 9 || colNumber === 11) {
        // Exam Score & Num Siblings
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      } else if (colNumber === 4) {
        // Birthday
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNumber === 10) {
        // Remarks
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (cell.value === 'A - PASS') {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } };
        } else {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB45309' } };
        }
      } else if (colNumber === 12) {
        // LRN
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.numFmt = '@'; // Force text format
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      }
    });
  });

  // Calculate Column Widths
  columns.forEach((col, i) => {
    const colNumber = i + 1;
    const worksheetColumn = worksheet.getColumn(colNumber);

    let maxLength = col.header.length;
    students.forEach((s) => {
      let val = '';
      switch (col.key) {
        case 'surname': val = s.surname; break;
        case 'middleName': val = s.middleName; break;
        case 'firstName': val = s.firstName; break;
        case 'birthday': val = s.birthday; break;
        case 'address': val = s.address; break;
        case 'fatherName': val = s.fatherName; break;
        case 'motherName': val = s.motherName; break;
        case 'guardianName': val = s.guardianName; break;
        case 'examScore': val = String(s.examScore); break;
        case 'remarks': val = s.remarks; break;
        case 'numSiblings': val = String(s.numSiblings); break;
        case 'lrn': val = String(s.lrn); break;
        case 'fatherOccupation': val = s.fatherOccupation; break;
        case 'motherOccupation': val = s.motherOccupation; break;
        case 'guardianOccupation': val = s.guardianOccupation; break;
        case 'elementarySchool': val = s.elementarySchool; break;
        case 'healthStatus': val = s.healthStatus; break;
      }
      if (val && val.length > maxLength) {
        maxLength = val.length;
      }
    });

    worksheetColumn.width = Math.min(Math.max(maxLength + 4, 15), 36);
  });

  // Enable Auto-Filter over the data range
  const lastRow = Math.max(students.length + 1, 2);
  worksheet.autoFilter = `A1:Q${lastRow}`;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
