/** Pure parsing functions for Claude and Google Books API responses */

export interface IdentifiedBook {
  title: string
  author: string
  spine_text?: string
  confidence: 'high' | 'medium' | 'low'
  position?: string
}

export interface BookMetadata {
  title: string
  author: string
  isbn: string | null
  cover_url: string | null
  year: number | null
  page_count: number | null
  description: string | null
}

/**
 * Parse Claude vision response text into structured book list.
 * Handles both clean JSON arrays and responses with extra text.
 */
export function parseClaudeResponse(responseText: string): IdentifiedBook[] {
  let books: any[]

  try {
    books = JSON.parse(responseText)
  } catch {
    // Try to extract JSON array from response with extra text
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('No JSON array found in Claude response')
    }
    books = JSON.parse(jsonMatch[0])
  }

  if (!Array.isArray(books)) {
    throw new Error('Claude response is not an array')
  }

  return books.map((b: any) => ({
    title: b.title || 'Unknown',
    author: b.author || '',
    spine_text: b.spine_text || undefined,
    confidence: ['high', 'medium', 'low'].includes(b.confidence)
      ? b.confidence
      : 'low',
    position: b.position || undefined,
  }))
}

/**
 * Parse Google Books API response into structured metadata.
 */
export function parseGoogleBooksResponse(
  data: any,
  fallbackTitle: string,
  fallbackAuthor: string
): BookMetadata | null {
  if (!data.items || data.items.length === 0) {
    return null
  }

  const volume = data.items[0].volumeInfo
  const industryIds = volume.industryIdentifiers || []
  const isbn13 = industryIds.find((id: any) => id.type === 'ISBN_13')?.identifier
  const isbn10 = industryIds.find((id: any) => id.type === 'ISBN_10')?.identifier

  return {
    title: volume.title || fallbackTitle,
    author: volume.authors ? volume.authors.join(', ') : fallbackAuthor,
    isbn: isbn13 || isbn10 || null,
    cover_url: volume.imageLinks?.thumbnail || null,
    year: volume.publishedDate
      ? parseInt(volume.publishedDate.substring(0, 4), 10)
      : null,
    page_count: volume.pageCount || null,
    description: volume.description || null,
  }
}
