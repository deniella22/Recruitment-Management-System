import { StudentRecord, AdmissionStatus, OCRCorrectionRecord, ConfidenceLevel } from '../src/types.js';

// Common Filipino and International Occupations, General Terms & Health conditions
const OCCUPATION_DICTIONARY: Record<string, string> = {
  fonitures: 'Furniture Maker',
  foniture: 'Furniture Maker',
  furnitures: 'Furniture',
  furnitur: 'Furniture',
  studnt: 'Student',
  studdent: 'Student',
  studet: 'Student',
  admissoin: 'Admission',
  admissin: 'Admission',
  admision: 'Admission',
  recieve: 'Receive',
  recieved: 'Received',
  carpentcr: 'Carpenter',
  carpentr: 'Carpenter',
  carpentero: 'Carpenter',
  carpanter: 'Carpenter',
  electrisian: 'Electrician',
  electrisyan: 'Electrician',
  electrisn: 'Electrician',
  drvier: 'Driver',
  driber: 'Driver',
  drivr: 'Driver',
  seamstrss: 'Seamstress',
  seamstres: 'Seamstress',
  mananahi: 'Seamstress',
  sewr: 'Sewer',
  sewer: 'Sewer',
  merchnt: 'Merchant',
  marchant: 'Merchant',
  tindera: 'Vendor / Tindera',
  tindero: 'Vendor / Tindero',
  housewie: 'Housewife',
  houswife: 'Housewife',
  housewyf: 'Housewife',
  housewfe: 'Housewife',
  housekeepr: 'Housekeeper',
  fishermn: 'Fisherman',
  fissherman: 'Fisherman',
  mangingisda: 'Fisherman',
  vendr: 'Vendor',
  vender: 'Vendor',
  factry: 'Factory Worker',
  faktory: 'Factory Worker',
  securty: 'Security Guard',
  sekuridad: 'Security Guard',
  mechanik: 'Mechanic',
  mekaniko: 'Mechanic',
  mecanic: 'Mechanic',
  weldr: 'Welder',
  weldor: 'Welder',
  labrer: 'Laborer',
  labourer: 'Laborer',
  frmer: 'Farmer',
  magsasaka: 'Farmer',
  plumbr: 'Plumber',
  bkr: 'Baker',
  bakr: 'Baker',
  cleanr: 'Cleaner',
  janitr: 'Janitor',
  unemployd: 'Unemployed',
  'walang trabaho': 'Unemployed',
  deceasd: 'Deceased',
  'patay na': 'Deceased',
  ofw: 'OFW',
  'o.f.w': 'OFW',
  'o.f.w.': 'OFW',
};

const PHRASE_CORRECTIONS: Array<{ pattern: RegExp; replacement: string; reason: string }> = [
  { pattern: /\btricycle\s+drvi?er\b/gi, replacement: 'Tricycle Driver', reason: 'Common OCR misspelling for "Tricycle Driver"' },
  { pattern: /\bjeepney\s+drvi?er\b/gi, replacement: 'Jeepney Driver', reason: 'Common OCR misspelling for "Jeepney Driver"' },
  { pattern: /\bbus\s+drvi?er\b/gi, replacement: 'Bus Driver', reason: 'Common OCR misspelling for "Bus Driver"' },
  { pattern: /\bhousewi[fe|e]{1,3}\s*\/?\s*sew[er|r]{1,2}\b/gi, replacement: 'Housewife / Sewer', reason: 'Corrected compound occupation' },
  { pattern: /\bstore\s+vend[or|er]{1,2}\b/gi, replacement: 'Store Vendor', reason: 'Corrected "Store Vendor"' },
  { pattern: /\bstreet\s+vend[or|er]{1,2}\b/gi, replacement: 'Street Vendor', reason: 'Corrected "Street Vendor"' },
  { pattern: /\bmarket\s+vend[or|er]{1,2}\b/gi, replacement: 'Market Vendor', reason: 'Corrected "Market Vendor"' },
  { pattern: /\bconstra?ction\s+lab[or|ur]{1,2}er\b/gi, replacement: 'Construction Laborer', reason: 'Corrected "Construction Laborer"' },
  { pattern: /\bfact[o|r]{1,2}y\s+work[er|r]{1,2}\b/gi, replacement: 'Factory Worker', reason: 'Corrected "Factory Worker"' },
  { pattern: /\bsecur[i|t]{1,2}y\s+guard\b/gi, replacement: 'Security Guard', reason: 'Corrected "Security Guard"' },
  { pattern: /\bfonitures?\s*maker\b/gi, replacement: 'Furniture Maker', reason: 'Corrected "Furniture Maker"' },
  { pattern: /\bsari[- ]?sari\s+store\s+own[er|r]{1,2}\b/gi, replacement: 'Sari-Sari Store Owner', reason: 'Standardized Sari-Sari Store Owner' },
  { pattern: /\bkasambahay\b/gi, replacement: 'Domestic Helper / Kasambahay', reason: 'Standardized occupation' },
];

export function getLevenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: an + 1 }, () => new Array(bn + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[i][0] = i;
  for (let j = 0; j <= bn; j++) matrix[0][j] = j;

  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[an][bn];
}

export function getStringSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = getLevenshteinDistance(a, b);
  return 1 - dist / maxLen;
}

export function correctLrnDigits(rawLrn: string): { corrected: string; wasChanged: boolean; reason: string } {
  if (!rawLrn) return { corrected: '', wasChanged: false, reason: '' };

  let cleaned = rawLrn.trim();
  let wasCharSubstituted = false;

  const charMap: Record<string, string> = {
    O: '0',
    o: '0',
    I: '1',
    l: '1',
    '|': '1',
    '!': '1',
    S: '5',
    s: '5',
    B: '8',
    Z: '2',
    z: '2',
    g: '9',
    q: '9',
  };

  let mapped = '';
  for (const char of cleaned) {
    if (charMap[char]) {
      mapped += charMap[char];
      wasCharSubstituted = true;
    } else {
      mapped += char;
    }
  }

  const digitsOnly = mapped.replace(/\D/g, '').slice(0, 12);
  const wasChanged = digitsOnly !== rawLrn.trim();
  const reason = wasCharSubstituted
    ? 'Corrected OCR digit misrecognition (e.g. O->0, l/I->1, S->5) to valid 12-digit LRN'
    : wasChanged
    ? 'Cleaned non-digit formatting characters from LRN'
    : '';

  return { corrected: digitsOnly, wasChanged, reason };
}

export function normalizeOcrDate(rawDate: string): { corrected: string; wasChanged: boolean; reason: string } {
  if (!rawDate || !rawDate.trim()) return { corrected: '', wasChanged: false, reason: '' };

  const trimmed = rawDate.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return { corrected: trimmed, wasChanged: false, reason: '' };
    }
  }

  const monthMap: Record<string, string> = {
    jan: '01', january: '01', enero: '01',
    feb: '02', february: '02', pebrero: '02',
    mar: '03', march: '03', marso: '03',
    apr: '04', april: '04', abril: '04',
    may: '05', mayo: '05',
    jun: '06', june: '06', hunyo: '06',
    jul: '07', july: '07', hulyo: '07',
    aug: '08', august: '08', agosto: '08',
    sep: '09', sept: '09', september: '09', setyembre: '09',
    oct: '10', october: '10', oktubre: '10',
    nov: '11', november: '11', nobyembre: '11',
    dec: '12', december: '12', disyembre: '12',
  };

  const wordMatch = trimmed.match(/([a-zA-Z]+)[,\s.-]+(\d{1,2})[,\s.-]+(\d{4})/i) ||
                     trimmed.match(/(\d{1,2})[,\s.-]+([a-zA-Z]+)[,\s.-]+(\d{4})/i);

  if (wordMatch) {
    let monthStr = '';
    let dayStr = '';
    let yearStr = wordMatch[3];

    if (isNaN(Number(wordMatch[1]))) {
      monthStr = wordMatch[1].toLowerCase();
      dayStr = wordMatch[2];
    } else {
      dayStr = wordMatch[1];
      monthStr = wordMatch[2].toLowerCase();
    }

    const monthNum = monthMap[monthStr] || monthMap[monthStr.slice(0, 3)];
    if (monthNum && yearStr) {
      const paddedDay = dayStr.padStart(2, '0');
      const iso = `${yearStr}-${monthNum}-${paddedDay}`;
      return {
        corrected: iso,
        wasChanged: iso !== trimmed,
        reason: `Normalized OCR date "${trimmed}" to standard ISO YYYY-MM-DD`,
      };
    }
  }

  const slashMatch = trimmed.match(/(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})/);
  if (slashMatch) {
    let year = '';
    let month = '';
    let day = '';

    if (slashMatch[1].length === 4) {
      year = slashMatch[1];
      month = slashMatch[2].padStart(2, '0');
      day = slashMatch[3].padStart(2, '0');
    } else if (slashMatch[3].length === 4) {
      year = slashMatch[3];
      const p1 = parseInt(slashMatch[1], 10);
      const p2 = parseInt(slashMatch[2], 10);

      if (p1 > 12 && p2 <= 12) {
        day = slashMatch[1].padStart(2, '0');
        month = slashMatch[2].padStart(2, '0');
      } else {
        month = slashMatch[1].padStart(2, '0');
        day = slashMatch[2].padStart(2, '0');
      }
    }

    if (year && month && day) {
      const iso = `${year}-${month}-${day}`;
      return {
        corrected: iso,
        wasChanged: iso !== trimmed,
        reason: `Normalized numeric date "${trimmed}" to standard ISO YYYY-MM-DD`,
      };
    }
  }

  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    const iso = d.toISOString().split('T')[0];
    return {
      corrected: iso,
      wasChanged: iso !== trimmed,
      reason: `Parsed OCR date "${trimmed}" to standard ISO YYYY-MM-DD`,
    };
  }

  return { corrected: trimmed, wasChanged: false, reason: '' };
}

export function correctOccupationText(raw: string): { corrected: string; wasChanged: boolean; confidence: ConfidenceLevel; reason: string } {
  if (!raw || !raw.trim()) {
    return { corrected: '', wasChanged: false, confidence: 'NOT_DETECTED', reason: '' };
  }

  const trimmed = raw.trim();

  for (const phrase of PHRASE_CORRECTIONS) {
    if (phrase.pattern.test(trimmed)) {
      const corrected = trimmed.replace(phrase.pattern, phrase.replacement);
      if (corrected !== trimmed) {
        return {
          corrected,
          wasChanged: true,
          confidence: 'HIGH',
          reason: phrase.reason,
        };
      }
    }
  }

  const lower = trimmed.toLowerCase();
  if (OCCUPATION_DICTIONARY[lower]) {
    const corrected = OCCUPATION_DICTIONARY[lower];
    return {
      corrected,
      wasChanged: corrected.toLowerCase() !== lower,
      confidence: 'HIGH',
      reason: `Corrected OCR misspelling "${trimmed}" → "${corrected}"`,
    };
  }

  const words = trimmed.split(/\s+/);
  let changedCount = 0;
  const correctedWords = words.map((w) => {
    const cleanWord = w.toLowerCase().replace(/[^a-z]/g, '');
    if (OCCUPATION_DICTIONARY[cleanWord]) {
      changedCount++;
      return OCCUPATION_DICTIONARY[cleanWord];
    }

    if (cleanWord.length >= 4) {
      for (const [key, val] of Object.entries(OCCUPATION_DICTIONARY)) {
        if (key.length >= 4 && Math.abs(key.length - cleanWord.length) <= 2) {
          const sim = getStringSimilarity(cleanWord, key);
          if (sim >= 0.8) {
            changedCount++;
            return val;
          }
        }
      }
    }
    return w;
  });

  if (changedCount > 0) {
    const finalCorrected = correctedWords.join(' ');
    return {
      corrected: finalCorrected,
      wasChanged: true,
      confidence: changedCount >= 2 ? 'HIGH' : 'MEDIUM',
      reason: `Auto-corrected ${changedCount} misspelled term(s) in occupation field`,
    };
  }

  const capitalized = trimmed
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');

  return {
    corrected: capitalized,
    wasChanged: capitalized !== trimmed,
    confidence: 'HIGH',
    reason: capitalized !== trimmed ? 'Standardized capitalization' : '',
  };
}

export function sanitizeNameField(raw: string, fieldLabel: string): { corrected: string; wasChanged: boolean; confidence: ConfidenceLevel; reason: string } {
  if (!raw || !raw.trim()) {
    return { corrected: '', wasChanged: false, confidence: 'NOT_DETECTED', reason: '' };
  }

  let cleaned = raw.trim();

  const stripped = cleaned
    .replace(/[._,;:~*#^$@!|/\\]+$/g, '')
    .replace(/^[._,;:~*#^$@!|/\\]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const upper = stripped.toUpperCase();
  const wasChanged = upper !== cleaned;

  return {
    corrected: upper,
    wasChanged,
    confidence: 'HIGH',
    reason: wasChanged ? `Preserved name and removed stray OCR punctuation noise from ${fieldLabel}` : '',
  };
}

export function sanitizeAddressField(raw: string): { corrected: string; wasChanged: boolean; confidence: ConfidenceLevel; reason: string } {
  if (!raw || !raw.trim()) {
    return { corrected: '', wasChanged: false, confidence: 'NOT_DETECTED', reason: '' };
  }

  let cleaned = raw.trim();
  let formatted = cleaned
    .replace(/\s{2,}/g, ' ')
    .replace(/\bBgy\.\s*/gi, 'Brgy. ')
    .replace(/\bBrgy\s+/gi, 'Brgy. ')
    .replace(/\bBlk\.\s*/gi, 'Block ')
    .replace(/\bLt\.\s*/gi, 'Lot ');

  const wasChanged = formatted !== cleaned;
  return {
    corrected: formatted,
    wasChanged,
    confidence: 'HIGH',
    reason: wasChanged ? 'Standardized address formatting while preserving local location names' : '',
  };
}

export function sanitizeSchoolField(raw: string): { corrected: string; wasChanged: boolean; confidence: ConfidenceLevel; reason: string } {
  if (!raw || !raw.trim()) {
    return { corrected: '', wasChanged: false, confidence: 'NOT_DETECTED', reason: '' };
  }

  let cleaned = raw.trim();
  let formatted = cleaned
    .replace(/\bElem\.\s*/gi, 'Elementary ')
    .replace(/\bElem\s+/gi, 'Elementary ')
    .replace(/\bSch\.\s*/gi, 'School ')
    .replace(/\bSch\s+/gi, 'School ')
    .replace(/\bCent\.\s*/gi, 'Central ')
    .replace(/\bNatl\.\s*/gi, 'National ')
    .replace(/\s{2,}/g, ' ')
    .toUpperCase();

  const wasChanged = formatted !== cleaned.toUpperCase();
  return {
    corrected: formatted,
    wasChanged,
    confidence: 'HIGH',
    reason: wasChanged ? 'Standardized school keywords (Elementary / School / Central)' : '',
  };
}

export function normalizeAdmissionRemarks(raw: string): { corrected: AdmissionStatus; wasChanged: boolean; reason: string } {
  const lower = (raw || '').trim().toLowerCase();

  if (
    lower.includes('a - pass') ||
    lower.includes('a-pass') ||
    lower === 'pass' ||
    lower === 'passed' ||
    lower === 'qualified' ||
    lower === 'admitted' ||
    lower === 'a'
  ) {
    return {
      corrected: 'A - PASS',
      wasChanged: raw !== 'A - PASS',
      reason: 'Mapped admission evaluation to standard "A - PASS" status',
    };
  }

  return {
    corrected: 'B - PENDING',
    wasChanged: raw !== 'B - PENDING',
    reason: 'Mapped admission evaluation to standard "B - PENDING" status',
  };
}

export function normalizeHealthStatus(raw: string): { corrected: string; wasChanged: boolean; reason: string } {
  if (!raw || !raw.trim()) {
    return { corrected: 'Normal / Fit for schooling', wasChanged: true, reason: 'Defaulted empty health assessment to Normal' };
  }

  const lower = raw.trim().toLowerCase();
  if (lower.includes('astma') || lower.includes('asthma') || lower.includes('hika')) {
    return { corrected: 'Asthma (Requires inhaler/monitoring)', wasChanged: true, reason: 'Standardized Asthma medical note' };
  }
  if (lower.includes('alergy') || lower.includes('allergies') || lower.includes('allergy')) {
    return { corrected: 'Allergies recorded', wasChanged: true, reason: 'Standardized Allergy medical note' };
  }
  if (lower.includes('normal') || lower.includes('fit') || lower.includes('healthy') || lower.includes('none') || lower.includes('walang sakit')) {
    return { corrected: 'Normal / Fit for boarding school', wasChanged: true, reason: 'Standardized Normal health status' };
  }

  return { corrected: raw.trim(), wasChanged: false, reason: '' };
}

export function applySmartOcrCorrection(rawExtracted: Partial<StudentRecord>): {
  correctedData: Partial<StudentRecord>;
  originalOcrData: Partial<StudentRecord>;
  corrections: OCRCorrectionRecord[];
} {
  const originalOcrData: Partial<StudentRecord> = { ...rawExtracted };
  const correctedData: Partial<StudentRecord> = { ...rawExtracted };
  const corrections: OCRCorrectionRecord[] = [];

  if (rawExtracted.lrn !== undefined) {
    const lrnResult = correctLrnDigits(String(rawExtracted.lrn));
    correctedData.lrn = lrnResult.corrected;
    if (lrnResult.wasChanged) {
      corrections.push({
        field: 'lrn',
        fieldLabel: 'Learner Reference Number (LRN)',
        originalValue: String(rawExtracted.lrn),
        correctedValue: lrnResult.corrected,
        confidence: 'HIGH',
        reason: lrnResult.reason,
        applied: true,
      });
    }
  }

  if (rawExtracted.surname) {
    const snRes = sanitizeNameField(rawExtracted.surname, 'Surname');
    correctedData.surname = snRes.corrected;
    if (snRes.wasChanged) {
      corrections.push({
        field: 'surname',
        fieldLabel: 'Surname (SN)',
        originalValue: rawExtracted.surname,
        correctedValue: snRes.corrected,
        confidence: 'HIGH',
        reason: snRes.reason,
        applied: true,
      });
    }
  }

  if (rawExtracted.firstName) {
    const fnRes = sanitizeNameField(rawExtracted.firstName, 'First Name');
    correctedData.firstName = fnRes.corrected;
    if (fnRes.wasChanged) {
      corrections.push({
        field: 'firstName',
        fieldLabel: 'First Name (FN)',
        originalValue: rawExtracted.firstName,
        correctedValue: fnRes.corrected,
        confidence: 'HIGH',
        reason: fnRes.reason,
        applied: true,
      });
    }
  }

  if (rawExtracted.middleName) {
    const mnRes = sanitizeNameField(rawExtracted.middleName, 'Middle Name');
    correctedData.middleName = mnRes.corrected;
    if (mnRes.wasChanged) {
      corrections.push({
        field: 'middleName',
        fieldLabel: 'Middle Name (MN)',
        originalValue: rawExtracted.middleName,
        correctedValue: mnRes.corrected,
        confidence: 'HIGH',
        reason: mnRes.reason,
        applied: true,
      });
    }
  }

  if (rawExtracted.birthday) {
    const bdayRes = normalizeOcrDate(rawExtracted.birthday);
    correctedData.birthday = bdayRes.corrected;
    if (bdayRes.wasChanged) {
      corrections.push({
        field: 'birthday',
        fieldLabel: 'Date of Birth (Birthday)',
        originalValue: rawExtracted.birthday,
        correctedValue: bdayRes.corrected,
        confidence: 'HIGH',
        reason: bdayRes.reason,
        applied: true,
      });
    }
  }

  if (rawExtracted.address) {
    const addrRes = sanitizeAddressField(rawExtracted.address);
    correctedData.address = addrRes.corrected;
    if (addrRes.wasChanged) {
      corrections.push({
        field: 'address',
        fieldLabel: 'Complete Home Address',
        originalValue: rawExtracted.address,
        correctedValue: addrRes.corrected,
        confidence: 'HIGH',
        reason: addrRes.reason,
        applied: true,
      });
    }
  }

  if (rawExtracted.fatherName) {
    const fRes = sanitizeNameField(rawExtracted.fatherName, "Father's Name");
    correctedData.fatherName = fRes.corrected;
    if (fRes.wasChanged) {
      corrections.push({
        field: 'fatherName',
        fieldLabel: "Father's Name",
        originalValue: rawExtracted.fatherName,
        correctedValue: fRes.corrected,
        confidence: 'HIGH',
        reason: fRes.reason,
        applied: true,
      });
    }
  }

  if (rawExtracted.motherName) {
    const mRes = sanitizeNameField(rawExtracted.motherName, "Mother's Name");
    correctedData.motherName = mRes.corrected;
    if (mRes.wasChanged) {
      corrections.push({
        field: 'motherName',
        fieldLabel: "Mother's Name",
        originalValue: rawExtracted.motherName,
        correctedValue: mRes.corrected,
        confidence: 'HIGH',
        reason: mRes.reason,
        applied: true,
      });
    }
  }

  if (rawExtracted.guardianName) {
    const gRes = sanitizeNameField(rawExtracted.guardianName, "Guardian's Name");
    correctedData.guardianName = gRes.corrected;
    if (gRes.wasChanged) {
      corrections.push({
        field: 'guardianName',
        fieldLabel: "Guardian's Name",
        originalValue: rawExtracted.guardianName,
        correctedValue: gRes.corrected,
        confidence: 'HIGH',
        reason: gRes.reason,
        applied: true,
      });
    }
  }

  if (rawExtracted.fatherOccupation) {
    const foRes = correctOccupationText(rawExtracted.fatherOccupation);
    correctedData.fatherOccupation = foRes.corrected;
    if (foRes.wasChanged) {
      corrections.push({
        field: 'fatherOccupation',
        fieldLabel: "Father's Occupation",
        originalValue: rawExtracted.fatherOccupation,
        correctedValue: foRes.corrected,
        confidence: foRes.confidence,
        reason: foRes.reason,
        applied: true,
      });
    }
  }

  if (rawExtracted.motherOccupation) {
    const moRes = correctOccupationText(rawExtracted.motherOccupation);
    correctedData.motherOccupation = moRes.corrected;
    if (moRes.wasChanged) {
      corrections.push({
        field: 'motherOccupation',
        fieldLabel: "Mother's Occupation",
        originalValue: rawExtracted.motherOccupation,
        correctedValue: moRes.corrected,
        confidence: moRes.confidence,
        reason: moRes.reason,
        applied: true,
      });
    }
  }

  if (rawExtracted.guardianOccupation) {
    const goRes = correctOccupationText(rawExtracted.guardianOccupation);
    correctedData.guardianOccupation = goRes.corrected;
    if (goRes.wasChanged) {
      corrections.push({
        field: 'guardianOccupation',
        fieldLabel: "Guardian's Occupation",
        originalValue: rawExtracted.guardianOccupation,
        correctedValue: goRes.corrected,
        confidence: goRes.confidence,
        reason: goRes.reason,
        applied: true,
      });
    }
  }

  if (rawExtracted.elementarySchool) {
    const schRes = sanitizeSchoolField(rawExtracted.elementarySchool);
    correctedData.elementarySchool = schRes.corrected;
    if (schRes.wasChanged) {
      corrections.push({
        field: 'elementarySchool',
        fieldLabel: 'Elementary School Graduated',
        originalValue: rawExtracted.elementarySchool,
        correctedValue: schRes.corrected,
        confidence: schRes.confidence,
        reason: schRes.reason,
        applied: true,
      });
    }
  }

  if (rawExtracted.examScore !== undefined && rawExtracted.examScore !== null) {
    const score = Math.max(0, Number(rawExtracted.examScore) || 0);
    correctedData.examScore = score;
  }

  if (rawExtracted.remarks) {
    const remRes = normalizeAdmissionRemarks(rawExtracted.remarks);
    correctedData.remarks = remRes.corrected;
    if (remRes.wasChanged) {
      corrections.push({
        field: 'remarks',
        fieldLabel: 'Admission Remarks / Status',
        originalValue: rawExtracted.remarks,
        correctedValue: remRes.corrected,
        confidence: 'HIGH',
        reason: remRes.reason,
        applied: true,
      });
    }
  }

  if (rawExtracted.healthStatus) {
    const hRes = normalizeHealthStatus(rawExtracted.healthStatus);
    correctedData.healthStatus = hRes.corrected;
    if (hRes.wasChanged) {
      corrections.push({
        field: 'healthStatus',
        fieldLabel: 'Health & Medical Assessment',
        originalValue: rawExtracted.healthStatus,
        correctedValue: hRes.corrected,
        confidence: 'HIGH',
        reason: hRes.reason,
        applied: true,
      });
    }
  }

  return {
    correctedData,
    originalOcrData,
    corrections,
  };
}
