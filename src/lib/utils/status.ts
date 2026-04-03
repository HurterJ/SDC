import { ObservationStatus, ObservationPriority } from '@/types'

export const STATUS_LABELS: Record<ObservationStatus, string> = {
  ouverte: 'Ouverte',
  en_cours: 'En cours',
  resolue: 'Résolue',
  contestee: 'Contestée',
  validee: 'Validée',
}

export const STATUS_COLORS: Record<ObservationStatus, string> = {
  ouverte: 'bg-red-100 text-red-700 border-red-200',
  en_cours: 'bg-orange-100 text-orange-700 border-orange-200',
  resolue: 'bg-blue-100 text-blue-700 border-blue-200',
  contestee: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  validee: 'bg-green-100 text-green-700 border-green-200',
}

export const STATUS_DOT_COLORS: Record<ObservationStatus, string> = {
  ouverte: 'bg-red-500',
  en_cours: 'bg-orange-500',
  resolue: 'bg-blue-500',
  contestee: 'bg-yellow-500',
  validee: 'bg-green-500',
}

export const PRIORITY_LABELS: Record<ObservationPriority, string> = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
  critique: 'Critique',
}

export const PRIORITY_COLORS: Record<ObservationPriority, string> = {
  basse: 'bg-gray-100 text-gray-600',
  normale: 'bg-blue-100 text-blue-700',
  haute: 'bg-orange-100 text-orange-700',
  critique: 'bg-red-100 text-red-700',
}

export const PIN_COLORS: Record<ObservationStatus, string> = {
  ouverte: '#ef4444',
  en_cours: '#f97316',
  resolue: '#3b82f6',
  contestee: '#eab308',
  validee: '#22c55e',
}
