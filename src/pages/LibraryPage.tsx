import { useState, useEffect, useCallback } from 'react'
import TagPicker, { getTagColor } from '../components/TagPicker'
import NotesEditor from '../components/NotesEditor'

interface LibraryBook {
  id: number
  title: string
  author: string
  isbn?: string
  cover_url?: string
  year?: number
  page_count?: number
  description?: string
  tags: string[]
  notes?: string
  confidence: string
  verified: boolean
  session_id: number
  session_name: string
}

type SortField = 'title' | 'author' | 'year' | 'id'
type ViewMode = 'grid' | 'list'

const OWNERSHIP_TAGS = ['owned', 'to-buy', 'to-borrow', 'lent', 'gave-away', 'lost']
const READING_TAGS = ['unread', 'reading', 'read', 'abandoned', 're-reading']
const INTENT_TAGS = ['tbr', 'reference', 'gift-idea', 'favorite']

export default function LibraryPage() {
  const [allBooks, setAllBooks] = useState<LibraryBook[]>([])
  const [filteredBooks, setFilteredBooks] = useState<LibraryBook[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('id')
  const [sortAsc, setSortAsc] = useState(false)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [taggingBookId, setTaggingBookId] = useState<number | null>(null)
  const [notesBookId, setNotesBookId] = useState<number | null>(null)

  const loadBooks = useCallback(async () => {
    const books = await window.electronAPI.getAllBooks()
    setAllBooks(
      books.map((b: any) => ({
        ...b,
        tags: typeof b.tags === 'string' ? JSON.parse(b.tags) : b.tags || [],
        verified: !!b.verified,
      }))
    )
  }, [])

  useEffect(() => {
    loadBooks()
  }, [loadBooks])

  useEffect(() => {
    let books = [...allBooks]

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      books = books.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q)
      )
    }

    // Filter by tag
    if (filterTag) {
      books = books.filter((b) => b.tags.includes(filterTag))
    }

    // Sort
    books.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title)
          break
        case 'author':
          cmp = a.author.localeCompare(b.author)
          break
        case 'year':
          cmp = (a.year || 0) - (b.year || 0)
          break
        case 'id':
          cmp = a.id - b.id
          break
      }
      return sortAsc ? cmp : -cmp
    })

    setFilteredBooks(books)
  }, [allBooks, searchQuery, sortField, sortAsc, filterTag])

  const handleSaveTags = async (bookId: number, tags: string[]) => {
    await window.electronAPI.updateBook(bookId, { tags: JSON.stringify(tags) })
    setAllBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, tags } : b))
    )
    setTaggingBookId(null)
  }

  const handleSaveNotes = async (bookId: number, notes: string) => {
    await window.electronAPI.updateBook(bookId, { notes: notes || null })
    setAllBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, notes } : b))
    )
  }

  // Stats
  const totalBooks = allBooks.length
  const ownedCount = allBooks.filter((b) => b.tags.includes('owned')).length
  const readCount = allBooks.filter((b) => b.tags.includes('read')).length
  const tbrCount = allBooks.filter((b) => b.tags.includes('tbr')).length

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const filterTags = [
    ...OWNERSHIP_TAGS,
    ...READING_TAGS,
    ...INTENT_TAGS,
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-text-primary">Library</h1>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${
                viewMode === 'grid'
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
              title="Grid view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${
                viewMode === 'list'
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
              title="List view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M1 4h14M1 8h14M1 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="text-xs text-text-secondary mb-3">
          {totalBooks} books. {ownedCount} owned. {readCount} read. {tbrCount} on your TBR.
        </div>

        {/* Search and filter */}
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or author..."
            className="flex-1 px-3 py-1.5 text-sm bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent text-text-primary placeholder-text-tertiary"
          />
          <select
            value={filterTag || ''}
            onChange={(e) => setFilterTag(e.target.value || null)}
            className="px-2 py-1.5 text-sm bg-surface-secondary border border-border rounded-lg text-text-primary"
          >
            <option value="">All tags</option>
            {filterTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <select
            value={`${sortField}-${sortAsc ? 'asc' : 'desc'}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split('-')
              setSortField(field as SortField)
              setSortAsc(dir === 'asc')
            }}
            className="px-2 py-1.5 text-sm bg-surface-secondary border border-border rounded-lg text-text-primary"
          >
            <option value="id-desc">Newest first</option>
            <option value="id-asc">Oldest first</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
            <option value="author-asc">Author A-Z</option>
            <option value="year-desc">Year (newest)</option>
            <option value="year-asc">Year (oldest)</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-sm text-text-secondary">
              {allBooks.length === 0
                ? 'No books in your library yet. Start a scan!'
                : 'No books match your search/filter.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                className="bg-surface-secondary rounded-xl border border-border hover:border-text-tertiary transition-all"
              >
                <div className="aspect-[2/3] bg-surface-tertiary rounded-t-xl overflow-hidden flex items-center justify-center">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-3">
                      <div className="text-2xl mb-1">📖</div>
                      <div className="text-[10px] text-text-tertiary truncate">
                        {book.title}
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <h3 className="text-xs font-medium text-text-primary truncate">
                    {book.title}
                  </h3>
                  <p className="text-[10px] text-text-secondary truncate">
                    {book.author}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {book.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className={`text-[9px] px-1 py-0.5 rounded-full border font-medium ${getTagColor(tag)}`}
                      >
                        {tag}
                      </span>
                    ))}
                    {book.tags.length > 3 && (
                      <span className="text-[9px] text-text-tertiary">
                        +{book.tags.length - 3}
                      </span>
                    )}
                    <button
                      onClick={() => setTaggingBookId(book.id)}
                      className="text-[9px] px-1 py-0.5 rounded-full border border-dashed border-text-tertiary text-text-tertiary hover:border-accent hover:text-accent"
                    >
                      +
                    </button>
                    {book.notes && (
                      <button
                        onClick={() => setNotesBookId(book.id)}
                        className="text-[9px]"
                        title={book.notes}
                      >
                        📝
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-secondary border-b border-border">
                <th
                  className="pb-2 cursor-pointer hover:text-text-primary"
                  onClick={() => toggleSort('title')}
                >
                  Title {sortField === 'title' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  className="pb-2 cursor-pointer hover:text-text-primary"
                  onClick={() => toggleSort('author')}
                >
                  Author {sortField === 'author' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  className="pb-2 cursor-pointer hover:text-text-primary"
                  onClick={() => toggleSort('year')}
                >
                  Year {sortField === 'year' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="pb-2">Tags</th>
                <th className="pb-2">Session</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map((book) => (
                <tr
                  key={book.id}
                  className="border-b border-border/50 hover:bg-surface-secondary"
                >
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      {book.cover_url && (
                        <img
                          src={book.cover_url}
                          alt=""
                          className="w-6 h-9 object-cover rounded flex-shrink-0"
                        />
                      )}
                      <span className="text-text-primary truncate max-w-[200px]">
                        {book.title}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-text-secondary truncate max-w-[150px]">
                    {book.author}
                  </td>
                  <td className="py-2 pr-3 text-text-secondary">{book.year || '—'}</td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {book.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${getTagColor(tag)}`}
                        >
                          {tag}
                        </span>
                      ))}
                      <button
                        onClick={() => setTaggingBookId(book.id)}
                        className="text-[10px] px-1 py-0.5 rounded-full border border-dashed border-text-tertiary text-text-tertiary hover:border-accent hover:text-accent"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="py-2 text-text-tertiary text-xs truncate max-w-[120px]">
                    {book.session_name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Tag picker modal */}
      {taggingBookId && (
        <TagPicker
          currentTags={allBooks.find((b) => b.id === taggingBookId)?.tags || []}
          onSave={(tags) => handleSaveTags(taggingBookId, tags)}
          onClose={() => setTaggingBookId(null)}
        />
      )}

      {/* Notes editor */}
      {notesBookId && (
        <NotesEditor
          bookId={notesBookId}
          currentNotes={allBooks.find((b) => b.id === notesBookId)?.notes || ''}
          onSave={handleSaveNotes}
          onClose={() => setNotesBookId(null)}
        />
      )}
    </div>
  )
}
