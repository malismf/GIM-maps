export function getFilenameFromContentDisposition(header) {
  if (!header) return null

  const starMatch = header.match(/filename\*\s*=\s*([^']+)''([^;,\n]+)/i)
  if (starMatch) {
    try {
      return decodeURIComponent(starMatch[2].trim())
    } catch {
      return starMatch[2].trim()
    }
  }

  const match = header.match(/filename\s*=\s*(?:"([^"]*)"|([^;\s,]+))/i)
  if (match) {
    const name = (match[1] ?? match[2] ?? '').trim()
    if (name) return name
  }

  return null
}

export function getDownloadFilename(response, fallback) {
  return getFilenameFromContentDisposition(response.headers.get('content-disposition')) || fallback
}
