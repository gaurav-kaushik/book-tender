import { useState, useRef, useEffect } from 'react'

interface SearchResult {
  title: string
  author: string
  isbn: string | null
  cover_url: string | null
  year: number | null
  page_count: number | null
  description: string | null
}

interface BookEditSearchProps {
  initialTitle: string
  initialAuthor: string
  onSelect: (result: SearchResult) => void
  onCancel: () => void
}

export default function BookEditSearch({
  initialTitle,
  initialAuthor,
  onSelect,
  onCancel,
}: BookEditSearchProps) {
  const [query, setQuery] = useState(`${initialTitle} ${initialAuthor}`.trim())
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const result = await window.electronAPI.lookupBook(query.trim(), '')
      if (result) {
        setResults([result])
      } else {
        setResults([])
      }
    } catch {
      setResults([])
    }
    setSearching(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="p-3 space-y-2">
      <div className="flex gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search title or author..."
          className="flex-1 px-2 py-1.5 text-xs bg-surface border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent text-text-primary placeholder-text-tertiary"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-2 py-1.5 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {searching ? '...' : 'Search'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map((result, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(result)}
              className="w-full text-left p-2 bg-surface rounded-md border border-border hover:border-accent transition-colors"
            >
              <div className="flex gap-2">
                {result.cover_url && (
                  <img
                    src={result.cover_url}
                    alt=""
                    className="w-8 h-12 object-cover rounded flex-shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-medium text-text-primary truncate">
                    {result.title}
                  </div>
                  <div className="text-[10px] text-text-secondary truncate">
                    {result.author}
                    {result.year && ` (${result.year})`}
                  </div>
                  {result.isbn && (
                    <div className="text-[10px] text-text-tertiary">
                      ISBN: {result.isbn}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {results.length === 0 && searching === false && query && (
        <p className="text-[10px] text-text-tertiary text-center py-1">
          Press Enter or click Search to find books
        </p>
      )}

      <button
        onClick={onCancel}
        className="w-full px-2 py-1 text-[10px] text-text-secondary hover:text-text-primary transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
