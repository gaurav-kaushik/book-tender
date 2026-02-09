import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // API Key Management
  storeApiKey: (keyName: string, keyValue: string) =>
    ipcRenderer.invoke('store-api-key', keyName, keyValue),
  getApiKey: (keyName: string) => ipcRenderer.invoke('get-api-key', keyName),
  hasApiKey: (keyName: string) => ipcRenderer.invoke('has-api-key', keyName),
  deleteApiKey: (keyName: string) => ipcRenderer.invoke('delete-api-key', keyName),
  testAnthropicKey: (apiKey: string) => ipcRenderer.invoke('test-anthropic-key', apiKey),

  // Dark Mode
  getDarkMode: () => ipcRenderer.invoke('get-dark-mode'),
  onDarkModeChanged: (callback: (isDark: boolean) => void) => {
    const handler = (_event: any, isDark: boolean) => callback(isDark)
    ipcRenderer.on('dark-mode-changed', handler)
    return () => ipcRenderer.removeListener('dark-mode-changed', handler)
  },

  // Photo Import
  importPhotos: (filePaths: string[]) => ipcRenderer.invoke('import-photos', filePaths),
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
  showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  getPhotoData: (filePath: string) => ipcRenderer.invoke('get-photo-data', filePath),

  // Book Identification
  identifyBooks: (photoPath: string, photoHash: string) =>
    ipcRenderer.invoke('identify-books', photoPath, photoHash),
  lookupBook: (title: string, author: string, isbn?: string) =>
    ipcRenderer.invoke('lookup-book', title, author, isbn),

  // Dedup
  checkDuplicate: (sessionId: number, title: string, author: string, isbn?: string) =>
    ipcRenderer.invoke('check-duplicate', sessionId, title, author, isbn),

  // Sessions
  createSession: (name: string) => ipcRenderer.invoke('create-session', name),
  getSessions: () => ipcRenderer.invoke('get-sessions'),
  getSession: (sessionId: number) => ipcRenderer.invoke('get-session', sessionId),
  renameSession: (sessionId: number, newName: string) =>
    ipcRenderer.invoke('rename-session', sessionId, newName),
  deleteSession: (sessionId: number) => ipcRenderer.invoke('delete-session', sessionId),

  // Books
  saveBook: (book: any) => ipcRenderer.invoke('save-book', book),
  getBooks: (sessionId: number) => ipcRenderer.invoke('get-books', sessionId),
  updateBook: (bookId: number, updates: any) => ipcRenderer.invoke('update-book', bookId, updates),
  deleteBook: (bookId: number) => ipcRenderer.invoke('delete-book', bookId),

  // Photos
  savePhoto: (photo: any) => ipcRenderer.invoke('save-photo', photo),
  getPhotos: (sessionId: number) => ipcRenderer.invoke('get-photos', sessionId),

  // Notifications
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('show-notification', title, body),

  // Navigation events from menu
  onNavigate: (callback: (path: string) => void) => {
    const handler = (_event: any, path: string) => callback(path)
    ipcRenderer.on('navigate', handler)
    return () => ipcRenderer.removeListener('navigate', handler)
  },

  // Photos selected from menu File > Import
  onPhotosSelected: (callback: (paths: string[]) => void) => {
    const handler = (_event: any, paths: string[]) => callback(paths)
    ipcRenderer.on('photos-selected', handler)
    return () => ipcRenderer.removeListener('photos-selected', handler)
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
