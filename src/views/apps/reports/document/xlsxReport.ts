import type { CellValue, ColumnKind, ReportDocument, ReportRow } from './reportDocument'

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
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
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

/** Zip sin compresión: suficiente para un xlsx y sin dependencias. */
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
      u16(0x0800),
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
        u16(0x0800),
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

const STYLE = {
  hotel: 1,
  subtitle: 2,
  header: 3,
  text: 4,
  money: 5,
  integer: 6,
  percent: 7,
  section: 8,
  totalText: 9,
  totalMoney: 10,
  totalInteger: 11,
  totalPercent: 12,
  tableTitle: 13
} as const

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1"><numFmt numFmtId="164" formatCode="0.00&quot; %&quot;"/></numFmts>
  <fonts count="5">
    <font><sz val="10"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="14"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><name val="Calibri"/></font>
    <font><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF212121"/><bgColor rgb="FF212121"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE6E6E6"/><bgColor rgb="FFE6E6E6"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/><bgColor rgb="FFF2F2F2"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf/></cellStyleXfs>
  <cellXfs count="14">
    <xf/>
    <xf fontId="2" applyFont="1"/>
    <xf fontId="4" applyFont="1"/>
    <xf fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf borderId="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="4" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="1" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="164" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf fontId="3" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf fontId="3" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="4" fontId="3" fillId="4" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="1" fontId="3" fillId="4" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="3" fillId="4" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf fontId="3" applyFont="1"/>
  </cellXfs>
</styleSheet>`

const columnLetter = (index: number) => {
  let letter = ''
  let value = index + 1

  while (value > 0) {
    const remainder = (value - 1) % 26

    letter = String.fromCharCode(65 + remainder) + letter
    value = Math.floor((value - 1) / 26)
  }

  return letter
}

const xmlEscape = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '&#10;')

const ref = (col: number, row: number) => `${columnLetter(col)}${row}`

const textCell = (col: number, row: number, value: string, style: number) =>
  value === ''
    ? `<c r="${ref(col, row)}" s="${style}"/>`
    : `<c r="${ref(col, row)}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`

const numberCell = (col: number, row: number, value: number, style: number) =>
  `<c r="${ref(col, row)}" s="${style}"><v>${value}</v></c>`

const numericStyle = (kind: ColumnKind, isTotal: boolean) => {
  if (kind === 'money') return isTotal ? STYLE.totalMoney : STYLE.money
  if (kind === 'percent') return isTotal ? STYLE.totalPercent : STYLE.percent

  return isTotal ? STYLE.totalInteger : STYLE.integer
}

const valueCell = (col: number, row: number, value: CellValue, kind: ColumnKind, isTotal: boolean) => {
  if (typeof value === 'number' && (kind === 'number' || kind === 'money' || kind === 'percent')) {
    return numberCell(col, row, value, numericStyle(kind, isTotal))
  }

  const style = isTotal ? STYLE.totalText : STYLE.text

  if (typeof value === 'boolean') {
    return textCell(col, row, value ? 'Sí' : '', style)
  }

  return textCell(col, row, value === null || value === undefined ? '' : String(value), style)
}

const safeSheetName = (name: string) => name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Reporte'

export const buildReportXlsx = (report: ReportDocument) => {
  const width = Math.max(1, ...report.tables.map(table => table.columns.length))
  const lastCol = columnLetter(width - 1)
  const rows: string[] = []
  const merges: string[] = []
  let rowNumber = 1
  let freezeAt: number | null = null

  const pushMerged = (value: string, style: number) => {
    merges.push(`A${rowNumber}:${lastCol}${rowNumber}`)
    rows.push(`<row r="${rowNumber}">${textCell(0, rowNumber, value, style)}</row>`)
    rowNumber += 1
  }

  pushMerged(report.hotelName.toUpperCase(), STYLE.hotel)
  pushMerged(report.title, STYLE.tableTitle)
  pushMerged(report.period, STYLE.subtitle)

  if (report.summary?.length) {
    pushMerged(report.summary.map(item => `${item.label}: ${item.value}`).join('   ·   '), STYLE.subtitle)
  }

  rowNumber += 1

  report.tables.forEach((table, tableIndex) => {
    if (table.title) {
      pushMerged(table.title.toUpperCase(), STYLE.tableTitle)
    }

    rows.push(
      `<row r="${rowNumber}">${table.columns.map((column, col) => textCell(col, rowNumber, column.header, STYLE.header)).join('')}</row>`
    )

    if (report.tables.length === 1 && tableIndex === 0) {
      freezeAt = rowNumber
    }

    rowNumber += 1

    if (!table.rows.length) {
      pushMerged(table.emptyText ?? 'Sin registros.', STYLE.text)
    }

    table.rows.forEach((item: ReportRow) => {
      if (item.type === 'section') {
        merges.push(`A${rowNumber}:${columnLetter(table.columns.length - 1)}${rowNumber}`)
        rows.push(
          `<row r="${rowNumber}">${table.columns
            .map((_, col) => textCell(col, rowNumber, col === 0 ? item.label : '', STYLE.section))
            .join('')}</row>`
        )
        rowNumber += 1

        return
      }

      const isTotal = item.type === 'total'

      rows.push(
        `<row r="${rowNumber}">${table.columns
          .map((column, col) => valueCell(col, rowNumber, item.cells[col], column.kind ?? 'text', isTotal))
          .join('')}</row>`
      )
      rowNumber += 1
    })

    rowNumber += 1
  })

  report.notes?.forEach(note => pushMerged(note, STYLE.subtitle))

  const colWidths = Array.from({ length: width }, (_, col) =>
    Math.max(8, ...report.tables.map(table => table.columns[col]?.width ?? 0))
  )

  const sheetView =
    freezeAt === null
      ? '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
      : `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${freezeAt}" topLeftCell="A${freezeAt + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
  <dimension ref="A1:${lastCol}${Math.max(1, rowNumber - 1)}"/>
  ${sheetView}
  <sheetFormatPr defaultRowHeight="16"/>
  <cols>${colWidths.map((value, col) => `<col min="${col + 1}" max="${col + 1}" width="${value}" customWidth="1"/>`).join('')}</cols>
  <sheetData>${rows.join('')}</sheetData>
  ${merges.length ? `<mergeCells count="${merges.length}">${merges.map(item => `<mergeCell ref="${item}"/>`).join('')}</mergeCells>` : ''}
  <pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
  <pageSetup paperSize="9" orientation="${report.orientation === 'portrait' ? 'portrait' : 'landscape'}" fitToWidth="1" fitToHeight="0"/>
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
  <sheets><sheet name="${xmlEscape(safeSheetName(report.title))}" sheetId="1" r:id="rId1"/></sheets>
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
    { name: 'xl/styles.xml', content: STYLES_XML },
    { name: 'xl/worksheets/sheet1.xml', content: sheet }
  ]

  return zipStore(files)
}

export const downloadReportXlsx = (report: ReportDocument) => {
  const blob = new Blob([buildReportXlsx(report)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `${report.fileName}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
