import type { GuestSheet } from '@/types/apps/reportTypes'
import { GUEST_SHEET_COLUMNS, stayRowValues } from './guestSheetPdf'

const encoder = new TextEncoder()

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)

  for (let i = 0; i < 256; i++) {
    let crc = i

    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    }

    table[i] = crc >>> 0
  }

  return table
})()

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff

  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

const concat = (parts: Uint8Array[]) => {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const output = new Uint8Array(total)
  let offset = 0

  parts.forEach(part => {
    output.set(part, offset)
    offset += part.length
  })

  return output
}

const u16 = (value: number) => {
  const bytes = new Uint8Array(2)

  new DataView(bytes.buffer).setUint16(0, value, true)

  return bytes
}

const u32 = (value: number) => {
  const bytes = new Uint8Array(4)

  new DataView(bytes.buffer).setUint32(0, value, true)

  return bytes
}

const zipStore = (files: { name: string; content: string }[]) => {
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  files.forEach(file => {
    const name = encoder.encode(file.name)
    const data = encoder.encode(file.content)
    const crc = crc32(data)
    const local = concat([
      encoder.encode('PK\u0003\u0004'),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data
    ])

    locals.push(local)
    centrals.push(
      concat([
        encoder.encode('PK\u0001\u0002'),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name
      ])
    )
    offset += local.length
  })

  const central = concat(centrals)

  return concat([
    ...locals,
    central,
    encoder.encode('PK\u0005\u0006'),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(central.length),
    u32(offset),
    u16(0)
  ])
}

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const

const xmlEscape = (value: string) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '&#10;')
}

const ref = (col: number, row: number) => `${COLS[col]}${row}`

const inlineCell = (col: number, row: number, value: string, style = 2) => {
  return `<c r="${ref(col, row)}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`
}

const numberCell = (col: number, row: number, value: number, style = 2) => {
  return `<c r="${ref(col, row)}" s="${style}"><v>${value}</v></c>`
}

const emptyCell = (col: number, row: number, style = 2) => `<c r="${ref(col, row)}" s="${style}"/>`

const mergedRowCells = (row: number, value: string, style: number) => {
  return COLS.map((_, col) => (col === 0 ? inlineCell(col, row, value, style) : emptyCell(col, row, style))).join('')
}

const rowXml = (index: number, cells: string) => `<row r="${index}">${cells}</row>`

export const downloadGuestSheetXlsx = (report: GuestSheet) => {
  const merges: string[] = ['A1:L1', 'A2:L2']
  const rows: string[] = [
    rowXml(1, mergedRowCells(1, report.hotelName.toUpperCase(), 1)),
    rowXml(
      2,
      mergedRowCells(
        2,
        `Parte de huéspedes · ${report.date} · Hab. ${report.summary.totalRooms} · Ocupadas ${report.summary.occupiedRooms} · Vacías ${report.summary.vacantRooms} · Pax ${report.summary.pax}`,
        1
      )
    ),
    rowXml(3, GUEST_SHEET_COLUMNS.map((column, col) => inlineCell(col, 3, column, 1)).join(''))
  ]

  let rowNumber = 4

  const pushMerged = (text: string, style = 3) => {
    merges.push(`A${rowNumber}:L${rowNumber}`)
    rows.push(rowXml(rowNumber, mergedRowCells(rowNumber, text, style)))
    rowNumber += 1
  }

  const pushStay = (roomNumber: string, roomType: string, stay: ReturnType<typeof stayRowValues> | null, occupiedPax?: number) => {
    const values = stay ?? ['', '', '', '', '', '', '', '', '', '']
    const pax = occupiedPax && occupiedPax > 0 ? numberCell(3, rowNumber, occupiedPax) : inlineCell(3, rowNumber, values[1])

    rows.push(
      rowXml(
        rowNumber,
        [
          inlineCell(0, rowNumber, roomNumber),
          inlineCell(1, rowNumber, roomType),
          inlineCell(2, rowNumber, values[0]),
          pax,
          inlineCell(4, rowNumber, values[2]),
          inlineCell(5, rowNumber, values[3]),
          inlineCell(6, rowNumber, values[4]),
          inlineCell(7, rowNumber, values[5]),
          inlineCell(8, rowNumber, values[6]),
          inlineCell(9, rowNumber, values[7]),
          inlineCell(10, rowNumber, values[8]),
          inlineCell(11, rowNumber, values[9])
        ].join('')
      )
    )
    rowNumber += 1
  }

  report.floors.forEach(floor => {
    pushMerged(`${floor.floorName} · ocupadas ${floor.occupiedCount} · pax ${floor.paxCount}`)
    floor.rooms.forEach(room => {
      pushStay(room.number, room.roomTypeName, stayRowValues(room.stay), room.stay?.pax)
    })
  })

  if (report.unassigned.length > 0) {
    pushMerged(`Sin habitación asignada · ${report.unassigned.length}`)
    report.unassigned.forEach(stay => {
      pushStay('—', '—', stayRowValues(stay), stay.pax)
    })
  }

  const lastRow = rowNumber - 1
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:L${lastRow}"/>
  <sheetFormatPr defaultRowHeight="16"/>
  <cols>
    <col min="1" max="1" width="12" customWidth="1"/>
    <col min="2" max="2" width="16" customWidth="1"/>
    <col min="3" max="3" width="22" customWidth="1"/>
    <col min="4" max="4" width="8" customWidth="1"/>
    <col min="5" max="5" width="32" customWidth="1"/>
    <col min="6" max="6" width="10" customWidth="1"/>
    <col min="7" max="7" width="16" customWidth="1"/>
    <col min="8" max="8" width="20" customWidth="1"/>
    <col min="9" max="10" width="12" customWidth="1"/>
    <col min="11" max="11" width="16" customWidth="1"/>
    <col min="12" max="12" width="24" customWidth="1"/>
  </cols>
  <sheetData>${rows.join('')}</sheetData>
  <mergeCells count="${merges.length}">${merges.map(ref => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>
</worksheet>`

  const files = [
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
    },
    {
      name: 'xl/workbook.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Parte huespedes" sheetId="1" r:id="rId1"/></sheets>
</workbook>`
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
    },
    {
      name: 'xl/styles.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="10"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF212121"/><bgColor rgb="FF212121"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf/></cellStyleXfs>
  <cellXfs count="4">
    <xf/>
    <xf fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" wrapText="1"/></xf>
    <xf fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>
    <xf fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1"/></xf>
  </cellXfs>
</styleSheet>`
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      content: sheet
    }
  ]

  const blob = new Blob([zipStore(files)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `parte-huespedes-${report.date}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
