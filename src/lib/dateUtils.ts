/**
 * Date and Age calculation utilities.
 */

/**
 * Calculates accurate age based on complete Date of Birth (month, day, and year)
 * compared to current date (or reference date).
 *
 * Example:
 * - Date of Birth: November 3, 2007
 * - Current Date: September 17, 2026
 * - Correct Age: 18, because the applicant has not had their birthday yet in 2026.
 */
export function calculateAgeFromBirthdate(
  birthdateInput: string | Date | null | undefined,
  referenceDate: Date = new Date()
): number | null {
  if (!birthdateInput) return null;

  let birthYear: number | undefined;
  let birthMonth: number | undefined; // 1-12
  let birthDay: number | undefined; // 1-31

  if (birthdateInput instanceof Date) {
    if (isNaN(birthdateInput.getTime())) return null;
    birthYear = birthdateInput.getFullYear();
    birthMonth = birthdateInput.getMonth() + 1;
    birthDay = birthdateInput.getDate();
  } else {
    const raw = String(birthdateInput).trim();
    if (!raw) return null;

    // Format 1: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    const isoMatch = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (isoMatch) {
      birthYear = parseInt(isoMatch[1], 10);
      birthMonth = parseInt(isoMatch[2], 10);
      birthDay = parseInt(isoMatch[3], 10);
    } else {
      // Format 2: MM/DD/YYYY or MM-DD-YYYY or DD/MM/YYYY
      const slashMatch = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
      if (slashMatch) {
        const p1 = parseInt(slashMatch[1], 10);
        const p2 = parseInt(slashMatch[2], 10);
        const p3 = parseInt(slashMatch[3], 10);
        birthYear = p3;
        // If p1 > 12, then it must be DD/MM/YYYY
        if (p1 > 12 && p2 <= 12) {
          birthMonth = p2;
          birthDay = p1;
        } else {
          // Standard MM/DD/YYYY
          birthMonth = p1;
          birthDay = p2;
        }
      } else {
        // Format 3: Month name, e.g. "November 3, 2007" or "Nov 3, 2007" or "3 Nov 2007"
        const monthMap: Record<string, number> = {
          jan: 1, january: 1, enero: 1,
          feb: 2, february: 2, pebrero: 2,
          mar: 3, march: 3, marso: 3,
          apr: 4, april: 4, abril: 4,
          may: 5, mayo: 5,
          jun: 6, june: 6, hunyo: 6,
          jul: 7, july: 7, hulyo: 7,
          aug: 8, august: 8, agosto: 8,
          sep: 9, sept: 9, september: 9, setyembre: 9,
          oct: 10, october: 10, oktubre: 10,
          nov: 11, november: 11, nobyembre: 11,
          dec: 12, december: 12, disyembre: 12,
        };

        const wordMatch = raw.match(/([a-zA-Z]+)[,\s.-]+(\d{1,2})[,\s.-]+(\d{4})/i) ||
                          raw.match(/(\d{1,2})[,\s.-]+([a-zA-Z]+)[,\s.-]+(\d{4})/i);
        if (wordMatch) {
          let monthStr = '';
          let dayNum = 1;
          let yearNum = 2000;

          if (isNaN(Number(wordMatch[1]))) {
            monthStr = wordMatch[1].toLowerCase();
            dayNum = parseInt(wordMatch[2], 10);
            yearNum = parseInt(wordMatch[3], 10);
          } else {
            dayNum = parseInt(wordMatch[1], 10);
            monthStr = wordMatch[2].toLowerCase();
            yearNum = parseInt(wordMatch[3], 10);
          }

          const mPrefix = monthStr.substring(0, 3);
          const foundMonth = monthMap[monthStr] || monthMap[mPrefix];
          if (foundMonth && yearNum > 1900 && yearNum < 2100) {
            birthYear = yearNum;
            birthMonth = foundMonth;
            birthDay = dayNum;
          } else {
            const parsed = new Date(raw);
            if (isNaN(parsed.getTime())) return null;
            birthYear = parsed.getFullYear();
            birthMonth = parsed.getMonth() + 1;
            birthDay = parsed.getDate();
          }
        } else {
          const parsed = new Date(raw);
          if (isNaN(parsed.getTime())) return null;
          birthYear = parsed.getFullYear();
          birthMonth = parsed.getMonth() + 1;
          birthDay = parsed.getDate();
        }
      }
    }
  }

  if (
    birthYear === undefined ||
    birthMonth === undefined ||
    birthDay === undefined ||
    isNaN(birthYear) ||
    isNaN(birthMonth) ||
    isNaN(birthDay)
  ) {
    return null;
  }

  if (birthMonth < 1 || birthMonth > 12 || birthDay < 1 || birthDay > 31 || birthYear < 1900) {
    return null;
  }

  const today = referenceDate;
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentDay = today.getDate(); // 1-31

  let calculatedAge = currentYear - birthYear;

  // Complete Date of Birth check:
  // If the applicant has not had their birthday yet in the current year,
  // (current month is before birth month, OR current month is same as birth month but current day is before birth day),
  // subtract 1 from the year difference.
  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
    calculatedAge--;
  }

  if (calculatedAge >= 0 && calculatedAge < 120) {
    return calculatedAge;
  }

  return null;
}

/**
 * Formats an ISO date string (YYYY-MM-DD) or other date string into MM/DD/YYYY.
 */
export function formatToMmDdYyyy(inputDate: string | null | undefined): string {
  if (!inputDate) return '';
  const raw = String(inputDate).trim();
  if (!raw) return '';

  // Already MM/DD/YYYY?
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    return raw;
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = String(isoMatch[2]).padStart(2, '0');
    const d = String(isoMatch[3]).padStart(2, '0');
    return `${m}/${d}/${y}`;
  }

  // MM-DD-YYYY or M/D/YYYY
  const slashMatch = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (slashMatch) {
    const m = String(slashMatch[1]).padStart(2, '0');
    const d = String(slashMatch[2]).padStart(2, '0');
    const y = slashMatch[3];
    return `${m}/${d}/${y}`;
  }

  // Fallback using Date parser
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    const y = parsed.getFullYear();
    return `${m}/${d}/${y}`;
  }

  return raw;
}

/**
 * Parses MM/DD/YYYY or M/D/YYYY into ISO YYYY-MM-DD.
 */
export function parseMmDdYyyyToIso(mmDdYyyy: string): string {
  if (!mmDdYyyy) return '';
  const clean = mmDdYyyy.trim();
  const match = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return '';

  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    return '';
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

