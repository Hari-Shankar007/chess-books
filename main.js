const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(app.getPath('userData'), 'chess-library-data');
const BOOKS_DIR = path.join(DATA_DIR, 'books');
const COVERS_DIR = path.join(DATA_DIR, 'covers');
const LIBRARY_FILE = path.join(DATA_DIR, 'library.json');

function ensureDirs() {
  [DATA_DIR, BOOKS_DIR, COVERS_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function loadLibrary() {
  ensureDirs();
  if (!fs.existsSync(LIBRARY_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(LIBRARY_FILE, 'utf-8')) || []; }
  catch (e) { return []; }
}

function saveLibrary(library) {
  ensureDirs();
  fs.writeFileSync(LIBRARY_FILE, JSON.stringify(library, null, 2), 'utf-8');
}

let mainWindow;

function createWindow() {
  ensureDirs();
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Chess Book Library',
    show: false
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

// IPC: load library
ipcMain.handle('library:load', async () => loadLibrary());

// IPC: save library metadata
ipcMain.handle('library:save', async (e, library) => {
  saveLibrary(library);
  return true;
});

// IPC: choose PDF and copy into books/
ipcMain.handle('pdf:choose', async (e, bookId) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select PDF Book',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths.length) return null;
  ensureDirs();
  const src = filePaths[0];
  const dest = path.join(BOOKS_DIR, bookId + '.pdf');
  fs.copyFileSync(src, dest);
  return { filePath: dest, originalName: path.basename(src) };
});

// IPC: save cover image
ipcMain.handle('cover:save', async (e, bookId, dataUrl) => {
  ensureDirs();
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const dest = path.join(COVERS_DIR, bookId + '.jpg');
  fs.writeFileSync(dest, Buffer.from(base64, 'base64'));
  return dest;
});

// IPC: load cover as data URL
ipcMain.handle('cover:load', async (e, bookId) => {
  const coverPath = path.join(COVERS_DIR, bookId + '.jpg');
  if (!fs.existsSync(coverPath)) return null;
  const data = fs.readFileSync(coverPath);
  return 'data:image/jpeg;base64,' + data.toString('base64');
});

// IPC: get PDF as base64 for in-app viewing
ipcMain.handle('pdf:getBase64', async (e, filePath) => {
  if (!fs.existsSync(filePath)) return null;
  const data = fs.readFileSync(filePath);
  return 'data:application/pdf;base64,' + data.toString('base64');
});

// IPC: open PDF with default OS viewer
ipcMain.handle('pdf:openExternal', async (e, filePath) => {
  if (fs.existsSync(filePath)) await shell.openPath(filePath);
  return true;
});

// IPC: delete book files
ipcMain.handle('book:delete', async (e, bookId) => {
  const pdfPath = path.join(BOOKS_DIR, bookId + '.pdf');
  const coverPath = path.join(COVERS_DIR, bookId + '.jpg');
  if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
  return true;
});

// IPC: get paths for renderer to know where files are
ipcMain.handle('app:getPaths', async () => ({
  booksDir: BOOKS_DIR,
  coversDir: COVERS_DIR
}));

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
