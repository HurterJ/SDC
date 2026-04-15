import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { STATUS_LABELS, PRIORITY_LABELS } from '@/lib/utils/status'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const projectId = searchParams.get('projectId')
  const format = searchParams.get('format') // 'excel' | 'pdf'
  const title = searchParams.get('title') ?? ''
  const subtitle = searchParams.get('subtitle') ?? ''
  const filterStatus = searchParams.get('filterStatus') ?? ''
  const showPhotos = searchParams.get('showPhotos') !== '0'
  const colorMode = searchParams.get('colorMode') !== '0'

  if (!projectId || !format) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await supabase
    .from('projects')
    .select('name, address, description')
    .eq('id', projectId)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { data: allObs } = await supabase
    .from('observations')
    .select('*, observation_photos(id, file_url, file_path)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (!allObs) {
    return NextResponse.json({ error: 'No data' }, { status: 404 })
  }

  // Filtrer par statuts si précisé
  const statusFilter = filterStatus ? filterStatus.split(',') : []
  const observations = statusFilter.length > 0
    ? allObs.filter((o) => statusFilter.includes(o.status))
    : allObs

  if (format === 'excel') {
    return exportExcel(project, observations, colorMode)
  } else if (format === 'pdf') {
    return exportPdf(project, observations, {
      title: title || `Rapport de Réserves — ${project?.name ?? 'Projet'}`,
      subtitle,
      showPhotos,
      colorMode,
    })
  }

  return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
}