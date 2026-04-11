'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Observation, ObservationStatus, ObservationComment } from '@/types'
import { STATUS_LABELS, STATUS_COLORS, STATUS_DOT_COLORS, PRIORITY_LABELS } from '@/lib/utils/status'
import { compressImage, isMobileDevice } from '@/lib/utils/image'
import {
  Building2, CheckCircle, AlertTriangle, MessageSquare, Send, Loader2,
  ChevronDown, ChevronUp, Map, List, X, User, Camera, ImageIcon,
  Sparkles, ArrowUpDown, Filter, Eye, Tag, FileDown, Zap,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const PlanViewer = dynamic(() => import('@/components/plans/PlanViewer'), { ssr: false })

interface PlanItem { id: string; name: string; file_url: string }

interface LastComment {
  id: string
  content: string
  created_at: string
  installer_name?: string | null
  author_id?: string | null
}

interface Props {
  token: {
    id: string
    name: string
    company: string | null
    role: string
    project_id: string
    projects: { name: string; description: string | null } | null
  }
  observations: Observation[]
  plans: PlanItem[]
  lastComments: Record<string, LastComment>
  tokenString: string
}

const PRIORITY_ORDER: Record<string, number> = { critique: 0, haute: 1, normale: 2, basse: 3 }
const STATUS_ORDER: Record<string, number> = { ouverte: 0, en_cours: 1, contestee: 2, resolue: 3, validee: 4 }
const TODO_STATUSES: ObservationStatus[] = ['ouverte', 'en_cours', 'contestee']

export default function InstallerView({ token, observations: initial, plans, lastComments, tokenString }: Props) {
  const [observations, setObservations] = useState(initial)
  const [view, setView] = useState<'list' | 'plan'>('list')
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id ?? '')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selectedObs, setSelectedObs] = useState<Observation | null>(null)
  const [comments, setComments] = useState<Record<string, string>>({})
  const [commentsList, setCommentsList] = useState<Record<string, ObservationComment[]>>({})
  const [sending, setSending] = useState<string | null>(null)
  const [attachedPhoto, setAttachedPhoto] = useState<Record<string, File | null>>({})
  const [photoPreview, setPhotoPreview] = useState<Record<string, string | null>>({})
  const [lightbox, setLightbox] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [activePhotoObs, setActivePhotoObs] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({})
  const [loadingSuggestions, setLoadingSuggestions] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'priority' | 'status'>('date_desc')
  const [filterStatus, setFilterStatus] = useState<'all' | ObservationStatus>('all')
  const [groupByCategory, setGroupByCategory] = useState(false)
  const [quickFilter, setQuickFilter] = useState(false)
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())
  const [lastVisit, setLastVisit] = useState<Date | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)

  const supabase = createClient()
  const mobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  const STORAGE_KEY = `sitesuivi_seen_${token.id}`

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setSeenIds(new Set(JSON.parse(stored)))
      const visit = localStorage.getItem(`${STORAGE_KEY}_visit`)
      if (visit) setLastVisit(new Date(visit))
      localStorage.setItem(`${STORAGE_KEY}_visit`, new Date().toISOString())
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canEdit = token.role === 'installateur'
  const selectedPlan = plans.find((p) => p.id === selectedPlanId)
  const planObs = observations.filter((o) => o.plan_id === selectedPlanId)

  function isNew(obs: Observation): boolean {
    if (seenIds.has(obs.id)) return false
    if (!lastVisit) return false
    return new Date(obs.created_at) > lastVisit
  }

  const newCount = observations.filter(isNew).length
  const openCount = observations.filter((o) => o.status === 'ouverte').length
  const resolvedCount = observations.filter((o) => o.status === 'resolue' || o.status === 'validee').length
  const todoCount = observations.filter((o) => TODO_STATUSES.includes(o.status)).length

  function markAllAsSeen() {
    const newSet = new Set([...seenIds, ...observations.map((o) => o.id)])
    setSeenIds(newSet)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...newSet])) } catch {}
  }

  const displayedObs = observations
    .filter((o) => !quickFilter || TODO_STATUSES.includes(o.status))
    .filter((o) => filterStatus === 'all' || o.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'date_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortBy === 'priority') return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
      if (sortBy === 'status') return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
      return 0
    })

  const grouped: { category: string; items: Observation[] }[] = groupByCategory
    ? Object.entries(
        displayedObs.reduce((acc, obs) => {
          const cat = obs.category ?? 'Non catégorisée'
          if (!acc[cat]) acc[cat] = []
          acc[cat].push(obs)
          return acc
        }, {} as Record<string, Observation[]>)
      )
        .map(([category, items]) => ({ category, items }))
        .sort((a, b) => a.category.localeCompare(b.category))
    : [{ category: '', items: displayedObs }]

  async function updateStatus(obsId: string, status: ObservationStatus) {
    const res = await fetch('/api/installer/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ observation_id: obsId, installer_token_id: token.id, status }),
    })
    if (res.ok) {
      const data = await res.json()
      setObservations((prev) => prev.map((o) => (o.id === obsId ? data as Observation : o)))
      if (selectedObs?.id === obsId) setSelectedObs(data as Observation)
    }
  }

  async function loadComments(obsId: string) {
    const { data } = await supabase
      .from('observation_comments')
      .select('*')
      .eq('observation_id', obsId)
      .order('created_at', { ascending: true })
    if (data) setCommentsList((prev) => ({ ...prev, [obsId]: data as ObservationComment[] }))
  }

  function handlePhotoSelect(obsId: string, file: File) {
    const prev = photoPreview[obsId]
    if (prev) URL.revokeObjectURL(prev)
    setAttachedPhoto((p) => ({ ...p, [obsId]: file }))
    setPhotoPreview((p) => ({ ...p, [obsId]: URL.createObjectURL(file) }))
  }

  function removeAttachedPhoto(obsId: string) {
    const prev = photoPreview[obsId]
    if (prev) URL.revokeObjectURL(prev)
    setAttachedPhoto((p) => ({ ...p, [obsId]: null }))
    setPhotoPreview((p) => ({ ...p, [obsId]: null }))
  }

  async function sendComment(obsId: string) {
    const content = comments[obsId]?.trim()
    const photo = attachedPhoto[obsId]
    if (!content && !photo) return
    setSending(obsId)
    try {
      let photoUrl: string | undefined
      if (photo) {
        const compressed = await compressImage(photo)
        const fd = new FormData()
        fd.append('file', compressed)
        fd.append('observation_id', obsId)
        fd.append('installer_token_id', token.id)
        const photoRes = await fetch('/api/installer/photo', { method: 'POST', body: fd })
        if (photoRes.ok) {
          const { file_url } = await photoRes.json()
          photoUrl = file_url
        }
      }
      const commentRes = await fetch('/api/installer/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observation_id: obsId,
          installer_token_id: token.id,
          installer_name: token.name,
          content: content || '',
          photo_url: photoUrl,
        }),
      })
      if (commentRes.ok) {
        const data = await commentRes.json()
        setCommentsList((prev) => ({
          ...prev,
          [obsId]: [...(prev[obsId] ?? []), data as ObservationComment],
        }))
      }
      setComments((prev) => ({ ...prev, [obsId]: '' }))
      removeAttachedPhoto(obsId)
    } finally {
      setSending(null)
    }
  }

  async function fetchSuggestions(obs: Observation) {
    setLoadingSuggestions(obs.id)
    setSuggestions((prev) => ({ ...prev, [obs.id]: [] }))
    try {
      const res = await fetch('/api/ai/suggest-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observation_title: obs.title,
          observation_description: obs.description,
          comments: commentsList[obs.id] ?? [],
        }),
      })
      if (res.ok) {
        const { suggestions: s } = await res.json()
        setSuggestions((prev) => ({ ...prev, [obs.id]: s }))
      }
    } finally {
      setLoadingSuggestions(null)
    }
  }

  function handleExpand(obsId: string) {
    if (expanded === obsId) {
      setExpanded(null)
    } else {
      setExpanded(obsId)
      loadComments(obsId)
      const newSet = new Set([...seenIds, obsId])
      setSeenIds(newSet)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...newSet])) } catch {}
    }
  }

  async function handleExport(fmt: 'pdf' | 'excel') {
    setExporting(true)
    setExportMenuOpen(false)
    try {
      const res = await fetch(`/api/installer/export?token=${tokenString}&format=${fmt}`)
      if (!res.ok) return
      if (fmt === 'pdf') {
        const html = await res.text()
        const win = window.open('', '_blank')
        if (win) { win.document.write(html); win.document.close() }
      } else {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `controle_${tokenString.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setExporting(false)
    }
  }

  function renderObsCard(obs: Observation) {
    const obsIsNew = isNew(obs)
    const lastComment = lastComments[obs.id]
    return (
      <div key={obs.id} className={`bg-white border rounded-xl overflow-hidden transition-colors ${obsIsNew ? 'border-blue-300' : 'border-slate-200'}`}>
        <button onClick={() => handleExpand(obs.id)} className="w-full text-left p-4 flex items-start gap-3">
          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${STATUS_DOT_COLORS[obs.status]}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-slate-800 truncate">{obs.title}</p>
              {obsIsNew && (
                <span className="flex-shrink-0 text-xs px-1.5 py-0.5 bg-blue-600 text-white rounded-full font-medium">
                  Nouveau
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[obs.status]}`}>
                {STATUS_LABELS[obs.status]}
              </span>
              <span className="text-xs text-slate-400">{PRIORITY_LABELS[obs.priority]}</span>
              <span className="text-xs text-slate-300">
                {format(new Date(obs.created_at), 'dd MMM yyyy', { locale: fr })}
              </span>
            </div>
            {lastComment && expanded !== obs.id && (
              <p className="text-xs text-slate-400 mt-1.5 truncate flex items-center gap-1">
                <MessageSquare className="w-3 h-3 flex-shrink-0" />
                <span className="font-medium">
                  {lastComment.author_id ? 'Conducteur' : (lastComment.installer_name ?? 'Installateur')} :
                </span>
                &nbsp;{lastComment.content}
              </p>
            )}
          </div>
          {expanded === obs.id
            ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
            : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
        </button>

        {expanded === obs.id && (
          <div className="border-t border-slate-100 p-4 space-y-4">
            {obs.description && <p className="text-sm text-slate-600">{obs.description}</p>}
            {obs.due_date && (
              <p className="text-xs text-orange-500">
                Échéance : {format(new Date(obs.due_date), 'dd MMMM yyyy', { locale: fr })}
              </p>
            )}

            {(obs as any).observation_photos?.some((p: any) => p.file_url) && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Photos</p>
                <div className="grid grid-cols-3 gap-2">
                  {(obs as any).observation_photos.filter((p: any) => p.file_url).map((p: any) => (
                    <button key={p.id} onClick={() => setLightbox(p.file_url)}
                      className="aspect-square rounded-lg overflow-hidden bg-slate-100 hover:opacity-90 transition-opacity">
                      <img src={p.file_url} alt="Photo" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {canEdit && (
              <div className="flex gap-2">
                <button onClick={() => updateStatus(obs.id, 'resolue')}
                  disabled={obs.status === 'resolue' || obs.status === 'validee'}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <CheckCircle className="w-4 h-4" />
                  Marquer résolue
                </button>
                <button onClick={() => updateStatus(obs.id, 'contestee')}
                  disabled={obs.status === 'contestee'}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <AlertTriangle className="w-4 h-4" />
                  Contester
                </button>
              </div>
            )}

            <div>
              <h4 className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Commentaires
              </h4>

              {(commentsList[obs.id] ?? []).length > 0 && (
                <div className="space-y-2 mb-3">
                  {(commentsList[obs.id] ?? []).map((c) => (
                    <div key={c.id} className={`rounded-lg p-2.5 ${c.author_id ? 'bg-blue-50 ml-4' : 'bg-slate-50 mr-4'}`}>
                      <div className="flex items-center gap-1 mb-0.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="text-xs font-medium text-slate-500">
                          {c.author_id ? 'Conducteur' : (c.installer_name ?? 'Installateur')}
                        </span>
                        <span className="text-xs text-slate-300 ml-auto">{format(new Date(c.created_at), 'dd/MM HH:mm')}</span>
                      </div>
                      {c.content && <p className="text-sm text-slate-700">{c.content}</p>}
                      {(c as any).photo_url && (
                        <img src={(c as any).photo_url} alt="Photo" className="mt-1.5 rounded-lg max-h-40 object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {canEdit && (
                <div className="mb-2">
                  {(suggestions[obs.id] ?? []).length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-xs text-violet-500 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Suggestions IA
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestions[obs.id].map((s, i) => (
                          <button key={i} type="button"
                            onClick={() => {
                              setComments((prev) => ({ ...prev, [obs.id]: s }))
                              setSuggestions((prev) => ({ ...prev, [obs.id]: [] }))
                            }}
                            className="text-xs px-2.5 py-1 bg-violet-50 border border-violet-200 text-violet-700 rounded-full hover:bg-violet-100 transition-colors text-left">
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fetchSuggestions(obs)}
                      disabled={loadingSuggestions === obs.id}
                      className="flex items-center gap-1.5 text-xs text-violet-500 hover:text-violet-700 disabled:opacity-50 transition-colors">
                      {loadingSuggestions === obs.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Sparkles className="w-3 h-3" />}
                      Suggérer une réponse avec l'IA
                    </button>
                  )}
                </div>
              )}

              {photoPreview[obs.id] && (
                <div className="relative inline-block mb-2">
                  <img src={photoPreview[obs.id]!} alt="Aperçu" className="h-20 rounded-lg object-cover border border-slate-200" />
                  <button onClick={() => removeAttachedPhoto(obs.id)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <input ref={activePhotoObs === obs.id ? photoInputRef : undefined}
                type="file" accept="image/*" capture={mobile ? 'environment' : undefined}
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) handlePhotoSelect(obs.id, file)
                  e.target.value = ''
                }}
              />

              <div className="flex gap-2">
                <input value={comments[obs.id] ?? ''}
                  onChange={(e) => setComments({ ...comments, [obs.id]: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(obs.id) } }}
                  placeholder="Votre commentaire..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                <button type="button"
                  onClick={() => { setActivePhotoObs(obs.id); setTimeout(() => photoInputRef.current?.click(), 0) }}
                  className="p-2 border border-slate-200 text-slate-500 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors" title="Joindre une photo">
                  {mobile ? <Camera className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                </button>
                <button onClick={() => sendComment(obs.id)}
                  disabled={sending === obs.id || (!comments[obs.id]?.trim() && !attachedPhoto[obs.id])}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {sending === obs.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white py-4 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-bold">SiteSuivi</h1>
                <p className="text-slate-400 text-xs">Accès installateur</p>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white transition-colors disabled:opacity-50"
              >
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                Exporter
              </button>
              {exportMenuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 min-w-[160px]">
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    <FileDown className="w-4 h-4 text-red-500" />
                    Export PDF
                  </button>
                  <div className="h-px bg-slate-100" />
                  <button
                    onClick={() => handleExport('excel')}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    <FileDown className="w-4 h-4 text-green-600" />
                    Excel contrôle
                  </button>
                </div>
              )}
            </div>
          </div>
          <h2 className="text-lg font-semibold">{token.projects?.name}</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            {token.name}{token.company && ` — ${token.company}`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex">
          <button onClick={() => setView('list')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
              view === 'list' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            <List className="w-4 h-4" />
            Réserves ({observations.length})
            {newCount > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
                {newCount}
              </span>
            )}
          </button>
          {plans.length > 0 && (
            <button onClick={() => setView('plan')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
                view === 'plan' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              <Map className="w-4 h-4" />
              Plans ({plans.length})
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-slate-900">{observations.length}</p>
            <p className="text-xs text-slate-500">Total</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-red-700">{openCount}</p>
            <p className="text-xs text-red-600">Ouvertes</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-green-700">{resolvedCount}</p>
            <p className="text-xs text-green-600">Résolues</p>
          </div>
        </div>

        {/* ── VUE LISTE ── */}
        {view === 'list' && (
          <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex gap-2 flex-wrap items-center">
              <button
                onClick={() => { setQuickFilter(!quickFilter); setFilterStatus('all') }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  quickFilter ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300'
                }`}>
                <Zap className="w-3.5 h-3.5" />
                À traiter ({todoCount})
              </button>

              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="text-xs text-slate-700 bg-transparent focus:outline-none">
                  <option value="date_desc">Plus récentes</option>
                  <option value="date_asc">Plus anciennes</option>
                  <option value="priority">Par priorité</option>
                  <option value="status">Par statut</option>
                </select>
              </div>

              {!quickFilter && (
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                    className="text-xs text-slate-700 bg-transparent focus:outline-none">
                    <option value="all">Tous ({observations.length})</option>
                    <option value="ouverte">Ouvertes ({observations.filter((o) => o.status === 'ouverte').length})</option>
                    <option value="en_cours">En cours ({observations.filter((o) => o.status === 'en_cours').length})</option>
                    <option value="contestee">Contestées ({observations.filter((o) => o.status === 'contestee').length})</option>
                    <option value="resolue">Résolues ({observations.filter((o) => o.status === 'resolue').length})</option>
                    <option value="validee">Validées ({observations.filter((o) => o.status === 'validee').length})</option>
                  </select>
                </div>
              )}

              <button
                onClick={() => setGroupByCategory(!groupByCategory)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  groupByCategory ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                }`}>
                <Tag className="w-3.5 h-3.5" />
                Par catégorie
              </button>

              {newCount > 0 && (
                <button onClick={markAllAsSeen}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-white border-slate-200 text-slate-600 hover:border-slate-300 transition-colors">
                  <Eye className="w-3.5 h-3.5" />
                  Tout marquer lu ({newCount})
                </button>
              )}
            </div>

            {grouped.map(({ category, items }) => (
              <div key={category || '__all'}>
                {groupByCategory && (
                  <div className="flex items-center gap-2 py-2">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{category}</span>
                    <span className="text-xs text-slate-400">({items.length})</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                )}
                <div className="space-y-3">
                  {items.map(renderObsCard)}
                </div>
              </div>
            ))}

            {displayedObs.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
                <p className="font-medium">
                  {quickFilter ? 'Aucune observation à traiter' : filterStatus !== 'all' ? 'Aucune observation dans ce filtre' : 'Aucune observation'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── VUE PLAN ── */}
        {view === 'plan' && plans.length > 0 && (
          <div className="space-y-3">
            {plans.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {plans.map((p) => (
                  <button key={p.id} onClick={() => setSelectedPlanId(p.id)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedPlanId === p.id ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
                    }`}>
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            {selectedPlan && (
              <div className="h-[65vh] rounded-xl overflow-hidden">
                <PlanViewer planUrl={selectedPlan.file_url} observations={planObs} canAddPin={false} onPinClick={(obs) => setSelectedObs(obs)} />
              </div>
            )}
            <p className="text-xs text-slate-400 text-center">
              {planObs.length} observation{planObs.length !== 1 ? 's' : ''} sur ce plan — cliquez sur un pin pour les détails
            </p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/85 z-[100] flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Photo" className="max-w-full max-h-full object-contain rounded-lg" />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      )}

      {/* Drawer depuis plan */}
      {selectedObs && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between p-4 border-b border-slate-100 sticky top-0 bg-white">
              <div>
                <h3 className="font-semibold text-slate-800">{selectedObs.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[selectedObs.status]}`}>
                  {STATUS_LABELS[selectedObs.status]}
                </span>
              </div>
              <button onClick={() => setSelectedObs(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {selectedObs.description && <p className="text-sm text-slate-600">{selectedObs.description}</p>}
              {selectedObs.due_date && (
                <p className="text-xs text-orange-500">
                  Échéance : {format(new Date(selectedObs.due_date), 'dd MMMM yyyy', { locale: fr })}
                </p>
              )}
              {canEdit && (
                <div className="flex gap-2 pt-2">
                  <button onClick={() => { updateStatus(selectedObs.id, 'resolue'); setSelectedObs(null) }}
                    disabled={selectedObs.status === 'resolue' || selectedObs.status === 'validee'}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-40 transition-colors">
                    <CheckCircle className="w-4 h-4" />
                    Marquer résolue
                  </button>
                  <button onClick={() => { updateStatus(selectedObs.id, 'contestee'); setSelectedObs(null) }}
                    disabled={selectedObs.status === 'contestee'}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600 disabled:opacity-40 transition-colors">
                    <AlertTriangle className="w-4 h-4" />
                    Contester
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
