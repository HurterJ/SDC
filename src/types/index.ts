export type Role = 'conducteur' | 'installateur' | 'lecteur'

export type ObservationStatus = 'ouverte' | 'en_cours' | 'resolue' | 'contestee' | 'validee'

export type ObservationPriority = 'basse' | 'normale' | 'haute' | 'critique'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  address: string | null
  owner_id: string
  created_at: string
  updated_at: string
  archived: boolean
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: Role
  created_at: string
  profile?: Profile
}

export interface Plan {
  id: string
  project_id: string
  name: string
  description: string | null
  file_url: string
  file_path: string
  created_by: string
  created_at: string
  updated_at: string
  observation_count?: number
}

export interface Observation {
  id: string
  project_id: string
  plan_id: string | null
  plan_x: number | null
  plan_y: number | null
  title: string
  description: string | null
  status: ObservationStatus
  priority: ObservationPriority
  category: string | null
  assigned_to: string | null
  created_by: string
  due_date: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  photos?: ObservationPhoto[]
  comments?: ObservationComment[]
  assigned_profile?: Profile
  creator_profile?: Profile
  plan?: Plan
}

export interface ObservationPhoto {
  id: string
  observation_id: string
  file_url: string
  file_path: string
  caption: string | null
  uploaded_by: string
  created_at: string
}

export interface ObservationComment {
  id: string
  observation_id: string
  author_id: string | null
  installer_token_id: string | null
  content: string
  created_at: string
  author_profile?: Profile
  installer_name?: string
}

export interface InstallerToken {
  id: string
  project_id: string
  token: string
  name: string
  company: string | null
  email: string | null
  role: 'installateur' | 'lecteur'
  expires_at: string | null
  created_by: string
  created_at: string
  is_active: boolean
}

export interface PinPosition {
  x: number
  y: number
}

export interface ObservationWithPin extends Observation {
  pinPosition: PinPosition
}
