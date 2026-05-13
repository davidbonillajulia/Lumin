const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Native check if running in development
const isDev = !app.isPackaged;

let mainWindow;

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // If someone tries to run a second instance, focus our main window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  function createMainWindow() {
    mainWindow = new BrowserWindow({
      width: 1920,
      height: 1080,
      title: 'Lumin Media Server',
      backgroundColor: '#000000',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.cjs'),
      },
    });

    if (isDev) {
      mainWindow.loadURL('http://localhost:3000');
      mainWindow.webContents.openDevTools();
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
      // Check for updates on startup in production
      autoUpdater.checkForUpdatesAndNotify();
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  app.whenReady().then(createMainWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (mainWindow === null) {
      createMainWindow();
    }
  });

  const outputWindows = new Map();

  ipcMain.handle('get-screens', () => {
    const displays = screen.getAllDisplays();
    return displays.map(d => ({
      id: d.id.toString(),
      name: d.label || `Display ${d.id}`,
      width: d.bounds.width,
      height: d.bounds.height,
      left: d.bounds.x,
      top: d.bounds.y,
      isPrimary: d.id === screen.getPrimaryDisplay().id
    }));
  });

  ipcMain.on('launch-output', (event, { screenId, url }) => {
    const displays = screen.getAllDisplays();
    const targetDisplay = displays.find(d => d.id.toString() === screenId) || screen.getPrimaryDisplay();

    const outputWindow = new BrowserWindow({
      x: targetDisplay.bounds.x,
      y: targetDisplay.bounds.y,
      width: targetDisplay.bounds.width,
      height: targetDisplay.bounds.height,
      fullscreen: true,
      frame: false,
      title: `Lumin Output - ${targetDisplay.label}`,
      backgroundColor: '#000000',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.cjs'),
      },
    });

    if (isDev) {
      outputWindow.loadURL(`http://localhost:3000${url}`);
    } else {
      outputWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: url });
    }
    
    outputWindows.set(screenId || 'primary', outputWindow);

    outputWindow.on('closed', () => {
      outputWindows.delete(screenId || 'primary');
    });
  });
}
