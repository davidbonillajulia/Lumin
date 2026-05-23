const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getScreens: () => ipcRenderer.invoke('get-screens'),
  launchOutput: (data) => ipcRenderer.send('launch-output', data),
  closeOutput: (screenId) => ipcRenderer.send('close-output', screenId),
  isElectron: true
});
