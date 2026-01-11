const BOM = '\uFEFF'

function escapeCsvValue(value) {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  const mustQuote = /[",\r\n]/.test(stringValue)
  const escaped = stringValue.replace(/"/g, '""')
  return mustQuote ? `"${escaped}"` : escaped
}

export function buildCsv(headers, rows) {
  const headerLine = headers.map(escapeCsvValue).join(',')
  const rowLines = rows.map((row) => row.map(escapeCsvValue).join(','))
  return BOM + [headerLine, ...rowLines].join('\r\n') + '\r\n'
}

export function downloadCsv(csvString, filename) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'

  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  URL.revokeObjectURL(url)
}

export function statusLabel(isActive) {
  return isActive ? 'Aktif' : 'Nonaktif'
}
