import { useState, useEffect, useCallback, useRef } from 'react'
import BookEditSearch from '../components/BookEditSearch'
import PhotoClassifier, { getDefaultTags } from '../components/PhotoClassifier'
import TagPicker, { getTagColor } from '../components/TagPicker'
import NotesEditor from '../components/NotesEditor'

interface SessionPageProps {
  sessionId: number
  onSessionUpdated: () => void
}

interface BookCard {
  id?: number
  title: string
  author: string
  isbn?: string
  cover_url?: string
  year?: number
  page_count?: number
  description?: string
  tags: string[]
  notes?: string
  confidence: 'high' | 'medium' | 'low'
  verified: boolean
  position?: string
  spine_text?: string
  source_photo_path?: string
}

interface PhotoPreview {
  path: string
  hash: string
  dataUrl?: string
  status: 'importing' | 'identifying' | 'enriching' | 'done' | 'error'
  bookCount?: number
  error?: string
}

export default function SessionPage({
  sessionId,
  onSessionUpdated,
}: SessionPageProps) {
  const [session, setSession] = useState<any>(null)
  const [books, setBooks] = useState<BookCard[]>([])
  const [photos, setPhotos] = useState<any[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<PhotoPreview[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
  const [editingBookId, setEditingBookId] = useState<number | null>(null)
  const [pendingFiles, setPendingFiles] = useState<string[] | null>(null)
  const [taggingBookId, setTaggingBookId] = useState<number | null>(null)
  const [selectedForBulk, setSelectedForBulk] = useState<Set<number>>(new Set())
  const [showBulkTagPicker, setShowBulkTagPicker] = useState(false)
  const [notesBookId, setNotesBookId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [sessionName, setSessionName] = useState('')
  const [exporting, setExporting] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  const loadSession = useCallback(async () => {
    const s = await window.electronAPI.getSession(sessionId)
    setSession(s)
    setSessionName(s?.name || '')
    const b = await window.electronAPI.getBooks(sessionId)
    setBooks(
      b.map((book: any) => ({
        ...book,
        tags: typeof book.tags === 'string' ? JSON.parse(book.tags) : book.tags || [],
        verified: !!book.verified,
      }))
    )
    const p = await window.electronAPI.getPhotos(sessionId)
    setPhotos(p)

    // Load thumbnails for existing photos
    const previews: PhotoPreview[] = []
    for (const photo of p) {
      try {
        const dataUrl = await window.electronAPI.getPhotoData(photo.file_path)
        previews.push({
          path: photo.file_path,
          hash: photo.hash || '',
          dataUrl,
          status: 'done',
        })
      } catch {
        previews.push({
          path: photo.file_path,
          hash: photo.hash || '',
          status: 'done',
        })
      }
    }
    setPhotoPreviews(previews)
  }, [sessionId])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  // Listen for photos from menu
  useEffect(() => {
    const cleanup = window.electronAPI.onPhotosSelected(async (paths: string[]) => {
      setPendingFiles(paths)
    })
    return cleanup
  }, [sessionId])

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
      .filter((f) => /\.(jpg|jpeg|png|heic|webp)$/i.test(f.name))
      .map((f) => (f as any).path as string)
      .filter(Boolean)
    if (files.length > 0) {
      setPendingFiles(files)
    }
  }

  const handleFileSelect = async () => {
    const result = await window.electronAPI.showOpenDialog()
    if (!result.canceled && result.filePaths.length > 0) {
      setPendingFiles(result.filePaths)
    }
  }

  const handleClassification = async (classification: string) => {
    if (!pendingFiles) return
    const files = pendingFiles
    setPendingFiles(null)
    await processPhotos(files, classification)
  }

  const processPhotos = async (filePaths: string[], classification: string = 'other') => {
    setProcessing(true)
    let totalNewBooks = 0
    try {
      setProcessingStatus('Importing photos...')
      const imported = await window.electronAPI.importPhotos(filePaths)

      // Add preview placeholders
      const newPreviews: PhotoPreview[] = imported.map((p) => ({
        path: p.storedPath,
        hash: p.hash,
        status: 'importing' as const,
      }))
      setPhotoPreviews((prev) => [...prev, ...newPreviews])

      // Load thumbnails
      for (let idx = 0; idx < imported.length; idx++) {
        const photo = imported[idx]
        try {
          const dataUrl = await window.electronAPI.getPhotoData(photo.storedPath)
          setPhotoPreviews((prev) =>
            prev.map((p) =>
              p.hash === photo.hash ? { ...p, dataUrl, status: 'identifying' } : p
            )
          )
        } catch {
          setPhotoPreviews((prev) =>
            prev.map((p) =>
              p.hash === photo.hash ? { ...p, status: 'identifying' } : p
            )
          )
        }

        setProcessingStatus(
          `Identifying books in ${photo.originalPath.split('/').pop()}...`
        )

        // Save photo record
        await window.electronAPI.savePhoto({
          session_id: sessionId,
          file_path: photo.storedPath,
          classification,
          hash: photo.hash,
        })

        // Identify books via Claude
        let identified: any[]
        try {
          identified = await window.electronAPI.identifyBooks(
            photo.storedPath,
            photo.hash
          )
        } catch (err: any) {
          setPhotoPreviews((prev) =>
            prev.map((p) =>
              p.hash === photo.hash
                ? { ...p, status: 'error', error: err.message }
                : p
            )
          )
          continue
        }

        setPhotoPreviews((prev) =>
          prev.map((p) =>
            p.hash === photo.hash ? { ...p, status: 'enriching' } : p
          )
        )

        // Enrich each book via Google Books and save
        for (let i = 0; i < identified.length; i++) {
          const book = identified[i]
          setProcessingStatus(
            `Looking up "${book.title}" (${i + 1}/${identified.length})...`
          )

          let enriched = null
          try {
            enriched = await window.electronAPI.lookupBook(
              book.title,
              book.author
            )
          } catch {
            // Google Books lookup failed, continue without enrichment
          }

          // Check for duplicates within session
          const dupCheck = await window.electronAPI.checkDuplicate(
            sessionId,
            enriched?.title || book.title,
            enriched?.author || book.author,
            enriched?.isbn || undefined
          )

          const defaultTags = getDefaultTags(classification)
          const dupNote = dupCheck.isDuplicate
            ? `⚠️ Possible duplicate of "${dupCheck.existingBook?.title}" (${dupCheck.matchType} match)`
            : null

          await window.electronAPI.saveBook({
            session_id: sessionId,
            title: enriched?.title || book.title,
            author: enriched?.author || book.author,
            isbn: enriched?.isbn || null,
            cover_url: enriched?.cover_url || null,
            year: enriched?.year || null,
            page_count: enriched?.page_count || null,
            description: enriched?.description || null,
            tags: JSON.stringify(defaultTags),
            notes: dupNote,
            confidence: book.confidence,
            verified: false,
            source_photo_path: photo.storedPath,
            position: book.position || null,
            spine_text: book.spine_text || null,
          })
          totalNewBooks++
        }

        setPhotoPreviews((prev) =>
          prev.map((p) =>
            p.hash === photo.hash
              ? { ...p, status: 'done', bookCount: identified.length }
              : p
          )
        )
      }

      await loadSession()
      onSessionUpdated()

      await window.electronAPI.showNotification(
        'Scan Complete',
        `Identified ${totalNewBooks} books`
      )
    } catch (err: any) {
      console.error('Processing failed:', err)
      setProcessingStatus(`Error: ${err.message}`)
    } finally {
      setProcessing(false)
      setProcessingStatus('')
    }
  }

  const handleConfirmBook = async (bookId: number) => {
    await window.electronAPI.updateBook(bookId, { verified: 1 })
    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, verified: true } : b))
    )
  }

  const handleRemoveBook = async (bookId: number) => {
    await window.electronAPI.deleteBook(bookId)
    setBooks((prev) => prev.filter((b) => b.id !== bookId))
    onSessionUpdated()
  }

  const handleConfirmAllHigh = async () => {
    const highBooks = books.filter(
      (b) => b.confidence === 'high' && !b.verified
    )
    for (const book of highBooks) {
      if (book.id) {
        await window.electronAPI.updateBook(book.id, { verified: 1 })
      }
    }
    setBooks((prev) =>
      prev.map((b) =>
        b.confidence === 'high' ? { ...b, verified: true } : b
      )
    )
  }

  const handleEditBook = async (
    bookId: number,
    result: {
      title: string
      author: string
      isbn: string | null
      cover_url: string | null
      year: number | null
      page_count: number | null
      description: string | null
    }
  ) => {
    await window.electronAPI.updateBook(bookId, {
      title: result.title,
      author: result.author,
      isbn: result.isbn,
      cover_url: result.cover_url,
      year: result.year,
      page_count: result.page_count,
      description: result.description,
    })
    setBooks((prev) =>
      prev.map((b) =>
        b.id === bookId
          ? {
              ...b,
              title: result.title,
              author: result.author,
              isbn: result.isbn || undefined,
              cover_url: result.cover_url || undefined,
              year: result.year || undefined,
              page_count: result.page_count || undefined,
              description: result.description || undefined,
            }
          : b
      )
    )
    setEditingBookId(null)
  }

  const handleSaveTags = async (bookId: number, tags: string[]) => {
    await window.electronAPI.updateBook(bookId, { tags: JSON.stringify(tags) })
    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, tags } : b))
    )
    setTaggingBookId(null)
  }

  const handleBulkTag = async (tags: string[]) => {
    for (const bookId of selectedForBulk) {
      await window.electronAPI.updateBook(bookId, {
        tags: JSON.stringify(tags),
      })
    }
    setBooks((prev) =>
      prev.map((b) =>
        selectedForBulk.has(b.id!) ? { ...b, tags } : b
      )
    )
    setSelectedForBulk(new Set())
    setShowBulkTagPicker(false)
  }

  const handleSaveNotes = async (bookId: number, notes: string) => {
    await window.electronAPI.updateBook(bookId, { notes: notes || null })
    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, notes } : b))
    )
  }

  const toggleBulkSelect = (bookId: number) => {
    setSelectedForBulk((prev) => {
      const next = new Set(prev)
      if (next.has(bookId)) {
        next.delete(bookId)
      } else {
        next.add(bookId)
      }
      return next
    })
  }

  const handleExportCSV = async () => {
    const result = await window.electronAPI.showSaveDialog({
      defaultPath: `${session?.name || 'books'}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (result.canceled || !result.filePath) return
    setExporting(true)
    try {
      const csv = await window.electronAPI.exportSessionCSV(sessionId)
      await window.electronAPI.writeFile(result.filePath, csv)
      await window.electronAPI.showNotification('Export Complete', `Saved CSV to ${result.filePath}`)
    } catch (err: any) {
      console.error('Export failed:', err)
    }
    setExporting(false)
  }

  const handleExportJSON = async () => {
    const result = await window.electronAPI.showSaveDialog({
      defaultPath: `${session?.name || 'books'}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePath) return
    setExporting(true)
    try {
      const json = await window.electronAPI.exportSessionJSON(sessionId)
      await window.electronAPI.writeFile(result.filePath, json)
      await window.electronAPI.showNotification('Export Complete', `Saved JSON to ${result.filePath}`)
    } catch (err: any) {
      console.error('Export failed:', err)
    }
    setExporting(false)
  }

  const confidenceColor = (c: string) => {
    switch (c) {
      case 'high':
        return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
      case 'low':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
      default:
        return 'bg-surface-tertiary text-text-secondary'
    }
  }

  const statusLabel = (status: PhotoPreview['status']) => {
    switch (status) {
      case 'importing':
        return 'Importing...'
      case 'identifying':
        return 'Identifying books...'
      case 'enriching':
        return 'Looking up metadata...'
      case 'done':
        return 'Done'
      case 'error':
        return 'Error'
    }
  }

  const unverifiedHighCount = books.filter(
    (b) => b.confidence === 'high' && !b.verified
  ).length

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          {editingName ? (
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              onBlur={async () => {
                if (sessionName.trim()) {
                  await window.electronAPI.renameSession(sessionId, sessionName.trim())
                  onSessionUpdated()
                }
                setEditingName(false)
              }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  if (sessionName.trim()) {
                    await window.electronAPI.renameSession(sessionId, sessionName.trim())
                    onSessionUpdated()
                  }
                  setEditingName(false)
                }
                if (e.key === 'Escape') {
                  setSessionName(session?.name || '')
                  setEditingName(false)
                }
              }}
              autoFocus
              className="text-lg font-semibold bg-transparent border-b-2 border-accent outline-none text-text-primary"
            />
          ) : (
            <h1
              className="text-lg font-semibold text-text-primary cursor-pointer hover:text-accent transition-colors"
              onDoubleClick={() => setEditingName(true)}
              title="Double-click to rename"
            >
              {session?.name || 'Loading...'}
            </h1>
          )}
          <p className="text-xs text-text-secondary mt-0.5">
            {books.length} books &middot; {photos.length} photos
          </p>
        </div>
        <div className="flex gap-2">
          {selectedForBulk.size > 0 && (
            <>
              <span className="text-xs text-text-secondary self-center">
                {selectedForBulk.size} selected
              </span>
              <button
                onClick={() => setShowBulkTagPicker(true)}
                className="px-3 py-1.5 text-xs font-medium bg-accent/10 text-accent border border-accent/20 rounded-lg hover:bg-accent/20 transition-colors"
              >
                Tag Selected
              </button>
              <button
                onClick={() => setSelectedForBulk(new Set())}
                className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Clear
              </button>
            </>
          )}
          {unverifiedHighCount > 0 && (
            <button
              onClick={handleConfirmAllHigh}
              className="px-3 py-1.5 text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
            >
              Confirm All High ({unverifiedHighCount})
            </button>
          )}
          {books.length > 0 && (
            <>
              <button
                onClick={handleExportCSV}
                disabled={exporting}
                className="px-3 py-1.5 text-xs font-medium bg-surface-secondary border border-border text-text-primary rounded-lg hover:bg-surface-tertiary disabled:opacity-50 transition-colors"
              >
                CSV
              </button>
              <button
                onClick={handleExportJSON}
                disabled={exporting}
                className="px-3 py-1.5 text-xs font-medium bg-surface-secondary border border-border text-text-primary rounded-lg hover:bg-surface-tertiary disabled:opacity-50 transition-colors"
              >
                JSON
              </button>
            </>
          )}
          <button
            onClick={handleFileSelect}
            disabled={processing}
            className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            Add Photos
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Processing status */}
        {processing && (
          <div className="mb-6 p-4 bg-accent/5 border border-accent/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-text-primary">{processingStatus}</span>
            </div>
          </div>
        )}

        {/* Photo thumbnails */}
        {photoPreviews.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-text-secondary mb-3">
              Photos
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {photoPreviews.map((preview, idx) => (
                <div
                  key={preview.hash || idx}
                  className="relative flex-shrink-0 w-32 h-24 rounded-lg overflow-hidden bg-surface-tertiary border border-border"
                >
                  {preview.dataUrl ? (
                    <img
                      src={preview.dataUrl}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-2xl">📷</span>
                    </div>
                  )}
                  {preview.status !== 'done' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      {preview.status === 'error' ? (
                        <span className="text-xs text-red-400 px-2 text-center">
                          {preview.error || 'Error'}
                        </span>
                      ) : (
                        <div className="text-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                          <span className="text-[10px] text-white">
                            {statusLabel(preview.status)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {preview.status === 'done' && preview.bookCount !== undefined && (
                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {preview.bookCount} books
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {books.length === 0 && !processing ? (
          <div
            ref={dropRef}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`h-64 border-2 border-dashed rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-accent bg-accent/5'
                : 'border-border hover:border-text-tertiary'
            }`}
            onClick={handleFileSelect}
          >
            <div className="text-center">
              <div className="text-4xl mb-3">📸</div>
              <p className="text-sm font-medium text-text-primary">
                Drop bookshelf photos here
              </p>
              <p className="text-xs text-text-secondary mt-1">
                or click to browse &middot; JPG, PNG, HEIC, WebP
              </p>
              <p className="text-xs text-text-tertiary mt-2">
                <kbd className="px-1 py-0.5 bg-surface-secondary border border-border rounded">
                  Cmd+O
                </kbd>{' '}
                to import
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Also show drop area when books exist */}
            {!processing && (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`mb-6 h-20 border-2 border-dashed rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                  isDragging
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-text-tertiary'
                }`}
                onClick={handleFileSelect}
              >
                <p className="text-xs text-text-secondary">
                  Drop more photos or click to add
                </p>
              </div>
            )}

            {/* Book grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {books.map((book, index) => (
                <div
                  key={book.id}
                  className={`relative bg-surface-secondary rounded-xl border transition-all ${
                    book.verified
                      ? 'border-green-500/30'
                      : 'border-border hover:border-text-tertiary'
                  }`}
                >
                  {/* Position badge */}
                  <div className="absolute top-2 left-2 z-10 w-5 h-5 bg-black/60 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {index + 1}
                  </div>

                  {/* Bulk select checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      book.id && toggleBulkSelect(book.id)
                    }}
                    className={`absolute top-2 right-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedForBulk.has(book.id!)
                        ? 'bg-accent border-accent text-white'
                        : 'bg-black/30 border-white/60 hover:border-white'
                    }`}
                  >
                    {selectedForBulk.has(book.id!) && (
                      <span className="text-[10px] font-bold">✓</span>
                    )}
                  </button>

                  {/* Cover */}
                  <div className="aspect-[2/3] bg-surface-tertiary rounded-t-xl overflow-hidden flex items-center justify-center">
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <div className="text-3xl mb-2">📖</div>
                        <div className="text-xs text-text-tertiary truncate max-w-full">
                          {book.title}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-text-primary truncate">
                      {book.title}
                    </h3>
                    <p className="text-xs text-text-secondary truncate mt-0.5">
                      {book.author}
                    </p>

                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${confidenceColor(
                          book.confidence
                        )}`}
                      >
                        {book.confidence}
                      </span>
                      {book.verified && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 font-medium">
                          confirmed
                        </span>
                      )}
                      {book.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${getTagColor(tag)}`}
                        >
                          {tag}
                        </span>
                      ))}
                      <button
                        onClick={() => book.id && setTaggingBookId(book.id)}
                        className="text-[10px] px-1.5 py-0.5 rounded-full border border-dashed border-text-tertiary text-text-tertiary hover:border-accent hover:text-accent transition-colors"
                        title="Edit tags"
                      >
                        +
                      </button>
                      {book.notes && (
                        <button
                          onClick={() => book.id && setNotesBookId(book.id)}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 font-medium"
                          title={book.notes}
                        >
                          📝
                        </button>
                      )}
                      {!book.notes && (
                        <button
                          onClick={() => book.id && setNotesBookId(book.id)}
                          className="text-[10px] px-1 py-0.5 text-text-tertiary hover:text-accent transition-colors"
                          title="Add note"
                        >
                          📝
                        </button>
                      )}
                    </div>

                    {/* Actions */}
                    {editingBookId === book.id ? (
                      <BookEditSearch
                        initialTitle={book.title}
                        initialAuthor={book.author}
                        onSelect={(result) =>
                          book.id && handleEditBook(book.id, result)
                        }
                        onCancel={() => setEditingBookId(null)}
                      />
                    ) : !book.verified ? (
                      <div className="flex gap-1.5 mt-3">
                        <button
                          onClick={() => book.id && handleConfirmBook(book.id)}
                          className="flex-1 px-2 py-1 text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 rounded-md hover:bg-green-500/20 transition-colors"
                          title="Confirm"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => book.id && setEditingBookId(book.id)}
                          className="flex-1 px-2 py-1 text-xs font-medium bg-accent/10 text-accent rounded-md hover:bg-accent/20 transition-colors"
                          title="Edit"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => book.id && handleRemoveBook(book.id)}
                          className="flex-1 px-2 py-1 text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 rounded-md hover:bg-red-500/20 transition-colors"
                          title="Remove"
                        >
                          ✗
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Classification modal */}
      {pendingFiles && (
        <PhotoClassifier
          onSelect={handleClassification}
          onCancel={() => setPendingFiles(null)}
        />
      )}

      {/* Individual tag picker */}
      {taggingBookId && (
        <TagPicker
          currentTags={
            books.find((b) => b.id === taggingBookId)?.tags || []
          }
          onSave={(tags) => handleSaveTags(taggingBookId, tags)}
          onClose={() => setTaggingBookId(null)}
        />
      )}

      {/* Bulk tag picker */}
      {showBulkTagPicker && (
        <TagPicker
          currentTags={[]}
          onSave={handleBulkTag}
          onClose={() => setShowBulkTagPicker(false)}
        />
      )}

      {/* Notes editor */}
      {notesBookId && (
        <NotesEditor
          bookId={notesBookId}
          currentNotes={books.find((b) => b.id === notesBookId)?.notes || ''}
          onSave={handleSaveNotes}
          onClose={() => setNotesBookId(null)}
        />
      )}
    </div>
  )
}
