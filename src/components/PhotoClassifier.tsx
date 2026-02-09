interface PhotoClassifierProps {
  onSelect: (classification: string) => void
  onCancel: () => void
}

const CLASSIFICATIONS = [
  {
    id: 'my-shelf',
    label: 'My Shelf',
    description: 'Books I own on my shelf',
    defaultTags: ['owned', 'my-shelf'],
    icon: '🏠',
  },
  {
    id: 'bookstore',
    label: 'Bookstore',
    description: 'Books spotted at a bookstore',
    defaultTags: ['to-buy', 'bookstore'],
    icon: '🏪',
  },
  {
    id: 'library',
    label: 'Library',
    description: 'Books spotted at a library',
    defaultTags: ['to-borrow', 'library'],
    icon: '📚',
  },
  {
    id: 'other',
    label: 'Other',
    description: 'No default tags',
    defaultTags: [],
    icon: '📷',
  },
]

export function getDefaultTags(classification: string): string[] {
  const c = CLASSIFICATIONS.find((c) => c.id === classification)
  return c?.defaultTags || []
}

export default function PhotoClassifier({
  onSelect,
  onCancel,
}: PhotoClassifierProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-sm mx-4 border border-border">
        <div className="p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-1">
            Classify These Photos
          </h2>
          <p className="text-xs text-text-secondary mb-4">
            This sets default tags for all identified books.
          </p>

          <div className="space-y-2">
            {CLASSIFICATIONS.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className="w-full text-left px-4 py-3 rounded-lg border border-border hover:border-accent hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{c.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      {c.label}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {c.description}
                    </div>
                    {c.defaultTags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {c.defaultTags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border">
          <button
            onClick={onCancel}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
