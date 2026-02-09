import { useState } from 'react'

const TAG_CATEGORIES = {
  ownership: {
    label: 'Ownership',
    pickOne: true,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    tags: ['owned', 'to-buy', 'to-borrow', 'lent', 'gave-away', 'lost'],
  },
  reading: {
    label: 'Reading Status',
    pickOne: true,
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    tags: ['unread', 'reading', 'read', 'abandoned', 're-reading'],
  },
  intent: {
    label: 'Intent',
    pickOne: false,
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    tags: ['tbr', 'reference', 'gift-idea', 'favorite'],
  },
  source: {
    label: 'Source',
    pickOne: true,
    color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    tags: ['my-shelf', 'bookstore', 'library', 'recommendation', 'online'],
  },
}

export function getTagColor(tag: string): string {
  for (const [, category] of Object.entries(TAG_CATEGORIES)) {
    if (category.tags.includes(tag)) {
      return category.color
    }
  }
  return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
}

interface TagPickerProps {
  currentTags: string[]
  onSave: (tags: string[]) => void
  onClose: () => void
}

export default function TagPicker({
  currentTags,
  onSave,
  onClose,
}: TagPickerProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([...currentTags])
  const [customTag, setCustomTag] = useState('')

  const toggleTag = (tag: string, categoryKey: string) => {
    const category = TAG_CATEGORIES[categoryKey as keyof typeof TAG_CATEGORIES]
    if (!category) return

    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag)
      }
      if (category.pickOne) {
        // Remove other tags from same category
        const filtered = prev.filter((t) => !category.tags.includes(t))
        return [...filtered, tag]
      }
      return [...prev, tag]
    })
  }

  const addCustomTag = () => {
    const tag = customTag.trim().toLowerCase().replace(/\s+/g, '-')
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags((prev) => [...prev, tag])
    }
    setCustomTag('')
  }

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag))
  }

  // Find custom tags (not in any category)
  const allCategoryTags = Object.values(TAG_CATEGORIES).flatMap((c) => c.tags)
  const customTags = selectedTags.filter((t) => !allCategoryTags.includes(t))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md mx-4 border border-border max-h-[80vh] overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            Edit Tags
          </h3>

          {/* Current tags */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4 pb-3 border-b border-border">
              {selectedTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => removeTag(tag)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border font-medium inline-flex items-center gap-1 ${getTagColor(
                    tag
                  )}`}
                >
                  {tag}
                  <span className="text-[9px] opacity-60">×</span>
                </button>
              ))}
            </div>
          )}

          {/* Category sections */}
          {Object.entries(TAG_CATEGORIES).map(([key, category]) => (
            <div key={key} className="mb-3">
              <div className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
                {category.label}
                {category.pickOne && (
                  <span className="ml-1 normal-case tracking-normal">(pick one)</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {category.tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag, key)}
                    className={`text-[11px] px-2 py-1 rounded-full border font-medium transition-all ${
                      selectedTags.includes(tag)
                        ? category.color + ' ring-1 ring-current'
                        : 'bg-surface-secondary text-text-secondary border-border hover:border-text-tertiary'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Custom tags */}
          <div className="mb-3">
            <div className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
              Custom Tags
            </div>
            {customTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {customTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => removeTag(tag)}
                    className="text-[11px] px-2 py-0.5 rounded-full border font-medium bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20 inline-flex items-center gap-1"
                  >
                    {tag}
                    <span className="text-[9px] opacity-60">×</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
                placeholder="Add custom tag..."
                className="flex-1 px-2 py-1.5 text-xs bg-surface-secondary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent text-text-primary placeholder-text-tertiary"
              />
              <button
                onClick={addCustomTag}
                disabled={!customTag.trim()}
                className="px-2 py-1.5 text-xs font-medium bg-surface-secondary border border-border rounded-md hover:bg-surface-tertiary disabled:opacity-50 transition-colors text-text-primary"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(selectedTags)}
            className="px-4 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
