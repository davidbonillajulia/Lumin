const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getPathForFile: (file) => webUtils?.getPathForFile ? webUtils.getPathForFile(file) : file.path,
  getScreens: () => ipcRenderer.invoke('get-screens'),
  launchOutput: (data) => ipcRenderer.send('launch-output', data),
  closeOutput: (screenId) => ipcRenderer.send('close-output', screenId),
  savePerfSettings: (settings) => ipcRenderer.invoke('save-perf-settings', settings),
  getPerfSettings: () => ipcRenderer.invoke('get-perf-settings'),
  openSettings: () => ipcRenderer.send('open-settings'),
  convertPptx: (filePath) => ipcRenderer.invoke('convert-pptx', filePath),
  convertPptToPdf: (filePath) => ipcRenderer.invoke('convert-ppt-to-pdf', filePath),
  selectOpenLuminFile: () => ipcRenderer.invoke('select-open-lumin-file'),
  selectSaveLuminFile: (defaultPath) => ipcRenderer.invoke('select-save-lumin-file', defaultPath),
  selectPptFile: () => ipcRenderer.invoke('select-ppt-file'),
  writeLuminFile: (filePath, data) => ipcRenderer.invoke('write-lumin-file', { filePath, data }),
  readLuminFile: (filePath) => ipcRenderer.invoke('read-lumin-file', filePath),
  resolveValidPath: (absPath, relPath, projectPath) => ipcRenderer.invoke('resolve-valid-path', { absPath, relPath, projectPath }),
  getWindowsVolume: () => ipcRenderer.invoke('get-windows-volume'),
  setWindowsVolume: (val) => ipcRenderer.invoke('set-windows-volume', val),
  getWindowsDevices: () => ipcRenderer.invoke('get-windows-devices'),
  setWindowsDeviceVolume: (id, val) => ipcRenderer.invoke('set-windows-device-volume', { id, val }),
  setWindowsDeviceMute: (id, mute) => ipcRenderer.invoke('set-windows-device-mute', { id, mute }),
  setWindowsMute: (mute) => ipcRenderer.invoke('set-windows-mute', mute),
  setWindowsDefaultDevice: (id) => ipcRenderer.invoke('set-windows-default-device', id),
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
  exitApp: () => ipcRenderer.send('exit-app'),
  getStartFile: () => ipcRenderer.invoke('get-start-file'),
  checkFFmpeg: () => ipcRenderer.invoke('check-ffmpeg'),
  transcodeToIntra: (inputPath, outputPath) => ipcRenderer.invoke('transcode-to-intra', { inputPath, outputPath }),
  onOpenLuminFile: (callback) => {
    const subscription = (event, path) => callback(path);
    ipcRenderer.on('open-lumin-file', subscription);
    return () => {
      ipcRenderer.removeListener('open-lumin-file', subscription);
    };
  },
  isElectron: true
});
