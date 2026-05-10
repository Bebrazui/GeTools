const { contextBridge, ipcRenderer } = require('electron')

// IPC мост для выполнения команд
contextBridge.exposeInMainWorld('electronAgent', {
  exec: (command, opts) => ipcRenderer.invoke('agent:exec', { command, ...opts }),
  readFile: (filePath) => ipcRenderer.invoke('agent:readFile', { filePath }),
  writeFile: (filePath, content) => ipcRenderer.invoke('agent:writeFile', { filePath, content }),
  confirm: (title, detail) => ipcRenderer.invoke('agent:confirm', { title, detail }),
  pasteText: (text) => ipcRenderer.invoke('agent:pasteText', { text }),
  openPlugins: () => window.dispatchEvent(new CustomEvent('getools:open-plugins')),
  openGemini: () => ipcRenderer.invoke('app:openGemini'),
  // Рабочая директория
  getCwd: () => ipcRenderer.invoke('agent:getCwd'),
  setCwd: (cwd) => ipcRenderer.invoke('agent:setCwd', { cwd }),
  pickCwd: () => ipcRenderer.invoke('agent:pickCwd'),
})
