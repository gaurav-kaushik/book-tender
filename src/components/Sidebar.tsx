import { useState } from 'react'

interface SidebarProps {
  sessions: any[]
  activeSessionId: number | null
  onSelectSession: (id: number) => void
  onNewSession: () => void
  onDeleteSession: (id: number) => void
  onNavigate: (page: string) => void
  currentPage: string
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onNavigate,
  currentPage,
}: SidebarProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    sessionId: number
  } | null>(null)

  const handleContextMenu = (e: React.MouseEvent, sessionId: number) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, sessionId })
  }

  return (
    <>
      <aside className="w-56 flex-shrink-0 bg-surface-secondary border-r border-border flex flex-col">
        <div className="p-3 pt-1">
          <button
            onClick={onNewSession}
            className="titlebar-no-drag w-full px-3 py-2 text-sm font-medium text-accent hover:bg-surface-tertiary rounded-lg transition-colors flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3v10M3 8h10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            New Scan
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2">
          <div className="px-2 py-1.5 text-xs font-medium text-text-tertiary uppercase tracking-wider">
            Sessions
          </div>
          {sessions.length === 0 && (
            <div className="px-3 py-2 text-xs text-text-tertiary">
              No sessions yet
            </div>
          )}
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              onContextMenu={(e) => handleContextMenu(e, session.id)}
              className={`titlebar-no-drag w-full text-left px-3 py-2 text-sm rounded-lg mb-0.5 transition-colors ${
                activeSessionId === session.id
                  ? 'bg-accent text-white'
                  : 'text-text-primary hover:bg-surface-tertiary'
              }`}
            >
              <div className="truncate font-medium">{session.name}</div>
              <div
                className={`text-xs mt-0.5 ${
                  activeSessionId === session.id
                    ? 'text-white/70'
                    : 'text-text-secondary'
                }`}
              >
                {session.book_count || 0} books
              </div>
            </button>
          ))}
        </nav>

        <div className="p-2 border-t border-border">
          <button
            onClick={() => onNavigate('settings')}
            className={`titlebar-no-drag w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
              currentPage === 'settings'
                ? 'bg-surface-tertiary text-text-primary'
                : 'text-text-secondary hover:bg-surface-tertiary'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6.5 2.5l.5-1h2l.5 1 1.5.5 1-.5 1.5 1.5-.5 1 .5 1.5 1 .5v2l-1 .5-.5 1.5.5 1-1.5 1.5-1-.5-1.5.5-.5 1h-2l-.5-1-1.5-.5-1 .5-1.5-1.5.5-1-.5-1.5-1-.5v-2l1-.5.5-1.5-.5-1L5 3l1 .5 1.5-.5z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <circle
                cx="8"
                cy="8"
                r="2"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </svg>
            Settings
          </button>
        </div>
      </aside>

      {contextMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setContextMenu(null)}
        >
          <div
            className="absolute bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => {
                onDeleteSession(contextMenu.sessionId)
                setContextMenu(null)
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-surface-secondary"
            >
              Delete Session
            </button>
          </div>
        </div>
      )}
    </>
  )
}
