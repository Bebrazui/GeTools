const { app, BrowserWindow, BrowserView, ipcMain, dialog, shell, clipboard, screen, nativeImage, session } = require('electron')
const { exec, execFile } = require('child_process')
const path = require('path')
const fs = require('fs')

// ── Fresh mode: должен быть ДО любой инициализации app ──────────────────────
// npm run fresh передаёт --getools-fresh, мы переключаем userData на .fresh-run
// app.setPath обязан вызываться до app.whenReady(), иначе не работает
if (process.argv.includes('--getools-fresh')) {
  const freshDir = path.join(__dirname, '.fresh-run')
  // Чистим папку при каждом запуске — гарантируем чистое состояние
  try {
    if (fs.existsSync(freshDir)) {
      fs.rmSync(freshDir, { recursive: true, force: true })
    }
    fs.mkdirSync(freshDir, { recursive: true })
  } catch (e) {
    console.warn('[GeTools] Fresh mode: не удалось очистить .fresh-run:', e.message)
  }
  app.setPath('userData', freshDir)
  console.log('[GeTools] Fresh mode: userData =', freshDir)
}

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

// Папка для снапшотов и файл настроек — инициализируются после ready
let SNAPSHOTS_DIR = null
let SETTINGS_FILE = null

function loadSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return {}
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'))
  } catch (_) { return {} }
}

function saveSettings(data) {
  try {
    const current = loadSettings()
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ ...current, ...data }, null, 2), 'utf8')
  } catch (_) {}
}

function getLanguage() {
  const settings = loadSettings()
  const lang = settings.language
  if (lang === 'ru' || lang === 'en') return lang
  return null
}

function setLanguage(lang) {
  if (lang !== 'ru' && lang !== 'en') return
  saveSettings({ language: lang })
}

// ─── Темы ─────────────────────────────────────────────────────────────────────

const VALID_THEMES = ['deep-ocean', 'coffee', 'midnight', 'forest', 'aurora', 'light']

function getTheme() {
  const settings = loadSettings()
  const theme = settings.theme
  if (VALID_THEMES.includes(theme)) return theme
  return 'deep-ocean'
}

function setTheme(theme) {
  if (!VALID_THEMES.includes(theme)) return
  saveSettings({ theme })
}

// CSS для каждой темы — применяется через webContents.insertCSS в BrowserView Gemini
// Правило: красим только фоны контейнеров. НЕ трогаем border-radius, color на div/span.
// Поле ввода красим через внутренний div[contenteditable], не через обёртку.
const THEME_CSS = {
  'deep-ocean': `
    body, .mat-app-background, bard-sidenav, .conversation-container,
    chat-window, ms-chat-turn, .response-container,
    .side-navigation-panel, bard-sidenav-content, .sidenav-container {
      background-color: #0d1117 !important;
    }
    .mat-toolbar, .app-bar, header {
      background-color: #0d1117 !important;
      border-bottom: 1px solid #30363d !important;
    }
    ::-webkit-scrollbar-thumb { background: #30363d !important; }
  `,

  'coffee': `
    body, .mat-app-background, bard-sidenav, .conversation-container,
    chat-window, ms-chat-turn, .response-container {
      background-color: #1a1208 !important;
    }
    .side-navigation-panel, bard-sidenav-content, .sidenav-container {
      background-color: #120d05 !important;
    }
    .mat-toolbar, .app-bar, header {
      background-color: #120d05 !important;
      border-bottom: 1px solid #3d2b14 !important;
    }
    model-response p, model-response li,
    model-response h1, model-response h2, model-response h3, model-response h4,
    message-content p, message-content li { color: #e8d5b0 !important; }
    code, pre { background-color: #2a1f0f !important; color: #f0c070 !important; }
    ::-webkit-scrollbar-thumb { background: #5c3d1e !important; }
    ::selection { background: rgba(200,169,110,0.3) !important; }
  `,

  'midnight': `
    body, .mat-app-background, bard-sidenav, .conversation-container,
    chat-window, ms-chat-turn, .response-container {
      background-color: #000000 !important;
    }
    .side-navigation-panel, bard-sidenav-content, .sidenav-container {
      background-color: #050505 !important;
    }
    .mat-toolbar, .app-bar, header {
      background-color: #000000 !important;
      border-bottom: 1px solid #1a1a1a !important;
    }
    model-response p, model-response li,
    model-response h1, model-response h2, model-response h3, model-response h4,
    message-content p, message-content li { color: #e2e8f0 !important; }
    code, pre { background-color: #0f0f0f !important; color: #a78bfa !important; }
    ::-webkit-scrollbar-thumb { background: #2d2d2d !important; }
    ::selection { background: rgba(124,58,237,0.35) !important; }
  `,

  'forest': `
    body, .mat-app-background, bard-sidenav, .conversation-container,
    chat-window, ms-chat-turn, .response-container {
      background-color: #0d1f0d !important;
    }
    .side-navigation-panel, bard-sidenav-content, .sidenav-container {
      background-color: #081508 !important;
    }
    .mat-toolbar, .app-bar, header {
      background-color: #081508 !important;
      border-bottom: 1px solid #1a3a1a !important;
    }
    model-response p, model-response li,
    model-response h1, model-response h2, model-response h3, model-response h4,
    message-content p, message-content li { color: #d1fae5 !important; }
    code, pre { background-color: #0a1a0a !important; color: #86efac !important; }
    ::-webkit-scrollbar-thumb { background: #1a4a1a !important; }
    ::selection { background: rgba(34,197,94,0.3) !important; }
  `,

  'aurora': `
    body, .mat-app-background, bard-sidenav, .conversation-container,
    chat-window, ms-chat-turn, .response-container {
      background-color: #0f0e17 !important;
    }
    .side-navigation-panel, bard-sidenav-content, .sidenav-container {
      background-color: #0a0912 !important;
    }
    .mat-toolbar, .app-bar, header {
      background-color: #0a0912 !important;
      border-bottom: 1px solid #2d2b4e !important;
    }
    model-response p, model-response li,
    model-response h1, model-response h2, model-response h3, model-response h4,
    message-content p, message-content li { color: #fffffe !important; }
    code, pre { background-color: #16142a !important; color: #ff6b9d !important; }
    ::-webkit-scrollbar-thumb { background: #3d3a6e !important; }
    ::selection { background: rgba(199,125,255,0.3) !important; }
  `,

  'light': `
    body, .mat-app-background, bard-sidenav, .conversation-container,
    chat-window, ms-chat-turn, .response-container {
      background-color: #f8fafd !important;
    }
    .side-navigation-panel, bard-sidenav-content, .sidenav-container {
      background-color: #f0f4f9 !important;
    }
    .mat-toolbar, .app-bar, header {
      background-color: #ffffff !important;
      border-bottom: 1px solid #e0e0e0 !important;
    }
    model-response p, model-response li,
    model-response h1, model-response h2, model-response h3, model-response h4,
    message-content p, message-content li { color: #1f1f1f !important; }
    code, pre { background-color: #f0f4f9 !important; color: #0b57d0 !important; }
    ::-webkit-scrollbar-thumb { background: #c4c7c5 !important; }
    ::selection { background: rgba(11,87,208,0.2) !important; }
  `,
}

// Текущий cssKey для возможности удаления предыдущей темы
let currentThemeCssKey = null

async function applyThemeToGeminiView() {
  if (!geminiView) return
  const theme = getTheme()
  const css = THEME_CSS[theme]
  if (!css) return

  try {
    // Удаляем предыдущую тему если есть
    if (currentThemeCssKey) {
      try { await geminiView.webContents.removeInsertedCSS(currentThemeCssKey) } catch (_) {}
      currentThemeCssKey = null
    }
    currentThemeCssKey = await geminiView.webContents.insertCSS(css)
    console.log(`[Theme] Применена тема: ${theme}`)
  } catch (e) {
    console.error('[Theme] Ошибка применения темы:', e.message)
  }
}

function localizeAgentPrompt(prompt, lang) {
  if (lang === 'en') {
    return prompt
      .replace('Отвечай на русском языке.', 'Reply in English.')
      .replace('Отвечай на русском языке,', 'Reply in English,')
      .replace('На это служебное сообщение ответь только: `Понял`', 'Reply to this system message with only: `Understood`')
  }
  return prompt
}

function setupAcceptLanguageHeader(lang) {
  const headerValue = lang === 'en'
    ? 'en-US,en;q=0.9'
    : 'ru-RU,ru;q=0.9,en;q=0.8'

  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://gemini.google.com/*'] },
    (details, callback) => {
      details.requestHeaders['Accept-Language'] = headerValue
      callback({ requestHeaders: details.requestHeaders })
    }
  )
}

app.whenReady().then(() => {
  const userData = app.getPath('userData')
  SNAPSHOTS_DIR = path.join(userData, 'snapshots')
  SETTINGS_FILE = path.join(userData, 'settings.json')

  // Восстанавливаем cwd из прошлой сессии
  const settings = loadSettings()
  if (settings.cwd && fs.existsSync(settings.cwd)) {
    currentCwd = settings.cwd
    console.log('[Agent] Восстановлен cwd:', currentCwd)
  }

  // Устанавливаем Accept-Language и создаём окно
  const lang = getLanguage() || 'ru'
  setupAcceptLanguageHeader(lang)
  createWindow()
})

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
  const lang = getLanguage() || 'ru'
  mainWindow.loadFile(path.join(__dirname, 'pluginPage.html'), { query: { lang } })
}

let settingsWindow = null

function openSettingsWindow() {
  // Если окно уже открыто — фокусируем его
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: 520,
    height: 600,
    minWidth: 400,
    minHeight: 500,
    title: 'GeTools — Настройки',
    icon: path.join(__dirname, 'logo.ico'),
    backgroundColor: '#131314',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
    autoHideMenuBar: true,
    resizable: true,
    frame: false,
    show: false,
    parent: mainWindow,
  })

  settingsWindow.loadFile(path.join(__dirname, 'preferences.html'))

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show()
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
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

  // При первом запуске — экран настройки. Иначе — сплэш-лоадер.
  const _splashLang = getLanguage()
  if (_splashLang === null) {
    mainWindow.loadFile(path.join(__dirname, 'settings.html'))
  } else {
    mainWindow.loadFile(path.join(__dirname, 'splash.html'))
  }

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

  geminiView.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      const wc = geminiView.webContents
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
      // Загружаем активные плагины
      const pluginsDir = path.join(app.getPath('userData'), 'plugins')
      let pluginScripts = ''
      if (fs.existsSync(pluginsDir)) {
        const settings = loadSettings()
        const enabledPlugins = settings.enabledPlugins || []
        for (const pluginId of enabledPlugins) {
          const pluginDir = path.join(pluginsDir, pluginId)
          const manifestFile = path.join(pluginDir, 'plugin.json')
          if (!fs.existsSync(manifestFile)) continue
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
            if (manifest.inject) {
              const injectFile = path.join(pluginDir, manifest.inject)
              if (fs.existsSync(injectFile)) {
                const pluginCode = fs.readFileSync(injectFile, 'utf8')
                pluginScripts += `\n// ─── Plugin: ${manifest.name} ───\n;(function(){\n${pluginCode}\n})();\n`
              }
            }
          } catch (e) {
            console.warn(`[Agent] Ошибка загрузки плагина ${pluginId}:`, e.message)
          }
        }
      }

      const lang = getLanguage() || 'ru'
      const localizedPrompt = localizeAgentPrompt(prompt, lang)
      const isFreshMode = process.argv.includes('--getools-fresh')
      const isTestPrompts = process.argv.includes('--getools-reset-prompts')

      // В режиме test:prompts — сбрасываем doneKey ДО инжекции агента
      // чтобы агент стартовал уже с чистым состоянием
      if (isTestPrompts) {
        await wc.debugger.sendCommand('Runtime.evaluate', {
          expression: `
            (function() {
              const keys = Object.keys(localStorage).filter(k =>
                k.startsWith('getools_prompts_done:') ||
                k.startsWith('getools_prompts_added_count:') ||
                k === 'getools_setup_running_ts'
              )
              keys.forEach(k => localStorage.removeItem(k))
              sessionStorage.removeItem('getools_setup_running')
              console.log('[Agent] test:prompts — сброшено ключей:', keys.length)
            })()
          `
        })
        console.log('[Agent] test:prompts: localStorage промптов сброшен до инжекции')
      }

      await wc.debugger.sendCommand('Runtime.evaluate', {
        expression: `window.__geminiAgentPrompt = ${JSON.stringify(localizedPrompt)};\nwindow.__geminiAgentAppPath = ${JSON.stringify(__dirname)};\nwindow.__geminiAgentLogoUrl = ${JSON.stringify(logoUrl)};\nwindow.__geminiAgentLang = ${JSON.stringify(lang)};\nwindow.__geminiAgentFreshMode = ${JSON.stringify(isFreshMode)};\nwindow.__geminiAgentTheme = ${JSON.stringify(getTheme())};\n${script}\n${pluginScripts}`
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
    // Применяем тему после загрузки страницы
    applyThemeToGeminiView()
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

// ─── Снапшоты файлов (чекпоинты) ────────────────────────────────────────────

// Управление окном
ipcMain.handle('window:minimize', () => mainWindow.minimize())

// ─── Язык ────────────────────────────────────────────────────────────────────

ipcMain.handle('settings:getLanguage', () => ({ language: getLanguage() || 'ru' }))

ipcMain.handle('settings:setLanguage', async (event, { lang }) => {
  if (lang !== 'ru' && lang !== 'en') return { success: false, error: 'Invalid language' }
  setLanguage(lang)
  // Переустанавливаем Accept-Language заголовок и перезагружаем Gemini
  setupAcceptLanguageHeader(lang)
  if (geminiView) {
    geminiView.webContents.reload()
  }
  return { success: true }
})

// ─── Тема ─────────────────────────────────────────────────────────────────────

ipcMain.handle('settings:getTheme', () => ({ theme: getTheme() }))

ipcMain.handle('settings:setTheme', async (event, { theme }) => {
  if (!VALID_THEMES.includes(theme)) return { success: false, error: 'Invalid theme' }
  setTheme(theme)
  // Применяем немедленно через inject.js который уже в странице
  if (geminiView) {
    try {
      await geminiView.webContents.executeJavaScript(
        `window.__getoolsApplyTheme && window.__getoolsApplyTheme(${JSON.stringify(theme)})`
      )
    } catch (_) {}
    // Также обновляем через insertCSS как fallback
    await applyThemeToGeminiView()
  }
  return { success: true }
})

ipcMain.handle('app:openSettings', async () => {
  openSettingsWindow()
  return { success: true }
})

ipcMain.handle('settings:reset', async () => {
  // Сбрасываем язык и тему — следующий запуск покажет экран настроек заново
  try {
    saveSettings({ language: null, theme: null })
  } catch (_) {}
  return { success: true }
})

ipcMain.handle('agent:createSnapshot', async (event, { label }) => {
  try {
    const targetDir = currentCwd || __dirname
    const snapshotId = `snap_${Date.now()}`
    const snapshotDir = path.join(SNAPSHOTS_DIR, snapshotId)
    fs.mkdirSync(snapshotDir, { recursive: true })

    // Собираем все файлы в targetDir (не рекурсивно глубже 3 уровней, игнорируем node_modules/.git)
    const files = []
    function collectFiles(dir, depth = 0) {
      if (depth > 3) return
      let entries
      try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch (_) { return }
      for (const entry of entries) {
        if (['node_modules', '.git', '.svn', 'dist', 'build', '__pycache__'].includes(entry.name)) continue
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          collectFiles(fullPath, depth + 1)
        } else if (entry.isFile()) {
          try {
            const stat = fs.statSync(fullPath)
            if (stat.size > 2 * 1024 * 1024) continue // пропускаем файлы > 2MB
            const content = fs.readFileSync(fullPath, 'utf8')
            files.push({ path: fullPath, relativePath: path.relative(targetDir, fullPath), content })
          } catch (_) {}
        }
      }
    }
    collectFiles(targetDir)

    const meta = {
      id: snapshotId,
      label: label || `Снапшот ${new Date().toLocaleString('ru')}`,
      cwd: targetDir,
      ts: Date.now(),
      fileCount: files.length,
    }

    fs.writeFileSync(path.join(snapshotDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8')
    fs.writeFileSync(path.join(snapshotDir, 'files.json'), JSON.stringify(files, null, 2), 'utf8')

    console.log(`[Agent] Снапшот создан: ${snapshotId} (${files.length} файлов)`)
    return { success: true, snapshotId, fileCount: files.length, label: meta.label }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('agent:listSnapshots', async () => {
  try {
    if (!fs.existsSync(SNAPSHOTS_DIR)) return { success: true, snapshots: [] }
    const dirs = fs.readdirSync(SNAPSHOTS_DIR).filter(d => d.startsWith('snap_'))
    const snapshots = dirs.map(d => {
      try {
        const meta = JSON.parse(fs.readFileSync(path.join(SNAPSHOTS_DIR, d, 'meta.json'), 'utf8'))
        return meta
      } catch (_) { return null }
    }).filter(Boolean).sort((a, b) => b.ts - a.ts)
    return { success: true, snapshots }
  } catch (e) {
    return { success: false, error: e.message, snapshots: [] }
  }
})

ipcMain.handle('agent:restoreSnapshot', async (event, { snapshotId }) => {
  try {
    const snapshotDir = path.join(SNAPSHOTS_DIR, snapshotId)
    const files = JSON.parse(fs.readFileSync(path.join(snapshotDir, 'files.json'), 'utf8'))
    const meta = JSON.parse(fs.readFileSync(path.join(snapshotDir, 'meta.json'), 'utf8'))

    let restored = 0
    for (const file of files) {
      try {
        fs.mkdirSync(path.dirname(file.path), { recursive: true })
        fs.writeFileSync(file.path, file.content, 'utf8')
        restored++
      } catch (_) {}
    }

    console.log(`[Agent] Откат выполнен: ${restored}/${files.length} файлов восстановлено`)
    return { success: true, restored, total: files.length, label: meta.label }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('agent:deleteSnapshot', async (event, { snapshotId }) => {
  try {
    const snapshotDir = path.join(SNAPSHOTS_DIR, snapshotId)
    fs.rmSync(snapshotDir, { recursive: true, force: true })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})
ipcMain.handle('window:maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize()
  else mainWindow.maximize()
})
ipcMain.handle('window:close', () => mainWindow.close())

// ─── Плагины ─────────────────────────────────────────────────────────────────

const PLUGINS_DIR = path.join(app.getPath('userData'), 'plugins')

ipcMain.handle('agent:listPlugins', async () => {
  try {
    if (!fs.existsSync(PLUGINS_DIR)) return { success: true, plugins: [] }
    const settings = loadSettings()
    const enabled = new Set(settings.enabledPlugins || [])
    const dirs = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        try {
          const manifest = JSON.parse(fs.readFileSync(path.join(PLUGINS_DIR, d.name, 'plugin.json'), 'utf8'))
          return { ...manifest, id: d.name, enabled: enabled.has(d.name) }
        } catch (_) { return null }
      }).filter(Boolean)
    return { success: true, plugins: dirs }
  } catch (e) {
    return { success: false, error: e.message, plugins: [] }
  }
})

ipcMain.handle('agent:togglePlugin', async (event, { pluginId, enabled }) => {
  try {
    const settings = loadSettings()
    const list = new Set(settings.enabledPlugins || [])
    if (enabled) list.add(pluginId)
    else list.delete(pluginId)
    saveSettings({ enabledPlugins: [...list] })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('agent:installPlugin', async (event, { sourceDir }) => {
  try {
    const manifestFile = path.join(sourceDir, 'plugin.json')
    if (!fs.existsSync(manifestFile)) return { success: false, error: 'plugin.json не найден' }
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
    if (!manifest.id) return { success: false, error: 'Поле id обязательно в plugin.json' }

    const destDir = path.join(PLUGINS_DIR, manifest.id)
    fs.mkdirSync(destDir, { recursive: true })

    // Копируем все файлы плагина
    const entries = fs.readdirSync(sourceDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile()) {
        fs.copyFileSync(path.join(sourceDir, entry.name), path.join(destDir, entry.name))
      }
    }

    // Автоматически включаем
    const settings = loadSettings()
    const list = new Set(settings.enabledPlugins || [])
    list.add(manifest.id)
    saveSettings({ enabledPlugins: [...list] })

    return { success: true, plugin: { ...manifest, id: manifest.id, enabled: true } }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('agent:uninstallPlugin', async (event, { pluginId }) => {
  try {
    const pluginDir = path.join(PLUGINS_DIR, pluginId)
    if (fs.existsSync(pluginDir)) fs.rmSync(pluginDir, { recursive: true, force: true })
    const settings = loadSettings()
    const list = new Set(settings.enabledPlugins || [])
    list.delete(pluginId)
    saveSettings({ enabledPlugins: [...list] })
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('agent:installPluginFromZip', async (event, { bytes, filename }) => {
  const zlib = require('zlib')

  // Встроенный минимальный ZIP-парсер (без внешних зависимостей)
  function parseZip(buf) {
    const entries = []
    let i = 0
    while (i < buf.length - 4) {
      // Local file header signature: PK\x03\x04
      if (buf[i] !== 0x50 || buf[i+1] !== 0x4B || buf[i+2] !== 0x03 || buf[i+3] !== 0x04) {
        i++
        continue
      }
      const compression = buf.readUInt16LE(i + 8)
      const compressedSize = buf.readUInt32LE(i + 18)
      const uncompressedSize = buf.readUInt32LE(i + 22)
      const fileNameLen = buf.readUInt16LE(i + 26)
      const extraLen = buf.readUInt16LE(i + 28)
      const fileName = buf.slice(i + 30, i + 30 + fileNameLen).toString('utf8')
      const dataStart = i + 30 + fileNameLen + extraLen
      const compressedData = buf.slice(dataStart, dataStart + compressedSize)

      if (!fileName.endsWith('/')) {
        let data
        if (compression === 0) {
          data = compressedData
        } else if (compression === 8) {
          try { data = zlib.inflateRawSync(compressedData) } catch (_) { data = compressedData }
        } else {
          data = compressedData
        }
        entries.push({ name: fileName, data })
      }
      i = dataStart + compressedSize
    }
    return entries
  }

  try {
    const buf = Buffer.from(bytes)
    const entries = parseZip(buf)

    if (!entries.length) return { success: false, error: 'ZIP пустой или повреждён' }

    // Ищем plugin.json (может быть в корне или в подпапке)
    const manifestEntry = entries.find(e => e.name === 'plugin.json' || e.name.endsWith('/plugin.json'))
    if (!manifestEntry) return { success: false, error: 'plugin.json не найден в ZIP' }

    const manifest = JSON.parse(manifestEntry.data.toString('utf8'))
    if (!manifest.id) return { success: false, error: 'Поле id обязательно в plugin.json' }

    // Определяем базовый путь внутри ZIP (папка где лежит plugin.json)
    const manifestDir = manifestEntry.name.includes('/')
      ? manifestEntry.name.slice(0, manifestEntry.name.lastIndexOf('/') + 1)
      : ''

    const destDir = path.join(PLUGINS_DIR, manifest.id)
    fs.mkdirSync(destDir, { recursive: true })

    // Записываем все файлы из той же папки что и plugin.json
    for (const entry of entries) {
      if (!entry.name.startsWith(manifestDir)) continue
      const relName = entry.name.slice(manifestDir.length)
      if (!relName || relName.includes('/')) continue // только файлы из корня плагина
      const destFile = path.join(destDir, relName)
      fs.writeFileSync(destFile, entry.data)
    }

    // Автоматически включаем
    const settings = loadSettings()
    const list = new Set(settings.enabledPlugins || [])
    list.add(manifest.id)
    saveSettings({ enabledPlugins: [...list] })

    console.log(`[Agent] Плагин установлен из ZIP: ${manifest.id}`)
    return { success: true, plugin: { ...manifest, id: manifest.id, enabled: true } }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// ─── Рабочая директория ──────────────────────────────────────────────────────

ipcMain.handle('agent:getCwd', () => ({ cwd: currentCwd }))

ipcMain.handle('agent:setCwd', async (event, { cwd: newCwd }) => {
  if (newCwd && fs.existsSync(newCwd)) {
    currentCwd = newCwd
    saveSettings({ cwd: currentCwd })
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
  saveSettings({ cwd: currentCwd })
  return { canceled: false, cwd: currentCwd }
})

// ─── App lifecycle ───────────────────────────────────────────────────────────

app.on('window-all-closed', () => {
  app.quit()
})
