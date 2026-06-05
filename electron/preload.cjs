const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
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
  getWindowsVolume: () => ipcRenderer.invoke('get-windows-volume'),
  setWindowsVolume: (val) => ipcRenderer.invoke('set-windows-volume', val),
  getWindowsDevices: () => ipcRenderer.invoke('get-windows-devices'),
  setWindowsDeviceVolume: (id, val) => ipcRenderer.invoke('set-windows-device-volume', { id, val }),
  setWindowsDeviceMute: (id, mute) => ipcRenderer.invoke('set-windows-device-mute', { id, mute }),
  setWindowsMute: (mute) => ipcRenderer.invoke('set-windows-mute', mute),
  setWindowsDefaultDevice: (id) => ipcRenderer.invoke('set-windows-default-device', id),
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
  exitApp: () => ipcRenderer.send('exit-app'),
  isElectron: true
});
