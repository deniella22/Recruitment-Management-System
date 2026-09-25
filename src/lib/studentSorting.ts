import { StudentRecord } from '../types';

/**
 * Resolves the student's province from registration.
 * Sourced directly from the "Select Province" dropdown (testingCenterProvince).
 * Falls back to home address province if needed.
 * SPECIAL HANDLING: If the selected Province is 'Others' (or case-insensitive 'others'),
 * it is ALWAYS strictly grouped under 'OTHERS' regardless of what is typed in Other Province.
 */
export function getStudentProvince(s: Partial<StudentRecord> | any): string {
  if (!s) return 'OTHERS';

  // Primary: Selected from the "Select Province" dropdown in Section K
  const tcp = typeof s.testingCenterProvince === 'string' ? s.testingCenterProvince.trim() : '';
  if (tcp) {
    if (tcp.toLowerCase() === 'others') {
      return 'OTHERS';
    }
    return tcp.toUpperCase();
  }

  // Fallback: Address province
  const p = typeof s.province === 'string' ? s.province.trim() : '';
  if (p) {
    if (p.toLowerCase() === 'others') {
      return 'OTHERS';
    }
    return p.toUpperCase();
  }

  return 'OTHERS';
}

/**
 * Extracts the testing center venue/location from a student record.
 * Represents the specific examination venue/location entered in Testing Center Location.
 */
export function getTestingCenterName(s: Partial<StudentRecord> | any): string {
  if (!s) return 'General Testing Center';
  if (typeof s.testingCenterLocation === 'string' && s.testingCenterLocation.trim()) {
    return s.testingCenterLocation.trim();
  }
  if (typeof s.testingCenter === 'string' && s.testingCenter.trim()) {
    return s.testingCenter.trim();
  }
  if (typeof s.parishPlace === 'string' && s.parishPlace.trim()) {
    return s.parishPlace.trim();
  }
  return 'General Testing Center';
}

/**
 * Returns priority rank for admission status:
 * 1: Passed
 * 2: Conditional
 * 3: Pending
 * 4: Failed
 */
export function getAdmissionStatusRank(s: Partial<StudentRecord> | any): number {
  const status = (s?.admissionStatus || '').trim().toLowerCase();
  const remarks = (s?.remarks || '').trim().toLowerCase();

  // 1. Passed
  if (
    status === 'passed' ||
    remarks === 'a - pass' ||
    remarks === 'passed' ||
    remarks === 'pass'
  ) {
    return 1;
  }

  // 2. Conditional
  if (
    status === 'conditional' ||
    remarks === 'conditional'
  ) {
    return 2;
  }

  // 4. Failed (evaluate before general pending fallback)
  if (
    status === 'failed' ||
    remarks === 'failed' ||
    remarks.includes('fail')
  ) {
    return 4;
  }

  // 3. Pending
  if (
    status === 'pending' ||
    remarks === 'b - pending' ||
    remarks === 'pending' ||
    (!status && !remarks)
  ) {
    return 3;
  }

  return 3;
}

/**
 * Resolves normalized admission status string:
 * 'Passed' | 'Conditional' | 'Pending' | 'Failed'
 */
export function resolveAdmissionStatus(s: Partial<StudentRecord> | any): 'Passed' | 'Conditional' | 'Pending' | 'Failed' {
  const status = (s?.admissionStatus || '').trim().toLowerCase();
  const remarks = (s?.remarks || '').trim().toLowerCase();

  if (status === 'passed' || remarks === 'a - pass' || remarks === 'passed' || remarks === 'pass') {
    return 'Passed';
  }
  if (status === 'conditional' || remarks === 'conditional') {
    return 'Conditional';
  }
  if (status === 'failed' || remarks === 'failed' || remarks.includes('fail')) {
    return 'Failed';
  }
  return 'Pending';
}

/**
 * Tertiary sort: Student Name (Last Name / Surname -> First Name -> Middle Name) alphabetically
 */
export function compareStudentNames(a: Partial<StudentRecord>, b: Partial<StudentRecord>): number {
  const surnameA = (a.surname || a.lastName || '').trim();
  const surnameB = (b.surname || b.lastName || '').trim();
  const surnameComp = surnameA.localeCompare(surnameB, undefined, { sensitivity: 'base' });
  if (surnameComp !== 0) return surnameComp;

  const firstA = (a.firstName || '').trim();
  const firstB = (b.firstName || '').trim();
  const firstComp = firstA.localeCompare(firstB, undefined, { sensitivity: 'base' });
  if (firstComp !== 0) return firstComp;

  const middleA = (a.middleName || '').trim();
  const middleB = (b.middleName || '').trim();
  return middleA.localeCompare(middleB, undefined, { sensitivity: 'base' });
}

/**
 * Sorts student records according to the selected sortBy field and sortOrder.
 * When sortBy === 'province' (default):
 *  1. Province (A–Z) with 'OTHERS' at the end
 *  2. Testing Center (A–Z)
 *  3. Admission Status (Passed -> Conditional -> Pending -> Failed)
 *  4. Student Name (Surname -> First Name -> Middle Name A–Z)
 */
export function sortStudents(
  students: StudentRecord[],
  sortBy: string = 'province',
  sortOrder: 'asc' | 'desc' = 'asc'
): StudentRecord[] {
  if (!Array.isArray(students)) return [];
  const order = sortOrder === 'desc' ? -1 : 1;

  return [...students].sort((a, b) => {
    // 1. Province Sort (Default)
    if (sortBy === 'province' || !sortBy) {
      const provA = getStudentProvince(a);
      const provB = getStudentProvince(b);

      // Keep OTHERS grouped together at the end of the province list
      if (provA !== provB) {
        if (provA === 'OTHERS') return 1 * order;
        if (provB === 'OTHERS') return -1 * order;
        const provComp = provA.localeCompare(provB, undefined, { sensitivity: 'base' });
        if (provComp !== 0) return provComp * order;
      }

      // Inside each Province: Testing Center (A–Z)
      const centerA = getTestingCenterName(a);
      const centerB = getTestingCenterName(b);
      if (centerA !== centerB) {
        const centerComp = centerA.localeCompare(centerB, undefined, { sensitivity: 'base' });
        if (centerComp !== 0) return centerComp * order;
      }

      // Inside each Testing Center: Admission Status (Passed -> Conditional -> Pending -> Failed)
      const rankA = getAdmissionStatusRank(a);
      const rankB = getAdmissionStatusRank(b);
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // Student Name (Surname -> First Name -> Middle Name A–Z)
      return compareStudentNames(a, b);
    }

    if (sortBy === 'testingCenter') {
      const provA = getStudentProvince(a);
      const provB = getStudentProvince(b);

      if (provA !== provB) {
        if (provA === 'OTHERS') return 1 * order;
        if (provB === 'OTHERS') return -1 * order;
        const provComp = provA.localeCompare(provB, undefined, { sensitivity: 'base' });
        if (provComp !== 0) return provComp * order;
      }

      const centerA = getTestingCenterName(a);
      const centerB = getTestingCenterName(b);
      if (centerA !== centerB) {
        const centerComp = centerA.localeCompare(centerB, undefined, { sensitivity: 'base' });
        if (centerComp !== 0) return centerComp * order;
      }

      const rankA = getAdmissionStatusRank(a);
      const rankB = getAdmissionStatusRank(b);
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      return compareStudentNames(a, b);
    }

    if (sortBy === 'fullName') {
      return compareStudentNames(a, b) * order;
    }

    if (sortBy === 'remarks' || sortBy === 'admissionStatus') {
      const rankA = getAdmissionStatusRank(a);
      const rankB = getAdmissionStatusRank(b);
      if (rankA !== rankB) {
        return (rankA - rankB) * order;
      }
      return compareStudentNames(a, b);
    }

    let valA: any = (a as any)[sortBy];
    let valB: any = (b as any)[sortBy];

    if (typeof valA === 'number' && typeof valB === 'number') {
      if (valA !== valB) {
        return (valA - valB) * order;
      }
      return compareStudentNames(a, b);
    }

    const strA = (valA !== undefined && valA !== null ? String(valA) : '').toLowerCase();
    const strB = (valB !== undefined && valB !== null ? String(valB) : '').toLowerCase();

    const strComp = strA.localeCompare(strB, undefined, { sensitivity: 'base' });
    if (strComp !== 0) {
      return strComp * order;
    }

    return compareStudentNames(a, b);
  });
}
