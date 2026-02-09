# Book Scanner -- Product Spec & Sprint Backlog

> A macOS desktop app for cataloging your physical book collection via photos.
> Open source, public, standalone. Users bring their own Anthropic API key.
> Exports to CSV/JSON or integrates with external tools via API.

---

## Product Vision

Take a photo of your bookshelf. Get back a verified, tagged, deduplicated catalog.
Do this for every shelf in your house, every bookstore visit, every library trip.
Export your library as structured data you can use anywhere.

**Distribution model:** Free, open source macOS app. Users provide their own Anthropic API key (and optionally a Google Books API key). No backend, no accounts, no cloud. Everything runs locally.

---

## Core Workflow

```
Photo(s) → AI Identification → Verification Grid → Classification/Tagging → Dedup → Export
```

1. **Upload**: One or more photos of shelves, stacks, or displays
2. **Identify**: Claude vision extracts each book (title, author, confidence)
3. **Enrich**: Google Books API adds ISBN, cover, year, page count
4. **Verify**: User confirms, corrects, or removes each identification
5. **Tag**: User applies tags from a flexible tag system (owned, read, TBR, etc.)
6. **Dedup**: Check against this session, past sessions, and optionally Second Mind
7. **Export**: CSV, JSON, or direct API push to Second Mind

---

## Tag System

Books get one or more tags from these categories. Users can create custom tags too.

**Ownership status** (pick one):
- `owned` -- on my shelf
- `to-buy` -- want to purchase
- `to-borrow` -- want to borrow from library/friend
- `lent` -- I own it but lent it to someone (track who via notes)
- `gave-away` -- used to own, gave away or donated
- `lost` -- owned but can't find it

**Reading status** (pick one):
- `unread` -- haven't started
- `reading` -- currently reading
- `read` -- finished
- `abandoned` -- started but won't finish
- `re-reading` -- reading again

**Intent** (pick any):
- `tbr` -- on the to-be-read list (different from unread: tbr is intentional)
- `reference` -- not meant to be read cover-to-cover
- `gift-idea` -- would make a good gift for someone
- `favorite` -- personal favorite, would recommend

**Source context** (pick one, auto-set from photo classification):
- `my-shelf` -- scanned from my own bookshelf
- `bookstore` -- spotted at a bookstore
- `library` -- spotted at a library
- `recommendation` -- someone recommended it
- `online` -- found online, not from a photo

**Custom tags**: Users can create and apply any additional tags (e.g., `sci-fi`, `parenting`, `work`, `beach-read`, a person's name for "lent to" or "recommended by").

---

## Tech Stack

- **Platform**: Electron (macOS desktop app, .dmg distribution)
- **Frontend**: React + Tailwind inside Electron renderer
- **AI**: Claude vision API (user provides their own ANTHROPIC_API_KEY)
- **Book data**: Google Books API for metadata enrichment (user provides own key, or use without key at lower rate limits)
- **Storage**: Local SQLite via better-sqlite3 (ships with the app, no external DB)
- **Packaging**: electron-builder for .dmg and auto-update
- **Target**: macOS 13+ (Ventura and later), Apple Silicon + Intel universal binary

### Architecture

```
book-scanner/
├── electron/
│   ├── main.ts          # Electron main process
│   ├── preload.ts       # Bridge between main and renderer
│   └── services/
│       ├── db.ts        # SQLite via better-sqlite3
│       ├── claude.ts    # Claude vision API calls
│       └── books.ts     # Google Books API lookups
├── src/                 # React renderer
│   ├── App.tsx
│   ├── components/
│   ├── pages/
│   └── hooks/
├── resources/           # App icon, DMG background
└── package.json
```

All API calls happen in the Electron main process (not renderer) to keep keys secure.
The renderer communicates via IPC (contextBridge + ipcRenderer/ipcMain).

### First Launch Experience

1. User opens app for the first time
2. Welcome screen explains what the app does (one paragraph + screenshot)
3. Settings modal: paste your Anthropic API key (required), Google Books API key (optional)
4. Keys are stored in the macOS Keychain via electron safeStorage (not in plaintext)
5. "Test Connection" button validates the Anthropic key with a cheap API call
6. On success: "You're all set. Upload your first bookshelf photo."

---

## How to Work (for Ralph Loop)

Same iteration protocol as Second Mind sprints:
1. Read this file, find the next TODO item
2. Implement, test, build, commit
3. Mark item DONE with a note, commit this file
4. Move to the next item

---

## Sprint 1 -- Core Pipeline

### 1.1 Project setup: Electron + React
- **Status:** `DONE` — Electron + React + Tailwind + Vite + better-sqlite3 + electron-builder all wired up. IPC bridge via contextBridge, safeStorage for API keys, native menus, hiddenInset titlebar, dark mode, sidebar, settings page, onboarding modal, upload area. `npm run build` produces a 181MB universal .dmg.
- **What:** Initialize an Electron app with React renderer and Tailwind CSS.
  - electron-builder for packaging
  - better-sqlite3 for local storage (native module, needs rebuild for Electron)
  - React + Tailwind in the renderer process
  - IPC bridge via contextBridge (no nodeIntegration in renderer)
  - Dark mode support (follow macOS system preference via `nativeTheme`)
  - App icon and basic window chrome (titleBarStyle: 'hiddenInset' for native macOS feel)
  - Basic layout: sidebar for session history, main content area
  - Settings page (accessible from menu bar and sidebar): API key input fields, "Test Connection" button, keys stored via safeStorage/Keychain
  - First-launch flow: if no API key configured, show onboarding modal before anything else
- **Acceptance:** `npm run dev` opens a native macOS window. `npm run build` produces a .dmg. First launch shows API key setup. After key entry, landing page loads with upload area.
- **Tests:** Playwright (or Spectron/Playwright with Electron) config set up. Basic test that app window opens and onboarding appears.

### 1.2 Photo upload and book identification
- **Status:** `DONE` — Upload via drag-and-drop or file picker. Photo thumbnail previews with status spinners. Claude vision API identification with caching by photo hash. Google Books enrichment with caching by ISBN. Results displayed in grid. Unit tests for Claude and Google Books response parsing (13 tests, all pass).
- **What:** Upload area accepts one or more photos (drag-and-drop + file picker). For each photo:
  1. Show a thumbnail preview with a loading spinner
  2. Send to Claude vision API with prompt (see Appendix A below)
  3. Parse response into structured book list
  4. For each identified book, query Google Books API for enrichment (ISBN, cover URL, year, page count, description)
  5. Display results in a grid below the photo
- **Acceptance:** Upload a photo of a bookshelf with ~15 books. Get back identified books with covers and metadata within 30 seconds. Most high-confidence identifications are correct.
- **Tests:** Unit test for Claude response parsing. Unit test for Google Books API response parsing. Integration test for the full pipeline with a sample image.

### 1.3 Verification grid
- **Status:** `DONE` — Grid shows cover, title, author, confidence badges (green/yellow/red), numbered position badges. Action buttons: Confirm (✓), Edit (✎ with Google Books search), Remove (✗). Batch "Confirm All High" button. Edit mode opens inline search with Google Books results.
- **What:** After identification, show a grid of book cards. Each card shows:
  - Cover thumbnail (from Google Books, or placeholder if not found)
  - Title and author
  - Confidence badge: green (high), yellow (medium), red (low)
  - Action buttons: ✓ Confirm, ✗ Remove, ✎ Edit
  - Edit mode: opens a Google Books search bar. User types corrected title/author, selects from results, card updates.
  Show the original photo above the grid (or side by side on desktop) with numbered annotations matching the grid positions so user can cross-reference.
  Batch action: "Confirm all high-confidence" button that auto-confirms green items.
- **Acceptance:** See 15 book cards. Confirm 10 with one click (batch). Correct 3 via search. Remove 2. Final list is accurate.
- **Tests:** Playwright test for confirm/edit/remove flows. Playwright test for batch confirm.

### 1.4 Photo classification and default tags
- **Status:** `DONE` — Classification modal appears before processing: My Shelf (owned, my-shelf), Bookstore (to-buy, bookstore), Library (to-borrow, library), Other (no tags). Default tags auto-applied to all identified books. Tags shown as pills on book cards.
- **What:** When uploading photos, let user classify each photo:
  - "My shelf" → default tags: `owned`, `my-shelf`
  - "Bookstore" → default tags: `to-buy`, `bookstore`
  - "Library" → default tags: `to-borrow`, `library`
  - "Other" → no defaults
  Classification can be set per photo or per batch. Default tags auto-apply to all books from that photo. Individual books can override.
- **Acceptance:** Upload a photo classified as "My shelf." All identified books get `owned` + `my-shelf` tags. Change one book to `lent`. Tags update correctly.
- **Tests:** Playwright test for classification selection and tag inheritance.

---

## Sprint 2 -- Tagging & Session Management

### 2.1 Tag system UI
- **Status:** `DONE` — Tag picker with four categories: Ownership (pick one), Reading Status (pick one), Intent (multi), Source (pick one). Color-coded by category. Custom tag input. Bulk tag: select multiple books via checkboxes, apply tags to all at once. Tags shown as colored pills on cards with + button to add.
- **What:** Each book card in the grid has a tag area. Show current tags as pills/chips. Click to edit: shows tag picker with categories (ownership, reading status, intent, source, custom). Multi-select within each category (except ownership and reading status, which are pick-one). Custom tag input: type a new tag name, press enter to create. Tags are color-coded by category. Bulk tag: select multiple books, apply tags to all at once.
- **Acceptance:** Tag a book as `owned`, `read`, `favorite`, `sci-fi`. All four tags show as colored pills. Bulk-tag 5 books as `tbr`. Tags apply correctly.
- **Tests:** Playwright test for individual tagging, custom tag creation, and bulk tagging.

### 2.2 Notes per book
- **Status:** `DONE` — Notes editor modal with textarea. Notes icon (📝) shown on card if notes exist, clickable to edit. Notes displayed as tooltip on hover. Add/edit/save flow complete.
- **What:** Each book can have a free-text notes field. Useful for: "Lent to Sarah, Jan 2026", "Recommended by Mom", "Read this before the movie comes out", "Top shelf, living room". Show notes icon on card if notes exist. Click to expand.
- **Acceptance:** Add a note to a book. See the notes icon. Click to read. Edit. Save.
- **Tests:** Playwright test for note CRUD.

### 2.3 Session management with SQLite
- **Status:** `DONE` — SQLite schema with sessions, books, photos, settings, caches. Sidebar shows session list with book counts. Click to reopen. Double-click title to rename. Right-click to delete (with context menu). DB in userData directory. All data persists across app restarts.
- **What:** Each scan session is saved locally in SQLite (via better-sqlite3 in the main process):
  - Session: id, name (auto: "Scan -- Feb 8, 2026"), created_at, photo_count, book_count
  - Books: id, session_id, title, author, isbn, cover_url, year, page_count, description, tags (JSON array), notes, confidence, verified (bool), source_photo_path
  - Photos: id, session_id, file_path, classification (my-shelf/bookstore/library/other), scanned_at
  Sidebar shows session list with book count and date. Click to re-open. Can rename sessions. Can delete sessions (with confirmation). DB file lives in the app's userData directory (`app.getPath('userData')`).
- **Acceptance:** Scan a shelf. Quit the app. Reopen. Session is there with all books and tags intact. Rename it to "Living Room Shelf."
- **Tests:** Integration test for SQLite CRUD. E2E test for session list, reopen, rename.

### 2.4 Continue scanning within a session
- **Status:** `DONE` — Open existing session, upload more photos, new books added to same session. Dedup check on save: matches by ISBN (exact) or normalized title+author (fuzzy). Duplicates flagged with a note, not auto-removed — user decides.
- **What:** Open an existing session. Upload more photos. New books are added to the same session. Dedup runs within the session automatically (same ISBN or fuzzy title+author match). Duplicates are flagged, not auto-removed (user decides).
- **Acceptance:** Scan top shelf (10 books). Open same session, scan bottom shelf (10 books). Session now has ~20 books. 2 duplicates detected (same book visible in both photos). User resolves.
- **Tests:** Playwright test for multi-photo session with dedup.

---

## Sprint 3 -- Dedup & Export

### 3.1 Deduplication engine
- **Status:** `TODO`
- **What:** Before export (and on demand), run dedup:
  - **Within session**: Match on ISBN (exact) or title+author (fuzzy, Levenshtein or similar). Flag matches, let user merge or keep both.
  - **Across sessions**: Check new books against all previous sessions. Show: "You already scanned this in 'Bedroom Shelf' on Jan 15."
  - **Against Second Mind** (optional): If Second Mind API URL is configured, check for existing books. Show: "Already in your Second Mind library."
  Dedup view: list of duplicate pairs with side-by-side comparison. Actions: merge (keep better metadata), keep both, skip.
- **Acceptance:** Session has 3 duplicate pairs. Dedup view shows them. Merge 2, keep both for 1. Export has correct count.
- **Tests:** Unit test for fuzzy matching logic. Integration test for cross-session dedup. Playwright test for dedup resolution UI.

### 3.2 Export: CSV
- **Status:** `TODO`
- **What:** Export button generates a CSV with columns:
  ```
  title, author, isbn, cover_url, publication_year, page_count, 
  ownership_status, reading_status, tags, notes, source, date_scanned
  ```
  `tags` column contains comma-separated tags (excluding ownership and reading status, which have their own columns). Download triggers browser save dialog.
- **Acceptance:** Export 20 books. Open CSV in Excel/Numbers. All fields populated. Tags parsed correctly.
- **Tests:** Unit test for CSV generation. Verify column format with sample data.

### 3.3 Export: JSON
- **Status:** `TODO`
- **What:** Export as JSON array. Same fields as CSV but properly typed. Include a metadata wrapper:
  ```json
  {
    "exported_at": "2026-02-08T...",
    "session_name": "Living Room Shelf",
    "book_count": 20,
    "books": [ ... ]
  }
  ```
- **Acceptance:** Export JSON. Parse it. All fields present and typed correctly.
- **Tests:** Unit test for JSON generation.

### 3.4 Export: API push (generic webhook)
- **Status:** `TODO`
- **What:** For users who want to push to an external system (like Second Mind or any API), support a configurable webhook:
  - Settings page: "Export API" section with URL field and optional auth header
  - Sends a POST with the standard JSON format from 3.3
  - Show progress bar during push. Handle failures gracefully (retry failed books, show which succeeded/failed).
  - Includes a "Test Connection" button that sends a single dummy book to verify the endpoint works
- **Acceptance:** Configure an API URL. Push 20 books. See success/failure for each. Failed books can be retried.
- **Tests:** Integration test with a mock HTTP server. Error handling test for timeouts and failures.

---

## Sprint 4 -- Polish, Package & Ship

### 4.1 Native macOS feel
- **Status:** `TODO`
- **What:** Make it feel like a real Mac app, not a web page in a frame:
  - titleBarStyle: 'hiddenInset' with traffic lights
  - Native macOS menu bar (File: New Session, Import Photos, Export; Edit: standard; Window: standard; Help: link to GitHub)
  - Cmd+O for import photos, Cmd+E for export, Cmd+, for settings
  - Drag-and-drop photos onto the app icon in Dock or onto the window
  - Respect system dark mode preference, follow changes in real-time
  - Native file save dialogs for CSV/JSON export
  - Notifications via macOS Notification Center ("Scan complete: 15 books identified")
- **Acceptance:** App feels indistinguishable from a native macOS utility. Keyboard shortcuts work. Drag-and-drop works. Menu bar is functional.
- **Tests:** E2E test for keyboard shortcuts and menu actions.

### 4.2 Photo import from multiple sources
- **Status:** `TODO`
- **What:** Support importing photos from:
  - File picker (Cmd+O): select one or more images from Finder
  - Drag-and-drop onto the window
  - Drag onto the Dock icon
  - Paste from clipboard (Cmd+V): for screenshots or photos copied from other apps
  - AirDrop: if an image is AirDropped to the Mac, offer to import it (register as a handler for image types, or document how to set this up)
  All paths feed into the same identification pipeline.
- **Acceptance:** Import a photo via each method. All work and produce identified books.
- **Tests:** E2E test for file picker and drag-and-drop. Manual test for clipboard paste.

### 4.3 Packaging and distribution
- **Status:** `TODO`
- **What:** Package the app for public distribution:
  - electron-builder config for macOS: .dmg with background image and app icon
  - Universal binary (Apple Silicon + Intel)
  - Code signing: document how to sign with an Apple Developer certificate (or note that unsigned apps require right-click > Open on first launch)
  - Auto-update via electron-updater pointing at GitHub Releases
  - GitHub Actions workflow: on tag push, build .dmg, create GitHub Release, attach artifact
  - Minimum macOS version: 13 (Ventura)
- **Acceptance:** `npm run build` produces a working .dmg. Double-click installs to /Applications. App launches and works. Auto-updater checks for new versions on launch.
- **Tests:** Manual test: install from .dmg on a clean Mac, complete full workflow.

### 4.4 Public README and onboarding
- **Status:** `TODO`
- **What:** Write README.md for a public audience:
  - Hero screenshot of the app in action (verification grid with identified books)
  - One-line description: "Catalog your physical books by taking photos of your shelves."
  - Feature list with screenshots: scan, verify, tag, export
  - Download link (GitHub Releases)
  - Setup: download .dmg, install, paste your Anthropic API key, start scanning
  - How to get an Anthropic API key (link to console.anthropic.com, brief instructions)
  - Optional: Google Books API key for richer metadata
  - FAQ: How much does it cost? (you pay per Claude API call, roughly $X per shelf photo), Is my data sent to the cloud? (only the photo goes to Anthropic's API for identification, everything else is local), Where is my data stored? (~/Library/Application Support/Book Scanner/)
  - Contributing guide
  - License: MIT
- **Acceptance:** A stranger could download, install, and scan their first shelf in under 5 minutes.
- **Tests:** N/A (documentation). Have someone else try the setup flow if possible.

### 4.5 Library view: your full catalog
- **Status:** `TODO`
- **What:** A "Library" tab that shows ALL books across all sessions in a unified view:
  - Grid view (covers) and list view (table with sortable columns) toggle
  - Filter by: tag category (owned/want/read/unread/tbr), custom tags, session
  - Sort by: title, author, date scanned, date published
  - Search by title or author
  - Stats bar: "247 books. 180 owned. 42 read this year. 15 on your TBR."
  - Click any book to edit tags, notes, or correct metadata
  This is the "I want to see my whole collection" view vs. the session-based scanning view.
- **Acceptance:** After 3 scanning sessions, Library view shows all books unified. Filtering and sorting work. Stats are accurate.
- **Tests:** E2E test for library view with filters and sorting.

---

## Appendix A: Claude Vision Prompt for Book Identification

Use this as the system prompt when sending shelf photos to Claude:

```
You are a book identification expert. Analyze this photo of books and identify
every book visible.

For each book you can identify, provide:
- title: The book's title
- author: The author's name
- spine_text: The exact text you can read on the spine (if visible)
- confidence: "high" (you're very sure), "medium" (likely correct but uncertain), 
  or "low" (best guess based on partial information)
- position: approximate position in the image (e.g., "top-left", "middle-center", 
  "bottom-right") to help the user cross-reference

If you can see a cover instead of a spine, note that.
If a book is partially obscured, still attempt identification and mark confidence accordingly.
If you cannot identify a book at all, include it as {"title": "Unknown", "confidence": "low", 
"spine_text": "<whatever text you can read>"} so the user can manually identify it.

Respond ONLY with a JSON array of book objects. No preamble, no markdown fences.
```

## Appendix B: Second Mind Bulk Book API (Proposed)

If this endpoint doesn't exist in Second Mind yet, it should be created:

```
POST /api/artifacts/bulk
Content-Type: application/json

{
  "artifacts": [
    {
      "type": "book",
      "title": "Dune",
      "metadata": {
        "author": "Frank Herbert",
        "isbn": "9780441013593",
        "cover_url": "https://...",
        "publication_year": 1965,
        "page_count": 688
      },
      "tags": ["owned", "read", "favorite", "sci-fi"],
      "reading_status": "read",
      "notes": "Top shelf, living room. All-time favorite."
    }
  ]
}
```

Response: `{ "created": 18, "failed": 2, "duplicates_skipped": 1, "errors": [...] }`

---

## Notes for the Agent

- This is a **public macOS desktop app** built with Electron. It must feel native, not like a web page in a frame.
- **No server, no accounts, no cloud storage.** Everything is local except API calls to Anthropic and Google Books.
- **API keys belong to the user.** Store them securely via Electron safeStorage (macOS Keychain). Never log keys, never send them anywhere except the intended API.
- **BYO key model:** The app must work with any valid Anthropic API key. Don't hardcode models or assume specific plan tiers. Use claude-sonnet-4-20250514 for vision (good balance of cost and quality). Let user override model in advanced settings if they want.
- Claude vision API is the expensive call. Cache results per photo (hash the image, store the response in SQLite). Don't re-identify on app relaunch.
- Google Books API has rate limits. Add a small delay between lookups. Cache aggressively by ISBN in SQLite. The app should work (with reduced metadata) even without a Google Books key.
- The tag system should feel fast. No API calls for tagging, it's all local state in SQLite.
- Fuzzy matching for dedup: Levenshtein distance on normalized title+author (lowercase, strip "the", strip subtitle after colon). Threshold of ~0.85 similarity to flag as potential duplicate.
- The verification grid is the core UX. Make it fast and pleasant. Users will spend most of their time here.
- **Electron-specific:**
  - All API calls in main process, not renderer (security)
  - Use contextBridge + ipcMain/ipcRenderer for all main<->renderer communication
  - Never enable nodeIntegration in renderer
  - better-sqlite3 needs native module rebuild for Electron (electron-rebuild or @electron/rebuild)
  - Test both Apple Silicon and Intel builds if possible
  - App data directory: `app.getPath('userData')` (~/Library/Application Support/Book Scanner/)
  - Photos should be copied into app data directory on import (don't reference external paths that might move)
