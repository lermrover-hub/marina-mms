export function exportRowsCsv(filename: string, rows: Record<string, unknown>[]) {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          const text = value == null ? "" : String(value)
          return `"${text.replace(/"/g, '""')}"`
        })
        .join(","),
    ),
  ]

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
