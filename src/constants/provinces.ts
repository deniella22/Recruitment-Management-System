export const PROVINCE_OPTIONS = [
  'Aklan',
  'Albay',
  'Antique',
  'Batangas',
  'Bohol',
  'Camarines Norte',
  'Camarines Sur',
  'Capiz',
  'Catanduanes',
  'Cavite',
  'Cebu',
  'Guimaras',
  'Iloilo',
  'Laguna',
  'Marinduque',
  'Masbate',
  'Negros Occidental',
  'Negros Oriental',
  'Occidental Mindoro',
  'Oriental Mindoro',
  'Palawan',
  'Quezon',
  'Rizal',
  'Romblon',
  'Siquijor',
  'Sorsogon',
  'Others',
] as const;

export type ProvinceOption = (typeof PROVINCE_OPTIONS)[number];

// Normalized aliases map for resilient matching (e.g. OCR variations or abbreviations)
const PROVINCE_ALIASES: Record<string, string> = {
  'camsur': 'Camarines Sur',
  'cam sur': 'Camarines Sur',
  'cam. sur': 'Camarines Sur',
  'camnorte': 'Camarines Norte',
  'cam norte': 'Camarines Norte',
  'cam. norte': 'Camarines Norte',
  'mindoro oriental': 'Oriental Mindoro',
  'mindoro occidental': 'Occidental Mindoro',
  'or. mindoro': 'Oriental Mindoro',
  'occ. mindoro': 'Occidental Mindoro',
  'negros occ': 'Negros Occidental',
  'negros occ.': 'Negros Occidental',
  'negros or': 'Negros Oriental',
  'negros or.': 'Negros Oriental',
};

/**
 * Resolves any raw province text (from OCR or database) to a dropdown value
 * and, if "Others", extracts the specified province text.
 */
export function resolveProvince(
  raw?: string | null,
  rawOther?: string | null
): {
  dropdownValue: string;
  specifiedOther: string;
} {
  if (!raw || !raw.trim()) {
    if (rawOther && rawOther.trim()) {
      return { dropdownValue: 'Others', specifiedOther: rawOther.trim() };
    }
    return { dropdownValue: '', specifiedOther: '' };
  }

  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  // If already explicitly 'Others' or 'Other'
  if (lower === 'others' || lower === 'other') {
    return { dropdownValue: 'Others', specifiedOther: rawOther ? rawOther.trim() : '' };
  }

  // Check aliases
  if (PROVINCE_ALIASES[lower]) {
    return { dropdownValue: PROVINCE_ALIASES[lower], specifiedOther: '' };
  }

  // Exact or case-insensitive match among the standard provinces
  const found = PROVINCE_OPTIONS.find(
    (p) => p !== 'Others' && p.toLowerCase() === lower
  );

  if (found) {
    return { dropdownValue: found, specifiedOther: '' };
  }

  // Otherwise, select "Others" and populate specifiedOther
  return { dropdownValue: 'Others', specifiedOther: trimmed };
}

/**
 * Formats the province for display or export
 */
export function formatProvinceDisplay(
  province?: string | null,
  specifiedOther?: string | null
): string {
  if (!province) return '-';
  if (province === 'Others') {
    return specifiedOther && specifiedOther.trim()
      ? `${specifiedOther.trim()} (Others)`
      : 'Others';
  }
  return province;
}
