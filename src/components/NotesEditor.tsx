import { useState, useRef, useEffect } from 'react'

interface NotesEditorProps {
  bookId: number
  currentNotes: string
  onSave: (bookId: number, notes: string) => void
  onClose: () => void
}

export default function NotesEditor({
  bookId,
  currentNotes,
  onSave,
  onClose,
}: NotesEditorProps) {
  const [notes, setNotes] = useState(currentNotes)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSave = () => {
    onSave(bookId, notes.trim())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-sm mx-4 border border-border">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-2">Notes</h3>
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder='e.g., "Lent to Sarah, Jan 2026" or "Top shelf, living room"'
            rows={4}
            className="w-full px-3 py-2 text-sm bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text-primary placeholder-text-tertiary resize-none"
          />
        </div>
        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
