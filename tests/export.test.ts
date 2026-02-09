import { describe, it, expect } from 'vitest'

// Test the CSV escaping logic directly
function escapeCSV(val: string | null | undefined): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

describe('CSV escaping', () => {
  it('returns empty for null/undefined', () => {
    expect(escapeCSV(null)).toBe('')
    expect(escapeCSV(undefined)).toBe('')
  })

  it('returns plain string when no special chars', () => {
    expect(escapeCSV('hello')).toBe('hello')
  })

  it('wraps in quotes when comma present', () => {
    expect(escapeCSV('hello, world')).toBe('"hello, world"')
  })

  it('escapes double quotes', () => {
    expect(escapeCSV('he said "hi"')).toBe('"he said ""hi"""')
  })

  it('handles newlines', () => {
    expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"')
  })
})

describe('JSON export format', () => {
  it('produces correct structure', () => {
    const OWNERSHIP_TAGS = ['owned', 'to-buy', 'to-borrow', 'lent', 'gave-away', 'lost']
    const READING_TAGS = ['unread', 'reading', 'read', 'abandoned', 're-reading']

    const tags = ['owned', 'read', 'favorite', 'sci-fi']
    const ownership = tags.find((t) => OWNERSHIP_TAGS.includes(t)) || null
    const reading = tags.find((t) => READING_TAGS.includes(t)) || null
    const otherTags = tags.filter(
      (t) => !OWNERSHIP_TAGS.includes(t) && !READING_TAGS.includes(t)
    )

    expect(ownership).toBe('owned')
    expect(reading).toBe('read')
    expect(otherTags).toEqual(['favorite', 'sci-fi'])
  })

  it('handles empty tags', () => {
    const OWNERSHIP_TAGS = ['owned', 'to-buy', 'to-borrow', 'lent', 'gave-away', 'lost']
    const READING_TAGS = ['unread', 'reading', 'read', 'abandoned', 're-reading']

    const tags: string[] = []
    const ownership = tags.find((t) => OWNERSHIP_TAGS.includes(t)) || null
    const reading = tags.find((t) => READING_TAGS.includes(t)) || null

    expect(ownership).toBeNull()
    expect(reading).toBeNull()
  })
})
