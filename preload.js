const { contextBridge, ipcRenderer } = require('electron')

// IPC мост для выполнения команд
contextBridge.exposeInMainWorld('electronAgent', {
  exec: (command) => ipcRenderer.invoke('agent:exec', { command }),
  writeFile: (filePath, content) => ipcRenderer.invoke('agent:writeFile', { filePath, content }),
  confirm: (title, detail) => ipcRenderer.invoke('agent:confirm', { title, detail }),
  pasteText: (text) => ipcRenderer.invoke('agent:pasteText', { text }),
  openPlugins: () => ipcRenderer.invoke('app:openPlugins'),
  openGemini: () => ipcRenderer.invoke('app:openGemini'),
})
