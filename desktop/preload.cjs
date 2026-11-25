const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  saveKeys: (keys) => ipcRenderer.invoke('keys:save', keys),
});
