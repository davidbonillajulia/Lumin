const { app, BrowserWindow, screen, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
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
// Se elimina disable-gpu-vsync para activar V-Sync nativo y eliminar las líneas horizontales (screen tearing) en los monitores/proyectores.

// DIRECTIVAS CRÍTICAS PARA EVITAR CORTES Y CONGELAMIENTOS EN WINDOWS NATIVO MULTIPANTALLA:
// 1. Evita que Windows deje de renderizar las salidas secundarias fullscreen cuando pierden el foco.
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
// 2. Impide que Chromium estrangule la CPU/GPU y el temporizador JS de las ventanas de salida en segundo plano.
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
// 3. Fuerza la aceleración de decodificación de vídeo por hardware en Chromium.
app.commandLine.appendSwitch('enable-accelerated-video-decode');

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

    mainWindow.setMenu(null);

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

  ipcMain.handle('select-open-lumin-file', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Abrir archivo LUMIN',
      filters: [{ name: 'LUMIN Config', extensions: ['lumin'] }],
      properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }
    return { canceled: false, filePath: result.filePaths[0] };
  });

  ipcMain.handle('select-save-lumin-file', async (event, defaultName) => {
    const result = await dialog.showSaveDialog({
      title: 'Guardar archivo LUMIN',
      defaultPath: defaultName || 'configuracion.lumin',
      filters: [{ name: 'LUMIN Config', extensions: ['lumin'] }]
    });
    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle('select-ppt-file', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Importar PowerPoint',
      filters: [{ name: 'PowerPoint Presentations', extensions: ['ppt', 'pptx'] }],
      properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }
    return { canceled: false, filePath: result.filePaths[0] };
  });

  ipcMain.handle('write-lumin-file', async (event, { filePath, data }) => {
    try {
      fs.writeFileSync(filePath, data, 'utf8');
      return { success: true };
    } catch (err) {
      console.error("Error writing lumin file:", err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('read-lumin-file', async (event, filePath) => {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return { success: true, data };
    } catch (err) {
      console.error("Error reading lumin file:", err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.on('exit-app', () => {
    app.exit(0);
  });

  ipcMain.handle('get-windows-volume', async () => {
    return new Promise((resolve) => {
      const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "
        $code = @'
        using System;
        using System.Runtime.InteropServices;
        public class Audio {
            [Guid(\\"D66606E7-27D5-4E6B-97F4-B52F22F44031\\")]
            internal class MMDeviceEnumerator { }
            [Guid(\\"A95664D2-9614-4F35-A746-DE8DB63617E6\\"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
            internal interface IMMDeviceEnumerator {
                int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
            }
            [Guid(\\"D66606E7-27D5-4E6B-97F4-B52F22F44031\\")]
            internal interface IMMDevice {
                int Activate(ref Guid iid, int dwClsContext, IntPtr pActivationParams, out IntPtr ppInterface);
            }
            [Guid(\\"5CDF2C82-841E-4546-9722-0CF74078229A\\"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
            internal interface IAudioEndpointVolume {
                int RegisterControlChangeNotifyCallback(IntPtr pNotify);
                int UnregisterControlChangeNotifyCallback(IntPtr pNotify);
                int GetChannelCount(out int pnChannelCount);
                int SetMasterVolumeLevel(float fLevelDB, ref Guid pguidEventContext);
                int SetMasterVolumeLevelScalar(float fLevel, ref Guid pguidEventContext);
                int GetMasterVolumeLevel(out float pfLevelDB);
                int GetMasterVolumeLevelScalar(out float pfLevel);
            }
            public static float GetVolume() {
                try {
                    var enumerator = (IMMDeviceEnumerator)new MMDeviceEnumerator();
                    IntPtr devPtr = IntPtr.Zero;
                    enumerator.GetDefaultAudioEndpoint(0, 1, out devPtr);
                    if (devPtr == IntPtr.Zero) return -1;
                    var dev = (IMMDevice)Marshal.GetObjectForIUnknown(devPtr);
                    IntPtr objPtr = IntPtr.Zero;
                    var iid = new Guid(\\"5CDF2C82-841E-4546-9722-0CF74078229A\\");
                    dev.Activate(ref iid, 23, IntPtr.Zero, out objPtr);
                    if (objPtr == IntPtr.Zero) return -1;
                    var volume = (IAudioEndpointVolume)Marshal.GetObjectForIUnknown(objPtr);
                    float val = 0;
                    volume.GetMasterVolumeLevelScalar(out val);
                    return val;
                } catch { return -1; }
            }
        }
'@
        try {
          Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
        } catch {}
        [Audio]::GetVolume()
      "`;
      exec(psCommand, (err, stdout) => {
        if (err || !stdout) {
          resolve(0.5);
        } else {
          const val = parseFloat(stdout.trim());
          resolve(val >= 0 ? val : 0.5);
        }
      });
    });
  });

  ipcMain.handle('set-windows-volume', async (event, val) => {
    return new Promise((resolve) => {
      const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "
        $code = @'
        using System;
        using System.Runtime.InteropServices;
        public class Audio {
            [Guid(\\"D66606E7-27D5-4E6B-97F4-B52F22F44031\\")]
            internal class MMDeviceEnumerator { }
            [Guid(\\"A95664D2-9614-4F35-A746-DE8DB63617E6\\"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
            internal interface IMMDeviceEnumerator {
                int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
            }
            [Guid(\\"D66606E7-27D5-4E6B-97F4-B52F22F44031\\")]
            internal interface IMMDevice {
                int Activate(ref Guid iid, int dwClsContext, IntPtr pActivationParams, out IntPtr ppInterface);
            }
            [Guid(\\"5CDF2C82-841E-4546-9722-0CF74078229A\\"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
            internal interface IAudioEndpointVolume {
                int RegisterControlChangeNotifyCallback(IntPtr pNotify);
                int UnregisterControlChangeNotifyCallback(IntPtr pNotify);
                int GetChannelCount(out int pnChannelCount);
                int SetMasterVolumeLevel(float fLevelDB, ref Guid pguidEventContext);
                int SetMasterVolumeLevelScalar(float fLevel, ref Guid pguidEventContext);
                int GetMasterVolumeLevel(out float pfLevelDB);
                int GetMasterVolumeLevelScalar(out float pfLevel);
            }
            public static void SetVolume(float val) {
                try {
                    var enumerator = (IMMDeviceEnumerator)new MMDeviceEnumerator();
                    IntPtr devPtr = IntPtr.Zero;
                    enumerator.GetDefaultAudioEndpoint(0, 1, out devPtr);
                    if (devPtr == IntPtr.Zero) return;
                    var dev = (IMMDevice)Marshal.GetObjectForIUnknown(devPtr);
                    IntPtr objPtr = IntPtr.Zero;
                    var iid = new Guid(\\"5CDF2C82-841E-4546-9722-0CF74078229A\\");
                    dev.Activate(ref iid, 23, IntPtr.Zero, out objPtr);
                    if (objPtr == IntPtr.Zero) return;
                    var volume = (IAudioEndpointVolume)Marshal.GetObjectForIUnknown(objPtr);
                    Guid guid = Guid.Empty;
                    volume.SetMasterVolumeLevelScalar(val, ref guid);
                } catch {}
            }
        }
'@
        try {
          Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
        } catch {}
        [Audio]::SetVolume(${val})
      "`;
      exec(psCommand, () => {
        resolve(true);
      });
    });
  });

  ipcMain.handle('convert-ppt-to-pdf', async (event, filePath) => {
    return new Promise((resolve) => {
      const presentationId = `LUMIN_PPT_PDF_${Date.now()}`;
      const tempPdfDirectory = app.getPath('temp');
      const pdfPath = path.join(tempPdfDirectory, `${presentationId}.pdf`);

      const psScript = `
$ErrorActionPreference = 'Stop'
$ppt = $null
$pres = $null

try {
    # Initialize the PowerPoint COM Object
    $ppt = New-Object -ComObject PowerPoint.Application
    
    # Make PowerPoint visible so it can paint slides correctly on Windows
    $ppt.Visible = [Microsoft.Office.Core.MsoTriState]::msoTrue
    
    # Open presentation: Open(FileName, ReadOnly, Untitled, WithWindow)
    $pres = $ppt.Presentations.Open("${filePath.replace(/"/g, '`"')}", [Microsoft.Office.Core.MsoTriState]::msoTrue, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoTrue)
    
    # Minimize the PowerPoint window immediately
    try {
        $ppt.WindowState = 2 # ppWindowMinimized
    } catch {}
    
    # Save deck as a multi-page PDF document
    # 32 is the PowerPoint constant for ppSaveAsPDF
    $pres.SaveAs("${pdfPath.replace(/"/g, '`"')}", 32)
    
    # Orderly close presentation and quit PowerPoint
    $pres.Close()
    $ppt.Quit()

    $res = @{
        success = $true
        pdfPath = "${pdfPath.replace(/\\/g, '/')}"
    }
    
    Write-Output (ConvertTo-Json -InputObject $res -Depth 5)
} catch {
    if ($pres) { try { $pres.Close() } catch {} }
    if ($ppt) { try { $ppt.Quit() } catch {} }
    
    $res = @{
        success = $false
        error = $_.Exception.Message
    }
    Write-Output (ConvertTo-Json -InputObject $res -Depth 5)
}
`;

      const psScriptPath = path.join(app.getPath('temp'), `${presentationId}_script.ps1`);
      
      try {
        fs.writeFileSync(psScriptPath, psScript, 'utf8');
      } catch (writeError) {
        console.error("Error writing temporary script file:", writeError);
        resolve({ success: false, error: "Error de escritura temporal en disco." });
        return;
      }

      const runCmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${psScriptPath}"`;
      
      exec(runCmd, { maxBuffer: 10 * 1024 * 1024 }, (execError, stdout, stderr) => {
        try {
          if (fs.existsSync(psScriptPath)) {
            fs.unlinkSync(psScriptPath);
          }
        } catch (cleanErr) {}

        if (execError) {
          console.error("PowerShell PPT-to-PDF conversion failed:", execError, stderr);
          resolve({ success: false, error: `Error de automatización de PowerPoint: ${execError.message}` });
          return;
        }

        try {
          const psResult = JSON.parse(stdout.trim());
          resolve(psResult);
        } catch (jsonErr) {
          console.error("Failed parsing PowerShell PDF output JSON:", jsonErr, stdout);
          resolve({ 
            success: false, 
            error: "No se pudo interpretar la respuesta del automatizador de PowerPoint. Asegúrate de tener instalado Microsoft PowerPoint en Windows." 
          });
        }
      });
    });
  });

  ipcMain.handle('convert-pptx', async (event, filePath) => {
    return new Promise((resolve) => {
      // Create a temporary directory dedicated to this PowerPoint presentation's slide images
      const presentationId = `LUMIN_PPT_${Date.now()}`;
      const tempDir = path.join(app.getPath('temp'), presentationId);
      
      try {
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
      } catch (err) {
        console.error("Error creating temporary directory for slide conversion:", err);
        resolve({ success: false, error: "No se pudo crear el directorio de renderizado temporal." });
        return;
      }

      // Compile discrete powershell script to execute
      const psScript = `
$ErrorActionPreference = 'Stop'
$ppt = $null
$pres = $null

try {
    # Initialize the PowerPoint COM Object
    $ppt = New-Object -ComObject PowerPoint.Application
    
    # Make PowerPoint visible so it can paint slides correctly on Windows
    $ppt.Visible = [Microsoft.Office.Core.MsoTriState]::msoTrue
    
    # Open presentation: Open(FileName, ReadOnly, Untitled, WithWindow)
    # WithWindow matches [Microsoft.Office.Core.MsoTriState]::msoTrue (provides graphics context for slide exports)
    $pres = $ppt.Presentations.Open("${filePath.replace(/"/g, '`"')}", [Microsoft.Office.Core.MsoTriState]::msoTrue, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoTrue)
    
    # Minimize the PowerPoint window immediately so it doesn't steal focus or cover LUMIN fullscreen displays
    try {
        $ppt.WindowState = 2 # ppWindowMinimized
    } catch {}
    
    # Save entire deck as individual PNG slide frames in the target directory
    # 18 is the PowerPoint constant for ppSaveAsPNG
    $pres.SaveAs("${tempDir.replace(/"/g, '`"')}", 18)
    
    # Collect metadata like Slide Title and full body text for synchronization
    $slideData = @()
    $slideCount = $pres.Slides.Count
    for ($i = 1; $i -le $slideCount; $i++) {
        $slide = $pres.Slides.Item($i)
        $title = ""
        
        # Pull slide title shape if configured
        try {
            if ($slide.Shapes.HasTitle) {
                $slideTitleText = $slide.Shapes.Title.TextFrame.TextRange.Text.Trim()
                if ($slideTitleText) {
                    $title = $slideTitleText
                }
            }
        } catch {}

        # Scan other shapes to construct clean list of key bullet text points
        $bullets = @()
        try {
            foreach ($shape in $slide.Shapes) {
                if ($shape.HasTextFrame -and $shape.TextFrame.HasText) {
                    # Skip the slide title shape
                    if ($slide.Shapes.HasTitle -and $shape.Name -eq $slide.Shapes.Title.Name) {
                        continue
                    }
                    $textVal = $shape.TextFrame.TextRange.Text.Trim()
                    if ($textVal -and $textVal.Length -gt 1) {
                        # Add shape's paragraphs to bullet collection
                        foreach ($p in $shape.TextFrame.TextRange.Paragraphs()) {
                            $pText = $p.Text.Trim()
                            if ($pText) {
                                $bullets += $pText
                            }
                        }
                    }
                }
            }
        } catch {}

        if (-not $title) {
            $title = "Diapositiva $i"
        }

        $slideData += @{
            index = $i
            title = $title
            bullets = $bullets
        }
    }

    # Orderly close presentation and quit PowerPoint headless engine
    $pres.Close()
    $ppt.Quit()

    $res = @{
        success = $true
        slides = $slideData
    }
    
    # Output outcome in clean JSON format
    Write-Output (ConvertTo-Json -InputObject $res -Depth 5)
} catch {
    if ($pres) { try { $pres.Close() } catch {} }
    if ($ppt) { try { $ppt.Quit() } catch {} }
    
    $res = @{
        success = $false
        error = $_.Exception.Message
    }
    Write-Output (ConvertTo-Json -InputObject $res -Depth 5)
}
`;

      // Write code block out as a temporary file to avoid complex shell quoting and backslash issues in command line strings
      const psScriptPath = path.join(app.getPath('temp'), `${presentationId}_script.ps1`);
      
      try {
        fs.writeFileSync(psScriptPath, psScript, 'utf8');
      } catch (writeError) {
        console.error("Error writing temporary script file:", writeError);
        resolve({ success: false, error: "Error de escritura temporal en disco." });
        return;
      }

      const runCmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${psScriptPath}"`;
      
      exec(runCmd, { maxBuffer: 25 * 1024 * 1024 }, (execError, stdout, stderr) => {
        // Cleaning up temporary script
        try {
          if (fs.existsSync(psScriptPath)) {
            fs.unlinkSync(psScriptPath);
          }
        } catch (cleanErr) {}

        if (execError) {
          console.error("PowerShell core script execution failed:", execError, stderr);
          resolve({ success: false, error: `Error al abrir PowerPoint: ${execError.message}` });
          return;
        }

        try {
          // Parse stdout resulting JSON structure
          const psResult = JSON.parse(stdout.trim());
          if (!psResult.success) {
            resolve({ success: false, error: psResult.error || "Microsoft PowerPoint lanzó un error durante el procesado." });
            return;
          }

          // Scan temp folder and any subfolders recursively for the rendered slides images (handles different PowerPoint structures, languages or folders)
          const getAllFilesRecursively = (dirPath) => {
            let filesList = [];
            const items = fs.readdirSync(dirPath);
            for (const item of items) {
              const fullPath = path.join(dirPath, item);
              const stats = fs.statSync(fullPath);
              if (stats.isDirectory()) {
                filesList = filesList.concat(getAllFilesRecursively(fullPath));
              } else {
                filesList.push({ filename: item, fullPath });
              }
            }
            return filesList;
          };

          const allGraphicFiles = getAllFilesRecursively(tempDir)
            .filter(fileItem => {
              const ext = fileItem.filename.toLowerCase();
              return ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg');
            })
            .map(fileItem => {
              const digits = fileItem.filename.match(/\d+/);
              const numericId = digits ? parseInt(digits[0], 10) : 0;
              return { filename: fileItem.filename, fullPath: fileItem.fullPath, numericId };
            })
            .sort((a, b) => a.numericId - b.numericId);

          // Build clean state matching slides with image pointers
          const formattedSlides = psResult.slides.map((s, idx) => {
            // Find appropriate frame matching this slide sequence (sorted arrays should match index offsets)
            const slideImg = allGraphicFiles[idx] || allGraphicFiles.find(g => g.numericId === s.index);
            const absoluteFileUri = slideImg 
              ? `file:///${slideImg.fullPath.replace(/\\/g, '/')}` 
              : undefined;

            return {
              title: s.title,
              subtitle: s.bullets && s.bullets.length > 0 ? s.bullets[0] : undefined,
              bullets: s.bullets && s.bullets.length > 1 ? s.bullets.slice(1) : (s.bullets || []),
              image: absoluteFileUri,
              bgColor: '#0f172a' // Let PowerPoint image background render itself!
            };
          });

          if (formattedSlides.length === 0) {
            resolve({ success: false, error: "PowerPoint se ha ejecutado pero no ha exportado diapositivas. ¿Está instalado PowerPoint?" });
            return;
          }

          resolve({
            success: true,
            slides: formattedSlides,
            totalPages: formattedSlides.length
          });

        } catch (jsonErr) {
          console.error("Failed parsing PowerShell result JSON:", jsonErr, stdout);
          resolve({ 
            success: false, 
            error: "No se pudo interpretar la respuesta del automatizador nativo de PowerPoint. Asegúrate de tener instalado Microsoft Office PowerPoint nativo en Windows." 
          });
        }
      });
    });
  });

  ipcMain.on('open-settings', () => {
    shell.openExternal('ms-settings:display');
  });

  ipcMain.on('launch-output', (event, { screenId, url }) => {
    const isTimerWindow = (url && url.includes('mode=floating_timer')) || (screenId && screenId.startsWith('timer_'));

    if (isTimerWindow) {
      // Timer controller: compact, framed, always-on-top window centered on primary display
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;
      const winW = 380;
      const winH = 260;

      const outputWindow = new BrowserWindow({
        x: primaryDisplay.workArea.x + Math.round((screenW - winW) / 2),
        y: primaryDisplay.workArea.y + Math.round((screenH - winH) / 2),
        width: winW,
        height: winH,
        fullscreen: false,
        frame: true,
        resizable: true,
        alwaysOnTop: true,
        title: 'LUMIN Timer Controller',
        backgroundColor: '#000000',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.cjs'),
          webSecurity: false,
        },
      });

      outputWindow.setMenu(null);

      if (isDev) {
        outputWindow.loadURL(`http://localhost:3000${url}`);
      } else {
        outputWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: url });
      }

      outputWindows.set(screenId || 'primary', outputWindow);

      outputWindow.on('closed', () => {
        outputWindows.delete(screenId || 'primary');
      });
    } else {
      // Video output: fullscreen on the target display
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
    }
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
