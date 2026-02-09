# Book Tender

Catalog your physical books by taking photos of your shelves.

Take a photo of your bookshelf, and get back a verified, tagged, deduplicated catalog. Do this for every shelf in your house, every bookstore visit, every library trip. Export your library as structured data you can use anywhere.

## Features

- **Scan**: Upload photos of bookshelves (drag-and-drop, file picker, or paste from clipboard)
- **Identify**: Claude AI recognizes each book with title, author, and confidence level
- **Enrich**: Google Books API adds ISBN, cover art, publication year, and page count
- **Verify**: Review identified books in a grid with confirm, edit, or remove actions
- **Tag**: Flexible tag system with categories (ownership, reading status, intent, source) plus custom tags
- **Dedup**: Automatic duplicate detection within and across scanning sessions
- **Export**: CSV, JSON, or push to any API via configurable webhook

## Download

Download the latest `.dmg` from [GitHub Releases](https://github.com/gaurav/book-tender/releases).

> **Note**: Since the app is not code-signed, on first launch you'll need to right-click the app and select "Open", then confirm in the dialog.

## Setup

1. Download and install the `.dmg`
2. Open Book Tender
3. Paste your **Anthropic API key** (required) — get one at [console.anthropic.com](https://console.anthropic.com/)
4. Optionally add a **Google Books API key** for richer metadata
5. Start scanning!

## How It Works

1. Create a new scan session
2. Classify your photos (My Shelf, Bookstore, Library, or Other) — this sets default tags
3. Upload one or more photos of your bookshelves
4. Claude AI identifies each visible book
5. Review the results: confirm correct identifications, edit mistakes, remove false positives
6. Add tags and notes to organize your collection
7. Export as CSV or JSON, or push to your own API

## FAQ

**How much does it cost?**
You pay per Claude API call on your own Anthropic account. A typical bookshelf photo costs roughly $0.01–0.03 depending on image size. Google Books API is free.

**Is my data sent to the cloud?**
Only the photo is sent to Anthropic's API for identification. Everything else (your catalog, tags, notes) is stored locally on your Mac. No accounts, no cloud storage.

**Where is my data stored?**
`~/Library/Application Support/Book Tender/` — this includes the SQLite database and copies of your imported photos.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build .dmg
npm run build
```

## Tech Stack

- **Electron** — macOS desktop app
- **React + Tailwind** — UI
- **Vite** — bundler
- **better-sqlite3** — local database
- **Claude AI** — book identification (user provides own API key)
- **Google Books API** — metadata enrichment

## Contributing

Issues and pull requests are welcome. Please open an issue first to discuss what you'd like to change.

## License

MIT
