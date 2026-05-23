const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getScreens: () => ipcRenderer.invoke('get-screens'),
  launchOutput: (data) => ipcRenderer.send('launch-output', data),
  closeOutput: (screenId) => ipcRenderer.send('close-output', screenId),
  savePerfSettings: (settings) => ipcRenderer.invoke('save-perf-settings', settings),
  getPerfSettings: () => ipcRenderer.invoke('get-perf-settings'),
  openSettings: () => ipcRenderer.send('open-settings'),
  isElectron: true
});
