import { useState } from 'react'

interface OnboardingModalProps {
  onComplete: () => void
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [anthropicKey, setAnthropicKey] = useState('')
  const [googleKey, setGoogleKey] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    error?: string
  } | null>(null)
  const [saving, setSaving] = useState(false)

  const handleTestConnection = async () => {
    if (!anthropicKey.trim()) return
    setTesting(true)
    setTestResult(null)
    const result = await window.electronAPI.testAnthropicKey(anthropicKey.trim())
    setTestResult(result)
    setTesting(false)
  }

  const handleSave = async () => {
    if (!anthropicKey.trim()) return
    setSaving(true)
    await window.electronAPI.storeApiKey('anthropic', anthropicKey.trim())
    if (googleKey.trim()) {
      await window.electronAPI.storeApiKey('google_books', googleKey.trim())
    }
    setSaving(false)
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-border">
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">📚</div>
            <h1 className="text-xl font-semibold text-text-primary">
              Welcome to Book Tender
            </h1>
            <p className="text-sm text-text-secondary mt-2 leading-relaxed">
              Catalog your physical book collection by taking photos of your
              shelves. Book Tender uses Claude AI to identify books and Google
              Books for metadata. Everything runs locally — you just need your
              own API keys.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Anthropic API Key{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-3 py-2 text-sm bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text-primary placeholder-text-tertiary"
              />
              <p className="text-xs text-text-tertiary mt-1">
                Get your key at{' '}
                <button
                  onClick={() =>
                    window.open('https://console.anthropic.com/', '_blank')
                  }
                  className="text-accent hover:underline"
                >
                  console.anthropic.com
                </button>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Google Books API Key{' '}
                <span className="text-text-tertiary">(optional)</span>
              </label>
              <input
                type="password"
                value={googleKey}
                onChange={(e) => setGoogleKey(e.target.value)}
                placeholder="AIza..."
                className="w-full px-3 py-2 text-sm bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text-primary placeholder-text-tertiary"
              />
              <p className="text-xs text-text-tertiary mt-1">
                Adds richer metadata (ISBN, covers, page counts). Works without
                it at lower rate limits.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleTestConnection}
                disabled={!anthropicKey.trim() || testing}
                className="px-4 py-2 text-sm font-medium bg-surface-secondary border border-border rounded-lg hover:bg-surface-tertiary disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-text-primary"
              >
                {testing ? 'Testing...' : 'Test Connection'}
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
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-surface-secondary border-t border-border flex justify-end">
          <button
            onClick={handleSave}
            disabled={!anthropicKey.trim() || saving}
            className="px-5 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : "Get Started"}
          </button>
        </div>
      </div>
    </div>
  )
}
