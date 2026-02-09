export interface BookMetadata {
  title: string
  author: string
  isbn: string | null
  cover_url: string | null
  year: number | null
  page_count: number | null
  description: string | null
}

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
    if (!data.items || data.items.length === 0) {
      return null
    }

    const volume = data.items[0].volumeInfo
    const industryIds = volume.industryIdentifiers || []
    const isbn13 = industryIds.find((id: any) => id.type === 'ISBN_13')?.identifier
    const isbn10 = industryIds.find((id: any) => id.type === 'ISBN_10')?.identifier

    return {
      title: volume.title || title,
      author: volume.authors ? volume.authors.join(', ') : author,
      isbn: isbn13 || isbn10 || null,
      cover_url: volume.imageLinks?.thumbnail || null,
      year: volume.publishedDate ? parseInt(volume.publishedDate.substring(0, 4), 10) : null,
      page_count: volume.pageCount || null,
      description: volume.description || null,
    }
  } catch (err) {
    console.error('Google Books lookup failed:', err)
    return null
  }
}
