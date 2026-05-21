# Breezing Pictures Studio Manager

Internal studio document manager for Breezing Pictures.

## Features

- Create invoices, quotations, inquiries, receipts, and correction notes.
- Choose from four professional presets for each document type.
- Manage production team members, roles, assignments, and document visibility.
- Customize document titles, labels, sections, business details, items, tax/VAT fields, colors, logo presets, signature, watermark, brand themes, studio presets, and typography.
- Reorder document sections with drag and drop, duplicate the current template, and use undo/redo for editing history.
- Use the command palette with `Cmd/Ctrl+K` for common document actions.
- Dock, hide, or move the editor panel, switch dark mode, and choose localized currency/date formatting.
- IndexedDB stores autosaved drafts, manual versions, and numbering counters for offline-safe recovery after refreshes or crashes.
- Export to PDF, PNG, JPEG, WebP, Word, HTML, JSON backup, or print.
- JSON exports use a versioned compatibility envelope so imports can be migrated safely.
- Long documents are allowed to grow in preview and export as paginated PDFs with metadata.
- The service worker caches the app shell so the manager can reopen while offline.

## Files

- `index.html` is the app shell.
- `styles.css` controls the interface and document styling.
- `script.js` loads the modular JavaScript app.
- `js/` contains app modules by purpose, including schema migration, IndexedDB storage, export rendering, preview rendering, and UI control wiring.
- `sw.js` caches the app shell for offline access.
- `assets/` contains optimized web assets.

## Local Use

Run a simple static server from this folder:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8765/`.
