export const TARGET_DEPARTMENT = '65'
export const TARGET_DEPARTMENT_LABEL = 'Hautes-Pyrénées'

const EXCLUDED_EMPLOYEE_RANGE_CODES = new Set([
  '12', // 20 a 49 salaries
  '21',
  '22',
  '31',
  '32',
  '41',
  '42',
  '51',
  '52',
  '53',
])

const EXCLUDED_EMPLOYEE_RANGE_PATTERNS = [
  /20\s*(a|à|-)\s*49/i,
  /50\s*(a|à|-)\s*99/i,
  /100\s*(a|à|-)\s*199/i,
  /200\s*(a|à|-)\s*249/i,
  /250\s*(a|à|-)\s*499/i,
  /500\s*(a|à|-)\s*999/i,
  /1\s*000/i,
  /1000/i,
]

export function isCapebProspectEmployeeRange(range?: string | null) {
  if (!range) return true

  const normalized = range.trim()
  if (!normalized) return true

  if (EXCLUDED_EMPLOYEE_RANGE_CODES.has(normalized)) return false

  return !EXCLUDED_EMPLOYEE_RANGE_PATTERNS.some(pattern => pattern.test(normalized))
}

export function isTargetDepartment(departement?: string | null) {
  return departement === TARGET_DEPARTMENT
}
