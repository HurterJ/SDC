import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

  let query = supabase
    .from('observations')
    .select('*, observation_photos(id, file_url)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  const { data: allObs } = await query

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

async function exportExcel(project: any, observations: any[], colorMode: boolean) {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Réserves')

  const headerFill = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FF1E3A5F' },
  }
  const headerFont = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 }

  sheet.mergeCells('A1:I1')
  const titleCell = sheet.getCell('A1')
  titleCell.value = `RAPPORT DE RÉSERVES — ${project?.name?.toUpperCase() ?? 'PROJET'}`
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1E3A5F' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(1).height = 30

  sheet.mergeCells('A2:I2')
  const dateCell = sheet.getCell('A2')
  dateCell.value = `Généré le ${new Date().toLocaleDateString('fr-FR')} — ${project?.address ?? ''}`
  dateCell.font = { italic: true, color: { argb: 'FF666666' } }
  dateCell.alignment = { horizontal: 'center' }

  const headers = ['N°', 'Titre', 'Statut', 'Priorité', 'Catégorie', 'Créé le', 'Échéance', 'Plan', 'Description']
  const headerRow = sheet.addRow(headers)
  headerRow.eachCell((cell) => {
    cell.fill = headerFill
    cell.font = headerFont
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } } }
  })
  sheet.getRow(3).height = 22

  sheet.columns = [
    { key: 'num', width: 5 },
    { key: 'title', width: 35 },
    { key: 'status', width: 14 },
    { key: 'priority', width: 12 },
    { key: 'category', width: 16 },
    { key: 'created', width: 14 },
    { key: 'due', width: 14 },
    { key: 'plan', width: 20 },
    { key: 'description', width: 40 },
  ]

  const statusColors: Record<string, string> = {
    ouverte: 'FFFFE0E0',
    en_cours: 'FFFFF3E0',
    resolue: 'FFE3F2FD',
    contestee: 'FFFFFDE7',
    validee: 'FFE8F5E9',
  }

  observations.forEach((obs, idx) => {
    const row = sheet.addRow([
      idx + 1,
      obs.title,
      STATUS_LABELS[obs.status as keyof typeof STATUS_LABELS] ?? obs.status,
      PRIORITY_LABELS[obs.priority as keyof typeof PRIORITY_LABELS] ?? obs.priority,
      obs.category ?? '',
      obs.created_at ? new Date(obs.created_at).toLocaleDateString('fr-FR') : '',
      obs.due_date ? new Date(obs.due_date).toLocaleDateString('fr-FR') : '',
      '',
      obs.description ?? '',
    ])

    const bgColor = colorMode ? (statusColors[obs.status] ?? 'FFFFFFFF') : 'FFFFFFFF'
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
      cell.alignment = { wrapText: true, vertical: 'middle' }
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } } }
    })
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
  })

  sheet.views = [{ state: 'frozen', ySplit: 3 }]

  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `reserves_${project?.name?.replace(/\s+/g, '_') ?? 'projet'}_${new Date().toISOString().split('T')[0]}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

interface PdfOptions {
  title: string
  subtitle: string
  showPhotos: boolean
  colorMode: boolean
}

function statusBadgeStyle(status: string, colorMode: boolean): string {
  if (!colorMode) return 'background:#e2e8f0;color:#475569'
  const map: Record<string, string> = {
    ouverte: 'background:#fee2e2;color:#dc2626',
    en_cours: 'background:#ffedd5;color:#ea580c',
    resolue: 'background:#dbeafe;color:#2563eb',
    contestee: 'background:#fef9c3;color:#ca8a04',
    validee: 'background:#dcfce7;color:#16a34a',
  }
  return map[status] ?? 'background:#f1f5f9;color:#475569'
}

function priorityBadgeStyle(priority: string, colorMode: boolean): string {
  if (!colorMode) return 'background:#e2e8f0;color:#475569'
  const map: Record<string, string> = {
    critique: 'background:#fee2e2;color:#dc2626',
    haute: 'background:#ffedd5;color:#ea580c',
    normale: 'background:#dbeafe;color:#2563eb',
    basse: 'background:#f1f5f9;color:#475569',
  }
  return map[priority] ?? 'background:#f1f5f9;color:#475569'
}

async function exportPdf(project: any, observations: any[], opts: PdfOptions) {
  const date = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const counts = {
    ouverte: observations.filter((o) => o.status === 'ouverte').length,
    en_cours: observations.filter((o) => o.status === 'en_cours').length,
    resolue: observations.filter((o) => o.status === 'resolue').length,
    contestee: observations.filter((o) => o.status === 'contestee').length,
    validee: observations.filter((o) => o.status === 'validee').length,
  }

  const obsRows = observations.map((obs, i) => {
    const photos = opts.showPhotos && obs.observation_photos?.length > 0
      ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
          ${obs.observation_photos.slice(0, 4).map((p: any) =>
            `<img src="${p.file_url}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;" />`
          ).join('')}
        </div>`
      : ''

    return `
      <tr>
        <td style="text-align:center;padding:8px 6px;border-bottom:1px solid #e2e8f0;font-size:10px;color:#64748b;">${i + 1}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;max-width:260px;">
          <strong style="font-size:11px;color:#0f172a;">${obs.title}</strong>
          ${obs.description ? `<br><span style="font-size:9px;color:#64748b;">${obs.description.substring(0, 120)}${obs.description.length > 120 ? '…' : ''}</span>` : ''}
          ${photos}
        </td>
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;">
          <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:9px;font-weight:600;${statusBadgeStyle(obs.status, opts.colorMode)}">
            ${STATUS_LABELS[obs.status as keyof typeof STATUS_LABELS] ?? obs.status}
          </span>
        </td>
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;">
          <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:9px;font-weight:600;${priorityBadgeStyle(obs.priority, opts.colorMode)}">
            ${PRIORITY_LABELS[obs.priority as keyof typeof PRIORITY_LABELS] ?? obs.priority}
          </span>
        </td>
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;font-size:10px;color:#64748b;">${obs.category ?? '—'}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;font-size:10px;color:#64748b;">${obs.created_at ? new Date(obs.created_at).toLocaleDateString('fr-FR') : '—'}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;font-size:10px;color:${obs.due_date ? '#ea580c' : '#94a3b8'};">${obs.due_date ? new Date(obs.due_date).toLocaleDateString('fr-FR') : '—'}</td>
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${opts.title}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, Arial, sans-serif; color:#0f172a; background:#fff; }
    @media print {
      .no-print { display:none !important; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>

  <!-- Bouton impression (masqué à l'impression) -->
  <div class="no-print" style="position:fixed;top:16px;right:16px;z-index:999;">
    <button onclick="window.print()" style="background:#1e3a5f;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600;">
      🖨 Imprimer / Enregistrer en PDF
    </button>
  </div>

  <!-- Page de garde -->
  <div style="min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:60px 60px;page-break-after:always;">
    <div style="width:60px;height:6px;background:#1e3a5f;border-radius:3px;margin-bottom:32px;"></div>
    <h1 style="font-size:36px;font-weight:800;color:#0f172a;line-height:1.2;margin-bottom:16px;">${opts.title}</h1>
    ${opts.subtitle ? `<p style="font-size:18px;color:#475569;margin-bottom:8px;">${opts.subtitle}</p>` : ''}
    <p style="font-size:14px;color:#94a3b8;margin-top:8px;">${project?.address ?? ''}</p>
    <div style="margin-top:48px;padding:24px;background:#f8fafc;border-radius:12px;display:inline-block;">
      <p style="font-size:13px;color:#64748b;">Généré le <strong style="color:#0f172a;">${date}</strong></p>
      <p style="font-size:13px;color:#64748b;margin-top:4px;">${observations.length} réserve${observations.length !== 1 ? 's' : ''} dans ce rapport</p>
    </div>
    <!-- Récap statuts -->
    <div style="display:flex;gap:12px;margin-top:32px;flex-wrap:wrap;">
      ${Object.entries(counts).filter(([, v]) => v > 0).map(([s, v]) => `
        <div style="padding:12px 20px;border-radius:8px;${statusBadgeStyle(s, opts.colorMode)}">
          <span style="font-size:24px;font-weight:800;">${v}</span>
          <br><span style="font-size:11px;">${STATUS_LABELS[s as keyof typeof STATUS_LABELS]}</span>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- Tableau des observations -->
  <div style="padding:40px 40px;">
    <h2 style="font-size:18px;font-weight:700;color:#1e3a5f;margin-bottom:20px;padding-bottom:8px;border-bottom:2px solid #e2e8f0;">
      Détail des réserves
    </h2>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#1e3a5f;">
          <th style="padding:8px 6px;color:white;font-size:10px;text-align:center;width:32px;">N°</th>
          <th style="padding:8px 10px;color:white;font-size:10px;text-align:left;">Titre</th>
          <th style="padding:8px 6px;color:white;font-size:10px;text-align:left;">Statut</th>
          <th style="padding:8px 6px;color:white;font-size:10px;text-align:left;">Priorité</th>
          <th style="padding:8px 6px;color:white;font-size:10px;text-align:left;">Catégorie</th>
          <th style="padding:8px 6px;color:white;font-size:10px;text-align:left;">Date</th>
          <th style="padding:8px 6px;color:white;font-size:10px;text-align:left;">Échéance</th>
        </tr>
      </thead>
      <tbody>
        ${obsRows}
      </tbody>
    </table>
  </div>

  <div style="padding:20px 40px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:9px;text-align:center;">
    SiteSuivi — Rapport généré automatiquement le ${date}
  </div>

  <script>
    // Auto-print après chargement des images
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 800);
    });
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
