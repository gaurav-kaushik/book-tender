import { useState, useEffect } from 'react'

export function useDarkMode() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    window.electronAPI.getDarkMode().then(setIsDark)
    const cleanup = window.electronAPI.onDarkModeChanged(setIsDark)
    return cleanup
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  return isDark
}
