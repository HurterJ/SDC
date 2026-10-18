// Longueurs maximales des champs saisis, communes aux formulaires et aux routes API
export const LIMITS = {
  projectName: 120,
  projectDescription: 2000,
  address: 200,
  planName: 120,
  planDescription: 1000,
  observationTitle: 200,
  observationDescription: 5000,
  aiInput: 2000,
  comment: 2000,
  installerName: 100,
  company: 100,
  exportTitle: 150,
} as const

export const MAX_PHOTO_BYTES = 20 * 1024 * 1024
export const MAX_PLAN_BYTES = 50 * 1024 * 1024

// Date du jour au format des champs <input type="date"> (heure locale)
export function todayInputValue(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
