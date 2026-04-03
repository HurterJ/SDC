import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { STATUS_LABELS, PRIORITY_LABELS } from '@/lib/utils/status'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const projectId = searchParams.get('projectId')
  const format = searchParams.get('format') // 'excel' | 'pdf'

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

  const { data: observations } = await supabase
    .from('observations')
    .select('*, observation_photos(id, file_url)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (!observations) {
    return NextResponse.json({ error: 'No data' }, { status: 404 })
  }

  if (format === 'excel') {
    return exportExcel(project, observations)
  } else if (format === 'pdf') {
    return exportPdf(project, observations)
  }

  return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
}

async function exportExcel(project: any, observations: any[]) {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Réserves')

  // Header styles
  const headerFill = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FF1E3A5F' },
  }
  const headerFont = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 }

  // Title
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

  // Column headers
  const headers = ['N°', 'Titre', 'Statut', 'Priorité', 'Catégorie', 'Créé le', 'Échéance', 'Plan', 'Description']
  const headerRow = sheet.addRow(headers)
  headerRow.eachCell((cell) => {
    cell.fill = headerFill
    cell.font = headerFont
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
    }
  })
  sheet.getRow(3).height = 22

  // Column widths
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

  // Status colors
  const statusColors: Record<string, string> = {
    ouverte: 'FFFFE0E0',
    en_cours: 'FFFFF3E0',
    resolue: 'FFE3F2FD',
    contestee: 'FFFFFDE7',
    validee: 'FFE8F5E9',
  }

  // Data rows
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

    const bgColor = statusColors[obs.status] ?? 'FFFFFFFF'
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
      cell.alignment = { wrapText: true, vertical: 'middle' }
      cell.border = {
        bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } },
      }
    })
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
  })

  // Freeze top rows
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

async function exportPdf(project: any, observations: any[]) {
  const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a2e; }
    .header { background: #1e3a5f; color: white; padding: 20px 30px; }
    .header h1 { font-size: 20px; font-weight: bold; }
    .header p { font-size: 11px; opacity: 0.8; margin-top: 4px; }
    .meta { padding: 12px 30px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .meta p { color: #64748b; font-size: 10px; }
    .content { padding: 20px 30px; }
    .stats { display: flex; gap: 12px; margin-bottom: 20px; }
    .stat { background: #f1f5f9; border-radius: 8px; padding: 10px 16px; flex: 1; }
    .stat .value { font-size: 22px; font-weight: bold; color: #1e3a5f; }
    .stat .label { font-size: 9px; color: #64748b; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1e3a5f; color: white; padding: 8px 10px; text-align: left; font-size: 10px; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 10px; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: bold; }
    .status-ouverte { background: #fee2e2; color: #dc2626; }
    .status-en_cours { background: #ffedd5; color: #ea580c; }
    .status-resolue { background: #dbeafe; color: #2563eb; }
    .status-contestee { background: #fef9c3; color: #ca8a04; }
    .status-validee { background: #dcfce7; color: #16a34a; }
    .priority-critique { background: #fee2e2; color: #dc2626; }
    .priority-haute { background: #ffedd5; color: #ea580c; }
    .priority-normale { background: #dbeafe; color: #2563eb; }
    .priority-basse { background: #f1f5f9; color: #475569; }
    .footer { margin-top: 30px; padding: 12px 30px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 9px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Rapport de Réserves — ${project?.name ?? 'Projet'}</h1>
    <p>${project?.address ?? ''}</p>
  </div>
  <div class="meta">
    <p>Généré le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • ${observations.length} observations au total</p>
  </div>
  <div class="content">
    <div class="stats">
      ${(['ouverte', 'en_cours', 'resolue', 'contestee', 'validee'] as const).map((s) => {
        const count = observations.filter((o) => o.status === s).length
        return `<div class="stat"><div class="value">${count}</div><div class="label">${STATUS_LABELS[s]}</div></div>`
      }).join('')}
    </div>
    <table>
      <thead>
        <tr>
          <th>N°</th>
          <th>Titre</th>
          <th>Statut</th>
          <th>Priorité</th>
          <th>Catégorie</th>
          <th>Date</th>
          <th>Échéance</th>
        </tr>
      </thead>
      <tbody>
        ${observations.map((obs, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>
              <strong>${obs.title}</strong>
              ${obs.description ? `<br><span style="color:#64748b;font-size:9px;">${obs.description.substring(0, 100)}${obs.description.length > 100 ? '…' : ''}</span>` : ''}
            </td>
            <td><span class="badge status-${obs.status}">${STATUS_LABELS[obs.status as keyof typeof STATUS_LABELS] ?? obs.status}</span></td>
            <td><span class="badge priority-${obs.priority}">${PRIORITY_LABELS[obs.priority as keyof typeof PRIORITY_LABELS] ?? obs.priority}</span></td>
            <td>${obs.category ?? '—'}</td>
            <td>${obs.created_at ? new Date(obs.created_at).toLocaleDateString('fr-FR') : '—'}</td>
            <td>${obs.due_date ? new Date(obs.due_date).toLocaleDateString('fr-FR') : '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  <div class="footer">SiteSuivi — Rapport généré automatiquement</div>
</body>
</html>`

  // Return HTML as PDF-ready document (Puppeteer would be used in production)
  // For now, return the HTML which browsers can print to PDF
  const filename = `reserves_${project?.name?.replace(/\s+/g, '_') ?? 'projet'}_${new Date().toISOString().split('T')[0]}.html`

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
