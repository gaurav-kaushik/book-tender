import {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  Menu,
  dialog,
  safeStorage,
  shell,
  Notification,
} from 'electron'
import path from 'path'
import { initDatabase, getDatabase } from './services/db'
import { identifyBooks } from './services/claude'
import { lookupBook } from './services/books'
import { readFileSync, copyFileSync, mkdirSync, existsSync } from 'fs'
import crypto from 'crypto'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    vibrancy: 'sidebar',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings...',
          accelerator: 'Cmd+,',
          click: () => mainWindow?.webContents.send('navigate', '/settings'),
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Session',
          accelerator: 'Cmd+N',
          click: () => mainWindow?.webContents.send('navigate', '/new-session'),
        },
        {
          label: 'Import Photos...',
          accelerator: 'Cmd+O',
          click: () => handleImportPhotos(),
        },
        { type: 'separator' },
        {
          label: 'Export...',
          accelerator: 'Cmd+E',
          click: () => mainWindow?.webContents.send('navigate', '/export'),
        },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Book Tender on GitHub',
          click: () => shell.openExternal('https://github.com/gaurav/book-tender'),
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function handleImportPhotos() {
  if (!mainWindow) return
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'heic', 'webp'] }],
  })
  if (!result.canceled && result.filePaths.length > 0) {
    mainWindow.webContents.send('photos-selected', result.filePaths)
  }
}

function registerIpcHandlers() {
  const db = getDatabase()

  // --- API Key Management (safeStorage / macOS Keychain) ---
  ipcMain.handle('store-api-key', async (_event, keyName: string, keyValue: string) => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system')
    }
    const encrypted = safeStorage.encryptString(keyValue)
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
      `apikey_${keyName}`,
      encrypted.toString('base64')
    )
    return true
  })

  ipcMain.handle('get-api-key', async (_event, keyName: string) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(`apikey_${keyName}`) as
      | { value: string }
      | undefined
    if (!row) return null
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system')
    }
    const decrypted = safeStorage.decryptString(Buffer.from(row.value, 'base64'))
    return decrypted
  })

  ipcMain.handle('has-api-key', async (_event, keyName: string) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(`apikey_${keyName}`)
    return !!row
  })

  ipcMain.handle('delete-api-key', async (_event, keyName: string) => {
    db.prepare('DELETE FROM settings WHERE key = ?').run(`apikey_${keyName}`)
    return true
  })

  // --- Test API Connection ---
  ipcMain.handle('test-anthropic-key', async (_event, apiKey: string) => {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic({ apiKey })
      await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say "ok"' }],
      })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // --- Dark Mode ---
  ipcMain.handle('get-dark-mode', () => {
    return nativeTheme.shouldUseDarkColors
  })

  nativeTheme.on('updated', () => {
    mainWindow?.webContents.send('dark-mode-changed', nativeTheme.shouldUseDarkColors)
  })

  // --- Photo Import ---
  ipcMain.handle('import-photos', async (_event, filePaths: string[]) => {
    const photosDir = path.join(app.getPath('userData'), 'photos')
    if (!existsSync(photosDir)) {
      mkdirSync(photosDir, { recursive: true })
    }
    const imported: { originalPath: string; storedPath: string; hash: string }[] = []
    for (const filePath of filePaths) {
      const fileBuffer = readFileSync(filePath)
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
      const ext = path.extname(filePath)
      const storedPath = path.join(photosDir, `${hash}${ext}`)
      if (!existsSync(storedPath)) {
        copyFileSync(filePath, storedPath)
      }
      imported.push({ originalPath: filePath, storedPath, hash })
    }
    return imported
  })

  // --- File dialog ---
  ipcMain.handle('show-open-dialog', async () => {
    if (!mainWindow) return { canceled: true, filePaths: [] }
    return dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'heic', 'webp'] }],
    })
  })

  ipcMain.handle('show-save-dialog', async (_event, options: Electron.SaveDialogOptions) => {
    if (!mainWindow) return { canceled: true, filePath: undefined }
    return dialog.showSaveDialog(mainWindow, options)
  })

  // --- Claude Vision (book identification) ---
  ipcMain.handle(
    'identify-books',
    async (_event, photoPath: string, photoHash: string) => {
      // Check cache first
      const cached = db
        .prepare('SELECT response FROM claude_cache WHERE photo_hash = ?')
        .get(photoHash) as { response: string } | undefined
      if (cached) {
        return JSON.parse(cached.response)
      }

      const apiKey = await getApiKey('anthropic')
      if (!apiKey) throw new Error('Anthropic API key not configured')

      const result = await identifyBooks(apiKey, photoPath)

      // Cache the response
      db.prepare('INSERT OR REPLACE INTO claude_cache (photo_hash, response) VALUES (?, ?)').run(
        photoHash,
        JSON.stringify(result)
      )

      return result
    }
  )

  // --- Google Books Lookup ---
  ipcMain.handle(
    'lookup-book',
    async (_event, title: string, author: string, isbn?: string) => {
      // Check cache by ISBN
      if (isbn) {
        const cached = db
          .prepare('SELECT response FROM google_books_cache WHERE isbn = ?')
          .get(isbn) as { response: string } | undefined
        if (cached) {
          return JSON.parse(cached.response)
        }
      }

      const apiKey = await getApiKey('google_books')
      const result = await lookupBook(title, author, apiKey || undefined, isbn)

      // Cache by ISBN if available
      if (result && (isbn || result.isbn)) {
        db.prepare(
          'INSERT OR REPLACE INTO google_books_cache (isbn, response) VALUES (?, ?)'
        ).run(isbn || result.isbn, JSON.stringify(result))
      }

      return result
    }
  )

  // --- Session CRUD ---
  ipcMain.handle('create-session', (_event, name: string) => {
    const result = db
      .prepare('INSERT INTO sessions (name, created_at) VALUES (?, ?)')
      .run(name, new Date().toISOString())
    return result.lastInsertRowid
  })

  ipcMain.handle('get-sessions', () => {
    return db
      .prepare(
        `SELECT s.*,
          (SELECT COUNT(*) FROM photos WHERE session_id = s.id) as photo_count,
          (SELECT COUNT(*) FROM books WHERE session_id = s.id) as book_count
        FROM sessions s ORDER BY created_at DESC`
      )
      .all()
  })

  ipcMain.handle('get-session', (_event, sessionId: number) => {
    return db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId)
  })

  ipcMain.handle('rename-session', (_event, sessionId: number, newName: string) => {
    db.prepare('UPDATE sessions SET name = ? WHERE id = ?').run(newName, sessionId)
    return true
  })

  ipcMain.handle('delete-session', (_event, sessionId: number) => {
    db.prepare('DELETE FROM books WHERE session_id = ?').run(sessionId)
    db.prepare('DELETE FROM photos WHERE session_id = ?').run(sessionId)
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)
    return true
  })

  // --- Book CRUD ---
  ipcMain.handle(
    'save-book',
    (
      _event,
      book: {
        session_id: number
        title: string
        author: string
        isbn?: string
        cover_url?: string
        year?: number
        page_count?: number
        description?: string
        tags?: string
        notes?: string
        confidence: string
        verified: boolean
        source_photo_path?: string
        position?: string
        spine_text?: string
      }
    ) => {
      const result = db
        .prepare(
          `INSERT INTO books (session_id, title, author, isbn, cover_url, year, page_count,
           description, tags, notes, confidence, verified, source_photo_path, position, spine_text)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          book.session_id,
          book.title,
          book.author,
          book.isbn || null,
          book.cover_url || null,
          book.year || null,
          book.page_count || null,
          book.description || null,
          book.tags || '[]',
          book.notes || null,
          book.confidence,
          book.verified ? 1 : 0,
          book.source_photo_path || null,
          book.position || null,
          book.spine_text || null
        )
      return result.lastInsertRowid
    }
  )

  ipcMain.handle('get-books', (_event, sessionId: number) => {
    return db.prepare('SELECT * FROM books WHERE session_id = ? ORDER BY id ASC').all(sessionId)
  })

  ipcMain.handle('update-book', (_event, bookId: number, updates: Record<string, any>) => {
    const allowedFields = [
      'title',
      'author',
      'isbn',
      'cover_url',
      'year',
      'page_count',
      'description',
      'tags',
      'notes',
      'confidence',
      'verified',
    ]
    const fields: string[] = []
    const values: any[] = []
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    }
    if (fields.length === 0) return false
    values.push(bookId)
    db.prepare(`UPDATE books SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return true
  })

  ipcMain.handle('delete-book', (_event, bookId: number) => {
    db.prepare('DELETE FROM books WHERE id = ?').run(bookId)
    return true
  })

  // --- Photo records ---
  ipcMain.handle(
    'save-photo',
    (
      _event,
      photo: {
        session_id: number
        file_path: string
        classification: string
        hash: string
      }
    ) => {
      const result = db
        .prepare(
          `INSERT INTO photos (session_id, file_path, classification, hash, scanned_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(photo.session_id, photo.file_path, photo.classification, photo.hash, new Date().toISOString())
      return result.lastInsertRowid
    }
  )

  ipcMain.handle('get-photos', (_event, sessionId: number) => {
    return db.prepare('SELECT * FROM photos WHERE session_id = ?').all(sessionId)
  })

  // --- Notification ---
  ipcMain.handle('show-notification', (_event, title: string, body: string) => {
    new Notification({ title, body }).show()
    return true
  })

  // --- Get photo as base64 (for display) ---
  ipcMain.handle('get-photo-data', (_event, filePath: string) => {
    const buffer = readFileSync(filePath)
    const ext = path.extname(filePath).toLowerCase().replace('.', '')
    const mimeType = ext === 'jpg' ? 'jpeg' : ext
    return `data:image/${mimeType};base64,${buffer.toString('base64')}`
  })

  // Helper to get decrypted API key
  async function getApiKey(keyName: string): Promise<string | null> {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(`apikey_${keyName}`) as
      | { value: string }
      | undefined
    if (!row) return null
    if (!safeStorage.isEncryptionAvailable()) return null
    return safeStorage.decryptString(Buffer.from(row.value, 'base64'))
  }
}

app.whenReady().then(() => {
  initDatabase()
  buildMenu()
  createWindow()
  registerIpcHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
