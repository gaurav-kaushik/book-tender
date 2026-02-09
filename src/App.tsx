import { useState, useEffect, useCallback } from 'react'
import { useDarkMode } from './hooks/useDarkMode'
import Sidebar from './components/Sidebar'
import OnboardingModal from './components/OnboardingModal'
import SettingsPage from './components/SettingsPage'
import HomePage from './pages/HomePage'
import SessionPage from './pages/SessionPage'

type Page = 'home' | 'settings' | 'session'

export default function App() {
  useDarkMode()

  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [checkingKey, setCheckingKey] = useState(true)
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [sessions, setSessions] = useState<any[]>([])

  const loadSessions = useCallback(async () => {
    const data = await window.electronAPI.getSessions()
    setSessions(data)
  }, [])

  useEffect(() => {
    async function checkApiKey() {
      const hasKey = await window.electronAPI.hasApiKey('anthropic')
      if (!hasKey) {
        setShowOnboarding(true)
      }
      setCheckingKey(false)
    }
    checkApiKey()
    loadSessions()
  }, [loadSessions])

  // Listen for menu navigation
  useEffect(() => {
    const cleanup = window.electronAPI.onNavigate((path: string) => {
      if (path === '/settings') setCurrentPage('settings')
      else if (path === '/new-session') handleNewSession()
      else setCurrentPage('home')
    })
    return cleanup
  }, [])

  const handleNewSession = async () => {
    const now = new Date()
    const name = `Scan — ${now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`
    const sessionId = await window.electronAPI.createSession(name)
    await loadSessions()
    setActiveSessionId(sessionId as number)
    setCurrentPage('session')
  }

  const handleSelectSession = (id: number) => {
    setActiveSessionId(id)
    setCurrentPage('session')
  }

  const handleDeleteSession = async (id: number) => {
    await window.electronAPI.deleteSession(id)
    if (activeSessionId === id) {
      setActiveSessionId(null)
      setCurrentPage('home')
    }
    await loadSessions()
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  if (checkingKey) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface">
        <div className="text-text-secondary text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-surface">
      {/* Titlebar drag region */}
      <div className="titlebar-drag h-12 flex-shrink-0" />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          onNavigate={(page: string) => setCurrentPage(page as Page)}
          currentPage={currentPage}
        />

        <main className="flex-1 overflow-y-auto">
          {currentPage === 'settings' && <SettingsPage />}
          {currentPage === 'home' && (
            <HomePage onNewSession={handleNewSession} />
          )}
          {currentPage === 'session' && activeSessionId && (
            <SessionPage
              sessionId={activeSessionId}
              onSessionUpdated={loadSessions}
            />
          )}
        </main>
      </div>

      {showOnboarding && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}
    </div>
  )
}
