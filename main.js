const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, screen, nativeImage, session } = require('electron')
const { exec, execFile } = require('child_process')
const path = require('path')
const fs = require('fs')

// Включаем WebGPU и аппаратное ускорение
app.commandLine.appendSwitch('enable-features', 'WebGPU')
app.commandLine.appendSwitch('enable-unsafe-webgpu')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-oop-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('force_high_performance_gpu')
app.commandLine.appendSwitch('num-raster-threads', '4')
app.commandLine.appendSwitch('use-angle', 'd3d11')
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.commandLine.appendSwitch('disable-renderer-backgrounding')

// Отключаем Trusted Types для нашего скрипта
app.commandLine.appendSwitch('disable-features', 'TrustedTypes')

let mainWindow

function loadGemini() {
  mainWindow.loadURL('https://gemini.google.com')
}

function loadPluginPage() {
  mainWindow.loadFile(path.join(__dirname, 'pluginPage.html'))
}

function decodeCommandOutput(value) {
  if (!value || value.length === 0) return ''
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(String(value), 'binary')

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch (_) {
    return new TextDecoder('ibm866').decode(buffer)
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Gemini Agent',
    backgroundColor: '#1e1e2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      backgroundThrottling: false,
      spellcheck: false,
      v8CacheOptions: 'bypassHeatCheckAndEagerCompile',
    },
    autoHideMenuBar: true,
    show: false,
  })

  loadGemini()

  if (typeof mainWindow.webContents.setFrameRate === 'function') {
    mainWindow.webContents.setFrameRate(120)
  }

  // Подключаем debugger для CDP
  // CDP is attached only during injection; keeping it attached slows the page down.

  // Открываем DevTools для отладки
  if (process.env.GEMINI_AGENT_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  // F12 открывает/закрывает DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools()
      } else {
        mainWindow.webContents.openDevTools({ mode: 'detach' })
      }
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Инжектируем агентский код через CDP (обходит Trusted Types)
  async function injectAgentViaCDP() {
    let attachedHere = false
    try {
      if (!mainWindow.webContents.debugger.isAttached()) {
        mainWindow.webContents.debugger.attach('1.3')
        attachedHere = true
      }

      // Включаем Runtime domain
      await mainWindow.webContents.debugger.sendCommand('Runtime.enable')
      
      // Выполняем код в контексте страницы
      const script = fs.readFileSync(path.join(__dirname, 'inject.js'), 'utf8')
      const prompt = fs.readFileSync(path.join(__dirname, 'AGENT_PROMPT.md'), 'utf8')
      await mainWindow.webContents.debugger.sendCommand('Runtime.evaluate', {
        expression: `window.__geminiAgentPrompt = ${JSON.stringify(prompt)};\n${script}`
      })
      
      console.log('[Agent] Скрипт внедрён через CDP')
    } catch (e) {
      console.error('[Agent] Ошибка CDP:', e.message)
    } finally {
      if (attachedHere && mainWindow.webContents.debugger.isAttached()) {
        mainWindow.webContents.debugger.detach()
      }
    }
  }

  // Инжектируем агентский код после каждой навигации
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow.webContents.getURL().startsWith('https://gemini.google.com')) return
    injectAgentViaCDP()
  })

  // Обновляем заголовок
  mainWindow.webContents.on('page-title-updated', (e, title) => {
    mainWindow.setTitle(`Gemini Agent — ${title}`)
  })
}

// ─── Инжекция скрипта в страницу ────────────────────────────────────────────

function injectAgentScript() {
  const script = fs.readFileSync(path.join(__dirname, 'inject.js'), 'utf8')
  mainWindow.webContents.executeJavaScript(script).catch(() => {})
}

// ─── IPC: обработка запросов от агента ──────────────────────────────────────

// Запрос разрешения у пользователя
ipcMain.handle('agent:confirm', async (event, { title, detail }) => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['Разрешить', 'Отклонить'],
    defaultId: 0,
    cancelId: 1,
    title: '🤖 Gemini Agent — Запрос действия',
    message: title,
    detail: detail,
    checkboxLabel: 'Запомнить для этого типа действий',
    checkboxChecked: false,
  })
  return { allowed: result.response === 0, remember: result.checkboxChecked }
})

// Выполнить команду в терминале
ipcMain.handle('agent:exec', async (event, { command }) => {
  return new Promise((resolve) => {
    exec(`chcp 65001 > nul & ${command}`, { timeout: 30000, maxBuffer: 1024 * 1024, encoding: 'buffer' }, (err, stdout, stderr) => {
      resolve({
        success: !err,
        stdout: decodeCommandOutput(stdout),
        stderr: decodeCommandOutput(stderr),
        error: err ? err.message : null,
      })
    })
  })
})

// Открыть файл/папку/URL
ipcMain.handle('agent:open', async (event, { target }) => {
  try {
    await shell.openPath(target)
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// Открыть URL в браузере
ipcMain.handle('agent:openUrl', async (event, { url }) => {
  await shell.openExternal(url)
  return { success: true }
})

ipcMain.handle('app:openPlugins', async () => {
  loadPluginPage()
  return { success: true }
})

ipcMain.handle('app:openGemini', async () => {
  loadGemini()
  return { success: true }
})

// Читать файл
ipcMain.handle('agent:readFile', async (event, { filePath }) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return { success: true, content }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// Записать файл
ipcMain.handle('agent:writeFile', async (event, { filePath, content }) => {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, content, 'utf8')
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// Буфер обмена
ipcMain.handle('agent:clipboard', async (event, { action, text }) => {
  if (action === 'write') {
    clipboard.writeText(text)
    return { success: true }
  } else {
    return { success: true, text: clipboard.readText() }
  }
})

// Надёжная вставка текста в активное поле страницы через системный paste
ipcMain.handle('agent:pasteText', async (event, { text }) => {
  const previous = clipboard.readText()
  clipboard.writeText(text)

  if (typeof event.sender.paste === 'function') {
    event.sender.paste()
  } else {
    event.sender.sendInputEvent({ type: 'keyDown', keyCode: 'V', modifiers: ['control'] })
    event.sender.sendInputEvent({ type: 'char', keyCode: 'v', modifiers: ['control'] })
    event.sender.sendInputEvent({ type: 'keyUp', keyCode: 'V', modifiers: ['control'] })
  }

  setTimeout(() => {
    if (clipboard.readText() === text) clipboard.writeText(previous)
  }, 1000)

  return { success: true }
})

// Скриншот экрана
ipcMain.handle('agent:screenshot', async (event) => {
  try {
    const { desktopCapturer } = require('electron')
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    })
    if (sources.length > 0) {
      const dataURL = sources[0].thumbnail.toDataURL()
      return { success: true, dataURL }
    }
    return { success: false, error: 'No screen source' }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// Диалог выбора файла
ipcMain.handle('agent:pickFile', async (event, { mode }) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: mode === 'folder' ? ['openDirectory'] : ['openFile'],
  })
  return { canceled: result.canceled, path: result.filePaths[0] || null }
})

// Управление окном
ipcMain.handle('window:minimize', () => mainWindow.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize()
  else mainWindow.maximize()
})
ipcMain.handle('window:close', () => mainWindow.close())

// ─── App lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})
