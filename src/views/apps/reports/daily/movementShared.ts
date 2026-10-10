import { COMPANY_TYPE_LABELS } from '@/types/apps/clientsTypes'
import { SOURCE_LABELS } from '@/types/apps/reservationsTypes'
import type { MovementGroup, MovementLine } from '@/types/apps/reportTypes'
import type { ReportRow } from '../document/reportDocument'
import { formatMoney, section } from '../document/reportDocument'

export const paxText = (line: Pick<MovementLine, 'adults' | 'children'>) =>
  line.children > 0 ? `${line.adults} + ${line.children} niño${line.children > 1 ? 's' : ''}` : String(line.adults)

export const linePax = (line: Pick<MovementLine, 'adults' | 'children'>) => line.adults + line.children

export const agencyText = (group: MovementGroup) => {
  const source = SOURCE_LABELS[group.source] ?? group.source

  if (!group.companyName) {
    return `Particular · ${source}`
  }

  const type = group.companyType ? COMPANY_TYPE_LABELS[group.companyType] : 'Empresa'

  return `${group.companyName} (${type}) · ${source}`
}

export const groupHeading = (group: MovementGroup) => {
  const pax = group.lines.reduce((sum, line) => sum + linePax(line), 0)
  const balance = group.balance > 0 ? ` · Saldo ${formatMoney(group.balance)}` : ' · Pagado'

  return `Grupo ${group.reservationCode} · ${group.companyName ?? group.holderName} · ${group.lines.length} hab. · ${pax} pax${balance}`
}

/**
 * Recorre grupos y habitaciones: las reservas de varias habitaciones van bajo un título de grupo.
 * `first` indica la primera habitación de la reserva (ahí se muestran saldo y notas una sola vez).
 */
export const eachMovementRow = (
  groups: MovementGroup[],
  build: (group: MovementGroup, line: MovementLine, first: boolean) => ReportRow,
  filter: (line: MovementLine) => boolean = () => true
) => {
  const rows: ReportRow[] = []

  groups.forEach(group => {
    const lines = group.lines.filter(filter)

    if (!lines.length) {
      return
    }

    if (group.lines.length > 1) {
      rows.push(section(groupHeading(group)))
    }

    lines.forEach((line, index) => rows.push(build(group, line, index === 0)))
  })

  return rows
}
