interface HomePageProps {
  onNewSession: () => void
}

export default function HomePage({ onNewSession }: HomePageProps) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">📚</div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          Book Tender
        </h1>
        <p className="text-text-secondary mb-6 leading-relaxed">
          Take a photo of your bookshelf, and get back a verified, tagged
          catalog. Scan every shelf in your house, every bookstore visit,
          every library trip.
        </p>
        <button
          onClick={onNewSession}
          className="px-6 py-3 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors inline-flex items-center gap-2"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 4v12M4 10h12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Start Your First Scan
        </button>
        <p className="text-xs text-text-tertiary mt-4">
          Or press <kbd className="px-1.5 py-0.5 bg-surface-secondary border border-border rounded text-text-secondary">Cmd+N</kbd> to
          create a new session
        </p>
      </div>
    </div>
  )
}
