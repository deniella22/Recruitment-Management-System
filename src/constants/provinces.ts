export const PROVINCE_OPTIONS = [
  'Abra',
  'Albay',
  'Aurora',
  'Batangas',
  'Benguet',
  'Bulacan',
  'Cagayan',
  'Camarines Norte',
  'Camarines Sur',
  'Catanduanes',
  'Cavite',
  'Ifugao',
  'Ilocos Norte',
  'Ilocos Sur',
  'Isabela',
  'La Union',
  'Laguna',
  'Marinduque',
  'Metro Manila',
  'Nueva Ecija',
  'Nueva Vizcaya',
  'Occidental Mindoro',
  'Oriental Mindoro',
  'Palawan',
  'Pangasinan',
  'Quezon Province',
  'Quirino',
  'Rizal',
  'Romblon',
  'Sorsogon',
  'Tarlac',
  'Zambales',
  'Others',
] as const;

export type ProvinceOption = (typeof PROVINCE_OPTIONS)[number];

// Normalized aliases map for resilient matching (e.g. OCR variations or abbreviations)
const PROVINCE_ALIASES: Record<string, string> = {
  'quezon': 'Quezon Province',
  'quezon province': 'Quezon Province',
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
  'ncr': 'Metro Manila',
  'national capital region': 'Metro Manila',
  'manila': 'Metro Manila',
  'la union': 'La Union',
  'ilocos n.': 'Ilocos Norte',
  'ilocos s.': 'Ilocos Sur',
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
