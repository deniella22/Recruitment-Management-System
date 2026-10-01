/**
 * School Year (SY) and Report Card SY calculation utilities.
 * 
 * Rules:
 * - Philippine school-year convention:
 *   If the student graduated Grade 6 in calendar year YYYY:
 *   Report Card SY = SY (YYYY-1)-(YYYY)
 *   Examples:
 *   - Graduation Year 2025 -> SY 2024-2025
 *   - Graduation Year 2024 -> SY 2023-2024
 *   - Graduation Year 2023 -> SY 2022-2023
 *   - Graduation Year 2022 -> SY 2021-2022
 * 
 * - Regular/Current Grade 6 Applicant:
 *   Grade 6 Report Card corresponds to the school year immediately preceding the recruitment School Year.
 *   - Recruitment SY 2025-2026 -> regular applicant Report Card SY = SY 2024-2025
 *   - Recruitment SY 2026-2027 -> regular applicant Report Card SY = SY 2025-2026
 *   - Recruitment SY 2027-2028 -> regular applicant Report Card SY = SY 2026-2027
 * 
 * - Old Graduate:
 *   Uses the student's actual Grade 6 graduation year.
 *   - Graduated Grade 6 in 2024 -> SY 2023-2024
 *   - Graduated Grade 6 in 2023 -> SY 2022-2023
 *   - Graduated Grade 6 in 2022 -> SY 2021-2022
 */

/**
 * Safely extracts a 4-digit elementary graduation year from old graduate remarks.
 * Handles inputs like:
 * - "2023", "2024"
 * - "Graduated 2023", "Graduated in 2024"
 * - "Old graduate - 2023", "Old graduate (2022)"
 * - "SY 2023-2024" -> completion year 2024
 * - "Graduated 2023, applied 2025" -> 2023
 * - Blank, "N/A", "Transferee" without year -> null
 * - Never extracts unrelated numbers (e.g. LRN, phone number, age, address).
 */
export function extractGraduationYearFromRemarks(remarks: string | undefined | null): number | null {
  if (!remarks || typeof remarks !== 'string') return null;
  const text = remarks.trim();
  if (!text) return null;

  // 1. Check if the text contains a school year range like "2023-2024" or "2023–2024" or "2023/2024"
  const rangeMatch = text.match(/(?<!\d)(19\d{2}|20\d{2})\s*[-–/]\s*(19\d{2}|20\d{2})(?!\d)/);
  if (rangeMatch) {
    const y1 = parseInt(rangeMatch[1], 10);
    const y2 = parseInt(rangeMatch[2], 10);
    if (y1 >= 1990 && y1 <= 2050 && y2 >= 1990 && y2 <= 2050) {
      if (y2 === y1 + 1 || y2 >= y1) {
        return y2;
      }
    }
  }

  // 2. Check for keyword-adjacent year: e.g. "graduated 2023", "grad 2024", "batch 2022", "year 2021"
  const keywordMatch = text.match(/(?:graduat\w*|batch|elem\w*|class of|year|yr)\s*(?:in|of|:|-|\s)*\s*(?<!\d)(19[9]\d|20[0-5]\d)(?!\d)/i);
  if (keywordMatch) {
    const y = parseInt(keywordMatch[1], 10);
    if (y >= 1990 && y <= 2050) {
      return y;
    }
  }

  // 3. Find standalone 4-digit years in reasonable range (1990 to 2050)
  // Ensure we do not extract from longer digit strings like an LRN (12 digits) or phone number
  const matches = [...text.matchAll(/(?<!\d)(19[9]\d|20[0-5]\d)(?!\d)/g)];
  if (matches.length > 0) {
    const years = matches.map((m) => parseInt(m[1], 10)).filter((y) => y >= 1990 && y <= 2050);
    if (years.length > 0) {
      return years[0];
    }
  }

  return null;
}

/**
 * Extracts the starting calendar year of a recruitment school year.
 * Examples:
 * - "SY 2026-2027 Recruitment" -> 2026
 * - "for SY 2027-2028" -> 2027
 * - "Recruitment SY 2025-2026" -> 2025
 * - "SY 2025–2026" -> 2025
 * - "2025-2026" -> 2025
 * - "Recruitment 2026" -> 2026
 */
export function extractRecruitmentStartYear(recruitmentNameOrYear: string | undefined | null): number | null {
  if (!recruitmentNameOrYear || typeof recruitmentNameOrYear !== 'string') return null;
  const text = recruitmentNameOrYear.trim();
  if (!text) return null;

  // Look for SY range like 2026-2027 or 2026–2027
  const rangeMatch = text.match(/(?<!\d)(19\d{2}|20\d{2})\s*[-–/]\s*(19\d{2}|20\d{2})(?!\d)/);
  if (rangeMatch) {
    const startYear = parseInt(rangeMatch[1], 10);
    if (startYear >= 1990 && startYear <= 2050) {
      return startYear;
    }
  }

  // Look for standalone 4-digit year
  const singleMatch = text.match(/(?<!\d)(19[9]\d|20[0-5]\d)(?!\d)/);
  if (singleMatch) {
    const year = parseInt(singleMatch[1], 10);
    if (year >= 1990 && year <= 2050) {
      return year;
    }
  }

  return null;
}

/**
 * Formats standard Report Card SY given the actual Grade 6 graduation year.
 * graduationYear = YYYY
 * reportCardStartYear = YYYY - 1
 * reportCardEndYear = YYYY
 * result = "SY ${reportCardStartYear}-${reportCardEndYear}"
 */
export function formatSchoolYearFromGraduationYear(graduationYear: number): string {
  const startYear = graduationYear - 1;
  const endYear = graduationYear;
  return `SY ${startYear}-${endYear}`;
}

export interface SchoolYearCalculationInput {
  oldGraduateRemarks?: string | null;
  recruitmentListName?: string | null;
  recruitmentSchoolYear?: string | null;
  currentGrade?: string | null;
  existingReportCardSy?: string | null;
}

/**
 * Determines the correct Report Card (SY) for a student following the priority rules:
 * PRIORITY 1: Explicit old-graduate / graduation-year value
 * PRIORITY 2: Normal/current Grade 6 applicant derived from recruitment School Year
 * PRIORITY 3: Preserve existing valid Report Card SY, or empty (never silently hardcodes SY 2024-2025)
 */
export function calculateReportCardSy(input: SchoolYearCalculationInput): string {
  // PRIORITY 1:
  // If the student has an explicit old-graduate / graduation-year value, use that actual graduation year.
  const gradYear = extractGraduationYearFromRemarks(input.oldGraduateRemarks);
  if (gradYear !== null) {
    return formatSchoolYearFromGraduationYear(gradYear);
  }

  // PRIORITY 2:
  // If the student is a normal/current Grade 6 applicant with no old-graduate year,
  // derive the Grade 6 Report Card SY from the recruitment School Year.
  const recStartYear =
    extractRecruitmentStartYear(input.recruitmentListName) ||
    extractRecruitmentStartYear(input.recruitmentSchoolYear);

  if (recStartYear !== null) {
    // Regular Grade 6 applicant graduates in recStartYear, so report card is SY (recStartYear - 1)-(recStartYear)
    return formatSchoolYearFromGraduationYear(recStartYear);
  }

  // PRIORITY 3:
  // If the system cannot determine the year reliably, preserve the existing value if one already exists.
  if (input.existingReportCardSy && typeof input.existingReportCardSy === 'string') {
    const existingClean = input.existingReportCardSy.trim();
    if (existingClean) {
      // Normalize format to "SY YYYY-YYYY" if it contains a valid year range
      const rangeMatch = existingClean.match(/(?<!\d)(19\d{2}|20\d{2})\s*[-–/]\s*(19\d{2}|20\d{2})(?!\d)/);
      if (rangeMatch) {
        return `SY ${rangeMatch[1]}-${rangeMatch[2]}`;
      }
      return existingClean;
    }
  }

  return '';
}

/**
 * Convenience helper to calculate a student's Report Card (SY) from student object.
 */
export function getStudentReportCardSy(
  student: {
    oldGraduateRemarks?: string;
    othersSpecify?: string;
    currentGrade?: string;
    reportCardSy?: string;
    reportCard?: string;
    recruitmentListId?: string;
  },
  recruitmentListOrName?: { id?: string; name?: string } | string | null,
  fallbackAcademicYear?: string | null
): string {
  const remarks = student.oldGraduateRemarks || (student as any).othersSpecify || '';

  let recName: string | undefined = undefined;
  if (typeof recruitmentListOrName === 'string') {
    recName = recruitmentListOrName;
  } else if (recruitmentListOrName && typeof recruitmentListOrName === 'object') {
    recName = recruitmentListOrName.name;
  }

  return calculateReportCardSy({
    oldGraduateRemarks: remarks,
    recruitmentListName: recName,
    recruitmentSchoolYear: fallbackAcademicYear,
    currentGrade: student.currentGrade,
    existingReportCardSy: student.reportCardSy || student.reportCard,
  });
}
