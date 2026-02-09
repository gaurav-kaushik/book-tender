import { useState, useEffect } from 'react'

export default function SettingsPage() {
  const [anthropicKey, setAnthropicKey] = useState('')
  const [googleKey, setGoogleKey] = useState('')
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false)
  const [hasGoogleKey, setHasGoogleKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    error?: string
  } | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      setHasAnthropicKey(await window.electronAPI.hasApiKey('anthropic'))
      setHasGoogleKey(await window.electronAPI.hasApiKey('google_books'))
    }
    load()
  }, [])

  const handleTestConnection = async () => {
    const key = anthropicKey.trim()
    if (!key) {
      if (hasAnthropicKey) {
        const stored = await window.electronAPI.getApiKey('anthropic')
        if (stored) {
          setTesting(true)
          setTestResult(null)
          const result = await window.electronAPI.testAnthropicKey(stored)
          setTestResult(result)
          setTesting(false)
          return
        }
      }
      return
    }
    setTesting(true)
    setTestResult(null)
    const result = await window.electronAPI.testAnthropicKey(key)
    setTestResult(result)
    setTesting(false)
  }

  const handleSave = async () => {
    if (anthropicKey.trim()) {
      await window.electronAPI.storeApiKey('anthropic', anthropicKey.trim())
      setHasAnthropicKey(true)
      setAnthropicKey('')
    }
    if (googleKey.trim()) {
      await window.electronAPI.storeApiKey('google_books', googleKey.trim())
      setHasGoogleKey(true)
      setGoogleKey('')
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleDeleteKey = async (keyName: string) => {
    await window.electronAPI.deleteApiKey(keyName)
    if (keyName === 'anthropic') setHasAnthropicKey(false)
    if (keyName === 'google_books') setHasGoogleKey(false)
  }

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Settings</h1>

      <section className="mb-8">
        <h2 className="text-lg font-medium text-text-primary mb-4">API Keys</h2>
        <p className="text-sm text-text-secondary mb-4">
          Keys are stored securely in the macOS Keychain and never leave your
          computer except to call the respective APIs.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Anthropic API Key
            </label>
            {hasAnthropicKey ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 text-sm bg-surface-secondary border border-border rounded-lg text-text-secondary">
                  ••••••••••••••••••••
                </div>
                <button
                  onClick={() => handleDeleteKey('anthropic')}
                  className="px-3 py-2 text-sm text-red-500 hover:bg-surface-secondary rounded-lg transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-3 py-2 text-sm bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text-primary placeholder-text-tertiary"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Google Books API Key{' '}
              <span className="text-text-tertiary">(optional)</span>
            </label>
            {hasGoogleKey ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 text-sm bg-surface-secondary border border-border rounded-lg text-text-secondary">
                  ••••••••••••••••••••
                </div>
                <button
                  onClick={() => handleDeleteKey('google_books')}
                  className="px-3 py-2 text-sm text-red-500 hover:bg-surface-secondary rounded-lg transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <input
                type="password"
                value={googleKey}
                onChange={(e) => setGoogleKey(e.target.value)}
                placeholder="AIza..."
                className="w-full px-3 py-2 text-sm bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text-primary placeholder-text-tertiary"
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2 text-sm font-medium bg-surface-secondary border border-border rounded-lg hover:bg-surface-tertiary disabled:opacity-50 transition-colors text-text-primary"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleSave}
              disabled={!anthropicKey.trim() && !googleKey.trim()}
              className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save Keys
            </button>
            {testResult && (
              <span
                className={`text-sm ${
                  testResult.success ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {testResult.success
                  ? 'Connection successful!'
                  : testResult.error || 'Connection failed'}
              </span>
            )}
            {saved && (
              <span className="text-sm text-green-500">Saved!</span>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium text-text-primary mb-4">About</h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          Book Tender v0.1.0. Catalog your physical books by photographing
          your shelves. All data is stored locally. Open source under the MIT
          license.
        </p>
      </section>
    </div>
  )
}
