import { describe, it, expect } from 'vitest'
import {
  parseClaudeResponse,
  parseGoogleBooksResponse,
} from '../electron/services/parsers'

describe('parseClaudeResponse', () => {
  it('parses a clean JSON array', () => {
    const response = JSON.stringify([
      {
        title: 'Dune',
        author: 'Frank Herbert',
        spine_text: 'DUNE FRANK HERBERT',
        confidence: 'high',
        position: 'top-left',
      },
      {
        title: 'Neuromancer',
        author: 'William Gibson',
        confidence: 'medium',
        position: 'top-center',
      },
    ])

    const books = parseClaudeResponse(response)
    expect(books).toHaveLength(2)
    expect(books[0].title).toBe('Dune')
    expect(books[0].author).toBe('Frank Herbert')
    expect(books[0].confidence).toBe('high')
    expect(books[0].spine_text).toBe('DUNE FRANK HERBERT')
    expect(books[1].title).toBe('Neuromancer')
    expect(books[1].confidence).toBe('medium')
  })

  it('extracts JSON from response with preamble text', () => {
    const response = `Here are the books I identified:\n\n[{"title": "1984", "author": "George Orwell", "confidence": "high"}]`

    const books = parseClaudeResponse(response)
    expect(books).toHaveLength(1)
    expect(books[0].title).toBe('1984')
  })

  it('extracts JSON from markdown-fenced response', () => {
    const response =
      '```json\n[{"title": "Sapiens", "author": "Yuval Noah Harari", "confidence": "high"}]\n```'

    const books = parseClaudeResponse(response)
    expect(books).toHaveLength(1)
    expect(books[0].title).toBe('Sapiens')
  })

  it('defaults missing fields appropriately', () => {
    const response = JSON.stringify([
      { title: 'Unknown Book' },
      { confidence: 'invalid' },
    ])

    const books = parseClaudeResponse(response)
    expect(books).toHaveLength(2)
    expect(books[0].author).toBe('')
    expect(books[0].confidence).toBe('low')
    expect(books[1].title).toBe('Unknown')
    expect(books[1].confidence).toBe('low')
  })

  it('throws on non-array response', () => {
    expect(() => parseClaudeResponse('{"title": "not an array"}')).toThrow(
      'not an array'
    )
  })

  it('throws on completely invalid text', () => {
    expect(() => parseClaudeResponse('no json here at all')).toThrow(
      'No JSON array found'
    )
  })

  it('handles empty array', () => {
    const books = parseClaudeResponse('[]')
    expect(books).toHaveLength(0)
  })
})

describe('parseGoogleBooksResponse', () => {
  it('parses a complete Google Books response', () => {
    const data = {
      items: [
        {
          volumeInfo: {
            title: 'Dune',
            authors: ['Frank Herbert'],
            publishedDate: '1965-08-01',
            pageCount: 688,
            description: 'A science fiction masterpiece.',
            industryIdentifiers: [
              { type: 'ISBN_13', identifier: '9780441013593' },
              { type: 'ISBN_10', identifier: '0441013597' },
            ],
            imageLinks: {
              thumbnail: 'https://books.google.com/dune.jpg',
            },
          },
        },
      ],
    }

    const result = parseGoogleBooksResponse(data, 'Dune', 'Frank Herbert')
    expect(result).not.toBeNull()
    expect(result!.title).toBe('Dune')
    expect(result!.author).toBe('Frank Herbert')
    expect(result!.isbn).toBe('9780441013593')
    expect(result!.cover_url).toBe('https://books.google.com/dune.jpg')
    expect(result!.year).toBe(1965)
    expect(result!.page_count).toBe(688)
    expect(result!.description).toBe('A science fiction masterpiece.')
  })

  it('returns null for empty results', () => {
    expect(parseGoogleBooksResponse({ items: [] }, 'Test', 'Author')).toBeNull()
    expect(parseGoogleBooksResponse({}, 'Test', 'Author')).toBeNull()
  })

  it('uses fallback values for missing fields', () => {
    const data = {
      items: [
        {
          volumeInfo: {
            industryIdentifiers: [],
          },
        },
      ],
    }

    const result = parseGoogleBooksResponse(data, 'Fallback Title', 'Fallback Author')
    expect(result).not.toBeNull()
    expect(result!.title).toBe('Fallback Title')
    expect(result!.author).toBe('Fallback Author')
    expect(result!.isbn).toBeNull()
    expect(result!.cover_url).toBeNull()
    expect(result!.year).toBeNull()
    expect(result!.page_count).toBeNull()
  })

  it('prefers ISBN-13 over ISBN-10', () => {
    const data = {
      items: [
        {
          volumeInfo: {
            title: 'Test',
            industryIdentifiers: [
              { type: 'ISBN_10', identifier: '0123456789' },
              { type: 'ISBN_13', identifier: '9780123456789' },
            ],
          },
        },
      ],
    }

    const result = parseGoogleBooksResponse(data, 'Test', 'Author')
    expect(result!.isbn).toBe('9780123456789')
  })

  it('falls back to ISBN-10 when no ISBN-13', () => {
    const data = {
      items: [
        {
          volumeInfo: {
            title: 'Test',
            industryIdentifiers: [
              { type: 'ISBN_10', identifier: '0123456789' },
            ],
          },
        },
      ],
    }

    const result = parseGoogleBooksResponse(data, 'Test', 'Author')
    expect(result!.isbn).toBe('0123456789')
  })

  it('joins multiple authors', () => {
    const data = {
      items: [
        {
          volumeInfo: {
            title: 'Co-authored',
            authors: ['Author One', 'Author Two', 'Author Three'],
            industryIdentifiers: [],
          },
        },
      ],
    }

    const result = parseGoogleBooksResponse(data, 'Test', 'Author')
    expect(result!.author).toBe('Author One, Author Two, Author Three')
  })
})
