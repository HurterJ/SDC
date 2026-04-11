import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATUS_LABELS: Record<string, string> = {
  ouverte: 'Ouverte', en_cours: 'En cours', resolue: 'Résolue',
  contestee: 'Contestée', validee: 'Validée',
}
const STATUS_BG: Record<string, string> = {
  ouverte: '#fee2e2', en_cours: '#dbeafe', resolue: '#dcfce7',
  contestee: '#fef9c3', validee: '#d1fae5',
}
const STATUS_TEXT: Record<string, string> = {
  ouverte: '#dc2626', en_cours: '#2563eb', resolue: '#16a34a',
  contestee: '#ca8a04', validee: '#059669',
}
const STATUS_BORDER: Record<string, string> = {
  ouverte: '#fca5a5', en_cours: '#93c5fd', resolue: '#86efac',
  contestee: '#fde047', validee: '#6ee7b7',
}
// ExcelJS ARGB colors
const STATUS_ARGB: Record<string, string> = {
  ouverte: 'FFFEE2E2', en_cours: 'FFDBEAFE', resolue: 'FFDCFCE7',
  contestee: 'FFFEF9C3', validee: 'FFD1FAE5',
}

export async function GET(req: NextRequest) {
  const tokenStr = req.nextUrl.searchParams.get('token')
  const exportFormat = req.nextUrl.searchParams.get('format') ?? 'pdf'
  if (!tokenStr) return new NextResponse('Missing token', { status: 400 })

  const admin = createAdminClient()

  const { data: tokenData } = await admin
    .from('installer_tokens')
    .select('*, projects(id, name)')
    .eq('token', tokenStr)
    .eq('is_active', true)
    .single()

  if (!tokenData) return new NextResponse('Invalid token', { status: 401 })

  const { data: rawObs } = await admin
    .from('observations')
    .select('*, observation_photos(id, file_path), observation_comments(id, content, created_at, installer_name, author_id)')
    .eq('project_id', tokenData.project_id)
    .order('created_at', { ascending: false })

  const obs = rawObs ?? []
  const projectName = (tokenData.projects as any)?.name ?? 'Projet'

  if (exportFormat === 'excel') {
    return exportExcel(obs, tokenData, projectName)
  }
  return exportPdf(obs, tokenData, projectName, admin)
}

// ── EXCEL ─────────────────────────────────────────────────────────────────────

async function exportExcel(obs: any[], tokenData: any, projectName: string) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SiteSuivi'
  wb.created = new Date()

  const sheet = wb.addWorksheet('Contrôle réserves', {
    views: [{ state: 'frozen', ySplit: 4 }],
  })

  // ── Titre ──
  sheet.mergeCells('A1:N1')
  const t = sheet.getCell('A1')
  t.value = `FICHE DE CONTRÔLE — ${projectName.toUpperCase()}`
  t.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
  t.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(1).height = 32

  // ── Sous-titre ──
  sheet.mergeCells('A2:N2')
  const sub = sheet.getCell('A2')
  sub.value = `Installateur : ${tokenData.name}${tokenData.company ? ` (${tokenData.company})` : ''} · Généré le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`
  sub.font = { italic: true, size: 10, color: { argb: 'FF64748B' } }
  sub.alignment = { horizontal: 'center' }
  sheet.getRow(2).height = 18

  // ── Stats ──
  const stats = [
    ['Total', obs.length, 'FFF1F5F9'],
    ['Ouvertes', obs.filter(o => o.status === 'ouverte').length, 'FFFEE2E2'],
    ['En cours', obs.filter(o => o.status === 'en_cours').length, 'FFDBEAFE'],
    ['Contestées', obs.filter(o => o.status === 'contestee').length, 'FFFEF9C3'],
    ['Résolues', obs.filter(o => o.status === 'resolue' || o.status === 'validee').length, 'FFDCFCE7'],
  ]
  sheet.mergeCells('A3:B3'); sheet.mergeCells('C3:D3'); sheet.mergeCells('E3:F3')
  sheet.mergeCells('G3:H3'); sheet.mergeCells('I3:J3')
  const statCols = ['A', 'C', 'E', 'G', 'I']
  stats.forEach(([label, val, color], i) => {
    const cell = sheet.getCell(`${statCols[i]}3`)
    cell.value = `${label} : ${val}`
    cell.font = { bold: true, size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color as string } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  sheet.getRow(3).height = 20

  // ── En-têtes ──
  const headers = [
    { header: 'N°', key: 'num', width: 5 },
    { header: 'Titre', key: 'title', width: 30 },
    { header: 'Description', key: 'desc', width: 36 },
    { header: 'Statut', key: 'status', width: 14 },
    { header: 'Priorité', key: 'priority', width: 12 },
    { header: 'Catégorie', key: 'category', width: 16 },
    { header: 'Créée le', key: 'created', width: 13 },
    { header: 'Échéance', key: 'due', width: 13 },
    { header: 'Résolue le', key: 'resolved', width: 13 },
    { header: 'Nb. photos', key: 'photos', width: 11 },
    { header: 'Nb. commentaires', key: 'comments', width: 16 },
    { header: 'Dernier commentaire', key: 'lastcomment', width: 36 },
    { header: 'Par', key: 'lastauthor', width: 14 },
    { header: '✓ Vérifié', key: 'check', width: 11 },
  ]
  sheet.columns = headers
  const headerRow = sheet.getRow(4)
  headerRow.values = headers.map(h => h.header)
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF475569' } } }
  })
  headerRow.height = 22

  // ── Données ──
  obs.forEach((o, idx) => {
    const comments = o.observation_comments ?? []
    const sorted = [...comments].sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const last = sorted[0]
    const photoCount = (o.observation_photos ?? []).length

    const row = sheet.addRow([
      idx + 1,
      o.title,
      o.description ?? '',
      STATUS_LABELS[o.status] ?? o.status,
      o.priority === 'critique' ? 'Critique' : o.priority === 'haute' ? 'Haute' : o.priority === 'normale' ? 'Normale' : 'Basse',
      o.category ?? '',
      o.created_at ? new Date(o.created_at).toLocaleDateString('fr-FR') : '',
      o.due_date ? new Date(o.due_date).toLocaleDateString('fr-FR') : '',
      o.resolved_at ? new Date(o.resolved_at).toLocaleDateString('fr-FR') : '',
      photoCount,
      comments.length,
      last?.content ?? '',
      last ? (last.author_id ? 'Conducteur' : (last.installer_name ?? 'Installateur')) : '',
      '',
    ])

    const bgArgb = STATUS_ARGB[o.status] ?? 'FFFFFFFF'
    row.eachCell((cell, colNum) => {
      if (colNum <= 13) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } }
      }
      cell.alignment = { wrapText: true, vertical: 'middle' }
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } }
    })
    // Colonne "Vérifié" — fond blanc, bordure pour écrire manuellement
    const checkCell = row.getCell(14)
    checkCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
    checkCell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    }

    // Colonne N° centrée
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    // Nb. photos et commentaires centrés
    row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' }
    row.height = 28
  })

  const filename = `controle_${(projectName).replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

// ── PDF ───────────────────────────────────────────────────────────────────────

async function exportPdf(obs: any[], tokenData: any, projectName: string, admin: any) {
  async function toBase64(filePath: string): Promise<string | null> {
    try {
      const { data, error } = await admin.storage.from('photos').download(filePath)
      if (error || !data) return null
      const buf = Buffer.from(await data.arrayBuffer()).toString('base64')
      return `data:${data.type || 'image/jpeg'};base64,${buf}`
    } catch { return null }
  }

  const obsWithPhotos = await Promise.all(
    obs.map(async (o: any) => {
      const photos = o.observation_photos ?? []
      const dataUrls = await Promise.all(
        photos.slice(0, 4).map((p: any) => p.file_path ? toBase64(p.file_path) : null)
      )
      return { ...o, _photoDataUrls: dataUrls.filter(Boolean) }
    })
  )

  const totalByStatus = {
    ouverte: obs.filter((o) => o.status === 'ouverte').length,
    en_cours: obs.filter((o) => o.status === 'en_cours').length,
    contestee: obs.filter((o) => o.status === 'contestee').length,
    resolue: obs.filter((o) => o.status === 'resolue').length,
    validee: obs.filter((o) => o.status === 'validee').length,
  }

  const todo = obsWithPhotos.filter((o) => ['ouverte', 'en_cours', 'contestee'].includes(o.status))
  const done = obsWithPhotos.filter((o) => ['resolue', 'validee'].includes(o.status))

  function renderObs(o: any) {
    const sortedComments = (o.observation_comments ?? []).sort(
      (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    const lastComment = sortedComments[sortedComments.length - 1]
    const bg = STATUS_BG[o.status] ?? '#f8fafc'
    const border = STATUS_BORDER[o.status] ?? '#e2e8f0'
    const textColor = STATUS_TEXT[o.status] ?? '#64748b'
    const photoHtml = (o._photoDataUrls ?? []).length > 0
      ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
          ${(o._photoDataUrls as string[]).map((src) =>
            `<img src="${src}" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid ${border};" />`
          ).join('')}
         </div>`
      : ''

    return `
      <div style="background:${bg};border:1px solid ${border};border-radius:8px;padding:12px 14px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">
          <span style="font-weight:600;font-size:13px;color:#1e293b;">${o.title}</span>
          <span style="font-size:11px;padding:2px 8px;border-radius:12px;background:${bg};color:${textColor};border:1px solid ${border};white-space:nowrap;">
            ${STATUS_LABELS[o.status] ?? o.status}
          </span>
        </div>
        ${o.description ? `<p style="font-size:12px;color:#475569;margin-bottom:4px;">${o.description}</p>` : ''}
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:4px;">
          ${o.category ? `<span style="font-size:11px;color:#94a3b8;">Catégorie : ${o.category}</span>` : ''}
          ${o.due_date ? `<span style="font-size:11px;color:#f97316;">Échéance : ${format(new Date(o.due_date), 'dd MMMM yyyy', { locale: fr })}</span>` : ''}
          <span style="font-size:11px;color:#94a3b8;">Créée le ${format(new Date(o.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
          ${o.resolved_at ? `<span style="font-size:11px;color:#16a34a;">Résolue le ${format(new Date(o.resolved_at), 'dd/MM/yyyy', { locale: fr })}</span>` : ''}
        </div>
        ${photoHtml}
        ${lastComment ? `
          <div style="margin-top:8px;padding:6px 10px;background:rgba(255,255,255,0.6);border-radius:6px;font-size:11px;color:#475569;">
            <strong>${lastComment.author_id ? 'Conducteur' : (lastComment.installer_name ?? 'Installateur')} :</strong>
            ${lastComment.content}
            <span style="color:#94a3b8;margin-left:8px;">${format(new Date(lastComment.created_at), 'dd/MM HH:mm')}</span>
          </div>
        ` : ''}
      </div>
    `
  }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport — ${projectName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; font-size: 13px; color: #1e293b; background: #fff; padding: 32px; max-width: 860px; margin: 0 auto; }
    .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .header p { color: #64748b; font-size: 12px; margin-bottom: 24px; }
    .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 28px; }
    .stat { border-radius: 8px; padding: 10px 12px; text-align: center; border: 1px solid #e2e8f0; }
    .stat-num { font-size: 22px; font-weight: 700; }
    .stat-label { font-size: 10px; color: #64748b; margin-top: 2px; }
    h2 { font-size: 14px; font-weight: 600; margin: 20px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; color: #334155; }
    .no-print { position: fixed; top: 16px; right: 16px; z-index: 999; display: flex; gap: 8px; }
    @media print { .no-print { display: none; } body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()" style="background:#1e3a5f;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600;">
      🖨 Imprimer / PDF
    </button>
  </div>

  <div class="header">
    <h1>Rapport de réserves — ${projectName}</h1>
    <p>
      Installateur : <strong>${tokenData.name}</strong>${tokenData.company ? ` (${tokenData.company})` : ''}
      &nbsp;·&nbsp; Généré le <strong>${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}</strong>
      &nbsp;·&nbsp; ${obs.length} observation${obs.length !== 1 ? 's' : ''} au total
    </p>
  </div>

  <div class="summary">
    <div class="stat" style="background:#f8fafc">
      <div class="stat-num">${obs.length}</div><div class="stat-label">Total</div>
    </div>
    <div class="stat" style="background:#fee2e2">
      <div class="stat-num" style="color:#dc2626">${totalByStatus.ouverte}</div><div class="stat-label">Ouvertes</div>
    </div>
    <div class="stat" style="background:#dbeafe">
      <div class="stat-num" style="color:#2563eb">${totalByStatus.en_cours}</div><div class="stat-label">En cours</div>
    </div>
    <div class="stat" style="background:#fef9c3">
      <div class="stat-num" style="color:#ca8a04">${totalByStatus.contestee}</div><div class="stat-label">Contestées</div>
    </div>
    <div class="stat" style="background:#dcfce7">
      <div class="stat-num" style="color:#16a34a">${totalByStatus.resolue + totalByStatus.validee}</div><div class="stat-label">Résolues</div>
    </div>
  </div>

  ${todo.length > 0 ? `<h2>À traiter (${todo.length})</h2>${todo.map(renderObs).join('')}` : ''}
  ${done.length > 0 ? `<h2>Résolues / Validées (${done.length})</h2>${done.map(renderObs).join('')}` : ''}
  ${todo.length === 0 && done.length === 0 ? '<p style="color:#94a3b8;font-style:italic;">Aucune observation.</p>' : ''}

  <script>window.onload = () => window.print()</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
