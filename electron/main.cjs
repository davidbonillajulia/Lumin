const { app, BrowserWindow, screen, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// Native check if running in development
const isDev = !app.isPackaged;

// Carpeta de configuración en el directorio oficial de datos de usuario de Windows (APPDATA)
const appDataDir = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library/Application Support') : '/var/local');
const configDir = path.join(appDataDir, 'LUMIN_Media_Server');
const configPath = path.join(configDir, 'lumin_perf.json');

let savedPerfSettings = {
  gpuDecoding: 'd3d11',
  engine: 'native_chromium',
  bufferingMode: 'aggressive',
  renderingBackend: 'directx11',
  codecOptimization: true,
  renderCodec: 'dxv3',
  loopMode: 'native_seamless',
  highResOptimization: true,
  maxThreads: 4
};

try {
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf8');
    savedPerfSettings = JSON.parse(raw);
  }
} catch (err) {
  console.error("No se pudo cargar la configuración de rendimiento en Windows:", err);
}

// OPTIMIZACIONES DE COMPORTAMIENTO HARDWARE NATIVO (Estilo Resolume / OBS)
// Estas directivas eliminan retardos por hilos de pintado de HTML, activan búferes directos y fuerzan decodificadores GPU.
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-hardware-overlays', 'single-fullscreen,unscaled');
app.commandLine.appendSwitch('disable-gpu-vsync'); // Desbloquea la latencia de cuadros en tarjetas de alta tasa en Windows

// Configurar la API gráfica (DirectX 11, DirectX 12, OpenGL o Vulkan) de Windows de forma nativa
if (savedPerfSettings.renderingBackend === 'directx12') {
  app.commandLine.appendSwitch('use-angle', 'd3d12');
  app.commandLine.appendSwitch('enable-features', 'WebGPUService,Vulkan,D3D11VideoDecoder');
} else if (savedPerfSettings.renderingBackend === 'vulkan') {
  app.commandLine.appendSwitch('use-angle', 'vulkan');
  app.commandLine.appendSwitch('enable-features', 'Vulkan');
} else if (savedPerfSettings.renderingBackend === 'opengl') {
  app.commandLine.appendSwitch('use-gl', 'desktop'); // Fuerza el driver nativo OpenGL de NVIDIA/AMD en Windows
} else {
  app.commandLine.appendSwitch('use-angle', 'd3d11'); // DirectX 11 dedicado
}

// Configurar decodificador por Hardware Windows Media Foundation
if (savedPerfSettings.gpuDecoding === 'nvdec') {
  app.commandLine.appendSwitch('enable-features', 'D3D11VideoDecoder,VaapiVideoDecoder,VaapiVideoDecodeLinux');
  app.commandLine.appendSwitch('enable-nvdec');
} else if (savedPerfSettings.gpuDecoding === 'dxva2') {
  app.commandLine.appendSwitch('enable-features', 'DXVAVideoDecoder');
} else if (savedPerfSettings.gpuDecoding === 'software') {
  app.commandLine.appendSwitch('disable-accelerated-video-decode');
} else {
  app.commandLine.appendSwitch('enable-features', 'D3D11VideoDecoder,VaapiVideoDecoder');
}

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
      title: 'LUMIN Media Server',
      backgroundColor: '#000000',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.cjs'),
        webSecurity: false, // Allow loading local files
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
      // Close all output windows when main interface is closed
      outputWindows.forEach(win => {
        if (!win.isDestroyed()) win.close();
      });
      outputWindows.clear();
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
      width: Math.round(d.bounds.width * d.scaleFactor),
      height: Math.round(d.bounds.height * d.scaleFactor),
      left: Math.round(d.bounds.x * d.scaleFactor),
      top: Math.round(d.bounds.y * d.scaleFactor),
      isPrimary: d.id === screen.getPrimaryDisplay().id
    }));
  });

  ipcMain.handle('save-perf-settings', (event, settings) => {
    try {
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(configPath, JSON.stringify(settings, null, 2), 'utf8');
      
      // Actualizamos la variable en memoria para que concuerde en la sesión actual
      savedPerfSettings = { ...savedPerfSettings, ...settings };
      return { success: true };
    } catch (err) {
      console.error("Error al guardar la configuración de rendimiento:", err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('get-perf-settings', () => {
    return savedPerfSettings;
  });

  ipcMain.on('open-settings', () => {
    shell.openExternal('ms-settings:display');
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
      title: `LUMIN Output - ${targetDisplay.label}`,
      backgroundColor: '#000000',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.cjs'),
        webSecurity: false, // Allow loading local files
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

  ipcMain.on('close-output', (event, screenId) => {
    const key = screenId || 'primary';
    const outputWindow = outputWindows.get(key);
    if (outputWindow && !outputWindow.isDestroyed()) {
      outputWindow.close();
      outputWindows.delete(key);
    }
  });
}
