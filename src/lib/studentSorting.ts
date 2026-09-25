import { StudentRecord } from '../types';

/**
 * Extracts the testing center name from a student record.
 * Prioritizes direct testingCenter field, then testingCenterLocation,
 * and falls back to testingCenterProvince / testingCenterProvinceOther.
 */
export function getTestingCenterName(s: Partial<StudentRecord> | any): string {
  if (!s) return '';
  if (typeof s.testingCenter === 'string' && s.testingCenter.trim()) {
    return s.testingCenter.trim();
  }
  if (typeof s.testingCenterLocation === 'string' && s.testingCenterLocation.trim()) {
    return s.testingCenterLocation.trim();
  }
  const prov = s.testingCenterProvince === 'Others'
    ? (s.testingCenterProvinceOther || 'Others')
    : (s.testingCenterProvince || '');
  if (prov && typeof prov === 'string' && prov.trim()) {
    return prov.trim();
  }
  return '';
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
 * Tertiary sort: Student Name (Surname, Middle Name, First Name) alphabetically
 */
export function compareStudentNames(a: Partial<StudentRecord>, b: Partial<StudentRecord>): number {
  const surnameA = (a.surname || a.lastName || '').trim();
  const surnameB = (b.surname || b.lastName || '').trim();
  const surnameComp = surnameA.localeCompare(surnameB, undefined, { sensitivity: 'base' });
  if (surnameComp !== 0) return surnameComp;

  const middleA = (a.middleName || '').trim();
  const middleB = (b.middleName || '').trim();
  const middleComp = middleA.localeCompare(middleB, undefined, { sensitivity: 'base' });
  if (middleComp !== 0) return middleComp;

  const firstA = (a.firstName || '').trim();
  const firstB = (b.firstName || '').trim();
  return firstA.localeCompare(firstB, undefined, { sensitivity: 'base' });
}

/**
 * Sorts student records according to the selected sortBy field and sortOrder.
 * When sortBy === 'testingCenter':
 *  1. Testing Center (A-Z) - Primary
 *  2. Admission Status (Passed -> Conditional -> Pending -> Failed) - Secondary
 *  3. Student Name (Surname, Middle Name, First Name) - Tertiary
 */
export function sortStudents(
  students: StudentRecord[],
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'asc'
): StudentRecord[] {
  if (!Array.isArray(students)) return [];
  const order = sortOrder === 'desc' ? -1 : 1;

  return [...students].sort((a, b) => {
    if (sortBy === 'testingCenter') {
      const centerA = getTestingCenterName(a);
      const centerB = getTestingCenterName(b);

      // Primary: Testing Center (A-Z)
      if (!centerA && centerB) return 1 * order;
      if (centerA && !centerB) return -1 * order;
      if (centerA && centerB) {
        const centerComp = centerA.localeCompare(centerB, undefined, { sensitivity: 'base' });
        if (centerComp !== 0) {
          return centerComp * order;
        }
      }

      // Secondary: Admission Status (Passed -> Conditional -> Pending -> Failed)
      // Must be strictly followed whenever Sorting by Testing Center is active
      const rankA = getAdmissionStatusRank(a);
      const rankB = getAdmissionStatusRank(b);
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // Tertiary: Student Name (Surname, Middle Name, First Name)
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

    if (sortBy === 'birthday' || sortBy === 'birthdate') {
      valA = a.birthdate || a.birthday || '';
      valB = b.birthdate || b.birthday || '';
    }

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
