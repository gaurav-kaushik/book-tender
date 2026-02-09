export interface ElectronAPI {
  storeApiKey: (keyName: string, keyValue: string) => Promise<boolean>
  getApiKey: (keyName: string) => Promise<string | null>
  hasApiKey: (keyName: string) => Promise<boolean>
  deleteApiKey: (keyName: string) => Promise<boolean>
  testAnthropicKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>

  getDarkMode: () => Promise<boolean>
  onDarkModeChanged: (callback: (isDark: boolean) => void) => () => void

  importPhotos: (filePaths: string[]) => Promise<
    { originalPath: string; storedPath: string; hash: string }[]
  >
  showOpenDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>
  showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath?: string }>
  getPhotoData: (filePath: string) => Promise<string>

  identifyBooks: (photoPath: string, photoHash: string) => Promise<any[]>
  lookupBook: (
    title: string,
    author: string,
    isbn?: string
  ) => Promise<{
    title: string
    author: string
    isbn: string | null
    cover_url: string | null
    year: number | null
    page_count: number | null
    description: string | null
  } | null>

  createSession: (name: string) => Promise<number>
  getSessions: () => Promise<any[]>
  getSession: (sessionId: number) => Promise<any>
  renameSession: (sessionId: number, newName: string) => Promise<boolean>
  deleteSession: (sessionId: number) => Promise<boolean>

  saveBook: (book: any) => Promise<number>
  getBooks: (sessionId: number) => Promise<any[]>
  updateBook: (bookId: number, updates: any) => Promise<boolean>
  deleteBook: (bookId: number) => Promise<boolean>

  savePhoto: (photo: any) => Promise<number>
  getPhotos: (sessionId: number) => Promise<any[]>

  showNotification: (title: string, body: string) => Promise<boolean>

  onNavigate: (callback: (path: string) => void) => () => void
  onPhotosSelected: (callback: (paths: string[]) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
