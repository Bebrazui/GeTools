const { app, BrowserWindow, BrowserView, ipcMain, dialog, shell, clipboard, screen, nativeImage, session } = require('electron')
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
let geminiView       // BrowserView с Gemini — грузится в фоне
let splashShownAt = 0
let currentCwd = null  // Рабочая директория для команд

function decodeCommandOutput(value) {
  if (!value || value.length === 0) return ''
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(String(value), 'binary')
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch (_) {
    return new TextDecoder('ibm866').decode(buffer)
  }
}

function getContentBounds() {
  const [w, h] = mainWindow.getContentSize()
  return { x: 0, y: 0, width: w, height: h }
}

function showGeminiView() {
  if (!geminiView) return
  geminiView.setBounds(getContentBounds())
  mainWindow.setTopBrowserView(geminiView)
  // Подгоняем размер при ресайзе
  mainWindow.on('resize', () => {
    if (geminiView) geminiView.setBounds(getContentBounds())
  })
}

function loadPluginPage() {
  // Плагины грузим в основном окне поверх view
  mainWindow.loadFile(path.join(__dirname, 'pluginPage.html'))
}

function loadGemini() {
  if (geminiView) {
    geminiView.webContents.loadURL('https://gemini.google.com')
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'GeTools',
    icon: path.join(__dirname, 'logo.ico'),
    backgroundColor: '#131314',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      backgroundThrottling: false,
      spellcheck: false,
    },
    autoHideMenuBar: true,
    show: false,
  })

  // Основное окно показывает сплэш
  mainWindow.loadFile(path.join(__dirname, 'splash.html'))

  // Создаём BrowserView для Gemini — грузится в фоне невидимым
  geminiView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      backgroundThrottling: false,
      spellcheck: false,
      v8CacheOptions: 'bypassHeatCheckAndEagerCompile',
    },
  })
  mainWindow.addBrowserView(geminiView)
  geminiView.setBounds({ x: 0, y: 0, width: 0, height: 0 }) // скрыт
  geminiView.webContents.loadURL('https://gemini.google.com')

  if (typeof geminiView.webContents.setFrameRate === 'function') {
    geminiView.webContents.setFrameRate(120)
  }

  if (process.env.GEMINI_AGENT_DEVTOOLS === '1') {
    geminiView.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      const wc = geminiView ? geminiView.webContents : mainWindow.webContents
      if (wc.isDevToolsOpened()) wc.closeDevTools()
      else wc.openDevTools({ mode: 'detach' })
    }
  })

  mainWindow.once('ready-to-show', () => {
    splashShownAt = Date.now()
    mainWindow.show()
  })

  // Инжектируем агентский код через CDP
  async function injectAgentViaCDP() {
    const wc = geminiView.webContents
    let attachedHere = false
    try {
      if (!wc.debugger.isAttached()) {
        wc.debugger.attach('1.3')
        attachedHere = true
      }
      await wc.debugger.sendCommand('Runtime.enable')

      const script = fs.readFileSync(path.join(__dirname, 'inject.js'), 'utf8')
      const prompt = fs.readFileSync(path.join(__dirname, 'AGENT_PROMPT.md'), 'utf8')
      const logoUrl = (() => {
        try { return 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'transparent.png')).toString('base64') }
        catch (_) { return '' }
      })()
      await wc.debugger.sendCommand('Runtime.evaluate', {
        expression: `window.__geminiAgentPrompt = ${JSON.stringify(prompt)};\nwindow.__geminiAgentAppPath = ${JSON.stringify(__dirname)};\nwindow.__geminiAgentLogoUrl = ${JSON.stringify(logoUrl)};\n${script}`
      })

      console.log('[Agent] Скрипт внедрён через CDP')

      // Показываем Gemini — минимум 1.5с сплэша
      const elapsed = Date.now() - splashShownAt
      setTimeout(() => showGeminiView(), Math.max(0, 1500 - elapsed))
    } catch (e) {
      console.error('[Agent] Ошибка CDP:', e.message)
      showGeminiView()
    } finally {
      if (attachedHere && wc.debugger.isAttached()) {
        wc.debugger.detach()
      }
    }
  }

  geminiView.webContents.on('did-finish-load', () => {
    if (!geminiView.webContents.getURL().startsWith('https://gemini.google.com')) return
    injectAgentViaCDP()
  })

  geminiView.webContents.on('page-title-updated', (e, title) => {
    mainWindow.setTitle(`GeTools — ${title}`)
  })
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
ipcMain.handle('agent:exec', async (event, { command, timeout: cmdTimeout, cwd: cmdCwd }) => {
  // Таймаут по умолчанию 5 минут, максимум 30 минут
  const timeout = Math.min(
    typeof cmdTimeout === 'number' && cmdTimeout > 0 ? cmdTimeout : 5 * 60 * 1000,
    30 * 60 * 1000
  )
  // cwd: из команды → текущий проект → папка приложения
  const execCwd = cmdCwd || currentCwd || __dirname

  return new Promise((resolve) => {
    const proc = exec(
      `chcp 65001 > nul & ${command}`,
      { timeout, maxBuffer: 4 * 1024 * 1024, encoding: 'buffer', cwd: execCwd },
      (err, stdout, stderr) => {
        const timedOut = err?.killed || err?.signal === 'SIGTERM'
        resolve({
          success: !err || timedOut,
          stdout: decodeCommandOutput(stdout),
          stderr: decodeCommandOutput(stderr),
          error: timedOut
            ? `Команда прервана по таймауту (${Math.round(timeout / 1000)}с)`
            : err ? err.message : null,
          timedOut: !!timedOut,
          cwd: execCwd,
        })
      }
    )
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
  if (geminiView) {
    geminiView.webContents.loadURL('https://gemini.google.com')
    showGeminiView()
  }
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
    const resolved = path.resolve(filePath)
    const cwd = process.cwd()
    const appDir = __dirname

    // Предупреждение если путь за пределами рабочей директории и папки приложения
    const inCwd = resolved.startsWith(cwd + path.sep) || resolved === cwd
    const inApp = resolved.startsWith(appDir + path.sep) || resolved === appDir
    if (!inCwd && !inApp) {
      console.warn(`[Agent] writeFile: путь за пределами рабочей директории: ${resolved}`)
    }

    fs.mkdirSync(path.dirname(resolved), { recursive: true })
    fs.writeFileSync(resolved, content, 'utf8')
    return { success: true, resolvedPath: resolved, outsideCwd: !inCwd && !inApp }
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

  const sender = geminiView ? geminiView.webContents : event.sender
  if (typeof sender.paste === 'function') {
    sender.paste()
  } else {
    sender.sendInputEvent({ type: 'keyDown', keyCode: 'V', modifiers: ['control'] })
    sender.sendInputEvent({ type: 'char', keyCode: 'v', modifiers: ['control'] })
    sender.sendInputEvent({ type: 'keyUp', keyCode: 'V', modifiers: ['control'] })
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

// ─── Рабочая директория ──────────────────────────────────────────────────────

ipcMain.handle('agent:getCwd', () => ({ cwd: currentCwd }))

ipcMain.handle('agent:setCwd', async (event, { cwd: newCwd }) => {
  if (newCwd && fs.existsSync(newCwd)) {
    currentCwd = newCwd
    return { success: true, cwd: currentCwd }
  }
  return { success: false, error: 'Папка не существует' }
})

ipcMain.handle('agent:pickCwd', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Выберите рабочую директорию проекта',
  })
  if (result.canceled || !result.filePaths[0]) return { canceled: true, cwd: currentCwd }
  currentCwd = result.filePaths[0]
  return { canceled: false, cwd: currentCwd }
})

// ─── App lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})
