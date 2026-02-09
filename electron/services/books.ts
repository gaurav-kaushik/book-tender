import { parseGoogleBooksResponse } from './parsers'
import type { BookMetadata } from './parsers'

export type { BookMetadata }

export async function lookupBook(
  title: string,
  author: string,
  apiKey?: string,
  isbn?: string
): Promise<BookMetadata | null> {
  try {
    let query: string
    if (isbn) {
      query = `isbn:${isbn}`
    } else {
      query = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`
    }

    let url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`
    if (apiKey) {
      url += `&key=${apiKey}`
    }

    const response = await fetch(url)
    if (!response.ok) {
      console.error(`Google Books API error: ${response.status}`)
      return null
    }

    const data = await response.json()
    return parseGoogleBooksResponse(data, title, author)
  } catch (err) {
    console.error('Google Books lookup failed:', err)
    return null
  }
}
