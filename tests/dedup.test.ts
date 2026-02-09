import { describe, it, expect } from 'vitest'
import {
  normalizeForComparison,
  levenshtein,
  similarity,
  checkDuplicate,
} from '../electron/services/dedup'

describe('normalizeForComparison', () => {
  it('lowercases and strips "the"', () => {
    expect(normalizeForComparison('The Great Gatsby')).toBe('great gatsby')
  })

  it('strips subtitle after colon', () => {
    expect(normalizeForComparison('Sapiens: A Brief History of Humankind')).toBe('sapiens')
  })

  it('strips special characters', () => {
    expect(normalizeForComparison("Harry Potter & the Sorcerer's Stone")).toBe(
      'harry potter  the sorcerers stone'
    )
  })
})

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('hello', 'hello')).toBe(0)
  })

  it('returns correct distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3)
  })

  it('handles empty strings', () => {
    expect(levenshtein('', 'abc')).toBe(3)
    expect(levenshtein('abc', '')).toBe(3)
  })
})

describe('similarity', () => {
  it('returns 1 for identical strings', () => {
    expect(similarity('hello', 'hello')).toBe(1)
  })

  it('returns ~0.71 for "kitten" vs "sitting"', () => {
    const sim = similarity('kitten', 'sitting')
    expect(sim).toBeCloseTo(0.571, 2)
  })

  it('returns 1 for two empty strings', () => {
    expect(similarity('', '')).toBe(1)
  })
})

describe('checkDuplicate', () => {
  it('detects ISBN match', () => {
    const result = checkDuplicate(
      { title: 'Dune', author: 'Frank Herbert', isbn: '9780441013593' },
      { title: 'Dune (Paperback)', author: 'F. Herbert', isbn: '9780441013593' }
    )
    expect(result).not.toBeNull()
    expect(result!.matchType).toBe('isbn')
    expect(result!.similarity).toBe(1)
  })

  it('detects exact normalized match', () => {
    const result = checkDuplicate(
      { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: null },
      { title: 'Great Gatsby', author: 'F. Scott Fitzgerald', isbn: null }
    )
    expect(result).not.toBeNull()
    expect(result!.matchType).toBe('exact')
  })

  it('detects fuzzy match on similar titles', () => {
    const result = checkDuplicate(
      { title: 'Sapiens', author: 'Yuval Noah Harari', isbn: null },
      { title: 'Sapiens: A Brief History', author: 'Yuval Noah Harari', isbn: null }
    )
    expect(result).not.toBeNull()
  })

  it('returns null for different books', () => {
    const result = checkDuplicate(
      { title: 'Dune', author: 'Frank Herbert', isbn: null },
      { title: '1984', author: 'George Orwell', isbn: null }
    )
    expect(result).toBeNull()
  })

  it('does not match when titles and authors are very different', () => {
    const result = checkDuplicate(
      { title: 'War and Peace', author: 'Leo Tolstoy', isbn: null },
      { title: 'The Alchemist', author: 'Paulo Coelho', isbn: null }
    )
    expect(result).toBeNull()
  })
})
