# Chess Book Library

A desktop application for managing your chess book collection. Built with Electron, this app allows you to organize, search, and read your PDF chess books with automatic cover generation and metadata management.

## Features

- **PDF Management**: Upload and store chess books in PDF format
- **Automatic Cover Generation**: First-page covers auto-generated using PDF.js
- **Local Storage**: All PDFs stored locally in a `books/` folder for persistent access
- **Metadata**: Add titles, authors, ratings, notes, levels, and phases
- **Search & Filter**: Find books by title, author, level (Beginner/Intermediate/Advanced), or phase (Opening/Middlegame/Endgame)
- **In-App PDF Viewer**: Read books directly in the application
- **External Viewer**: Open books in your system's default PDF viewer
- **Edit & Delete**: Modify book information or remove books from your library
- **Persistent Data**: All library data saved in `library.json` - nothing vanishes on reload

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Steps

1. Clone the repository:
```bash
git clone https://github.com/Hari-Shankar007/chess-books-.git
cd chess-books-
```

2. Install dependencies:
```bash
npm install
```

3. Run the application:
```bash
npm start
```

## Building the Application

To create a distributable executable:

```bash
npm run build
```

This will create platform-specific executables in the `dist/` folder.

## Usage

1. **Adding Books**: Click "Add New Book" and select a PDF file. Fill in the book details (title, author, rating, level, phase, notes).

2. **Searching**: Use the search bar to find books by title or author.

3. **Filtering**: Use the filter dropdowns to view books by level or phase.

4. **Viewing**: Click "View" to open the PDF in the in-app viewer, or "Open External" to use your system's PDF reader.

5. **Editing**: Click "Edit" on any book card to modify its information.

6. **Deleting**: Click "Delete" to remove a book from your library (this also deletes the PDF file).

## Project Structure

```
chess-books-/
├── main.js              # Electron main process
├── preload.js           # Preload script for IPC bridge
├── package.json         # Project dependencies and scripts
├── renderer/
│   ├── index.html       # Main UI
│   ├── style.css        # Styles
│   └── renderer.js      # Frontend logic
├── books/               # PDF storage folder (created automatically)
└── library.json         # Book metadata (created automatically)
```

## Technical Details

- **Framework**: Electron
- **PDF Rendering**: PDF.js (Mozilla)
- **Storage**: Local file system with JSON metadata
- **IPC**: Electron's contextBridge for secure main-renderer communication

## License

MIT License - Feel free to use and modify for your chess book collection!

## Author

Hari-Shankar007 - Chess Instructor & Developer

## Acknowledgments

- PDF.js by Mozilla for PDF rendering
- Electron team for the amazing framework
