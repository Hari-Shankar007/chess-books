const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

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

// ── Auto-Updater ──────────────────────────────────────────────────────────────
function setupAutoUpdater(win) {
  // Configure logger so update events show in dev tools
  autoUpdater.logger = require('electron').nativeTheme ? console : console;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // Notify renderer when an update is available
  autoUpdater.on('update-available', (info) => {
    win.webContents.send('update:available', info);
  });

  // Notify renderer when no update is found
  autoUpdater.on('update-not-available', (info) => {
    win.webContents.send('update:not-available', info);
  });

  // Forward download progress to renderer
  autoUpdater.on('download-progress', (progress) => {
    win.webContents.send('update:progress', progress);
  });

  // When update is fully downloaded, notify and prompt user
  autoUpdater.on('update-downloaded', (info) => {
    win.webContents.send('update:downloaded', info);
    // Show native dialog to install now or later
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'Update Ready',
      message: `Chess Book Library v${info.version} has been downloaded.`,
      detail: 'The update will be installed when you restart the app. Restart now?',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (err) => {
    win.webContents.send('update:error', err.message);
    console.error('AutoUpdater error:', err);
  });

  // Check for updates on startup (silently)
  autoUpdater.checkForUpdatesAndNotify();
}
// ─────────────────────────────────────────────────────────────────────────────

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
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Start auto-updater only in packaged app (not during dev)
    if (app.isPackaged) {
      setupAutoUpdater(mainWindow);
    }
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

// IPC: manually trigger update check from renderer
ipcMain.handle('updater:check', async () => {
  if (app.isPackaged) {
    return autoUpdater.checkForUpdates();
  }
  return { message: 'Auto-update only available in packaged app' };
});

// IPC: install update and restart
ipcMain.handle('updater:install', async () => {
  autoUpdater.quitAndInstall();
});

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

// IPC: bulk upload multiple PDFs
ipcMain.handle('pdf:chooseBulk', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select PDF Books (Multiple)',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    properties: ['openFile', 'multiSelections']
  });
  if (canceled || !filePaths.length) return [];
  ensureDirs();
  const results = [];
  for (const src of filePaths) {
    const bookId = Date.now() + '-' + Math.random().toString(36).slice(2, 9);
    const dest = path.join(BOOKS_DIR, bookId + '.pdf');
    fs.copyFileSync(src, dest);
    results.push({
      bookId,
      filePath: dest,
      originalName: path.basename(src)
    });
  }
  return results;
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
