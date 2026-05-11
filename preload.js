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
  // Снапшоты
  createSnapshot: (label, filePath) => ipcRenderer.invoke('agent:createSnapshot', { label, filePath }),
  listSnapshots: () => ipcRenderer.invoke('agent:listSnapshots'),
  restoreSnapshot: (snapshotId) => ipcRenderer.invoke('agent:restoreSnapshot', { snapshotId }),
  deleteSnapshot: (snapshotId) => ipcRenderer.invoke('agent:deleteSnapshot', { snapshotId }),
  // Плагины
  listPlugins: () => ipcRenderer.invoke('agent:listPlugins'),
  togglePlugin: (pluginId, enabled) => ipcRenderer.invoke('agent:togglePlugin', { pluginId, enabled }),
  installPlugin: (sourceDir) => ipcRenderer.invoke('agent:installPlugin', { sourceDir }),
  uninstallPlugin: (pluginId) => ipcRenderer.invoke('agent:uninstallPlugin', { pluginId }),
  installPluginFromZip: (bytes, filename) => ipcRenderer.invoke('agent:installPluginFromZip', { bytes, filename }),
  // Язык
  getLanguage: () => ipcRenderer.invoke('settings:getLanguage'),
  setLanguage: (lang) => ipcRenderer.invoke('settings:setLanguage', { lang }),
})
