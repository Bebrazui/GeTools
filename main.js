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

      await wc.debugger.sendCommand('Runtime.evaluate', {
        expression: `window.__geminiAgentPrompt = ${JSON.stringify(prompt)};\nwindow.__geminiAgentAppPath = ${JSON.stringify(__dirname)};\nwindow.__geminiAgentLogoUrl = ${JSON.stringify(logoUrl)};\n${script}\n${pluginScripts}`
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

// ─── Снапшоты файлов (чекпоинты) ────────────────────────────────────────────

// Управление окном
ipcMain.handle('window:minimize', () => mainWindow.minimize())

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

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})
