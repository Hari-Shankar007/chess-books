const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chessApi', {
  // Library metadata
  loadLibrary: () => ipcRenderer.invoke('library:load'),
  saveLibrary: (library) => ipcRenderer.invoke('library:save', library),

  // PDF operations
  choosePdf: (bookId) => ipcRenderer.invoke('pdf:choose', bookId),
    choosePdfBulk: () => ipcRenderer.invoke('pdf:chooseBulk'),
  getPdfBase64: (filePath) => ipcRenderer.invoke('pdf:getBase64', filePath),
  openPdfExternal: (filePath) => ipcRenderer.invoke('pdf:openExternal', filePath),

  // Cover operations
  saveCover: (bookId, dataUrl) => ipcRenderer.invoke('cover:save', bookId, dataUrl),
  loadCover: (bookId) => ipcRenderer.invoke('cover:load', bookId),

  // Book file deletion
  deleteBookFiles: (bookId) => ipcRenderer.invoke('book:delete', bookId),

  // App paths
  getPaths: () => ipcRenderer.invoke('app:getPaths')
});
