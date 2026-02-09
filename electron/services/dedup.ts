/**
 * Deduplication engine: fuzzy matching + cross-session dedup
 */

export interface DuplicatePair {
  book1: { id: number; title: string; author: string; isbn: string | null; session_name: string }
  book2: { id: number; title: string; author: string; isbn: string | null; session_name: string }
  matchType: 'isbn' | 'exact' | 'fuzzy'
  similarity: number
}

/**
 * Normalize a string for comparison: lowercase, strip "the", strip subtitle
 */
export function normalizeForComparison(s: string): string {
  return s
    .toLowerCase()
    .replace(/^the\s+/i, '')
    .replace(/:.+$/, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

/**
 * Levenshtein distance between two strings
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

/**
 * Similarity score between 0 and 1 (1 = identical)
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

/**
 * Check if two books are potential duplicates.
 * Returns match type and similarity score.
 */
export function checkDuplicate(
  book1: { title: string; author: string; isbn: string | null },
  book2: { title: string; author: string; isbn: string | null }
): { isDuplicate: boolean; matchType: 'isbn' | 'exact' | 'fuzzy'; similarity: number } | null {
  // ISBN match
  if (book1.isbn && book2.isbn && book1.isbn === book2.isbn) {
    return { isDuplicate: true, matchType: 'isbn', similarity: 1 }
  }

  const normTitle1 = normalizeForComparison(book1.title)
  const normTitle2 = normalizeForComparison(book2.title)
  const normAuthor1 = normalizeForComparison(book1.author)
  const normAuthor2 = normalizeForComparison(book2.author)

  // Exact normalized match
  if (normTitle1 === normTitle2 && normAuthor1 === normAuthor2) {
    return { isDuplicate: true, matchType: 'exact', similarity: 1 }
  }

  // Fuzzy match
  const titleSim = similarity(normTitle1, normTitle2)
  const authorSim = similarity(normAuthor1, normAuthor2)
  const combinedSim = titleSim * 0.6 + authorSim * 0.4

  if (combinedSim >= 0.85) {
    return { isDuplicate: true, matchType: 'fuzzy', similarity: combinedSim }
  }

  return null
}
