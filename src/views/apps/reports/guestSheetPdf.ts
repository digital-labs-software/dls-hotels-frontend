import { DOCUMENT_TYPE_LABELS } from '@/types/apps/clientsTypes'
import type { GuestSheet, GuestSheetStay } from '@/types/apps/reportTypes'
import { formatFrontDeskDate } from '@/types/apps/frontDeskTypes'

export const GUEST_SHEET_COLUMNS = [
  'Nº DE HAB',
  'TIPO DE HAB',
  'AGENCIA / PARTICULARES',
  'PAX',
  'NOMBRES Y APELLIDOS DEL HUÉSPED',
  'EDAD',
  'NACIONALIDAD',
  'DNI O PASAPORTE',
  'CHECK IN',
  'CHECK OUT',
  'FORMA DE PAGO',
  'OBSERVACIONES'
] as const

export const stayGuestNames = (stay: GuestSheetStay) => {
  if (stay.guestNames?.trim()) {
    return stay.guestNames
  }

  return stay.guests.map(guest => guest.fullName).filter(Boolean).join(', ')
}

export const stayAges = (stay: GuestSheetStay) => {
  return stay.guests.map(guest => (guest.age === null || guest.age === undefined ? '—' : String(guest.age))).join('\n')
}

export const stayDocuments = (stay: GuestSheetStay) => {
  return stay.guests
    .map(guest => {
      const type = guest.documentType ? DOCUMENT_TYPE_LABELS[guest.documentType] ?? guest.documentType : ''
      const number = guest.documentNumber?.trim() || ''

      return [type, number].filter(Boolean).join(' ')
    })
    .filter(Boolean)
    .join('\n')
}

export const stayRowValues = (stay: GuestSheetStay | null) => {
  if (!stay) {
    return ['', '', '', '', '', '', '', '', '', '']
  }

  return [
    stay.agencyOrParticular || 'Particular',
    stay.pax ? String(stay.pax) : '',
    stayGuestNames(stay),
    stayAges(stay),
    stay.guests.map(guest => guest.nationality || '').filter(Boolean).join('\n'),
    stayDocuments(stay),
    formatFrontDeskDate(stay.checkInDate),
    formatFrontDeskDate(stay.checkOutDate),
    stay.paymentMethodLabel || '',
    stay.observations || ''
  ]
}

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const cell = (value: string) => `<td>${escapeHtml(value).replace(/\n/g, '<br/>')}</td>`

export const downloadGuestSheetPdf = async (report: GuestSheet) => {
  const titleDate = formatFrontDeskDate(report.date)
  const head = GUEST_SHEET_COLUMNS.map(column => `<th>${escapeHtml(column)}</th>`).join('')

  const floorsHtml = report.floors
    .map(floor => {
      const rooms = floor.rooms
        .map(room => {
          const values = stayRowValues(room.stay)

          return `<tr>${cell(room.number)}${cell(room.roomTypeName)}${values.map(cell).join('')}</tr>`
        })
        .join('')

      return `<tr class="section"><td colspan="12">${escapeHtml(floor.floorName)} · ocupadas ${floor.occupiedCount} · pax ${floor.paxCount}</td></tr>${rooms}`
    })
    .join('')

  const unassignedHtml =
    report.unassigned.length === 0
      ? ''
      : `<tr class="section warn"><td colspan="12">Sin habitación asignada · ${report.unassigned.length}</td></tr>${report.unassigned
          .map(stay => {
            const values = stayRowValues(stay)

            return `<tr>${cell('—')}${cell('—')}${values.map(cell).join('')}</tr>`
          })
          .join('')}`

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Parte de huéspedes ${escapeHtml(report.date)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: Arial, sans-serif; color: #111; }
    h1 { text-align: center; font-size: 16px; margin: 0 0 4px; }
    p { text-align: center; margin: 0 0 12px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; }
    th, td { border: 1px solid #222; padding: 4px; vertical-align: top; }
    th { background: #111; color: #fff; }
    .section td { background: #111; color: #fff; font-weight: bold; }
    .section.warn td { background: #7a4f00; }
  </style>
</head>
<body>
  <h1>${escapeHtml(report.hotelName.toUpperCase())}</h1>
  <p>Parte de huéspedes · ${escapeHtml(titleDate)} · Hab. ${report.summary.totalRooms} · Ocupadas ${report.summary.occupiedRooms} · Vacías ${report.summary.vacantRooms} · Pax ${report.summary.pax}</p>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${floorsHtml}${unassignedHtml}</tbody>
  </table>
  <script>window.onload = function () { window.focus(); window.print(); }</script>
</body>
</html>`

  const printWindow = window.open('', '_blank')

  if (!printWindow) {
    throw new Error('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para descargar el PDF.')
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}
