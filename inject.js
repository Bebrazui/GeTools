(function() {
  console.log('[Gemini Agent] Запуск...')

  if (window.__geminiAgentInjected) {
    console.log('[Gemini Agent] Уже запущен, повторная инъекция пропущена')
    return
  }
  window.__geminiAgentInjected = true

  // ─── Тема ────────────────────────────────────────────────────────────────────
  // Применяем тему через style-тег в document.head — работает после Angular init
  // Используем !important на конкретных элементах Gemini

  const THEME_STYLES = {
    'deep-ocean': {
      bg: '#0d1117', bg2: '#161b22', sidebar: '#0a0e14',
      text: '#c9d1d9', text2: '#8b949e', border: '#30363d',
      accent: '#1f6feb', accentText: '#ffffff',
    },
    'coffee': {
      bg: '#1a1208', bg2: '#241a0e', sidebar: '#120d05',
      text: '#e8d5b0', text2: '#a08060', border: '#3d2b14',
      accent: '#c8a96e', accentText: '#1a1208',
    },
    'midnight': {
      bg: '#000000', bg2: '#0a0a0a', sidebar: '#050505',
      text: '#e2e8f0', text2: '#64748b', border: '#1a1a1a',
      accent: '#7c3aed', accentText: '#ffffff',
    },
    'forest': {
      bg: '#0d1f0d', bg2: '#132613', sidebar: '#081508',
      text: '#d1fae5', text2: '#4ade80', border: '#1a3a1a',
      accent: '#16a34a', accentText: '#ffffff',
    },
    'aurora': {
      bg: '#0f0e17', bg2: '#1a1830', sidebar: '#0a0912',
      text: '#fffffe', text2: '#9d8ec7', border: '#2d2b4e',
      accent: '#c77dff', accentText: '#0f0e17',
    },
    'light': {
      bg: '#f8fafd', bg2: '#ffffff', sidebar: '#f0f4f9',
      text: '#1f1f1f', text2: '#5f6368', border: '#e0e0e0',
      accent: '#0b57d0', accentText: '#ffffff',
    },
  }

  function applyTheme(themeName) {
    const t = THEME_STYLES[themeName]
    if (!t) return

    const styleId = 'getools-theme-style'
    let el = document.getElementById(styleId)
    if (!el) {
      el = document.createElement('style')
      el.id = styleId
      document.head.appendChild(el)
    }

    el.textContent = `
      /* GeTools Theme: ${themeName} */

      /* ── Переопределяем ВСЕ цветовые CSS переменные Gemini на :root ──
         Gemini использует --mat-sys-*, --gem-sys-color-*, --mdc-*
         Переопределяя их здесь мы красим всё сразу без точечных селекторов */
      :root, html, body {
        /* Angular Material system tokens */
        --mat-sys-background: ${t.bg} !important;
        --mat-sys-surface: ${t.bg2} !important;
        --mat-sys-surface-bright: ${t.bg2} !important;
        --mat-sys-surface-dim: ${t.bg} !important;
        --mat-sys-surface-container: ${t.bg2} !important;
        --mat-sys-surface-container-low: ${t.bg} !important;
        --mat-sys-surface-container-lowest: ${t.bg} !important;
        --mat-sys-surface-container-high: ${t.bg2} !important;
        --mat-sys-surface-container-highest: ${t.bg2} !important;
        --mat-sys-surface-variant: ${t.bg2} !important;
        --mat-sys-inverse-surface: ${t.text} !important;
        --mat-sys-on-background: ${t.text} !important;
        --mat-sys-on-surface: ${t.text} !important;
        --mat-sys-on-surface-variant: ${t.text2} !important;
        --mat-sys-outline: ${t.border} !important;
        --mat-sys-outline-variant: ${t.border} !important;
        --mat-sys-primary: ${t.accent} !important;
        --mat-sys-on-primary: ${t.accentText} !important;
        --mat-sys-primary-container: ${t.bg2} !important;
        --mat-sys-on-primary-container: ${t.text} !important;
        --mat-sys-secondary-container: ${t.bg2} !important;
        --mat-sys-on-secondary-container: ${t.text} !important;
        --mat-sys-tertiary-container: ${t.bg2} !important;

        /* Sidenav */
        --mat-sidenav-container-background-color: ${t.sidebar} !important;
        --mat-sidenav-container-text-color: ${t.text} !important;
        --mat-sidenav-content-background-color: ${t.bg} !important;
        --mat-sidenav-scrim-color: rgba(0,0,0,0.6) !important;

        /* Toolbar */
        --mat-toolbar-container-background-color: ${t.bg} !important;
        --mat-toolbar-container-text-color: ${t.text} !important;

        /* MDC filled text field (поле ввода) */
        --mdc-filled-text-field-container-color: ${t.bg2} !important;
        --mdc-filled-text-field-disabled-container-color: ${t.bg2} !important;
        --mdc-filled-text-field-input-text-color: ${t.text} !important;
        --mdc-filled-text-field-label-text-color: ${t.text2} !important;
        --mdc-filled-text-field-placeholder-text-color: ${t.text2} !important;
        --mdc-filled-text-field-focus-active-indicator-color: ${t.accent} !important;
        --mdc-filled-text-field-active-indicator-color: ${t.border} !important;

        /* MDC outlined text field */
        --mdc-outlined-text-field-container-color: ${t.bg2} !important;
        --mdc-outlined-text-field-input-text-color: ${t.text} !important;
        --mdc-outlined-text-field-outline-color: ${t.border} !important;

        /* MDC list */
        --mdc-list-list-item-container-color: transparent !important;
        --mdc-list-list-item-label-text-color: ${t.text} !important;
        --mdc-list-list-item-supporting-text-color: ${t.text2} !important;

        /* MDC menu */
        --mdc-menu-container-color: ${t.bg2} !important;
        --mat-menu-container-color: ${t.bg2} !important;
        --mat-menu-item-label-text-color: ${t.text} !important;

        /* MDC chip */
        --mdc-chip-elevated-container-color: ${t.bg2} !important;
        --mdc-chip-label-text-color: ${t.text} !important;

        /* MDC card */
        --mdc-elevated-card-container-color: ${t.bg2} !important;
        --mdc-outlined-card-container-color: ${t.bg2} !important;

        /* MDC dialog */
        --mdc-dialog-container-color: ${t.bg2} !important;
        --mat-dialog-container-color: ${t.bg2} !important;

        /* MDC icon button */
        --mdc-icon-button-icon-color: ${t.text} !important;

        /* Gemini собственные токены (gem-sys) */
        --gem-sys-color--surface: ${t.bg} !important;
        --gem-sys-color--surface-container: ${t.bg2} !important;
        --gem-sys-color--surface-container-low: ${t.bg} !important;
        --gem-sys-color--surface-container-lowest: ${t.bg} !important;
        --gem-sys-color--surface-container-high: ${t.bg2} !important;
        --gem-sys-color--surface-container-highest: ${t.bg2} !important;
        --gem-sys-color--surface-variant: ${t.bg2} !important;
        --gem-sys-color--surface-bright: ${t.bg2} !important;
        --gem-sys-color--surface-dim: ${t.bg} !important;
        --gem-sys-color--on-surface: ${t.text} !important;
        --gem-sys-color--on-surface-variant: ${t.text2} !important;
        --gem-sys-color--background: ${t.bg} !important;
        --gem-sys-color--on-background: ${t.text} !important;
        --gem-sys-color--outline: ${t.border} !important;
        --gem-sys-color--outline-variant: ${t.border} !important;
        --gem-sys-color--primary: ${t.accent} !important;
        --gem-sys-color--on-primary: ${t.accentText} !important;
        --gem-sys-color--primary-container: ${t.bg2} !important;
        --gem-sys-color--on-primary-container: ${t.text} !important;
        --gem-sys-color--secondary-container: ${t.bg2} !important;
        --gem-sys-color--on-secondary-container: ${t.text} !important;

        /* Bard synthetic переменные — именно они управляют фоном чата */
        --bard-color-synthetic--chat-window-surface: ${t.bg} !important;
        --bard-color-synthetic--chat-window-surface-container: ${t.bg2} !important;
        --bard-color-synthetic--chat-window-surface-container-low: ${t.bg} !important;
        --bard-color-synthetic--chat-window-surface-container-high: ${t.bg2} !important;
        --bard-color-synthetic--chat-window-surface-container-highest: ${t.bg2} !important;
        --bard-color-synthetic--mat-card-background: ${t.bg2} !important;

        /* Bard color tokens */
        --bard-color-neutral-90: ${t.bg2} !important;
        --bard-color-neutral-95: ${t.bg} !important;
        --bard-color-neutral-96: ${t.bg} !important;
        --bard-color-footer-background: ${t.bg} !important;
        --bard-color-sidenav-background-desktop: ${t.sidebar} !important;
        --bard-color-sidenav-background-mobile: ${t.sidebar} !important;
        --bard-color-mode-switcher-container: ${t.bg2} !important;
        --bard-color-mode-switcher-slider: ${t.bg2} !important;
        --bard-color-surface-tint: ${t.accent} !important;
        --bard-color-surface-dim-tmp: ${t.bg} !important;
      }

      /* ── Fallback: прямые фоны для элементов которые игнорируют переменные ── */
      html, body, .mat-app-background, bard-app {
        background-color: ${t.bg} !important;
        color: ${t.text} !important;
      }

      /* ── Текст ответов ── */
      model-response p, model-response li,
      model-response h1, model-response h2, model-response h3, model-response h4,
      message-content p, message-content li {
        color: ${t.text} !important;
      }

      /* ── Код ── */
      code, pre {
        background-color: ${t.bg2} !important;
        color: ${t.text2} !important;
        border: 1px solid ${t.border} !important;
      }

      /* ── Кнопки быстрых действий ── */
      .card.card-zero-state, button.card-zero-state {
        background-color: ${t.bg2} !important;
        color: ${t.text} !important;
      }
      .card-zero-state .card-label { color: ${t.text} !important; }

      /* ── Скроллбар ── */
      ::-webkit-scrollbar-track { background: ${t.bg} !important; }
      ::-webkit-scrollbar-thumb { background: ${t.border} !important; border-radius: 4px !important; }
      ::-webkit-scrollbar-thumb:hover { background: ${t.text2} !important; }

      /* ── Выделение ── */
      ::selection { background: ${t.accent}44 !important; }
    `

    console.log(`[GeTools] Тема применена: ${themeName}`)

    // MutationObserver — красим новые элементы по мере появления
    // Особенно важно для Shadow DOM хостов которые Angular создаёт динамически
    if (window.__getoolsThemeObserver) {
      window.__getoolsThemeObserver.disconnect()
    }

    function paintElement(el) {
      if (!el || el.nodeType !== Node.ELEMENT_NODE) return
      const tag = el.tagName?.toLowerCase()
      // Красим только известные контейнеры Gemini
      const bgTags = ['bard-sidenav', 'chat-window', 'ms-chat-turn', 'model-response',
        'message-content', 'bard-app', 'conversation-container']
      if (bgTags.includes(tag)) {
        el.style.setProperty('background-color', t.bg, 'important')
      }
    }

    window.__getoolsThemeObserver = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          paintElement(node)
        }
      }
    })
    window.__getoolsThemeObserver.observe(document.body, { childList: true, subtree: true })
  }

  // Применяем тему при старте
  const INITIAL_THEME = window.__geminiAgentTheme || 'deep-ocean'
  // Ждём немного чтобы Angular успел инициализироваться
  setTimeout(() => applyTheme(INITIAL_THEME), 500)

  // Экспортируем для смены темы из IPC
  window.__getoolsApplyTheme = applyTheme
  const LANG = (window.__geminiAgentLang === 'en') ? 'en' : 'ru'

  const TRANSLATIONS = {
    ru: {
      // Карточки команд
      cardTerminalTitle: 'Запрос терминала',
      cardAllow: 'Разрешить',
      cardDeny: 'Отклонить',
      cardTrustPrefix: 'Всегда разрешать этот префикс',
      cardRunning: 'Выполняется...',
      cardDone: 'Выполнено',
      cardError: 'Ошибка',
      cardFileTitle: 'Запись файла',
      cardWrite: 'Записать',
      cardWriting: 'Записывается...',
      cardFileWritten: 'Файл записан',
      cardWriteError: 'Ошибка записи',
      // Блок раздумий
      thinkingTitle: 'Раздумия',
      thinkingTitleStreaming: 'Раздумия...',
      // Панель плагинов
      pluginPanelTitle: 'Плагины GeTools',
      pluginConnectByUrl: 'Подключить по ссылке',
      pluginConnect: 'Подключить',
      pluginUploadZip: 'Загрузить ZIP архив',
      pluginDropHint: 'Перетащите файл или нажмите для выбора',
      pluginInstalledSection: 'Установленные плагины',
      pluginPromptsSection: 'Системные промпты',
      pluginPromptsDesc: 'Настроить инструкции из prompts.txt',
      pluginLoading: 'Загрузка плагинов...',
      pluginNone: 'Плагины не установлены',
      pluginLoadError: 'Ошибка загрузки плагинов',
      pluginMenuLabel: 'Плагины GeTools',
      pluginApiUnavailable: 'API плагинов недоступен',
      pluginInstalled: (name) => `Плагин "${name}" установлен`,
      pluginInstallError: (err) => `Ошибка установки: ${err}`,
      pluginApiMissing: 'API установки плагинов недоступен',
      // Снапшоты и рабочая директория
      rollbackBtn: 'Откатить изменения',
      rollbackNoSnapshot: 'Нет снапшота',
      openProjectBtn: 'Открыть проект',
      // Экран настройки промптов
      setupTitle: 'Настройка системных промптов...',
      setupSubtitle: 'Обычно занимает 1 минуту',
      setupDoneTitle: 'Готово!',
      setupDoneSubtitle: 'Системные промпты успешно добавлены',
      // Счётчик строк
      linesSuffix: ' стр.',
      // UltraThink заголовки
      ultraThinkAnalysis: '# Анализ',
      ultraThinkFinalAnswer: '## Финальный ответ',
      // SAVED_INFO_PROMPT языковая инструкция
      savedInfoLangInstruction: 'Reply in Russian unless the user asks otherwise.',
      // Статус агента
      agentOn: 'ВКЛ',
      agentOff: 'ВЫКЛ',
      agentLabel: 'Агент',
      // Промпты
      promptsTitle: 'Системные промпты',
      promptsDesc: 'Настроить инструкции из prompts.txt',
      promptsResetConfirm: 'Добавить системные промпты GeTools заново?',
      promptsResetDetail: 'Промпты будут добавлены в "Персональный контекст" Gemini. Это займёт около 1 минуты.',
    },
    en: {
      cardTerminalTitle: 'Terminal request',
      cardAllow: 'Allow',
      cardDeny: 'Deny',
      cardTrustPrefix: 'Always allow this prefix',
      cardRunning: 'Running...',
      cardDone: 'Done',
      cardError: 'Error',
      cardFileTitle: 'Write file',
      cardWrite: 'Write',
      cardWriting: 'Writing...',
      cardFileWritten: 'File written',
      cardWriteError: 'Write error',
      thinkingTitle: 'Thinking',
      thinkingTitleStreaming: 'Thinking...',
      pluginPanelTitle: 'GeTools Plugins',
      pluginConnectByUrl: 'Connect by URL',
      pluginConnect: 'Connect',
      pluginUploadZip: 'Upload ZIP archive',
      pluginDropHint: 'Drag a file or click to select',
      pluginInstalledSection: 'Installed plugins',
      pluginPromptsSection: 'System prompts',
      pluginPromptsDesc: 'Configure instructions from prompts.txt',
      pluginLoading: 'Loading plugins...',
      pluginNone: 'No plugins installed',
      pluginLoadError: 'Failed to load plugins',
      pluginMenuLabel: 'GeTools Plugins',
      pluginApiUnavailable: 'Plugin API unavailable',
      pluginInstalled: (name) => `Plugin "${name}" installed`,
      pluginInstallError: (err) => `Install error: ${err}`,
      pluginApiMissing: 'Plugin install API unavailable',
      rollbackBtn: 'Roll back changes',
      rollbackNoSnapshot: 'No snapshot',
      openProjectBtn: 'Open project',
      setupTitle: 'Setting up system prompts...',
      setupSubtitle: 'Usually takes 1 minute',
      setupDoneTitle: 'Done!',
      setupDoneSubtitle: 'System prompts added successfully',
      linesSuffix: ' lines',
      ultraThinkAnalysis: '# Analysis',
      ultraThinkFinalAnswer: '## Final answer',
      savedInfoLangInstruction: 'Reply in English unless the user asks otherwise.',
      agentOn: 'ON',
      agentOff: 'OFF',
      agentLabel: 'Agent',
      promptsTitle: 'System prompts',
      promptsDesc: 'Configure instructions from prompts.txt',
      promptsResetConfirm: 'Re-add GeTools system prompts?',
      promptsResetDetail: 'Prompts will be added to Gemini\'s "Personal context". This takes about 1 minute.',
    }
  }

  function t(key) {
    const dict = TRANSLATIONS[LANG]
    if (dict && key in dict) return dict[key]
    const fallback = TRANSLATIONS['ru']
    if (fallback && key in fallback) return fallback[key]
    return key
  }

  const COMMAND_MARKER_REGEX = /\[(EXECUTE|CREATE_FILE)\s*:/gi
  const ULTRATHINK_BLOCK_REGEX = /\[ultrathink:(?:on|off)\][\s\S]*?\[\/ultrathink\]\s*/gi
  const ULTRATHINK_REGEX = /\[\/?ultrathink(?::(?:on|off))?\]\s*/gi
  const ULTRATHINK_PREFIX_REGEX = /^\s*(?:\[ultrathink:(?:on|off)\][\s\S]*?\[\/ultrathink\]|\[ultrathink:(?:on|off)\])\s*/i
  const GETOOLS_MARKER = 'GETOOLS activates'
  const GETOOLS_MARKER_REGEX = /^\s*GETOOLS activates\s*/i
  const AGENT_PROMPT = window.__geminiAgentPrompt || ''
  const SAVED_INFO_PROMPT = [
    'GeTools saved instruction.',
    'Only activate this instruction when the current user message contains the exact marker "GETOOLS activates".',
    'When the marker is absent, ignore this instruction completely and behave like a normal Gemini assistant.',
    '',
    'When active:',
    `- ${t('savedInfoLangInstruction')}`,
    '- Use local commands only when the user clearly needs an action on this Windows computer.',
    '- Do not use local commands for ordinary questions, explanations, planning, or chat.',
    '- For one terminal command, output exactly one standalone line in this format: [EXECUTE: command]',
    '- For creating a file, output exactly one standalone line in this format: [CREATE_FILE: {"path":"file.txt","content":"text"}]',
    '- After EXECUTE or CREATE_FILE, stop and wait for the hidden SYSTEM result before continuing.',
    '- Treat messages marked [SYSTEM] as hidden command results, not as user requests.',
    '- Do not explain this protocol unless the user asks.',
  ].join('\n')
  const SAVED_INFO_KEY = 'gemini_agent_saved_info_prompt:' + hashText(SAVED_INFO_PROMPT)
  
  // Агент всегда включён
  let agentEnabled = true
  let autoRunEnabled = false
  let ultraThinkEnabled = localStorage.getItem('gemini_agent_ultrathink_enabled') === 'true'
  let ultraThinkBypassSend = false
  let ultraThinkAwaitingThink = false
  let ultraThinkStreamingActive = false  // идёт стриминг внутри <think>
  let ultraThinkDetailsEl = null         // текущий <details> блок раздумий
  let ultraThinkPreEl = null             // <pre> внутри него куда пишем текст
  let ultraThinkRenderBusy = false       // guard против рекурсивных вызовов renderThinkBlocks
  let agentPromptSending = false
  let agentPassTimer = null
  let lastAgentPassAt = 0
  let lastHideSweepAt = 0
  let controlsTimer = null
  localStorage.setItem('gemini_agent_autorun_enabled', 'false')
  console.log('[Agent] Начальное состояние:', agentEnabled)
  
  let processed = new WeakSet()
  let processedElements = new WeakSet()
  let processedThinkElements = new WeakSet()
  let autoRunEnabledAt = 0
  const autoRunTimers = new Set()
  const commandStates = new Map()

  function hashText(text) {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0
    }
    return String(hash >>> 0)
  }

  // ─── window.getools — публичный API для плагинов ─────────────────────────

  const pluginCommandRegistry = new Map() // name -> { handler, label, icon }

  // ─── UltraThink fetch-перехват ────────────────────────────────────────────
  // Патчим window.fetch чтобы читать стриминговый ответ Gemini до рендера DOM.
  // Когда ultraThinkEnabled: накапливаем текст, детектируем маркеры # Анализ / ## Финальный ответ,
  // рендерим <details> сами — Gemini рендерит в скрытый элемент параллельно.

  let utFetchAccum = ''          // накопленный ТЕКСТ ответа (уже извлечённый)
  let utFetchRawAccum = ''       // накопленный сырой XHR для отладки
  let utFetchPhase = 'idle'      // idle | think | answer
  let utFetchDetailsEl = null    // наш <details> блок
  let utFetchPreEl = null        // <pre> внутри него
  let utFetchHiddenEl = null     // скрытый model-response Gemini
  let utFetchDone = false        // стрим завершён

  function utFindCurrentModelResponse() {
    // Сначала используем элемент отслеженный MutationObserver во время стриминга
    if (utCurrentStreamingEl && document.body.contains(utCurrentStreamingEl)) {
      return utCurrentStreamingEl
    }
    // Fallback: последний model-response в DOM
    const candidates = [
      ...document.querySelectorAll('model-response, message-content, .model-response-text, ms-chat-turn')
    ].filter(el => !el.closest('user-query, [class*="user-query"], .query-content'))
    return candidates[candidates.length - 1] || null
  }

  function utCreateDetailsBlock(anchor) {
    const details = document.createElement('details')
    details.className = 'gemini-agent-think'
    details.open = true

    const summary = document.createElement('summary')
    summary.textContent = t('thinkingTitleStreaming')

    const pre = document.createElement('pre')
    pre.textContent = ''
    pre.style.cssText = 'white-space:pre-wrap;word-break:break-word;'

    details.append(summary, pre)

    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(details, anchor)
    } else {
      document.body.appendChild(details)
    }

    return { details, pre }
  }

  function utFinalizeDetails() {
    if (!utFetchDetailsEl) return
    const summary = utFetchDetailsEl.querySelector('summary')
    if (summary) summary.textContent = t('thinkingTitle')
    utFetchDetailsEl.open = false
    utFetchDetailsEl = null
    utFetchPreEl = null
  }

  function utShowHiddenEl() {
    if (!utFetchHiddenEl) return
    utFetchHiddenEl.style.removeProperty('visibility')
    utFetchHiddenEl.style.removeProperty('height')
    utFetchHiddenEl.style.removeProperty('overflow')
    utFetchHiddenEl.style.removeProperty('pointer-events')
    utFetchHiddenEl = null
  }

  function utReset() {
    utFetchAccum = ''
    utFetchRawAccum = ''
    utFetchPhase = 'idle'
    utFinalizeDetails()
    utShowHiddenEl()
    utFetchDone = false
  }

  // Парсим накопленный текст из JSON-чанков Gemini (формат StreamGenerate)
  // Формат chunked transfer: "1537\r\n[["wrb.fr", null, "<JSON-строка>"]]\r\n"
  // Внутри JSON-строки: [null, [...], null, null, [["rc_id", ["текст чанка"], ...]]]
  function utExtractText(raw) {
    let result = ''
    try {
      // Убираем XSSI-префикс )]}'\n
      let cleaned = raw.replace(/^\s*\)\]\}'\s*/, '')

      // Убираем chunked transfer encoding числа (hex или decimal в начале строк)
      // Формат: "177\r\n<данные>\r\n" или просто числа на отдельных строках
      cleaned = cleaned.replace(/^[0-9a-f]+\r?\n/gim, '')

      // Ищем все вхождения wrb.fr с вложенной JSON-строкой
      const wrbRegex = /\["wrb\.fr",[^,]*,"((?:[^"\\]|\\.)*)"/g
      let m
      while ((m = wrbRegex.exec(cleaned)) !== null) {
        try {
          // Распарсиваем вложенную JSON-строку (двойной JSON.parse)
          const inner = JSON.parse('"' + m[1] + '"')
          const innerParsed = JSON.parse(inner)
          // Структура: [null, [...], null, null, [["rc_id", ["текст"], ...]]]
          const chunks = innerParsed?.[4]
          if (Array.isArray(chunks)) {
            for (const chunk of chunks) {
              const textArr = chunk?.[1]
              if (Array.isArray(textArr)) {
                result += textArr.join('')
              } else if (typeof textArr === 'string') {
                result += textArr
              }
            }
          }
        } catch (_) {}
      }
    } catch (_) {}
    return result
  }

  // Рекурсивно извлекает строки из вложенных массивов/объектов Gemini
  function utDeepExtractStrings(val, depth = 0) {
    if (depth > 8) return ''
    if (typeof val === 'string') {
      if (val.length < 3) return ''
      if (/^(wrb\.fr|BardChatUi|di\.|af\.|cfb2|_reqid|noop|generic)/i.test(val)) return ''
      if (/^[0-9a-f]{8,}$/i.test(val)) return ''
      return val
    }
    if (Array.isArray(val)) {
      return val.map(v => utDeepExtractStrings(v, depth + 1)).join('')
    }
    return ''
  }

  // Принимает сырой XHR-чанк, извлекает текст и передаёт в utProcessChunk
  function utProcessRawChunk(raw) {
    if (!ultraThinkEnabled || !ultraThinkAwaitingThink) return
    const text = utExtractText(raw)
    if (text) {
      console.log('[UT] extracted:', JSON.stringify(text.slice(0, 100)))
      utProcessChunk(text)
    }
  }

  function utProcessChunk(text) {
    if (!ultraThinkEnabled || !ultraThinkAwaitingThink) return

    utFetchAccum += text
    console.log('[UT] chunk, phase:', utFetchPhase, 'accum len:', utFetchAccum.length)
    // Ищем открывающий маркер
    if (utFetchPhase === 'idle') {
      const openMatch = utFetchAccum.match(/#+\s*(?:Анализ|Analysis)\b/i)
      if (!openMatch) return

      utFetchPhase = 'think'
      utFetchAccum = utFetchAccum.slice(openMatch.index + openMatch[0].length)

      // Скрываем текущий model-response Gemini
      const modelEl = utFindCurrentModelResponse()
      if (modelEl) {
        utFetchHiddenEl = modelEl
        modelEl.style.setProperty('visibility', 'hidden', 'important')
        modelEl.style.setProperty('height', '0', 'important')
        modelEl.style.setProperty('overflow', 'hidden', 'important')
        modelEl.style.setProperty('pointer-events', 'none', 'important')
      }

      // Создаём наш <details> блок
      const anchor = modelEl || null
      const { details, pre } = utCreateDetailsBlock(anchor)
      utFetchDetailsEl = details
      utFetchPreEl = pre
    }

    // Ищем закрывающий маркер
    if (utFetchPhase === 'think') {
      const closeMatch = utFetchAccum.match(/#+\s*(?:Финальный\s+ответ|Final\s+answer)\b/i)
      if (closeMatch) {
        // Всё до маркера — раздумия
        const thinkPart = utFetchAccum.slice(0, closeMatch.index).trim()
        if (utFetchPreEl) utFetchPreEl.textContent = thinkPart

        utFetchPhase = 'answer'
        utFetchAccum = utFetchAccum.slice(closeMatch.index + closeMatch[0].length)

        utFinalizeDetails()
        utShowHiddenEl()
        return
      }

      // Обновляем текст раздумий
      if (utFetchPreEl) {
        utFetchPreEl.textContent = utFetchAccum.trim()
      }
    }
  }

  // Патчим fetch
  const _originalFetch = window.fetch
  window.fetch = async function(...args) {
    const response = await _originalFetch.apply(this, args)

    // Перехватываем только стриминговые запросы к Gemini API
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '')
    const isGeminiStream = /\/_\/BardChatUi\/data\/|\/generate|StreamGenerate|batchexecute/i.test(url)

    if (!isGeminiStream || !ultraThinkEnabled || !ultraThinkAwaitingThink || !response.body) {
      return response
    }

    // Клонируем стрим: один для Gemini, один для нас
    const [forGemini, forUs] = response.body.tee()

    // Читаем наш клон асинхронно
    ;(async () => {
      const reader = forUs.getReader()
      const decoder = new TextDecoder()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            utFetchDone = true
            // Если фаза think и не нашли закрывающий маркер — финализируем как есть
            if (utFetchPhase === 'think') {
              utFinalizeDetails()
              utShowHiddenEl()
              utFetchPhase = 'idle'
            }
            break
          }
          const raw = decoder.decode(value, { stream: true })
          const text = utExtractText(raw)
          if (text) utProcessChunk(text)
        }
      } catch (_) {
        // При ошибке показываем оригинальный элемент
        utShowHiddenEl()
        utFinalizeDetails()
      } finally {
        reader.releaseLock()
      }
    })()

    return new Response(forGemini, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  }

  // XHR-перехват — Gemini использует batchexecute через XHR, не fetch
  const _OrigXHR = window.XMLHttpRequest
  function PatchedXHR() {
    const xhr = new _OrigXHR()
    const _open = xhr.open.bind(xhr)
    const _send = xhr.send.bind(xhr)
    let _url = ''
    let _isGeminiStream = false

    xhr.open = function(method, url, ...rest) {
      _url = url || ''
      _isGeminiStream = /batchexecute|StreamGenerate|generate/i.test(_url)
      return _open(method, url, ...rest)
    }

    xhr.send = function(body) {
      if (_isGeminiStream && ultraThinkEnabled && ultraThinkAwaitingThink) {
        let _lastLen = 0
        const _origOnReadyStateChange = xhr.onreadystatechange

        const processNewData = () => {
          if (!xhr.responseText) return
          const newRaw = xhr.responseText.slice(_lastLen)
          _lastLen = xhr.responseText.length
          if (!newRaw) return
          // Передаём сырой чанк напрямую — utProcessRawChunk сам извлечёт текст
          utProcessRawChunk(newRaw)
        }

        xhr.onreadystatechange = function(...args) {
          if (xhr.readyState >= 3) processNewData()
          if (_origOnReadyStateChange) _origOnReadyStateChange.apply(xhr, args)
        }

        xhr.addEventListener('progress', processNewData)
      }
      return _send(body)
    }

    return xhr
  }
  PatchedXHR.prototype = _OrigXHR.prototype
  window.XMLHttpRequest = PatchedXHR

  window.getools = {
    // Плагин регистрирует новую команду
    registerCommand(name, handler, options = {}) {
      const key = String(name).toUpperCase()
      pluginCommandRegistry.set(key, {
        handler,
        label: options.label || name,
        icon: options.icon || 'extension',
        description: options.description || '',
      })
      console.log(`[GeTools] Команда зарегистрирована: ${key}`)
    },

    // Утилиты для плагинов
    sendSystemMessage: (msg) => sendSystemMessage(msg),
    formatResult: (cmd, result) => formatSystemResult(cmd, result),
    createCard: (cmd) => createCard(cmd),
    get cwd() { return currentCwd },
    get electronAgent() { return window.electronAgent },
  }

  // ─── Инъекция CSS стилей ──────────────────────────────────────────────────

  const style = document.createElement('style')
  style.textContent = `
    .gemini-agent-card {
      margin: 16px 0;
      padding: 16px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 1px solid #0f3460;
      border-radius: 12px;
      max-width: 480px;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      display: block;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    .gemini-agent-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      color: #8ab4f8;
      font-size: 13px;
      font-weight: 600;
    }
    .gemini-agent-card-cmd {
      background: #0f3460;
      padding: 12px 14px;
      border-radius: 8px;
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 13px;
      color: #e3e3e3;
      word-break: break-all;
      margin-bottom: 14px;
      line-height: 1.4;
    }
    .gemini-agent-card-btns {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .gemini-agent-card-btn-deny {
      padding: 8px 16px;
      background: transparent;
      border: 1px solid #f28b82;
      color: #f28b82;
      border-radius: 18px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.15s;
    }
    .gemini-agent-card-btn-deny:hover {
      background: rgba(242, 139, 130, 0.1);
    }
    .gemini-agent-card-btn-run {
      padding: 8px 20px;
      background: #8ab4f8;
      color: #000;
      border: none;
      border-radius: 18px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.15s;
    }
    .gemini-agent-card-btn-run:hover {
      background: #aecbfa;
    }
    .gemini-agent-card-btn-run:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .gemini-agent-card-result {
      margin-top: 12px;
      padding: 12px;
      border-radius: 8px;
      font-family: 'Consolas', monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 200px;
      overflow: auto;
    }
    .gemini-agent-card-result.success {
      background: rgba(129, 201, 149, 0.15);
      color: #81c995;
    }
    .gemini-agent-card-result.error {
      background: rgba(242, 139, 130, 0.15);
      color: #f28b82;
    }
    .gemini-agent-status {
      position: fixed;
      bottom: 16px;
      right: 16px;
      padding: 10px 16px;
      background: rgba(26, 26, 46, 0.95);
      border-radius: 20px;
      color: #e3e3e3;
      font-size: 13px;
      font-family: 'Segoe UI', system-ui, sans-serif;
      cursor: pointer;
      z-index: 2147483647;
      user-select: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      border: 1px solid #0f3460;
      transition: border-color 0.2s;
    }
    .gemini-agent-status:hover {
      background: rgba(26, 26, 46, 1);
    }
    .gemini-agent-status.enabled {
      border-color: #81c995;
    }
    .gemini-agent-autorun,
    .gemini-agent-ultrathink {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 12px;
      margin: 0 6px;
      background: transparent;
      border-radius: 16px;
      color: #c4c7c5;
      font-size: 12px;
      font-family: 'Google Sans', 'Segoe UI', system-ui, sans-serif;
      font-weight: 500;
      cursor: pointer;
      user-select: none;
      border: 1px solid rgba(196, 199, 197, 0.45);
      vertical-align: middle;
      white-space: nowrap;
    }
    .gemini-agent-autorun:hover,
    .gemini-agent-ultrathink:hover {
      background: rgba(196, 199, 197, 0.12);
    }
    .gemini-agent-autorun.enabled {
      border-color: #81c995;
      color: #81c995;
      background: rgba(129, 201, 149, 0.12);
    }
    .gemini-agent-ultrathink.enabled {
      border-color: #c58af9;
      color: #c58af9;
      background: rgba(197, 138, 249, 0.12);
    }
    .gemini-agent-plugin-menu-item {
      width: 100% !important;
      min-height: 40px !important;
      padding: 0 16px !important;
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      border: 0 !important;
      border-radius: 8px !important;
      background: transparent !important;
      color: inherit !important;
      font: inherit !important;
      text-align: left !important;
      cursor: pointer !important;
    }
    .gemini-agent-plugin-menu-item:hover {
      background: rgba(196, 199, 197, 0.12) !important;
    }
    .gemini-agent-plugin-menu-item-icon {
      font-family: 'Material Symbols Outlined' !important;
      font-size: 20px !important;
      line-height: 1 !important;
      font-weight: normal !important;
      font-style: normal !important;
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24 !important;
    }
    .gemini-agent-think {
      margin: 10px 0;
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(128, 134, 139, 0.14);
      color: #5f6368;
      font-family: 'Google Sans', 'Segoe UI', system-ui, sans-serif;
      font-size: 13px;
      line-height: 1.45;
    }
    .gemini-agent-think summary {
      cursor: pointer;
      user-select: none;
      font-weight: 600;
    }
    .gemini-agent-think pre {
      margin: 10px 0 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: 'Consolas', monospace;
      font-size: 12px;
    }
    [data-gemini-agent-hidden-system="true"] {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      pointer-events: none !important;
    }
    [data-gemini-agent-hidden-system="true"] .mat-mdc-button-touch-target,
    [data-gemini-agent-hidden-system="true"] button {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
    body[data-gemini-agent-silent-send="true"] rich-textarea,
    body[data-gemini-agent-silent-send="true"] bard-text-input,
    body[data-gemini-agent-silent-send="true"] [contenteditable="true"][role="textbox"],
    body[data-gemini-agent-silent-send="true"] textarea {
      opacity: 0 !important;
      visibility: hidden !important;
      color: transparent !important;
      caret-color: transparent !important;
      pointer-events: none !important;
    }
  `
  document.head.appendChild(style)

  function cleanCommand(cmd) {
    return cmd
      .replace(/```(?:powershell|pwsh|cmd|bat|shell)?/gi, '')
      .replace(/```/g, '')
      .replace(/^\s*(?:PowerShell|CMD)\s*$/gim, '')
      .trim()
  }

  function commandKey(cmd) {
    return cleanCommand(cmd).replace(/\s+/g, ' ').toLowerCase()
  }

  function isLikelyRealCommand(cmd, sourceText) {
    const value = cleanCommand(cmd)
    if (!value) return false
    if (/^(команда|command|cmd|ваша команда|your command|\.{3}|реальная_команда|real_command)$/i.test(value)) return false

    return true
  }

  function findCommandMarkerEnd(text, fromIndex) {
    for (let i = fromIndex; i < text.length; i++) {
      if (text[i] !== ']') continue
      const rest = text.slice(i + 1)
      if (/^\s*(?:$|\r?\n)/.test(rest)) return i
    }

    return -1
  }

  function parseAgentActions(text) {
    const value = String(text || '')
    const actions = []

    // Строим динамический regex: встроенные + зарегистрированные плагинами команды
    const pluginNames = [...pluginCommandRegistry.keys()]
    const allCommands = ['EXECUTE', 'CREATE_FILE', ...pluginNames]
    const dynamicRegex = new RegExp(
      `\\[(${allCommands.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s*:`,
      'gi'
    )

    let match
    while ((match = dynamicRegex.exec(value)) !== null) {
      const type = match[1].toUpperCase()
      const payloadStart = dynamicRegex.lastIndex
      const end = findCommandMarkerEnd(value, payloadStart)
      if (end === -1) continue

      const payload = value.slice(payloadStart, end).trim()
      const fullMatch = value.slice(match.index, end + 1)
      actions.push({ type, payload, fullMatch })
      dynamicRegex.lastIndex = end + 1
    }

    return actions
  }

  function parseCreateFilePayload(payload) {
    const value = String(payload || '').trim()
    if (!value) return null

    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        const [filePath, content] = parsed
        if (filePath && content != null) return { filePath: String(filePath), content: String(content) }
      } else if (parsed && typeof parsed === 'object') {
        const filePath = parsed.path || parsed.filePath || parsed.filename || parsed.name
        const content = parsed.content ?? parsed.text ?? parsed.body ?? ''
        if (filePath) return { filePath: String(filePath), content: String(content) }
      }
    } catch (_) {}

    const lineMatch = value.match(/^([^\r\n]+)\r?\n([\s\S]*)$/)
    if (lineMatch) {
      return { filePath: lineMatch[1].trim(), content: lineMatch[2] }
    }

    return null
  }

  function clearAutoRunTimers() {
    autoRunTimers.forEach(timer => clearTimeout(timer))
    autoRunTimers.clear()
  }

  function setImportant(el, styles) {
    Object.entries(styles).forEach(([key, value]) => {
      el.style.setProperty(key, value, 'important')
    })
  }

  function findInsertionTarget(textNode) {
    let el = textNode.parentElement
    while (el && el !== document.body) {
      const tag = el.tagName.toLowerCase()
      if (['p', 'li', 'pre', 'code'].includes(tag)) return el
      if (el.matches('message-content, model-response, .markdown')) return el
      el = el.parentElement
    }
    return textNode.parentElement
  }

  // Найти ближайший предок который находится в основном документе (не в Shadow DOM)
  function findDocumentAnchor(el) {
    let node = el
    while (node) {
      if (document.body.contains(node)) return node
      // Вышли за пределы shadow root — берём host
      const root = node.getRootNode()
      if (root instanceof ShadowRoot) {
        node = root.host
      } else {
        break
      }
    }
    return null
  }

  function insertAfter(target, node) {
    if (!target || !target.parentNode) return false
    target.parentNode.insertBefore(node, target.nextSibling)
    return true
  }

  // Вставить карточку после target, поднявшись до основного документа если нужно
  function insertCardAfter(target, card) {
    if (!target) return false

    // Если target уже в основном документе — вставляем рядом
    if (document.body.contains(target) && target.parentNode) {
      target.parentNode.insertBefore(card, target.nextSibling)
      return true
    }

    // target внутри Shadow DOM — поднимаемся до host-элемента в основном документе
    let node = target
    while (node) {
      const root = node.getRootNode()
      if (root === document) {
        // node в основном документе
        if (node.parentNode) {
          node.parentNode.insertBefore(card, node.nextSibling)
          return true
        }
        break
      }
      if (root instanceof ShadowRoot) {
        node = root.host
      } else {
        break
      }
    }

    return false
  }

  function truncateText(text, maxLength = 12000) {
    const value = String(text || '')
    if (value.length <= maxLength) return value
    return value.slice(0, maxLength) + `\n\n[...output truncated, ${value.length - maxLength} chars omitted]`
  }

  function formatSystemResult(cmd, result) {
    const stdout = truncateText(result.stdout || '')
    const stderr = truncateText(result.stderr || result.error || '')
    const parts = [
      '[SYSTEM]',
      'Результат выполнения локальной команды.',
      `Команда: ${cmd}`,
      `Рабочая директория: ${result.cwd || currentCwd || 'не задана'}`,
      `Статус: ${result.success ? 'success' : 'error'}`,
    ]

    if (result.timedOut) parts.push('⚠️ Команда прервана по таймауту')
    if (stdout) parts.push(`STDOUT:\n${stdout}`)
    if (stderr) parts.push(`STDERR:\n${stderr}`)
    if (!stdout && !stderr) parts.push('Вывод: OK')

    parts.push('Используй этот результат как скрытый служебный контекст и продолжи ответ пользователю без упоминания маркера [SYSTEM].')
    return parts.join('\n\n')
  }

  function formatCreateFileResult(filePath, result) {
    return formatSystemResult(`CREATE_FILE ${filePath}`, {
      success: result.success,
      stdout: result.success ? `File written: ${filePath}` : '',
      stderr: result.error || '',
      error: result.error || null,
    })
  }

  function findSystemMessageTarget(node) {
    const parent = node.nodeType === Node.TEXT_NODE ? node.parentElement : node
    if (!parent) return null
    if (parent.closest('[contenteditable="true"], textarea, input, .gemini-agent-host, #gemini-agent-status')) return null

    const queryContent = parent.closest('.query-content')
    if (queryContent) return queryContent

    const queryTurn = parent.closest('user-query, [class*="user-query"]')
    if (queryTurn) return queryTurn

    const bubble = parent.closest('.user-query-bubble-with-background')
    if (bubble) return bubble

    return parent.closest([
      'user-query',
      '[class*="query-bubble"]',
      '[data-test-id*="query"]',
      '[data-testid*="query"]',
      '.query-text',
    ].join(', ')) || parent
  }

  function hideElement(target) {
    target.setAttribute('data-gemini-agent-hidden-system', 'true')
    setImportant(target, {
      display: 'none',
      visibility: 'hidden',
      height: '0',
      'min-height': '0',
      margin: '0',
      padding: '0',
      overflow: 'hidden',
      'pointer-events': 'none',
    })
  }

  function hideSystemMessages() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false)
    const targets = new Set()
    let node

    while ((node = walker.nextNode())) {
      const text = node.textContent || ''
      if (GETOOLS_MARKER_REGEX.test(text)) {
        const owner = node.parentElement
        if (owner && owner.closest('[contenteditable="true"], textarea, input')) continue

        node.textContent = text.replace(GETOOLS_MARKER_REGEX, '')

        if (owner && !owner.textContent.trim() && owner.matches('p, li, pre, code, .query-text-line')) {
          hideElement(owner)
        }
        continue
      }
      if (!text.includes('[SYSTEM]')) continue

      const target = findSystemMessageTarget(node)
      if (target) targets.add(target)
    }

    targets.forEach(hideElement)
  }

  function hideSystemMessagesBurst(duration = 5000) {
    const startedAt = Date.now()
    hideSystemMessages()

    const timer = setInterval(() => {
      hideSystemMessages()
      if (Date.now() - startedAt >= duration) clearInterval(timer)
    }, 150)
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  function getInputShell(input) {
    return input.closest('rich-textarea, bard-text-input, .ql-editor, [role="textbox"]')
      || input.parentElement
      || input
  }

  function maskInput(input) {
    const shell = getInputShell(input)
    const previous = {
      opacity: shell.style.opacity,
      visibility: shell.style.visibility,
      color: shell.style.color,
      caretColor: shell.style.caretColor,
      pointerEvents: shell.style.pointerEvents,
    }

    document.body.setAttribute('data-gemini-agent-silent-send', 'true')
    shell.style.setProperty('opacity', '0', 'important')
    shell.style.setProperty('visibility', 'hidden', 'important')
    shell.style.setProperty('color', 'transparent', 'important')
    shell.style.setProperty('caret-color', 'transparent', 'important')
    shell.style.setProperty('pointer-events', 'none', 'important')

    return () => {
      document.body.removeAttribute('data-gemini-agent-silent-send')
      shell.style.opacity = previous.opacity
      shell.style.visibility = previous.visibility
      shell.style.color = previous.color
      shell.style.caretColor = previous.caretColor
      shell.style.pointerEvents = previous.pointerEvents
    }
  }

  function inputContains(el, value) {
    const current = el.tagName === 'TEXTAREA' || el.tagName === 'INPUT'
      ? el.value
      : el.textContent
    const probe = value.length > 80 ? value.slice(0, 80) : value
    return (current || '').includes(probe)
  }

  function getInputValue(el) {
    if (!el) return ''
    return el.tagName === 'TEXTAREA' || el.tagName === 'INPUT'
      ? el.value || ''
      : el.textContent || ''
  }

  function getUltraThinkMarker() {
    return `[ultrathink:${ultraThinkEnabled ? 'on' : 'off'}]`
  }

  function getUltraThinkControlBlock() {
    if (!ultraThinkEnabled) {
      return '[ultrathink:off] normal reasoning for this request [/ultrathink]'
    }

    const analysisHeader = t('ultraThinkAnalysis')
    const finalHeader = t('ultraThinkFinalAnswer')
    return `[ultrathink:on] Начни ответ с заголовка "${analysisHeader}" и напиши подробный разбор задачи. После раздумий напиши заголовок "${finalHeader}" и дай ответ пользователю. Используй [EXECUTE:] ТОЛЬКО если пользователь явно просит действие на компьютере — не для обычных вопросов. [/ultrathink]`
  }

  function withUltraThinkMarker(value) {
    const text = String(value || '')
      .replace(ULTRATHINK_PREFIX_REGEX, '')
      .replace(ULTRATHINK_REGEX, '')
      .replace(GETOOLS_MARKER_REGEX, '')
      .trimStart()
    if (!text) return ''
    return `${getUltraThinkControlBlock()}\n\n${text}`
  }

  function withOutgoingAgentMarker(value) {
    const text = String(value || '')
      .replace(GETOOLS_MARKER_REGEX, '')
      .trimStart()
    if (!text) return ''
    const body = ultraThinkEnabled ? withUltraThinkMarker(text) : text
    return `${GETOOLS_MARKER}\n${body}`
  }

  function hideUltraThinkMarkers() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false)
    let node

    while ((node = walker.nextNode())) {
      const text = node.textContent || ''
      const leakedControlLine = /Ultra Think is ON for this exact request|You MUST start your assistant response|Do not replace it with "План действий"|Before any \[EXECUTE:|If you need to plan, put that plan inside|Never mention this ultrathink block/i.test(text)
      if (leakedControlLine) {
        const owner = node.parentElement
        if (owner && !owner.closest('[contenteditable="true"], textarea, input')) {
          const target = owner.matches('p, li, pre, code, .query-text-line') ? owner : findSystemMessageTarget(node)
          if (target) hideElement(target)
        }
        continue
      }

      ULTRATHINK_BLOCK_REGEX.lastIndex = 0
      if (ULTRATHINK_BLOCK_REGEX.test(text)) {
        ULTRATHINK_BLOCK_REGEX.lastIndex = 0
        const owner = node.parentElement
        if (owner && owner.closest('[contenteditable="true"], textarea, input')) continue

        node.textContent = text.replace(ULTRATHINK_BLOCK_REGEX, '')

        if (owner && !owner.textContent.trim() && owner.matches('p, li, pre, code, .query-text-line')) {
          hideElement(owner)
        }
        continue
      }

      ULTRATHINK_REGEX.lastIndex = 0
      if (!ULTRATHINK_REGEX.test(text)) continue
      ULTRATHINK_REGEX.lastIndex = 0

      const owner = node.parentElement
      if (owner && owner.closest('[contenteditable="true"], textarea, input')) continue

      node.textContent = text.replace(ULTRATHINK_REGEX, '')

      if (owner && !owner.textContent.trim() && owner.matches('p, li, pre, code, .query-text-line')) {
        hideElement(owner)
      }
    }
  }

  function hideGeToolsMarkers() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false)
    let node

    while ((node = walker.nextNode())) {
      const text = node.textContent || ''
      if (!GETOOLS_MARKER_REGEX.test(text)) continue

      const owner = node.parentElement
      if (owner && owner.closest('[contenteditable="true"], textarea, input')) continue

      node.textContent = text.replace(GETOOLS_MARKER_REGEX, '')

      if (owner && !owner.textContent.trim() && owner.matches('p, li, pre, code, .query-text-line')) {
        hideElement(owner)
      }
    }
  }

  // Скрывает ultrathink-блок из отображаемых сообщений пользователя.
  // Gemini рендерит сообщение пользователя как набор параграфов — ищем параграфы
  // содержащие [ultrathink:on] или [/ultrathink] и скрываем их.
  function hideUltraThinkFromUserMessages() {
    const userMessages = document.querySelectorAll(
      'user-query, [class*="user-query"], .user-query-bubble-with-background, .query-content'
    )
    userMessages.forEach(msg => {
      if (msg.dataset.getoolsUltraHidden) return
      const fullText = msg.textContent || ''
      if (!/\[ultrathink:/i.test(fullText)) return

      // Скрываем отдельные параграфы/строки содержащие маркеры
      const paras = msg.querySelectorAll('p, li, pre, code, .query-text-line, span, div')
      let inUltraBlock = false
      paras.forEach(p => {
        const t = p.textContent || ''
        if (/\[ultrathink:on\]/i.test(t)) {
          inUltraBlock = true
          hideElement(p)
          return
        }
        if (/\[\/ultrathink\]/i.test(t)) {
          inUltraBlock = false
          hideElement(p)
          return
        }
        if (inUltraBlock) hideElement(p)
      })
      msg.dataset.getoolsUltraHidden = '1'
    })
  }

  function hideUltraThinkMarkersBurst(duration = 5000) {
    const startedAt = Date.now()
    hideGeToolsMarkers()
    hideUltraThinkMarkers()
    hideUltraThinkFromUserMessages()

    const timer = setInterval(() => {
      hideGeToolsMarkers()
      hideUltraThinkMarkers()
      hideUltraThinkFromUserMessages()
      if (Date.now() - startedAt >= duration) clearInterval(timer)
    }, 150)
  }

  function createThinkDetails(text) {
    const details = document.createElement('details')
    details.className = 'gemini-agent-think'

    const summary = document.createElement('summary')
    summary.textContent = t('thinkingTitle')

    const pre = document.createElement('pre')
    pre.textContent = text.trim()

    details.append(summary, pre)
    return details
  }

  // Создаёт пустой стриминговый блок раздумий и возвращает { details, pre }
  function createStreamingThinkBlock(anchorEl) {
    const details = document.createElement('details')
    details.className = 'gemini-agent-think'
    details.open = true  // раскрыт пока идёт стриминг

    const summary = document.createElement('summary')
    summary.textContent = t('thinkingTitleStreaming')

    const pre = document.createElement('pre')
    pre.textContent = ''

    details.append(summary, pre)

    if (anchorEl && anchorEl.parentNode) {
      anchorEl.parentNode.insertBefore(details, anchorEl)
    } else {
      // Вставляем в последний контейнер ответа
      const containers = document.querySelectorAll('model-response, message-content, .model-response-text')
      const last = containers[containers.length - 1]
      if (last) last.prepend(details)
      else document.body.appendChild(details)
    }

    return { details, pre }
  }

  function finalizeStreamingThinkBlock() {
    if (!ultraThinkDetailsEl) return
    const summary = ultraThinkDetailsEl.querySelector('summary')
    if (summary) summary.textContent = t('thinkingTitle')
    ultraThinkDetailsEl.open = false
    ultraThinkDetailsEl = null
    ultraThinkPreEl = null
    ultraThinkStreamingActive = false
    ultraThinkAwaitingThink = false
  }

  function isThinkCandidateElement(el) {
    return !!el
      && el.nodeType === Node.ELEMENT_NODE
      && el.matches('p, li, pre, code, .query-text-line')
      && !el.closest('[contenteditable="true"], textarea, input, .gemini-agent-host, .gemini-agent-think')
      && !el.hasAttribute('data-gemini-agent-hidden-system')
  }

  function collectSiblingReasoningBeforeExecute(executeEl) {
    const parent = executeEl?.parentNode
    if (!parent) return false

    const collected = []
    let node = executeEl.previousSibling

    while (node && collected.length < 50) {
      const previous = node.previousSibling
      const text = node.textContent?.trim() || ''

      if (node.nodeType === Node.ELEMENT_NODE && node.matches?.('.gemini-agent-think, .gemini-agent-host')) break
      if (/^\[SYSTEM\]/.test(text) || /\[ultrathink:(?:on|off)\]/i.test(text)) break

      if (text) {
        if (node.nodeType === Node.ELEMENT_NODE && !isThinkCandidateElement(node)) break
        collected.unshift(node)
      }

      node = previous
    }

    const reasoning = collected
      .map(node => node.textContent?.trim())
      .filter(Boolean)
      .join('\n\n')

    if (!reasoning || reasoning.length < 12) return false

    parent.insertBefore(createThinkDetails(reasoning), collected[0] || executeEl)
    collected.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        processedThinkElements.add(node)
        hideElement(node)
      } else {
        node.textContent = ''
      }
    })
    ultraThinkAwaitingThink = false
    return true
  }

  function looksLikeReasoningText(text) {
    const value = String(text || '').trim()
    if (value.length < 12) return false
    if (/\[EXECUTE:\s*[^\]\r\n]+\]/i.test(value)) return false
    return /^(?:План|План действий|Анализ|Разбор|Раздумия|Рассуждение|Ход мыслей|Сначала|Нужно понять|Надо понять|Я думаю|Для начала|Проверю|Действия|Шаги|Plan|Analysis|Reasoning|Thoughts|First|I need to|I should)\b\s*:?/i.test(value)
      || /(?:сначала нужно|для начала нужно|нужно понять|надо проверить|логично начать|минимально необходим|дальнейшие шаги)/i.test(value)
  }

  function collectInlineReasoningFrom(el) {
    const parent = el?.parentNode
    if (!parent || !looksLikeReasoningText(el.textContent || '')) return false

    const collected = [el]
    let node = el.nextSibling

    while (node && collected.length < 200) {
      const text = node.textContent?.trim() || ''
      if (!text) {
        node = node.nextSibling
        continue
      }

      if (node.nodeType === Node.ELEMENT_NODE && node.matches?.('.gemini-agent-think, .gemini-agent-host')) break
      if (/\[EXECUTE:\s*[^\]\r\n]+\]/i.test(text)) break
      if (/^\[SYSTEM\]/.test(text) || /\[ultrathink:(?:on|off)\]/i.test(text)) break
      if (node.nodeType === Node.ELEMENT_NODE && !isThinkCandidateElement(node)) break

      collected.push(node)
      node = node.nextSibling
    }

    const reasoning = collected
      .map(node => node.textContent?.trim())
      .filter(Boolean)
      .join('\n\n')

    if (!reasoning || reasoning.length < 12) return false

    parent.insertBefore(createThinkDetails(reasoning), collected[0])
    collected.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        processedThinkElements.add(node)
        hideElement(node)
      } else {
        node.textContent = ''
      }
    })
    ultraThinkAwaitingThink = false
    return true
  }

  // Собирает весь текст ответа модели в один блок раздумий
  // Используется когда ultraThinkAwaitingThink=true и ответ завершён без <think>
  function collectWholeResponseAsThink(responseContainer) {
    if (!responseContainer) return false

    const candidates = [...responseContainer.querySelectorAll('p, li, pre, code, .query-text-line')]
      .filter(el => {
        if (processedThinkElements.has(el)) return false
        if (el.closest('[contenteditable="true"], textarea, input, .gemini-agent-host, .gemini-agent-think')) return false
        if (el.hasAttribute('data-gemini-agent-hidden-system')) return false
        const text = el.textContent?.trim() || ''
        if (!text) return false
        if (/^\[SYSTEM\]/.test(text) || /\[ultrathink:(?:on|off)\]/i.test(text)) return false
        if (/\[EXECUTE:\s*[^\]\r\n]+\]/i.test(text)) return false
        return true
      })

    if (!candidates.length) return false

    const reasoning = candidates
      .map(el => el.textContent?.trim())
      .filter(Boolean)
      .join('\n\n')

    if (!reasoning || reasoning.length < 20) return false

    // Вставляем блок раздумий перед первым элементом
    const first = candidates[0]
    if (first.parentNode) {
      first.parentNode.insertBefore(createThinkDetails(reasoning), first)
    }
    candidates.forEach(el => {
      processedThinkElements.add(el)
      hideElement(el)
    })
    ultraThinkAwaitingThink = false
    return true
  }

  function renderThinkBlocks() {
    if (!ultraThinkAwaitingThink) return

    // Не трогаем DOM пока Gemini ещё генерирует — он перерисовывает всё при каждом токене
    if (isGenerating()) return

    if (ultraThinkRenderBusy) return
    ultraThinkRenderBusy = true

    try {
      // Собираем все заголовки и параграфы, исключая сообщения пользователя
      const allEls = [...document.querySelectorAll('h1, h2, h3, h4, p, li, pre, code, .query-text-line')]
        .filter(el => {
          if (el.closest('[contenteditable="true"], textarea, input, .gemini-agent-host, .gemini-agent-think')) return false
          if (el.hasAttribute('data-gemini-agent-hidden-system')) return false
          if (processedThinkElements.has(el)) return false
          if (el.closest('user-query, [class*="user-query"], .user-query-bubble-with-background, .query-content')) return false
          return true
        })

      // Ищем открывающий маркер (# Анализ / # Analysis)
      const analysisText = t('ultraThinkAnalysis').replace(/^#+\s*/, '').trim()
      const openIdx = allEls.findIndex(el =>
        el.matches('h1, h2, h3, h4') && new RegExp(`^${analysisText}$`, 'i').test((el.textContent || '').trim())
      )
      if (openIdx === -1) {
        console.log('[UT] renderThinkBlocks: маркер не найден')
        return
      }

      // Маркер найден — сбрасываем флаг
      ultraThinkAwaitingThink = false

      // Ищем закрывающий маркер (## Финальный ответ / ## Final answer) после открывающего
      const finalText = t('ultraThinkFinalAnswer').replace(/^#+\s*/, '').trim()
      const closeIdx = allEls.findIndex((el, i) =>
        i > openIdx && el.matches('h1, h2, h3, h4') && new RegExp(`^${finalText}$`, 'i').test((el.textContent || '').trim())
      )

      // Элементы раздумий — всё между маркерами (или до конца если закрывающего нет)
      const thinkEls = closeIdx === -1
        ? allEls.slice(openIdx + 1)
        : allEls.slice(openIdx + 1, closeIdx)

      // Собираем текст раздумий
      const thinkText = thinkEls
        .map(el => (el.textContent || '').trim())
        .filter(Boolean)
        .join('\n\n')

      // Создаём блок раздумий и вставляем перед открывающим маркером
      const openEl = allEls[openIdx]
      const details = createThinkDetails(thinkText)
      if (openEl.parentNode) {
        openEl.parentNode.insertBefore(details, openEl)
      }

      // Скрываем открывающий маркер и все элементы раздумий
      processedThinkElements.add(openEl)
      hideElement(openEl)
      thinkEls.forEach(el => {
        processedThinkElements.add(el)
        hideElement(el)
      })

      // Скрываем закрывающий маркер если есть
      if (closeIdx !== -1) {
        const closeEl = allEls[closeIdx]
        processedThinkElements.add(closeEl)
        hideElement(closeEl)
      }

    } finally {
      ultraThinkRenderBusy = false
      ultraThinkStreamingActive = false
      ultraThinkDetailsEl = null
      ultraThinkPreEl = null
    }
  }

  async function sendSystemMessage(message) {
    return sendMessage(message, { hidden: true, retries: 6 })
  }

  // ─── Создание карточки ───────────────────────────────────────────────────

  function createCard(cmd) {
    const host = document.createElement('div')
    host.className = 'gemini-agent-host'
    host.setAttribute('data-gemini-cmd', cmd)
    setImportant(host, {
      display: 'block',
      margin: '16px 0',
      'max-width': '520px',
      'font-size': '16px',
      'line-height': 'normal',
      'white-space': 'normal',
    })

    const root = host.attachShadow({ mode: 'open' })
    const shadowStyle = document.createElement('style')
    shadowStyle.textContent = `
      :host {
        all: initial;
        display: block !important;
        margin: 16px 0 !important;
        max-width: 448px !important;
        font-family: "Google Sans", "Segoe UI", system-ui, -apple-system, sans-serif !important;
      }
      .card {
        box-sizing: border-box;
        display: block;
        width: 100%;
        padding: 24px;
        background: #ffffff;
        border: 0;
        border-radius: 24px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        color: #1f1f1f;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
        color: #444746;
        font-size: 16px;
        font-weight: 500;
      }
      .terminal {
        width: 20px;
        height: 20px;
        color: #0b57d0;
        flex: 0 0 auto;
      }
      .cmd {
        background: #f0f4f9;
        padding: 12px 16px;
        border-radius: 12px;
        font-family: "Cascadia Mono", "Consolas", monospace;
        font-size: 14px;
        color: #1f1f1f;
        word-break: break-word;
        white-space: pre-wrap;
        margin-bottom: 24px;
        line-height: 1.4;
      }
      .trust {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 32px;
        cursor: pointer;
        color: #444746;
        font-size: 14px;
      }
      .trust:hover {
        color: #1f1f1f;
      }
      .trust input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }
      .switch {
        position: relative;
        width: 40px;
        height: 24px;
        border-radius: 999px;
        background: #c4c7c5;
        transition: background 0.16s ease;
        flex: 0 0 auto;
      }
      .switch::after {
        content: "";
        position: absolute;
        left: 4px;
        top: 4px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #fff;
        transition: transform 0.16s ease;
      }
      .trust input:checked + .switch {
        background: #0b57d0;
      }
      .trust input:checked + .switch::after {
        transform: translateX(16px);
      }
      .btns {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        align-items: center;
      }
      button {
        font-family: "Google Sans", "Segoe UI", system-ui, -apple-system, sans-serif;
        font-size: 14px;
        font-weight: 500;
        border-radius: 999px;
        padding: 10px 20px;
        cursor: pointer;
        transition: background 0.16s ease, box-shadow 0.16s ease, transform 0.08s ease;
      }
      .deny {
        background: transparent;
        border: none;
        color: #0b57d0;
      }
      .deny:hover {
        background: #f1f3f4;
      }
      .run {
        background: #0b57d0;
        border: none;
        color: #fff;
        padding-inline: 24px;
      }
      .run:hover {
        box-shadow: 0 2px 6px rgba(60, 64, 67, 0.22);
      }
      .run:active {
        transform: scale(0.95);
      }
      .result {
        display: none;
        margin-top: 20px;
        padding: 14px 16px;
        border-radius: 12px;
        border: 1px solid rgba(138, 180, 248, 0.18);
        font-family: "Cascadia Mono", "Consolas", monospace;
        font-size: 12.5px;
        line-height: 1.45;
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 220px;
        overflow: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(138, 180, 248, 0.55) rgba(15, 23, 42, 0.45);
      }
      .result::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }
      .result::-webkit-scrollbar-track {
        background: rgba(15, 23, 42, 0.45);
        border-radius: 999px;
      }
      .result::-webkit-scrollbar-thumb {
        background: rgba(138, 180, 248, 0.58);
        border: 2px solid rgba(15, 23, 42, 0.85);
        border-radius: 999px;
      }
      .result::-webkit-scrollbar-thumb:hover {
        background: rgba(138, 180, 248, 0.78);
      }
      .success {
        display: block;
        background: #0f172a;
        color: #d7fbe8;
      }
      .error {
        display: block;
        background: #211316;
        border-color: rgba(242, 139, 130, 0.26);
        color: #ffd7d2;
      }
      .card.done .trust,
      .card.done .btns {
        display: none;
      }
      .card.done .cmd {
        margin-bottom: 0;
      }
      @media (prefers-color-scheme: dark) {
        .card {
          background: #1f1f1f;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
          color: #e3e3e3;
        }
        .header,
        .trust {
          color: #c4c7c5;
        }
        .trust:hover {
          color: #e3e3e3;
        }
        .cmd {
          background: #2b2c2f;
          color: #e3e3e3;
        }
        .switch {
          background: #5f6368;
        }
        .deny {
          color: #a8c7fa;
        }
        .deny:hover {
          background: rgba(232, 234, 237, 0.08);
        }
        .run {
          background: #a8c7fa;
          color: #062e6f;
        }
        .success {
          background: rgba(129, 201, 149, 0.18);
          color: #81c995;
        }
        .error {
          background: rgba(242, 139, 130, 0.16);
          color: #f28b82;
        }
      }
    `

    const card = document.createElement('div')
    card.className = 'card'

    const header = document.createElement('div')
    header.className = 'header'
    const terminalIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    terminalIcon.setAttribute('viewBox', '0 0 24 24')
    terminalIcon.setAttribute('fill', 'none')
    terminalIcon.setAttribute('stroke', 'currentColor')
    terminalIcon.setAttribute('stroke-width', '2')
    terminalIcon.setAttribute('stroke-linecap', 'round')
    terminalIcon.setAttribute('stroke-linejoin', 'round')
    terminalIcon.classList.add('terminal')

    const terminalPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    terminalPath.setAttribute('d', 'm4 17 6-6-6-6')
    const terminalLine = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    terminalLine.setAttribute('d', 'M12 19h8')
    terminalIcon.append(terminalPath, terminalLine)

    const headerText = document.createElement('span')
    headerText.textContent = t('cardTerminalTitle')
    header.append(terminalIcon, headerText)

    const codeBox = document.createElement('div')
    codeBox.className = 'cmd'

    const btns = document.createElement('div')
    btns.className = 'btns'

    const trustLabel = document.createElement('label')
    trustLabel.className = 'trust'

    const trustInput = document.createElement('input')
    trustInput.type = 'checkbox'

    const trustSwitch = document.createElement('span')
    trustSwitch.className = 'switch'

    const trustText = document.createElement('span')
    trustText.textContent = t('cardTrustPrefix')

    trustLabel.append(trustInput, trustSwitch, trustText)

    const btnDeny = document.createElement('button')
    btnDeny.type = 'button'
    btnDeny.className = 'deny'
    btnDeny.textContent = t('cardDeny')

    const btnRun = document.createElement('button')
    btnRun.type = 'button'
    btnRun.className = 'run'
    btnRun.textContent = t('cardAllow')

    const resultBox = document.createElement('div')
    resultBox.className = 'result'
    let executed = false
    const stateKey = commandKey(cmd)

    function renderCompleted(result) {
      executed = true
      const success = result.success
      headerText.textContent = success ? t('cardDone') : t('cardError')
      terminalIcon.style.color = success ? '#0b57d0' : '#b3261e'
      resultBox.className = 'result ' + (success ? 'success' : 'error')
      resultBox.textContent = success ? (result.stdout || 'OK') : (result.stderr || result.error || t('cardError'))
      card.classList.add('done')
      host.setAttribute('data-gemini-agent-card-state', success ? 'success' : 'error')
    }

    btns.append(btnDeny, btnRun)
    card.append(header, codeBox, trustLabel, btns, resultBox)
    root.append(shadowStyle, card)
    codeBox.textContent = cmd

    const existingState = commandStates.get(stateKey)
    if (existingState && existingState.status === 'completed') {
      renderCompleted(existingState.result)
    }

    btnDeny.onclick = (e) => { e.stopPropagation(); host.remove() }

    btnRun.onclick = async (e) => {
      e.stopPropagation()
      if (executed) return
      executed = true
      commandStates.set(stateKey, { status: 'running', result: null, updatedAt: Date.now() })
      host.setAttribute('data-gemini-agent-card-state', 'running')
      btnRun.disabled = true
      btnRun.textContent = t('cardRunning')

      try {
        const result = await window.electronAgent.exec(cmd, { cwd: currentCwd || undefined })

        saveCommandToHistory(cmd, result)
        commandStates.set(stateKey, { status: 'completed', result, updatedAt: Date.now() })
        renderCompleted(result)

        const sent = await sendSystemMessage(formatSystemResult(cmd, result))
        if (!sent) {
          console.warn('[Agent] Не удалось отправить SYSTEM-сообщение с результатом')
        }
      } catch(err) {
        const errorResult = {
          success: false,
          stdout: '',
          stderr: '',
          error: err.message,
        }
        commandStates.set(stateKey, { status: 'completed', result: errorResult, updatedAt: Date.now() })
        renderCompleted(errorResult)

        await sendSystemMessage(formatSystemResult(cmd, errorResult))
      }
    }

    if (!executed && autoRunEnabled && !ultraThinkAwaitingThink && Number(host.dataset.createdAt || 0) >= autoRunEnabledAt) {
      const timer = setTimeout(() => {
        autoRunTimers.delete(timer)
        if (autoRunEnabled && document.body.contains(host) && !executed) btnRun.click()
      }, 150)
      autoRunTimers.add(timer)
    }

    return host
  }

  // ─── Карточка для плагинных команд ──────────────────────────────────────

  function createPluginCommandCard(commandType, payload) {
    const reg = pluginCommandRegistry.get(commandType)
    if (!reg) return createCard(`${commandType}: ${payload}`)

    // Строим карточку аналогично createCard но с иконкой и лейблом плагина
    const host = document.createElement('div')
    host.className = 'gemini-agent-host'
    host.setAttribute('data-getools-plugin-cmd', commandType)
    setImportant(host, {
      display: 'block', margin: '16px 0', 'max-width': '520px',
      'font-size': '16px', 'line-height': 'normal', 'white-space': 'normal',
    })

    const root = host.attachShadow({ mode: 'open' })
    const shadowStyle = document.createElement('style')
    // Переиспользуем те же стили что у createCard
    shadowStyle.textContent = `
      :host { all:initial; display:block !important; margin:16px 0 !important; max-width:448px !important; font-family:"Google Sans","Segoe UI",system-ui,sans-serif !important; }
      .card { box-sizing:border-box; display:block; width:100%; padding:24px; background:#ffffff; border:0; border-radius:24px; box-shadow:0 1px 3px rgba(0,0,0,0.1); color:#1f1f1f; }
      .header { display:flex; align-items:center; gap:12px; margin-bottom:20px; color:#444746; font-size:16px; font-weight:500; }
      .plugin-icon { width:20px; height:20px; color:#0b57d0; flex:0 0 auto; }
      .cmd { background:#f0f4f9; padding:12px 16px; border-radius:12px; font-family:"Cascadia Mono","Consolas",monospace; font-size:14px; color:#1f1f1f; word-break:break-word; white-space:pre-wrap; margin-bottom:24px; line-height:1.4; }
      .btns { display:flex; gap:8px; justify-content:flex-end; align-items:center; }
      button { font-family:"Google Sans","Segoe UI",system-ui,sans-serif; font-size:14px; font-weight:500; border-radius:999px; padding:10px 20px; cursor:pointer; transition:background 0.16s ease,box-shadow 0.16s ease,transform 0.08s ease; border:none; }
      .deny { background:transparent; color:#0b57d0; }
      .deny:hover { background:#f1f3f4; }
      .run { background:#0b57d0; color:#fff; padding-inline:24px; }
      .run:hover { box-shadow:0 2px 6px rgba(60,64,67,0.22); }
      .run:active { transform:scale(0.95); }
      .run:disabled { opacity:0.6; cursor:not-allowed; }
      .result { display:none; margin-top:20px; padding:14px 16px; border-radius:12px; font-family:"Cascadia Mono","Consolas",monospace; font-size:12.5px; line-height:1.45; white-space:pre-wrap; word-break:break-word; max-height:220px; overflow:auto; }
      .success { display:block; background:rgba(129,201,149,0.18); color:#1e6e3a; }
      .error { display:block; background:rgba(242,139,130,0.16); color:#b3261e; }
      .card.done .btns { display:none; }
      @media (prefers-color-scheme:dark) {
        .card { background:#1f1f1f; color:#e3e3e3; }
        .header { color:#c4c7c5; }
        .cmd { background:#2b2c2f; color:#e3e3e3; }
        .deny { color:#a8c7fa; }
        .run { background:#a8c7fa; color:#062e6f; }
        .success { background:rgba(129,201,149,0.18); color:#81c995; }
        .error { background:rgba(242,139,130,0.16); color:#f28b82; }
      }
    `

    const card = document.createElement('div')
    card.className = 'card'

    const header = document.createElement('div')
    header.className = 'header'
    const iconEl = matIcon(reg.icon, 'font-size:20px;color:#0b57d0;')
    iconEl.classList.add('plugin-icon')
    const headerText = document.createElement('span')
    headerText.textContent = reg.label
    header.append(iconEl, headerText)

    const codeBox = document.createElement('div')
    codeBox.className = 'cmd'
    codeBox.textContent = payload

    const btns = document.createElement('div')
    btns.className = 'btns'
    const btnDeny = document.createElement('button')
    btnDeny.className = 'deny'
    btnDeny.textContent = t('cardDeny')
    const btnRun = document.createElement('button')
    btnRun.className = 'run'
    btnRun.textContent = t('cardAllow')
    const resultBox = document.createElement('div')
    resultBox.className = 'result'

    btns.append(btnDeny, btnRun)
    card.append(header, codeBox, btns, resultBox)
    root.append(shadowStyle, card)

    btnDeny.onclick = (e) => { e.stopPropagation(); host.remove() }

    let executed = false
    btnRun.onclick = async (e) => {
      e.stopPropagation()
      if (executed) return
      executed = true
      btnRun.disabled = true
      btnRun.textContent = t('cardRunning')
      host.setAttribute('data-gemini-agent-card-state', 'running')

      try {
        const result = await reg.handler(payload)
        const success = result?.success !== false
        headerText.textContent = success ? `${reg.label} — ${t('cardDone').toLowerCase()}` : `${reg.label} — ${t('cardError').toLowerCase()}`
        resultBox.className = 'result ' + (success ? 'success' : 'error')
        resultBox.textContent = result?.stdout || result?.output || (success ? 'OK' : result?.error || t('cardError'))
        card.classList.add('done')
        host.setAttribute('data-gemini-agent-card-state', success ? 'success' : 'error')

        await sendSystemMessage(formatSystemResult(`${commandType}: ${payload}`, {
          success,
          stdout: result?.stdout || result?.output || '',
          stderr: result?.error || '',
          cwd: currentCwd,
        }))
      } catch (err) {
        headerText.textContent = `${reg.label} — ошибка`
        resultBox.className = 'result error'
        resultBox.textContent = err.message
        card.classList.add('done')
        host.setAttribute('data-gemini-agent-card-state', 'error')
        await sendSystemMessage(formatSystemResult(`${commandType}: ${payload}`, {
          success: false, stdout: '', stderr: err.message, cwd: currentCwd,
        }))
      }
    }

    return host
  }

  function createFileCard(filePath, content) {
    const safePath = String(filePath || '').trim()
    const preview = String(content || '')

    const host = document.createElement('div')
    host.className = 'gemini-agent-host'
    host.setAttribute('data-gemini-agent-create-file', safePath)
    setImportant(host, {
      display: 'block',
      margin: '16px 0',
      'max-width': '520px',
      'font-size': '16px',
      'line-height': 'normal',
      'white-space': 'normal',
    })

    const root = host.attachShadow({ mode: 'open' })

    const shadowStyle = document.createElement('style')
    shadowStyle.textContent = `
      :host {
        all: initial;
        display: block !important;
        margin: 16px 0 !important;
        max-width: 448px !important;
        font-family: "Google Sans", "Segoe UI", system-ui, -apple-system, sans-serif !important;
      }
      .card {
        box-sizing: border-box;
        display: block;
        width: 100%;
        padding: 20px 24px;
        background: #ffffff;
        border: 0;
        border-radius: 24px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        color: #1f1f1f;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 16px;
        color: #444746;
        font-size: 15px;
        font-weight: 500;
      }
      .file-icon {
        width: 20px;
        height: 20px;
        color: #0b57d0;
        flex: 0 0 auto;
      }
      .path-row {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #f0f4f9;
        padding: 10px 14px;
        border-radius: 12px;
        margin-bottom: 20px;
        min-width: 0;
      }
      .path-icon {
        width: 16px;
        height: 16px;
        color: #5f6368;
        flex: 0 0 auto;
      }
      .path-text {
        font-family: "Cascadia Mono", "Consolas", monospace;
        font-size: 13px;
        color: #1f1f1f;
        word-break: break-all;
        flex: 1;
        min-width: 0;
      }
      .lines-badge {
        font-size: 11px;
        color: #5f6368;
        background: #e8eaed;
        border-radius: 8px;
        padding: 2px 8px;
        white-space: nowrap;
        flex: 0 0 auto;
      }
      .btns {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        align-items: center;
      }
      button {
        font-family: "Google Sans", "Segoe UI", system-ui, -apple-system, sans-serif;
        font-size: 14px;
        font-weight: 500;
        border-radius: 999px;
        padding: 10px 20px;
        cursor: pointer;
        transition: background 0.16s ease, box-shadow 0.16s ease, transform 0.08s ease;
        border: none;
      }
      .deny {
        background: transparent;
        color: #0b57d0;
      }
      .deny:hover { background: #f1f3f4; }
      .run {
        background: #0b57d0;
        color: #fff;
        padding-inline: 24px;
      }
      .run:hover { box-shadow: 0 2px 6px rgba(60,64,67,0.22); }
      .run:active { transform: scale(0.95); }
      .run:disabled { opacity: 0.6; cursor: not-allowed; }
      .result {
        display: none;
        margin-top: 16px;
        padding: 12px 14px;
        border-radius: 12px;
        font-family: "Cascadia Mono", "Consolas", monospace;
        font-size: 12.5px;
        line-height: 1.45;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .success { display: block; background: rgba(129,201,149,0.18); color: #1e6e3a; }
      .error   { display: block; background: rgba(242,139,130,0.16); color: #b3261e; }
      .card.done .btns { display: none; }
      @media (prefers-color-scheme: dark) {
        .card { background: #1f1f1f; box-shadow: 0 1px 3px rgba(0,0,0,0.45); color: #e3e3e3; }
        .header { color: #c4c7c5; }
        .path-row { background: #2b2c2f; }
        .path-text { color: #e3e3e3; }
        .lines-badge { background: #3c3f43; color: #9aa0a6; }
        .path-icon { color: #9aa0a6; }
        .deny { color: #a8c7fa; }
        .deny:hover { background: rgba(232,234,237,0.08); }
        .run { background: #a8c7fa; color: #062e6f; }
        .success { background: rgba(129,201,149,0.18); color: #81c995; }
        .error   { background: rgba(242,139,130,0.16); color: #f28b82; }
      }
    `

    const card = document.createElement('div')
    card.className = 'card'

    // Header
    const header = document.createElement('div')
    header.className = 'header'

    const fileIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    fileIcon.setAttribute('viewBox', '0 0 24 24')
    fileIcon.setAttribute('fill', 'none')
    fileIcon.setAttribute('stroke', 'currentColor')
    fileIcon.setAttribute('stroke-width', '2')
    fileIcon.setAttribute('stroke-linecap', 'round')
    fileIcon.setAttribute('stroke-linejoin', 'round')
    fileIcon.classList.add('file-icon')
    const fp1 = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    fp1.setAttribute('d', 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z')
    const fp2 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
    fp2.setAttribute('points', '14 2 14 8 20 8')
    fileIcon.append(fp1, fp2)

    const headerText = document.createElement('span')
    headerText.textContent = t('cardFileTitle')
    header.append(fileIcon, headerText)

    // Path row
    const pathRow = document.createElement('div')
    pathRow.className = 'path-row'

    const pathIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    pathIcon.setAttribute('viewBox', '0 0 24 24')
    pathIcon.setAttribute('fill', 'none')
    pathIcon.setAttribute('stroke', 'currentColor')
    pathIcon.setAttribute('stroke-width', '2')
    pathIcon.setAttribute('stroke-linecap', 'round')
    pathIcon.setAttribute('stroke-linejoin', 'round')
    pathIcon.classList.add('path-icon')
    const pi1 = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    pi1.setAttribute('d', 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z')
    pathIcon.append(pi1)

    const pathText = document.createElement('span')
    pathText.className = 'path-text'
    pathText.textContent = safePath

    const lineCount = preview.split('\n').length
    const linesBadge = document.createElement('span')
    linesBadge.className = 'lines-badge'
    linesBadge.textContent = `${lineCount} стр.`

    pathRow.append(pathIcon, pathText, linesBadge)

    // Buttons
    const btns = document.createElement('div')
    btns.className = 'btns'

    const btnDeny = document.createElement('button')
    btnDeny.type = 'button'
    btnDeny.className = 'deny'
    btnDeny.textContent = t('cardDeny')

    const btnRun = document.createElement('button')
    btnRun.type = 'button'
    btnRun.className = 'run'
    btnRun.textContent = t('cardWrite')

    const resultBox = document.createElement('div')
    resultBox.className = 'result'

    btns.append(btnDeny, btnRun)
    card.append(header, pathRow, btns, resultBox)
    root.append(shadowStyle, card)

    btnDeny.onclick = (e) => { e.stopPropagation(); host.remove() }

    let executed = false
    btnRun.onclick = async (e) => {
      e.stopPropagation()
      if (executed) return
      executed = true
      btnRun.disabled = true
      btnRun.textContent = t('cardWriting')
      host.setAttribute('data-gemini-agent-card-state', 'running')

      try {
        const result = await window.electronAgent.writeFile(safePath, preview)
        const success = result.success
        headerText.textContent = success ? t('cardFileWritten') : t('cardWriteError')
        resultBox.className = 'result ' + (success ? 'success' : 'error')
        resultBox.textContent = success ? `✓ ${safePath}` : (result.error || t('cardError'))
        card.classList.add('done')
        host.setAttribute('data-gemini-agent-card-state', success ? 'success' : 'error')
        await sendSystemMessage(formatCreateFileResult(safePath, result))
      } catch (err) {
        const result = { success: false, error: err.message }
        headerText.textContent = t('cardWriteError')
        resultBox.className = 'result error'
        resultBox.textContent = err.message
        card.classList.add('done')
        host.setAttribute('data-gemini-agent-card-state', 'error')
        await sendSystemMessage(formatCreateFileResult(safePath, result))
      }
    }

    return host
  }

  // ─── Сканирование ─────────────────────────────────────────────────────────

  function getExecuteElementCandidates() {
    return [...document.querySelectorAll([
      '.query-text-line',
      'p',
      'li',
      'pre',
      'code',
    ].join(', '))].filter(el => {
      if (processedElements.has(el)) return false
      if (el.closest('[data-gemini-agent-execute-processed="true"]')) return false
      if (el.closest('[contenteditable="true"], textarea, input, .gemini-agent-host, #gemini-agent-status')) return false
      const text = el.textContent || ''
      return text.includes('[EXECUTE:') || text.includes('[CREATE_FILE:')
    })
  }

  function processActionMatch(node, action) {
    const owner = node.nodeType === Node.TEXT_NODE ? node.parentElement : node
    if (owner && processedElements.has(owner)) return
    if (owner && owner.closest('[data-gemini-agent-execute-processed="true"]')) return

    if (node.nodeType === Node.TEXT_NODE) processed.add(node)
    if (owner) {
      processedElements.add(owner)
      owner.setAttribute('data-gemini-agent-execute-processed', 'true')
    }

    console.log('[Agent] Создаю карточку:', action.type, action.payload)
    if (!action.payload) return

    let card = null
    if (action.type === 'CREATE_FILE') {
      const file = parseCreateFilePayload(action.payload)
      if (!file) return
      // Автоснапшот перед первой записью файла в сессии
      autoSnapshotOnce()
      card = createFileCard(file.filePath, file.content)
    } else if (pluginCommandRegistry.has(action.type)) {
      // Плагинная команда — создаём карточку и выполняем через обработчик плагина
      card = createPluginCommandCard(action.type, action.payload)
    } else {
      const cmd = cleanCommand(action.payload)
      console.log('[Agent] EXECUTE cmd после cleanCommand:', JSON.stringify(cmd), '| isLikely:', isLikelyRealCommand(cmd, node.textContent || ''))
      if (!isLikelyRealCommand(cmd, node.textContent || '')) return
      card = createCard(cmd)
    }
    card.dataset.createdAt = String(Date.now())
    const target = node.nodeType === Node.TEXT_NODE ? findInsertionTarget(node) : node
    const inserted = insertCardAfter(target, card)

    setTimeout(() => {
      console.log('[Agent] Карточка в DOM:', document.body.contains(card), '| inserted:', inserted, '| target:', target?.tagName, '| target.isConnected:', target?.isConnected)
    }, 500)

    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent = node.textContent.replace(action.fullMatch, '')
    } else if (['P', 'LI', 'PRE', 'CODE'].includes(node.tagName) || node.classList.contains('query-text-line')) {
      node.textContent = node.textContent.replace(action.fullMatch, '')
    }
  }

  function markExistingExecuteBlocksProcessed() {
    const mark = (node) => {
      const owner = node.nodeType === Node.TEXT_NODE ? node.parentElement : node
      if (!owner) return
      processedElements.add(owner)
      owner.setAttribute('data-gemini-agent-execute-processed', 'true')
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false)
    let node
    while ((node = walker.nextNode())) {
      const text = node.textContent || ''
      if (text.includes('[EXECUTE:') || text.includes('[CREATE_FILE:')) {
        processed.add(node)
        mark(node)
      }
    }

    getExecuteElementCandidates().forEach(mark)
  }

  function scan() {
    if (!agentEnabled) return

    const matches = []
    getExecuteElementCandidates().forEach(el => {
      const text = el.textContent || ''
      parseAgentActions(text).forEach(action => matches.push({ node: el, action }))
    })

    if (matches.length > 0) {
      console.log('[Agent] Найдено команд:', matches.length)
    }

    matches.forEach(m => processActionMatch(m.node, m.action))
  }

  // ─── Замена аватара модели на логотип GeTools ────────────────────────────

  const LOGO_DATA_URL = window.__geminiAgentLogoUrl || ''

  function replaceModelAvatars() {
    document.querySelectorAll('.avatar_primary_model.is-gpi-avatar, .avatar_primary_model').forEach(el => {
      if (el.dataset.getoolsAvatar) return
      el.dataset.getoolsAvatar = '1'

      // Очищаем содержимое и вставляем логотип
      el.textContent = ''
      if (LOGO_DATA_URL) {
        const img = document.createElement('img')
        img.src = LOGO_DATA_URL
        img.style.cssText = 'width:100%;height:100%;object-fit:contain;border-radius:50%;'
        img.draggable = false
        el.appendChild(img)
      } else {
        // Fallback — текстовый логотип
        el.style.cssText += ';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#a8c7fa;background:#1a1a2e;border-radius:50%;'
        el.textContent = 'GT'
      }
    })
  }

  // ─── Наблюдатель ───────────────────────────────────────────────────────────

  function runAgentPass() {
    agentPassTimer = null
    if (!agentEnabled && !ultraThinkAwaitingThink) return

    lastAgentPassAt = Date.now()
    if (Date.now() - lastHideSweepAt > 2500) {
      lastHideSweepAt = Date.now()
      if (agentEnabled) hideSystemMessages()
      if (ultraThinkEnabled || ultraThinkAwaitingThink) {
        hideUltraThinkMarkers()
        hideUltraThinkFromUserMessages()
      }
    }
    // renderThinkBlocks вызывается только через waitForGenerationEnd после конца генерации
    scan()
    replaceModelAvatars()
    updateAgentObserver()
  }

  // Ждёт завершения генерации и запускает renderThinkBlocks
  let ultraThinkWaitTimer = null
  function waitForGenerationEnd() {
    if (ultraThinkWaitTimer) return
    ultraThinkWaitTimer = setInterval(() => {
      if (!ultraThinkAwaitingThink) {
        clearInterval(ultraThinkWaitTimer)
        ultraThinkWaitTimer = null
        return
      }
      if (!isGenerating()) {
        clearInterval(ultraThinkWaitTimer)
        ultraThinkWaitTimer = null
        // Небольшая задержка чтобы DOM успел устояться после конца генерации
        // Пробуем несколько раз с нарастающей задержкой если маркер не найден сразу
        let attempts = 0
        const tryRender = () => {
          if (!ultraThinkAwaitingThink) return // уже обработано
          renderThinkBlocks()
          attempts++
          if (ultraThinkAwaitingThink && attempts < 5) {
            setTimeout(tryRender, 300 * attempts)
          }
        }
        setTimeout(tryRender, 300)
      }
    }, 200)
  }

  function scheduleAgentPass(delay = 350) {
    if (!agentEnabled && !ultraThinkAwaitingThink) return
    if (agentPassTimer) return

    const elapsed = Date.now() - lastAgentPassAt
    const wait = Math.max(delay, 1200 - elapsed)

    agentPassTimer = setTimeout(() => {
      const run = () => runAgentPass()
      if (window.requestIdleCallback) {
        window.requestIdleCallback(run, { timeout: 1200 })
      } else {
        run()
      }
    }, wait)
  }

  // Текущий стриминговый элемент — обновляется MutationObserver во время генерации
  let utCurrentStreamingEl = null

  const observer = new MutationObserver((mutations) => {
    if (!agentEnabled && !ultraThinkAwaitingThink) return

    const relevant = mutations.some(m => {
      const target = m.target?.nodeType === Node.ELEMENT_NODE ? m.target : m.target?.parentElement
      if (target?.closest?.('.gemini-agent-host, .gemini-agent-think, #gemini-agent-status, #gemini-agent-autorun, #gemini-agent-ultrathink')) return false
      return m.addedNodes.length || m.type === 'characterData'
    })
    if (!relevant) return

    // Отслеживаем текущий стриминговый контейнер — последний элемент который получил новые узлы
    // и не является сообщением пользователя
    if (ultraThinkAwaitingThink) {
      for (const m of mutations) {
        if (!m.addedNodes.length) continue
        const target = m.target?.nodeType === Node.ELEMENT_NODE ? m.target : m.target?.parentElement
        if (!target) continue
        if (target.closest('user-query, [class*="user-query"], .query-content, .gemini-agent-host, .gemini-agent-think')) continue
        if (target.closest('[contenteditable="true"], textarea, input')) continue
        // Ищем ближайший крупный контейнер ответа
        const container = target.closest('model-response, message-content, .model-response-text, ms-chat-turn') || target
        if (container && container !== document.body) {
          utCurrentStreamingEl = container
        }
      }
    }

    scheduleAgentPass()
  })
  let observingAgentDom = false

  function updateAgentObserver() {
    const shouldObserve = agentEnabled || ultraThinkAwaitingThink
    if (shouldObserve && !observingAgentDom) {
      observer.observe(document.body, { childList: true, subtree: true, characterData: true })
      observingAgentDom = true
    } else if (!shouldObserve && observingAgentDom) {
      observer.disconnect()
      observingAgentDom = false
    }
  }

  updateAgentObserver()
  if (agentEnabled) scheduleAgentPass(0)
  setInterval(() => scheduleAgentPass(1000), 10000)

  // ─── Кнопка статуса ───────────────────────────────────────────────────────

  // ─── Оверлей плагинов ─────────────────────────────────────────────────────

  // Создаёт mat-icon элемент как это делает Gemini — работает с google-symbols шрифтом
  function matIcon(name, extraStyle) {
    const el = document.createElement('mat-icon')
    el.setAttribute('role', 'img')
    el.setAttribute('aria-hidden', 'true')
    el.setAttribute('data-mat-icon-type', 'font')
    el.setAttribute('data-mat-icon-name', name)
    el.setAttribute('fonticon', name)
    el.className = 'mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color'
    el.textContent = name
    if (extraStyle) el.style.cssText = extraStyle
    return el
  }

  // ─── Экран загрузки поверх Gemini ────────────────────────────────────────

  function showSetupScreen(title = 'Настройка...', subtitle = '') {
    let screen = document.getElementById('getools-setup-screen')
    if (!screen) {
      screen = document.createElement('div')
      screen.id = 'getools-setup-screen'
      setImportant(screen, {
        position: 'fixed', inset: '0', 'z-index': '2147483646',
        background: '#131314', display: 'flex', 'flex-direction': 'column',
        'align-items': 'center', 'justify-content': 'center',
        'font-family': "'Google Sans','Segoe UI',system-ui,sans-serif",
        transition: 'opacity 0.3s ease',
      })

      const logo = document.createElement('img')
      logo.src = window.__geminiAgentLogoUrl || ''
      logo.style.cssText = 'width:72px;height:72px;object-fit:contain;margin-bottom:32px;'
      logo.draggable = false

      const track = document.createElement('div')
      track.style.cssText = 'width:200px;height:3px;background:rgba(255,255,255,0.08);border-radius:999px;overflow:hidden;margin-bottom:28px;'
      const bar = document.createElement('div')
      bar.id = 'getools-setup-bar'
      bar.style.cssText = 'height:100%;width:40%;background:linear-gradient(90deg,#4285f4,#a8c7fa);border-radius:999px;animation:getools-slide-in 1.4s cubic-bezier(0.4,0,0.6,1) infinite;'
      track.appendChild(bar)

      const titleEl = document.createElement('div')
      titleEl.id = 'getools-setup-title'
      titleEl.style.cssText = 'font-size:16px;font-weight:500;color:#e3e3e3;margin-bottom:8px;'

      const subtitleEl = document.createElement('div')
      subtitleEl.id = 'getools-setup-subtitle'
      subtitleEl.style.cssText = 'font-size:13px;color:#9aa0a6;'

      screen.append(logo, track, titleEl, subtitleEl)
      document.body.appendChild(screen)
    }

    const titleEl = screen.querySelector('#getools-setup-title')
    const subtitleEl = screen.querySelector('#getools-setup-subtitle')
    if (titleEl) titleEl.textContent = title
    if (subtitleEl) subtitleEl.textContent = subtitle
    screen.style.setProperty('opacity', '1', 'important')
    screen.style.setProperty('display', 'flex', 'important')
    return screen
  }

  function hideSetupScreen() {
    const screen = document.getElementById('getools-setup-screen')
    if (!screen) return
    screen.style.opacity = '0'
    setTimeout(() => {
      screen.style.setProperty('display', 'none', 'important')
    }, 350)
  }

  function openPluginsOverlay() {
    if (document.getElementById('getools-plugins-overlay')) {
      document.getElementById('getools-plugins-overlay').style.setProperty('display', 'flex', 'important')
      return
    }

    // Backdrop
    const overlay = document.createElement('div')
    overlay.id = 'getools-plugins-overlay'
    setImportant(overlay, {
      position: 'fixed',
      inset: '0',
      'z-index': '2147483646',
      display: 'flex',
      'align-items': 'stretch',
      'justify-content': 'flex-end',
      background: 'rgba(0,0,0,0.45)',
      'backdrop-filter': 'blur(2px)',
    })

    // Drawer panel
    const panel = document.createElement('div')
    setImportant(panel, {
      width: '520px',
      'max-width': '100vw',
      height: '100%',
      background: '#1e1f20',
      'border-left': '1px solid #2d2f31',
      display: 'flex',
      'flex-direction': 'column',
      'overflow-y': 'auto',
      'font-family': "'Google Sans', 'Segoe UI', system-ui, sans-serif",
      color: '#e3e3e3',
      animation: 'getools-slide-in 0.22s cubic-bezier(0.4,0,0.2,1)',
    })

    // Inject keyframe animation
    if (!document.getElementById('getools-overlay-style')) {
      const s = document.createElement('style')
      s.id = 'getools-overlay-style'
      s.textContent = `
        @keyframes getools-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        #getools-plugins-overlay * { box-sizing: border-box; }
        .getools-plugin-card {
          background: #28292a;
          border-radius: 16px;
          padding: 16px;
          border: 1px solid #2d2f31;
          transition: border-color 0.15s;
        }
        .getools-plugin-card:hover { border-color: #444746; }
        .getools-switch { position:relative; width:40px; height:24px; flex-shrink:0; }
        .getools-switch input { opacity:0; width:0; height:0; position:absolute; }
        .getools-slider {
          position:absolute; inset:0;
          background:#444746; border-radius:999px;
          transition:background 0.2s; cursor:pointer;
        }
        .getools-slider::after {
          content:''; position:absolute;
          left:4px; top:4px; width:16px; height:16px;
          background:#fff; border-radius:50%;
          transition:transform 0.2s;
        }
        .getools-switch input:checked + .getools-slider { background:#a8c7fa; }
        .getools-switch input:checked + .getools-slider::after { transform:translateX(16px); background:#062e6f; }
        .getools-upload-zone {
          border: 2px dashed #444746; border-radius:16px;
          padding:24px; text-align:center; cursor:pointer;
          transition: border-color 0.15s, background 0.15s;
          display:flex; flex-direction:column; align-items:center; gap:8px;
        }
        .getools-upload-zone:hover { border-color:#a8c7fa; background:rgba(168,199,250,0.04); }
        .getools-input {
          background:#131314; border:1px solid #444746; border-radius:10px;
          color:#e3e3e3; padding:10px 14px; outline:none; font-size:14px;
          font-family:inherit; flex:1; min-width:0;
        }
        .getools-input:focus { border-color:#a8c7fa; box-shadow:0 0 0 1px #a8c7fa; }
        .getools-btn-primary {
          background:#a8c7fa; color:#062e6f; border:none;
          padding:10px 20px; border-radius:10px; font-weight:500;
          font-size:14px; cursor:pointer; white-space:nowrap;
          font-family:inherit; transition:opacity 0.15s;
        }
        .getools-btn-primary:hover { opacity:0.88; }
      `
      document.head.appendChild(s)
    }

    // ── Header ──
    const header = document.createElement('div')
    setImportant(header, {
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'space-between',
      padding: '20px 24px 16px',
      'border-bottom': '1px solid #2d2f31',
      'flex-shrink': '0',
    })

    const title = document.createElement('div')
    setImportant(title, { display: 'flex', 'align-items': 'center', gap: '10px' })

    const titleIcon = matIcon('extension', 'font-size:22px;color:#a8c7fa;')
    const titleText = document.createElement('span')
    titleText.textContent = t('pluginPanelTitle')
    titleText.style.cssText = 'font-size:18px;font-weight:500;'
    title.append(titleIcon, titleText)

    const closeBtn = document.createElement('button')
    closeBtn.style.cssText = 'background:none;border:none;color:#9aa0a6;cursor:pointer;padding:6px;border-radius:8px;display:flex;align-items:center;'
    closeBtn.append(matIcon('close', 'font-size:22px;'))
    closeBtn.onmouseenter = () => { closeBtn.style.color = '#e3e3e3'; closeBtn.style.background = '#333537' }
    closeBtn.onmouseleave = () => { closeBtn.style.color = '#9aa0a6'; closeBtn.style.background = 'none' }
    closeBtn.onclick = () => overlay.style.setProperty('display', 'none', 'important')

    header.append(title, closeBtn)

    // ── Body ──
    const body = document.createElement('div')
    setImportant(body, { padding: '24px', display: 'flex', 'flex-direction': 'column', gap: '24px', flex: '1' })

    // Add by URL
    const urlSection = document.createElement('div')
    setImportant(urlSection, { display: 'flex', 'flex-direction': 'column', gap: '10px' })

    const urlLabel = document.createElement('div')
    setImportant(urlLabel, { display: 'flex', 'align-items': 'center', gap: '8px', 'font-size': '14px', color: '#a8c7fa', 'font-weight': '500' })
    urlLabel.append(matIcon('link', 'font-size:18px;color:#a8c7fa;'))
    const urlLabelText = document.createElement('span')
    urlLabelText.textContent = t('pluginConnectByUrl')
    urlLabel.append(urlLabelText)

    const urlRow = document.createElement('div')
    setImportant(urlRow, { display: 'flex', gap: '10px' })
    const urlInput = document.createElement('input')
    urlInput.type = 'text'
    urlInput.placeholder = 'https://example.com/plugin.json'
    urlInput.className = 'getools-input'
    const urlBtn = document.createElement('button')
    urlBtn.className = 'getools-btn-primary'
    urlBtn.textContent = t('pluginConnect')
    urlRow.append(urlInput, urlBtn)
    urlSection.append(urlLabel, urlRow)

    // Upload zone
    const uploadZone = document.createElement('div')
    uploadZone.className = 'getools-upload-zone'
    uploadZone.append(
      matIcon('folder_zip', 'font-size:36px;color:#a8c7fa;'),
      Object.assign(document.createElement('p'), { textContent: t('pluginUploadZip'), style: { margin: '0', color: '#a8c7fa', fontWeight: '500', fontSize: '14px' } }),
      Object.assign(document.createElement('p'), { textContent: t('pluginDropHint'), style: { margin: '0', color: '#5f6368', fontSize: '12px' } })
    )
    uploadZone.onclick = () => {
      const inp = document.createElement('input')
      inp.type = 'file'; inp.accept = '.zip'
      inp.onchange = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        if (!window.electronAgent?.installPluginFromZip) {
          alert(t('pluginApiMissing'))
          return
        }
        // Читаем ZIP как ArrayBuffer и передаём в main process
        const buf = await file.arrayBuffer()
        const uint8 = new Uint8Array(buf)
        // Передаём как обычный массив (IPC сериализует)
        const result = await window.electronAgent.installPluginFromZip(Array.from(uint8), file.name)
        if (result.success) {
          alert(t('pluginInstalled')(result.plugin?.name || result.plugin?.id))
          // Обновляем список
          if (window.electronAgent?.listPlugins) {
            window.electronAgent.listPlugins().then(res => {
              while (pluginList.firstChild) pluginList.removeChild(pluginList.firstChild)
              if (!res.success || !res.plugins.length) {
                const empty = document.createElement('div')
                empty.textContent = t('pluginNone')
                empty.style.cssText = 'font-size:13px;color:#9aa0a6;padding:8px 0;'
                pluginList.append(empty)
                return
              }
              res.plugins.forEach(p => pluginList.append(renderPluginCard(p)))
            })
          }
          // Если плагин содержит промпт — запускаем процесс добавления в Saved Info
          if (result.plugin?.prompt) {
            overlay.style.setProperty('display', 'none', 'important')
            window.getools._rerunSetup?.()
          }
        } else {          alert(t('pluginInstallError')(result.error || 'unknown error'))
        }
      }
      inp.click()
    }

    // Divider
    const divider = document.createElement('div')
    setImportant(divider, { 'border-top': '1px solid #2d2f31' })

    // Installed plugins header
    const installedHeader = document.createElement('div')
    setImportant(installedHeader, { display: 'flex', 'align-items': 'center', 'justify-content': 'space-between' })
    const installedTitle = document.createElement('span')
    installedTitle.textContent = t('pluginInstalledSection')
    installedTitle.style.cssText = 'font-size:15px;font-weight:500;'
    installedHeader.append(installedTitle)

    // Кнопка настройки системных промптов
    const promptsSection = document.createElement('div')
    setImportant(promptsSection, {
      display: 'flex', 'align-items': 'center', 'justify-content': 'space-between',
      padding: '14px 16px', background: '#28292a', 'border-radius': '14px',
      border: '1px solid #2d2f31', cursor: 'pointer',
    })
    const promptsLeft = document.createElement('div')
    setImportant(promptsLeft, { display: 'flex', 'align-items': 'center', gap: '12px' })
    const promptsIcon = matIcon('psychology', 'font-size:20px;color:#a8c7fa;')
    const promptsInfo = document.createElement('div')
    const promptsTitle = document.createElement('div')
    promptsTitle.textContent = t('pluginPromptsSection')
    promptsTitle.style.cssText = 'font-size:14px;font-weight:500;'
    const promptsDesc = document.createElement('div')
    promptsDesc.textContent = t('pluginPromptsDesc')
    promptsDesc.style.cssText = 'font-size:12px;color:#9aa0a6;margin-top:2px;'
    promptsInfo.append(promptsTitle, promptsDesc)
    promptsLeft.append(promptsIcon, promptsInfo)
    const promptsArrow = matIcon('arrow_forward', 'font-size:18px;color:#9aa0a6;')
    promptsSection.append(promptsLeft, promptsArrow)
    promptsSection.onclick = async () => {
      const confirmed = await window.electronAgent.confirm(
        t('promptsResetConfirm'),
        t('promptsResetDetail')
      )
      if (!confirmed.allowed) return

      // Сбрасываем флаг "done" чтобы промпты добавились заново
      Object.keys(localStorage)
        .filter(k => k.startsWith('getools_prompts_done:') || k.startsWith('getools_prompts_added_count:'))
        .forEach(k => localStorage.removeItem(k))
      // Помечаем что это ручной запуск — игнорирует fresh-режим
      sessionStorage.setItem('getools_setup_force', '1')
      overlay.style.setProperty('display', 'none', 'important')
      showSetupScreen(t('setupTitle'), t('setupSubtitle'))
      setTimeout(() => {
        location.href = 'https://gemini.google.com/saved-info'
      }, 800)
    }
    promptsSection.onmouseenter = () => promptsSection.style.setProperty('border-color', '#444746', 'important')
    promptsSection.onmouseleave = () => promptsSection.style.setProperty('border-color', '#2d2f31', 'important')

    // Plugin list — реальные данные из main.js
    const pluginList = document.createElement('div')
    setImportant(pluginList, { display: 'flex', 'flex-direction': 'column', gap: '10px' })

    function renderPluginCard(p) {
      const card = document.createElement('div')
      card.className = 'getools-plugin-card'
      setImportant(card, { display: 'flex', 'align-items': 'center', gap: '14px' })

      const iconBox = document.createElement('div')
      setImportant(iconBox, {
        width: '44px', height: '44px', 'border-radius': '12px',
        display: 'flex', 'align-items': 'center', 'justify-content': 'center',
        background: '#4285f422', color: '#4285f4', 'flex-shrink': '0', overflow: 'hidden',
      })
      const ic = matIcon(p.icon || 'extension')
      ic.style.cssText = 'font-size:22px;line-height:1;display:block;color:inherit;'
      iconBox.append(ic)

      const info = document.createElement('div')
      setImportant(info, { flex: '1', 'min-width': '0' })
      const pName = document.createElement('div')
      pName.textContent = p.name || p.id
      pName.style.cssText = 'font-size:14px;font-weight:500;'
      const pDesc = document.createElement('div')
      pDesc.textContent = p.description || (p.commands ? `Команды: ${p.commands.join(', ')}` : '')
      pDesc.style.cssText = 'font-size:12px;color:#9aa0a6;margin-top:2px;'
      info.append(pName, pDesc)

      const sw = document.createElement('label')
      sw.className = 'getools-switch'
      const swInput = document.createElement('input')
      swInput.type = 'checkbox'
      swInput.checked = !!p.enabled
      const swSlider = document.createElement('span')
      swSlider.className = 'getools-slider'
      sw.append(swInput, swSlider)
      swInput.onchange = async () => {
        await window.electronAgent?.togglePlugin?.(p.id, swInput.checked)
      }

      card.append(iconBox, info, sw)
      return card
    }

    // Загружаем плагины асинхронно
    const loadingMsg = document.createElement('div')
    loadingMsg.textContent = t('pluginLoading')
    loadingMsg.style.cssText = 'font-size:13px;color:#9aa0a6;padding:8px 0;'
    pluginList.append(loadingMsg)

    if (window.electronAgent?.listPlugins) {
      window.electronAgent.listPlugins().then(res => {
        while (pluginList.firstChild) pluginList.removeChild(pluginList.firstChild)
        if (!res.success || !res.plugins.length) {
          const empty = document.createElement('div')
          empty.textContent = t('pluginNone')
          empty.style.cssText = 'font-size:13px;color:#9aa0a6;padding:8px 0;'
          pluginList.append(empty)
          return
        }
        res.plugins.forEach(p => pluginList.append(renderPluginCard(p)))
      }).catch(() => {
        loadingMsg.textContent = t('pluginLoadError')
      })
    } else {
      loadingMsg.textContent = t('pluginApiUnavailable')
    }

    body.append(urlSection, uploadZone, divider, promptsSection, installedHeader, pluginList)
    panel.append(header, body)
    overlay.append(panel)
    document.body.appendChild(overlay)

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.style.setProperty('display', 'none', 'important')
    })
  }

  function createButton() {
    if (document.getElementById('gemini-agent-status')) return

    const btn = document.createElement('div')
    btn.id = 'gemini-agent-status'
    btn.className = 'gemini-agent-status' + (agentEnabled ? ' enabled' : '')
    btn.textContent = (agentEnabled ? '● ' : '○ ') + t('agentLabel') + ' ' + (agentEnabled ? t('agentOn') : t('agentOff'))
    setImportant(btn, {
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      padding: '10px 16px',
      background: 'rgba(26, 26, 46, 0.95)',
      'border-radius': '20px',
      color: '#e3e3e3',
      'font-size': '13px',
      'font-family': "'Segoe UI', system-ui, sans-serif",
      cursor: 'pointer',
      'z-index': '2147483647',
      'user-select': 'none',
      'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.3)',
      border: agentEnabled ? '1px solid #81c995' : '1px solid #0f3460',
    })

    btn.onclick = () => {
      agentEnabled = !agentEnabled
      localStorage.setItem('gemini_agent_enabled', agentEnabled)
      console.log('[Agent] Переключён:', agentEnabled)
      btn.className = 'gemini-agent-status' + (agentEnabled ? ' enabled' : '')
      btn.style.border = agentEnabled ? '1px solid #81c995' : '1px solid #0f3460'
      btn.textContent = (agentEnabled ? '● ' : '○ ') + t('agentLabel') + ' ' + (agentEnabled ? t('agentOn') : t('agentOff'))
      if (agentEnabled) {
        updateAgentObserver()
        scheduleAgentPass(0)
      } else {
        updateAgentObserver()
      }
    }

    document.body.appendChild(btn)
    console.log('[Agent] Кнопка создана, agentEnabled =', agentEnabled)
  }

  function createAutoRunButton() {
    let btn = document.getElementById('gemini-agent-autorun')
    if (!btn) {
      btn = document.createElement('button')
      btn.id = 'gemini-agent-autorun'
      btn.type = 'button'
      btn.title = 'Автоматически выполнять найденные команды'
    }

    function refresh() {
      btn.className = 'gemini-agent-autorun' + (autoRunEnabled ? ' enabled' : '')
      btn.textContent = 'Auto RUN ' + (autoRunEnabled ? 'ON' : 'OFF')
    }

    btn.onclick = async () => {
      if (autoRunEnabled) {
        autoRunEnabled = false
        localStorage.setItem('gemini_agent_autorun_enabled', 'false')
        clearAutoRunTimers()
        refresh()
        console.log('[Agent] Auto RUN выключен')
        return
      }

      const confirmation = await window.electronAgent.confirm(
        'Включить Auto RUN?',
        'Команды [EXECUTE: ...] будут выполняться автоматически сразу после появления. Включайте только если доверяете текущему диалогу.'
      )

      if (!confirmation.allowed) return

      autoRunEnabled = true
      autoRunEnabledAt = Date.now()
      localStorage.setItem('gemini_agent_autorun_enabled', 'true')
      markExistingExecuteBlocksProcessed()
      refresh()
      console.log('[Agent] Auto RUN включён')
    }

    refresh()

    const input = getInput()
    const composer = input && findComposerRoot(input)

    if (!composer) return

    const toolsAnchor = findToolsAnchor(composer)
    if (toolsAnchor) {
      const anchor = toolsAnchor.closest('button') || toolsAnchor
      if (btn.previousElementSibling !== anchor || btn.parentElement !== anchor.parentElement) {
        anchor.insertAdjacentElement('afterend', btn)
      }
      return
    }

    const fallbackRow = findComposerBottomRow(composer)
    if (fallbackRow && btn.parentElement !== fallbackRow) fallbackRow.appendChild(btn)
  }

  // ─── История команд ──────────────────────────────────────────────────────

  const CMD_HISTORY_KEY = 'getools_cmd_history'
  const CMD_HISTORY_MAX = 50

  function saveCommandToHistory(cmd, result) {
    try {
      const history = JSON.parse(localStorage.getItem(CMD_HISTORY_KEY) || '[]')
      history.unshift({
        cmd,
        success: result.success,
        stdout: (result.stdout || '').slice(0, 500),
        stderr: (result.stderr || result.error || '').slice(0, 200),
        cwd: result.cwd || '',
        ts: Date.now(),
      })
      if (history.length > CMD_HISTORY_MAX) history.length = CMD_HISTORY_MAX
      localStorage.setItem(CMD_HISTORY_KEY, JSON.stringify(history))
    } catch (_) {}
  }

  function getSessionSummary() {
    try {
      const history = JSON.parse(localStorage.getItem(CMD_HISTORY_KEY) || '[]')
      if (!history.length) return ''
      const recent = history.slice(0, 10)
      const lines = recent.map(h => {
        const status = h.success ? '✓' : '✗'
        const out = h.stdout ? ` → ${h.stdout.slice(0, 80).replace(/\r?\n/g, ' ')}` : ''
        return `${status} ${h.cmd}${out}`
      })
      return `[Последние команды сессии]\n${lines.join('\n')}`
    } catch (_) { return '' }
  }

  // ─── Снапшоты / чекпоинты ────────────────────────────────────────────────

  let sessionSnapshotDone = false
  let lastSnapshotId = localStorage.getItem('getools_last_snapshot_id') || null

  async function autoSnapshotOnce() {
    if (sessionSnapshotDone || !window.electronAgent?.createSnapshot) return
    sessionSnapshotDone = true
    try {
      const res = await window.electronAgent.createSnapshot('Авто: перед задачей')
      if (res.success) {
        lastSnapshotId = res.snapshotId
        localStorage.setItem('getools_last_snapshot_id', res.snapshotId)
        console.log(`[Agent] Автоснапшот: ${res.snapshotId} (${res.fileCount} файлов)`)
        updateRollbackButton()
      }
    } catch (_) {}
  }

  function updateRollbackButton() {
    const btn = document.getElementById('gemini-agent-rollback')
    if (!btn) return
    const lbl = btn.querySelector('.getools-toolbox-label')
    if (lbl) lbl.textContent = lastSnapshotId ? t('rollbackBtn') : t('rollbackNoSnapshot')
    btn.setAttribute('aria-disabled', lastSnapshotId ? 'false' : 'true')
    btn.style.opacity = lastSnapshotId ? '' : '0.45'
  }

  function createRollbackButton() {
    if (!window.electronAgent?.restoreSnapshot) return

    const btn = createToolboxItem({
      id: 'gemini-agent-rollback',
      icon: 'history',
      label: lastSnapshotId ? t('rollbackBtn') : t('rollbackNoSnapshot'),
      checked: false,
      onClick: async () => {
        if (!lastSnapshotId) return
        const confirmed = await window.electronAgent.confirm(
          'Откатить все изменения?',
          `Все файлы будут восстановлены из снапшота. Это действие необратимо.`
        )
        if (!confirmed.allowed) return

        const res = await window.electronAgent.restoreSnapshot(lastSnapshotId)
        if (res.success) {
          sessionSnapshotDone = false
          lastSnapshotId = null
          localStorage.removeItem('getools_last_snapshot_id')
          updateRollbackButton()
          await sendSystemMessage(
            `[SYSTEM] Откат выполнен. Восстановлено ${res.restored} файлов из снапшота "${res.label}". Все изменения отменены.`
          )
        } else {
          alert('Ошибка отката: ' + res.error)
        }
      },
    })
    updateRollbackButton()
    insertIntoToolbox(btn)
  }

  // ─── Кнопка рабочей директории ───────────────────────────────────────────

  let currentCwd = null

  async function initCwd() {
    if (!window.electronAgent?.getCwd) return
    const res = await window.electronAgent.getCwd()
    if (res?.cwd) currentCwd = res.cwd
    updateCwdButton()
  }

  function updateCwdButton() {
    const btn = document.getElementById('gemini-agent-cwd')
    if (!btn) return
    const name = currentCwd ? currentCwd.split(/[\\/]/).pop() : 'Проект'
    btn.textContent = '📁 ' + name
    btn.title = currentCwd || 'Выбрать рабочую директорию'
    btn.className = 'gemini-agent-autorun' + (currentCwd ? ' enabled' : '')
  }

  // Создаёт пункт меню в стиле нативных кнопок #toolbox-drawer-menu
  function createToolboxItem({ id, icon, label, checked = false, onClick }) {
    let btn = document.getElementById(id)
    if (!btn) {
      btn = document.createElement('button')
      btn.id = id
      btn.type = 'button'
      btn.setAttribute('mat-list-item', '')
      btn.setAttribute('role', 'menuitemcheckbox')
      btn.setAttribute('aria-disabled', 'false')
      btn.className = 'mat-mdc-list-item mdc-list-item mat-mdc-list-item-interactive toolbox-drawer-item-list-button mdc-list-item--with-leading-icon mat-mdc-list-item-single-line mdc-list-item--with-one-line gemini-agent-toolbox-item'
    }

    btn.setAttribute('aria-checked', checked ? 'true' : 'false')

    // Иконка
    let iconEl = btn.querySelector('mat-icon')
    if (!iconEl) {
      iconEl = document.createElement('mat-icon')
      iconEl.setAttribute('role', 'img')
      iconEl.setAttribute('aria-hidden', 'true')
      iconEl.setAttribute('matlistitemicon', '')
      iconEl.className = 'mat-icon notranslate mat-mdc-list-item-icon menu-icon gds-icon-l gem-menu-item-icon google-symbols mat-icon-no-color mdc-list-item__start'
      btn.appendChild(iconEl)
    }
    iconEl.setAttribute('data-mat-icon-name', icon)
    iconEl.setAttribute('fonticon', icon)
    iconEl.textContent = icon

    // Текст
    let content = btn.querySelector('.mdc-list-item__content')
    if (!content) {
      content = document.createElement('span')
      content.className = 'mdc-list-item__content'
      const primary = document.createElement('span')
      primary.className = 'mat-mdc-list-item-unscoped-content mdc-list-item__primary-text'
      const featureContent = document.createElement('div')
      featureContent.className = 'feature-content'
      const labels = document.createElement('div')
      labels.className = 'labels'
      const labelEl = document.createElement('div')
      labelEl.className = 'label gds-label-l getools-toolbox-label'
      labels.appendChild(labelEl)
      featureContent.appendChild(labels)
      primary.appendChild(featureContent)
      content.appendChild(primary)
      btn.appendChild(content)

      const focusIndicator = document.createElement('div')
      focusIndicator.className = 'mat-focus-indicator'
      btn.appendChild(focusIndicator)
    }

    const labelEl = btn.querySelector('.getools-toolbox-label')
    if (labelEl) labelEl.textContent = label

    btn.onclick = onClick
    return btn
  }

  function insertIntoToolbox(btn) {
    const toolbox = document.getElementById('toolbox-drawer-menu')
    if (!toolbox) return false
    if (toolbox.contains(btn)) return true
    toolbox.appendChild(btn)
    return true
  }

  function createCwdButton() {
    if (!window.electronAgent?.pickCwd) return

    const name = currentCwd ? currentCwd.split(/[\\/]/).pop() : t('openProjectBtn')
    const btn = createToolboxItem({
      id: 'gemini-agent-cwd',
      icon: 'folder_open',
      label: name,
      checked: !!currentCwd,
      onClick: async () => {
        const res = await window.electronAgent.pickCwd()
        if (!res.canceled && res.cwd) {
          currentCwd = res.cwd
          // Обновляем лейбл
          const lbl = btn.querySelector('.getools-toolbox-label')
          if (lbl) lbl.textContent = res.cwd.split(/[\\/]/).pop()
          btn.setAttribute('aria-checked', 'true')
          await sendSystemMessage(
            `[SYSTEM] Рабочая директория изменена: ${res.cwd}\nВсе команды теперь выполняются из этой папки. Используй относительные пути.`
          )
        }
      },
    })
    insertIntoToolbox(btn)
  }

  function createAutoRunButton() {
    let btn = document.getElementById('gemini-agent-autorun')
    if (!btn) {
      btn = document.createElement('button')
      btn.id = 'gemini-agent-autorun'
      btn.type = 'button'
      btn.title = 'Автоматически выполнять найденные команды'
    }

    function refresh() {
      btn.className = 'gemini-agent-autorun' + (autoRunEnabled ? ' enabled' : '')
      btn.textContent = 'Auto RUN ' + (autoRunEnabled ? 'ON' : 'OFF')
    }

    btn.onclick = async () => {
      if (autoRunEnabled) {
        autoRunEnabled = false
        localStorage.setItem('gemini_agent_autorun_enabled', 'false')
        clearAutoRunTimers()
        refresh()
        console.log('[Agent] Auto RUN выключен')
        return
      }

      const confirmation = await window.electronAgent.confirm(
        'Включить Auto RUN?',
        'Команды [EXECUTE: ...] будут выполняться автоматически сразу после появления. Включайте только если доверяете текущему диалогу.'
      )

      if (!confirmation.allowed) return

      autoRunEnabled = true
      autoRunEnabledAt = Date.now()
      localStorage.setItem('gemini_agent_autorun_enabled', 'true')
      markExistingExecuteBlocksProcessed()
      refresh()
      console.log('[Agent] Auto RUN включён')
    }

    refresh()

    const input = getInput()
    const composer = input && findComposerRoot(input)

    if (!composer) return

    const toolsAnchor = findToolsAnchor(composer)
    if (toolsAnchor) {
      const anchor = toolsAnchor.closest('button') || toolsAnchor
      if (btn.previousElementSibling !== anchor || btn.parentElement !== anchor.parentElement) {
        anchor.insertAdjacentElement('afterend', btn)
      }
      return
    }

    const fallbackRow = findComposerBottomRow(composer)
    if (fallbackRow && btn.parentElement !== fallbackRow) fallbackRow.appendChild(btn)
  }

  function createUltraThinkButton() {
    const btn = createToolboxItem({
      id: 'gemini-agent-ultrathink',
      icon: 'psychology',
      label: 'Ultra Think ' + (ultraThinkEnabled ? 'ON' : 'OFF'),
      checked: ultraThinkEnabled,
      onClick: () => {
        ultraThinkEnabled = !ultraThinkEnabled
        localStorage.setItem('gemini_agent_ultrathink_enabled', ultraThinkEnabled ? 'true' : 'false')
        const lbl = btn.querySelector('.getools-toolbox-label')
        if (lbl) lbl.textContent = 'Ultra Think ' + (ultraThinkEnabled ? 'ON' : 'OFF')
        btn.setAttribute('aria-checked', ultraThinkEnabled ? 'true' : 'false')
        console.log('[Agent] Ultra Think:', ultraThinkEnabled)
      },
    })
    insertIntoToolbox(btn)
  }

  // ── Кнопка настроек в левом сайдбаре ────────────────────────────────────────

  function createSidebarSettingsButton() {
    if (!window.electronAgent?.openSettings) return
    if (document.getElementById('getools-sidebar-settings')) return

    // Ищем пункт «Настройки и справка» в сайдбаре
    const settingsLink = [...document.querySelectorAll('a, button, [role="button"]')].find(el => {
      const text = (el.textContent || '').trim()
      const label = (el.getAttribute('aria-label') || '').trim()
      return /настройки и справка|settings.*help|help.*settings/i.test(text + ' ' + label)
    })

    if (!settingsLink) return

    // Клонируем весь родительский элемент — так получаем точно такую же структуру
    const parent = settingsLink.closest('li, [role="listitem"]') || settingsLink.parentElement
    if (!parent || !parent.parentElement) return

    const clone = parent.cloneNode(true)
    clone.id = 'getools-sidebar-settings'

    // Меняем иконку
    const iconEl = clone.querySelector('mat-icon, .mat-icon')
    if (iconEl) {
      iconEl.textContent = 'settings'
      iconEl.setAttribute('data-mat-icon-name', 'settings')
      iconEl.setAttribute('fonticon', 'settings')
      // Убираем mat-ligature-font чтобы не было двойной иконки
      iconEl.classList.remove('mat-ligature-font')
    }

    // Меняем текст — ищем текстовый узел или span с текстом
    const textEls = [...clone.querySelectorAll('span, div')].filter(el =>
      el.children.length === 0 && (el.textContent || '').trim().length > 2
    )
    if (textEls.length > 0) {
      textEls[0].textContent = LANG === 'en' ? 'GeTools Settings' : 'Настройки GeTools'
    }

    // Убираем все обработчики клика через замену на новый элемент
    const newClone = clone.cloneNode(true)
    newClone.id = 'getools-sidebar-settings'

    // Вешаем клик на весь элемент
    newClone.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      window.electronAgent.openSettings()
    })

    // Также на все дочерние кнопки/ссылки
    newClone.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        window.electronAgent.openSettings()
      })
    })

    parent.parentElement.insertBefore(newClone, parent)
  }

  function isVisibleElement(el) {
    const rect = el.getBoundingClientRect()
    const style = getComputedStyle(el)
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
  }

  function looksLikeSettingsMenu(el) {
    if (!isVisibleElement(el)) return false
    if (el.closest('.gemini-agent-card, #gemini-agent-status')) return false

    const text = el.textContent || ''
    const label = el.getAttribute('aria-label') || ''
    return /settings|настрой|saved info|extensions|apps|help|справ|activity/i.test(text + ' ' + label)
  }

  function createPluginMenuButton() {
    if (!window.electronAgent?.openPlugins) return

    // Angular CDK рендерит меню в cdk-overlay-container вне основного дерева
    const overlayContainer = document.querySelector('.cdk-overlay-container')
    const searchRoot = overlayContainer || document

    const menuContent = searchRoot.querySelector('.mat-mdc-menu-content')
    if (!menuContent) return
    if (menuContent.querySelector('.gemini-agent-plugin-menu-item')) return

    console.log('[Agent] Найдено меню, добавляю пункт Плагины')

    // Строим DOM вручную — без innerHTML (Trusted Types)
    const item = document.createElement('button')
    item.type = 'button'
    item.setAttribute('mat-menu-item', '')
    item.setAttribute('role', 'menuitem')
    item.setAttribute('tabindex', '0')
    item.setAttribute('aria-disabled', 'false')
    item.className = 'mat-mdc-menu-item mat-focus-indicator gemini-agent-plugin-menu-item'

    const itemText = document.createElement('span')
    itemText.className = 'mat-mdc-menu-item-text'

    const iconWrapper = document.createElement('gem-icon')
    iconWrapper.setAttribute('size', 'large')
    iconWrapper.className = 'gds-icon-l gem-menu-item-icon'

    const icon = document.createElement('mat-icon')
    icon.setAttribute('role', 'img')
    icon.setAttribute('aria-hidden', 'true')
    icon.setAttribute('data-mat-icon-type', 'font')
    icon.setAttribute('data-mat-icon-name', 'extension')
    icon.setAttribute('fonticon', 'extension')
    icon.className = 'mat-icon notranslate gds-icon-l google-symbols mat-ligature-font mat-icon-no-color'
    icon.textContent = 'extension'
    iconWrapper.append(icon)

    const labelWrap = document.createElement('div')
    labelWrap.className = 'menu-entry-with-badge'
    const label = document.createElement('span')
    label.className = 'gds-label-l gem-menu-item-label'
    label.textContent = t('pluginMenuLabel')
    labelWrap.append(label)

    const ripple = document.createElement('div')
    ripple.className = 'mat-ripple mat-mdc-menu-ripple'

    itemText.append(iconWrapper, labelWrap)
    item.append(itemText, ripple)

    item.onclick = (event) => {
      event.preventDefault()
      event.stopPropagation()
      window.electronAgent.openPlugins()
    }

    const helpBtn = menuContent.querySelector('[data-test-id="help-button"], [data-test-id="send-feedback-button"]')
    if (helpBtn) {
      menuContent.insertBefore(item, helpBtn)
    } else {
      menuContent.appendChild(item)
    }
  }

  function findComposerRoot(input) {
    let el = input
    while (el && el !== document.body) {
      const text = el.textContent || ''
      const rect = el.getBoundingClientRect()
      const looksLikeComposer = rect.width > 420 && rect.height >= 70 && rect.height <= 260
      const hasComposerControls = /Инструменты|Tools|Быстрая|Отправить|Send/.test(text)

      if (looksLikeComposer && hasComposerControls) return el
      el = el.parentElement
    }

    return input.closest('rich-textarea, bard-text-input, [role="form"], form') || input.parentElement
  }

  function findToolsAnchor(root) {
    const buttons = [...root.querySelectorAll('button')]
    const button = buttons.find(el => /Инструменты|Tools/.test(el.textContent || el.getAttribute('aria-label') || ''))
    if (button) return button

    const textNodeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false)
    let node
    while ((node = textNodeWalker.nextNode())) {
      if (/Инструменты|Tools/.test(node.textContent || '')) return node.parentElement
    }

    return null
  }

  function findComposerBottomRow(root) {
    const controls = [...root.querySelectorAll('button, [role="button"]')]
    const send = controls.find(el => /Отправить|Send/.test(el.getAttribute('aria-label') || el.textContent || ''))
    return send?.parentElement?.parentElement || send?.parentElement || root
  }

  // createButton убрана — агент всегда включён
  setTimeout(createAutoRunButton, 1000)

  // MutationObserver для меню и toolbox — с дебаунсом и защитой от рекурсии
  let uiObserverTimer = null
  let uiObserverRunning = false

  const uiObserver = new MutationObserver((mutations) => {
    // Игнорируем мутации от наших собственных вставок
    const relevant = mutations.some(m => {
      const target = m.target?.nodeType === Node.ELEMENT_NODE ? m.target : m.target?.parentElement
      if (!target) return false
      // Пропускаем мутации внутри наших элементов
      if (target.closest?.('#toolbox-drawer-menu .gemini-agent-toolbox-item')) return false
      if (target.closest?.('.gemini-agent-plugin-menu-item')) return false
      return true
    })
    if (!relevant) return

    // Дебаунс 200мс
    if (uiObserverTimer) clearTimeout(uiObserverTimer)
    uiObserverTimer = setTimeout(() => {
      if (uiObserverRunning) return
      uiObserverRunning = true
      try {
        // Меню настроек
        const menuContent = document.querySelector('.cdk-overlay-container .mat-mdc-menu-content')
          || document.querySelector('.mat-mdc-menu-content')
        if (menuContent && !menuContent.querySelector('.gemini-agent-plugin-menu-item')) {
          createPluginMenuButton()
        }
        // Toolbox drawer
        const toolbox = document.getElementById('toolbox-drawer-menu')
        if (toolbox) {
          if (!toolbox.querySelector('#gemini-agent-ultrathink')) createUltraThinkButton()
          if (!toolbox.querySelector('#gemini-agent-cwd')) createCwdButton()
          if (!toolbox.querySelector('#gemini-agent-rollback')) createRollbackButton()
        }
        // Кнопка настроек в сайдбаре
        if (!document.getElementById('getools-sidebar-settings')) {
          createSidebarSettingsButton()
        }
      } finally {
        uiObserverRunning = false
      }
    }, 200)
  })
  uiObserver.observe(document.body, { childList: true, subtree: true })

  // Один раз при старте для Auto RUN (он в поле ввода)
  setTimeout(createAutoRunButton, 1500)
  setTimeout(initCwd, 1500)

  // Редкий fallback — раз в 15 секунд для Auto RUN если потерялся
  controlsTimer = setInterval(() => {
    createAutoRunButton()
  }, 15000)

  function getInput() {
    return document.querySelector('rich-textarea div[contenteditable="true"]')
      || document.querySelector('[contenteditable="true"][role="textbox"]')
      || document.querySelector('textarea')
  }

  function getSendButton() {
    const buttons = [...document.querySelectorAll('button')]
    return buttons.find(btn => {
      const label = `${btn.getAttribute('aria-label') || ''} ${btn.textContent || ''}`.toLowerCase()
      return /send|отправ|submit/.test(label)
    })
  }

  function getStopButton() {
    const buttons = [...document.querySelectorAll('button')]
    return buttons.find(btn => {
      const label = `${btn.getAttribute('aria-label') || ''} ${btn.textContent || ''}`.toLowerCase()
      return /stop|стоп|остановить|cancel.*generat/.test(label)
    })
  }

  function isGenerating() {
    return !!getStopButton()
  }

  function isCurrentSendButton(btn) {
    return !!btn && btn === getSendButton()
  }

  function shouldApplyUltraThinkMarker() {
    if (location.pathname.includes('/saved-info')) return false

    const input = getInput()
    const value = getInputValue(input)
    return !!input && !!withOutgoingAgentMarker(value) && !GETOOLS_MARKER_REGEX.test(value)
  }

  async function sendCurrentInputWithUltraThink(sendButton) {
    if (ultraThinkBypassSend) return false

    const input = getInput()
    const value = getInputValue(input)
    const nextValue = withOutgoingAgentMarker(value)
    if (!input || !nextValue || GETOOLS_MARKER_REGEX.test(value)) return false

    ultraThinkBypassSend = true
    try {
      setNativeValue(input, nextValue)
      await sleep(80)
      hideUltraThinkMarkersBurst(6000)

      const btn = sendButton && document.body.contains(sendButton) ? sendButton : getSendButton()
      if (btn && !btn.disabled) {
        btn.click()
        ultraThinkAwaitingThink = ultraThinkEnabled
        ultraThinkStreamingActive = false
        ultraThinkDetailsEl = null
        ultraThinkPreEl = null
        utCurrentStreamingEl = null
        utReset()
        updateAgentObserver()
        scheduleAgentPass(0)
        hideUltraThinkMarkersBurst(8000)
        if (ultraThinkEnabled) waitForGenerationEnd()
        return true
      }
    } finally {
      setTimeout(() => {
        ultraThinkBypassSend = false
      }, 500)
    }

    return false
  }

  document.addEventListener('click', (event) => {
    const btn = event.target?.closest?.('button')
    if (!isCurrentSendButton(btn) || ultraThinkBypassSend) return
    if (!shouldApplyUltraThinkMarker()) return

    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    sendCurrentInputWithUltraThink(btn)
  }, true)

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return
    const input = getInput()
    if (!input || !event.target || !input.contains(event.target)) return

    const send = getSendButton()
    if (!send || send.disabled || ultraThinkBypassSend) return
    if (!shouldApplyUltraThinkMarker()) return

    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    sendCurrentInputWithUltraThink(send)
  }, true)

  function setNativeValue(el, value) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value')?.set
      setter ? setter.call(el, value) : (el.value = value)
    } else {
      el.focus()
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(el)
      selection.removeAllRanges()
      selection.addRange(range)

      const inserted = document.execCommand && document.execCommand('insertText', false, value)
      if (!inserted || !inputContains(el, value)) {
        el.textContent = value
      }
      selection.removeAllRanges()
      range.selectNodeContents(el)
      range.collapse(false)
      selection.addRange(range)
    }

    try {
      el.dispatchEvent(new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: value,
      }))
    } catch (_) {}

    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ' ', code: 'Space' }))
  }

  async function pasteNativeValue(el, value) {
    el.focus()

    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      el.select()
    } else {
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(el)
      selection.removeAllRanges()
      selection.addRange(range)
    }

    if (window.electronAgent?.pasteText) {
      await window.electronAgent.pasteText(value)
      await sleep(250)
    }

    if (!inputContains(el, value)) {
      setNativeValue(el, value)
    } else {
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: value }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }

  async function sendMessage(message, options = {}) {
    const { hidden = false, retries = 4 } = options
    let restoreInput = null

    try {
      for (let attempt = 0; attempt < retries; attempt++) {
        const input = getInput()
        if (!input) {
          await sleep(300)
          continue
        }

        input.focus()
        if (hidden && !restoreInput) restoreInput = maskInput(input)

        await pasteNativeValue(input, message)
        await sleep(250 + attempt * 100)

        if (!inputContains(input, message)) {
          input.focus()
          await pasteNativeValue(input, message)
          await sleep(250)
        }

        const send = getSendButton()
        if (send && !send.disabled && inputContains(input, message)) {
          if (hidden) hideSystemMessagesBurst(6000)
          ultraThinkBypassSend = true
          send.click()
          setTimeout(() => {
            ultraThinkBypassSend = false
          }, 500)
          if (hidden) {
            hideSystemMessagesBurst(8000)
          }
          return true
        }

        await sleep(500)
      }

      return false
    } finally {
      if (restoreInput) restoreInput()
    }
  }

  function findButtonByText(pattern) {
    return [...document.querySelectorAll('button, [role="button"]')].find(el => {
      const text = `${el.textContent || ''} ${el.getAttribute('aria-label') || ''}`.trim()
      return pattern.test(text)
    })
  }

  function getSavedInfoInput() {
    return document.querySelector('textarea')
      || document.querySelector('[contenteditable="true"][role="textbox"]')
      || document.querySelector('[contenteditable="true"]')
  }

  // Парсит prompts.txt — разделитель: строка вида "первый промпт:", "второй промпт:" и т.д.
  function parsePromptsFile(text) {
    const lines = text.split(/\r?\n/)
    const prompts = []
    let current = null

    for (const line of lines) {
      // Поддерживаем оба языка: "Первый промпт:" и "First prompt:"
      if (/^[а-яёa-z\d]+\s+(?:промпт|prompt)\s*:/i.test(line.trim())) {
        if (current !== null) prompts.push(current.trim())
        current = ''
      } else if (current !== null) {
        current += (current ? '\n' : '') + line
      }
    }
    if (current !== null && current.trim()) prompts.push(current.trim())
    return prompts.filter(Boolean)
  }

  async function setupSavedInfoPrompt({ force = false } = {}) {
    if (!AGENT_PROMPT) return false

    const isForced = force || sessionStorage.getItem('getools_setup_force') === '1'
    if (window.__geminiAgentFreshMode && !isForced) return false
    if (isForced) sessionStorage.removeItem('getools_setup_force')

    const setupUrl = 'https://gemini.google.com/saved-info'

    // Загружаем промпты
    let prompts = []
    if (window.electronAgent?.readFile && window.__geminiAgentAppPath) {
      const appPath = window.__geminiAgentAppPath
      for (const filePath of [`${appPath}\\prompts.${LANG}.txt`, `${appPath}\\prompts.txt`]) {
        try {
          const result = await window.electronAgent.readFile(filePath)
          if (result?.success && result.content) {
            prompts = parsePromptsFile(result.content)
            console.log(`[Agent] Загружено промптов:`, prompts.length)
            break
          }
        } catch (_) {}
      }
    }
    if (!prompts.length) {
      console.warn('[Agent] prompts.txt не найден, используем встроенный промпт')
      prompts = [SAVED_INFO_PROMPT]
    }

    if (window.electronAgent?.listPlugins) {
      try {
        const res = await window.electronAgent.listPlugins()
        if (res?.success) {
          for (const p of (res.plugins || [])) {
            if (p.enabled && p.prompt?.trim()) prompts.push(p.prompt.trim())
          }
        }
      } catch (_) {}
    }

    const promptsHash = hashText([...prompts].sort().join('|'))
    const doneKey = 'getools_prompts_done:' + promptsHash

    if (localStorage.getItem(doneKey) === 'done') {
      console.log('[Agent] Промпты уже настроены')
      localStorage.removeItem('getools_setup_pending')
      return false
    }

    // Если не на saved-info — ставим pending флаг и редиректим
    if (!location.href.startsWith(setupUrl)) {
      localStorage.setItem('getools_setup_pending', '1')
      showSetupScreen(t('setupTitle'), t('setupSubtitle'))
      setTimeout(() => { location.href = setupUrl }, 400)
      return true
    }

    // Мы на saved-info — добавляем промпты
    localStorage.removeItem('getools_setup_pending')
    console.log(`[Agent] Начинаю добавление ${prompts.length} промптов`)
    showSetupScreen(`${t('setupTitle')} (0/${prompts.length})`, t('setupSubtitle'))

    let addedCount = 0

    for (let pi = 0; pi < prompts.length; pi++) {
      const promptToAdd = prompts[pi]
      console.log(`[Agent] Добавляю промпт ${pi + 1}/${prompts.length}`)
      showSetupScreen(`${t('setupTitle')} (${pi + 1}/${prompts.length})`, t('setupSubtitle'))

      let addButton = null
      for (let attempt = 0; attempt < 30; attempt++) {
        addButton = [...document.querySelectorAll('button')].find(b => {
          const txt = (b.textContent || '').trim()
          return /^add$/i.test(txt) || /^добавить$/i.test(txt)
        })
        if (addButton) { addButton.click(); break }
        await sleep(500)
      }

      if (!addButton) {
        console.warn(`[Agent] Кнопка "Добавить" не найдена для промпта ${pi + 1}`)
        break
      }

      await sleep(2000)

      let inserted = false
      for (let attempt = 0; attempt < 30; attempt++) {
        const input = getSavedInfoInput()
        if (input) {
          await pasteNativeValue(input, promptToAdd)
          await sleep(400)
          if (!inputContains(input, promptToAdd)) {
            await pasteNativeValue(input, promptToAdd)
            await sleep(400)
          }

          const saveButton = [...document.querySelectorAll('button')].find(b => {
            if (b.closest('mat-slide-toggle, [role="switch"], .mdc-switch')) return false
            if (b.getAttribute('role') === 'switch') return false
            const txt = (b.textContent || '').replace(/\s+/g, ' ').trim()
            const label = (b.getAttribute('aria-label') || '').trim()
            return /^(save|сохранить|сохранить изменения|отправить|submit)$/i.test(txt)
              || /^(save|сохранить|отправить)$/i.test(label)
          })

          if (!saveButton) {
            console.log(`[Agent] Промпт ${pi + 1}: Save не найдена. Кнопки:`,
              JSON.stringify([...document.querySelectorAll('button')].map(b => ({
                t: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
                l: b.getAttribute('aria-label') || '',
              })))
            )
          }

          if (saveButton && !saveButton.disabled && inputContains(input, promptToAdd)) {
            saveButton.click()
            addedCount++
            console.log(`[Agent] Промпт ${pi + 1}/${prompts.length} сохранён`)
            await sleep(5000)
            inserted = true
            break
          }
        }
        await sleep(500)
      }

      if (!inserted) {
        console.warn(`[Agent] Не удалось добавить промпт ${pi + 1}`)
        break
      }
    }

    if (addedCount >= prompts.length) {
      localStorage.setItem(doneKey, 'done')
      showSetupScreen(t('setupDoneTitle'), t('setupDoneSubtitle'))
      setTimeout(() => { location.href = 'https://gemini.google.com' }, 1200)
      return true
    }

    console.warn(`[Agent] Добавлено ${addedCount}/${prompts.length} промптов`)
    return addedCount > 0
  }

  // Экспортируем для вызова после установки плагина
  window.getools._rerunSetup = () => setupSavedInfoPrompt({ force: true })

  // ── Плашка «Настроить промпты» ────────────────────────────────────────────

  async function checkPromptsNeeded() {
    if (!AGENT_PROMPT || window.__geminiAgentFreshMode) return false
    const url = location.href
    const isGeminiMain = url.startsWith('https://gemini.google.com/app')
      || url === 'https://gemini.google.com/'
      || /^https:\/\/gemini\.google\.com\/\?/.test(url)
    if (!isGeminiMain) return false

    let prompts = []
    if (window.electronAgent?.readFile && window.__geminiAgentAppPath) {
      const appPath = window.__geminiAgentAppPath
      for (const filePath of [`${appPath}\\prompts.${LANG}.txt`, `${appPath}\\prompts.txt`]) {
        try {
          const result = await window.electronAgent.readFile(filePath)
          if (result?.success && result.content) { prompts = parsePromptsFile(result.content); break }
        } catch (_) {}
      }
    }
    if (!prompts.length) prompts = [SAVED_INFO_PROMPT]
    if (window.electronAgent?.listPlugins) {
      try {
        const res = await window.electronAgent.listPlugins()
        if (res?.success) for (const p of (res.plugins || [])) {
          if (p.enabled && p.prompt?.trim()) prompts.push(p.prompt.trim())
        }
      } catch (_) {}
    }
    const doneKey = 'getools_prompts_done:' + hashText([...prompts].sort().join('|'))
    return localStorage.getItem(doneKey) !== 'done'
  }

  function showPromptsBanner() {
    if (document.getElementById('getools-prompts-banner')) return
    const isEn = LANG === 'en'

    if (!document.getElementById('getools-banner-style')) {
      const s = document.createElement('style')
      s.id = 'getools-banner-style'
      s.textContent = `
        @keyframes getools-banner-in { from{opacity:0} to{opacity:1} }
        @keyframes getools-banner-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        #getools-prompts-banner {
          position:fixed !important; inset:0 !important; z-index:2147483646 !important;
          display:flex !important; flex-direction:column !important;
          align-items:center !important; justify-content:center !important;
          background:#0d0d0e !important;
          animation:getools-banner-in 0.35s ease both !important;
          font-family:'Google Sans','Segoe UI',system-ui,sans-serif !important;
          pointer-events:all !important;
        }
        #getools-prompts-banner * { box-sizing:border-box; }
        #getools-prompts-inner {
          display:flex; flex-direction:column; align-items:center; text-align:center;
          max-width:480px; padding:0 32px;
          animation:getools-banner-up 0.4s cubic-bezier(0.4,0,0.2,1) 0.1s both;
        }
        #getools-prompts-banner .gtp-logo { width:56px;height:56px;object-fit:contain;margin-bottom:32px;opacity:0.9; }
        #getools-prompts-banner .gtp-title { font-size:24px;font-weight:500;color:#e3e3e3;letter-spacing:-0.2px;margin-bottom:12px;line-height:1.25; }
        #getools-prompts-banner .gtp-sub { font-size:14px;color:#6e7681;line-height:1.6;margin-bottom:36px;max-width:360px; }
        #getools-prompts-banner .gtp-btn {
          padding:13px 36px; background:#e3e3e3; color:#0d0d0e; border:none;
          border-radius:24px; font-size:15px; font-weight:600; font-family:inherit;
          cursor:pointer; transition:opacity 0.15s,transform 0.1s; letter-spacing:0.1px;
        }
        #getools-prompts-banner .gtp-btn:hover { opacity:0.88; }
        #getools-prompts-banner .gtp-btn:active { transform:scale(0.97); }
        #getools-prompts-banner .gtp-note { margin-top:20px;font-size:12px;color:#3d4147; }
      `
      document.head.appendChild(s)
    }

    const banner = document.createElement('div')
    banner.id = 'getools-prompts-banner'
    const inner = document.createElement('div')
    inner.id = 'getools-prompts-inner'

    const logo = Object.assign(document.createElement('img'), {
      className: 'gtp-logo', src: window.__geminiAgentLogoUrl || '', alt: 'GeTools', draggable: false,
    })
    const title = Object.assign(document.createElement('div'), {
      className: 'gtp-title',
      textContent: isEn ? 'One-time setup required' : 'Требуется одноразовая настройка',
    })
    const sub = Object.assign(document.createElement('div'), {
      className: 'gtp-sub',
      textContent: isEn
        ? 'GeTools needs to add agent instructions to your Gemini personal context. This happens once and takes about a minute.'
        : 'GeTools добавит инструкции агента в персональный контекст Gemini. Это происходит один раз и занимает около минуты.',
    })
    const btn = Object.assign(document.createElement('button'), {
      className: 'gtp-btn',
      textContent: isEn ? 'Set up now' : 'Настроить сейчас',
    })
    const note = Object.assign(document.createElement('div'), {
      className: 'gtp-note',
      textContent: isEn ? 'Without this, agent commands will not work' : 'Без этого команды агента работать не будут',
    })

    btn.onclick = () => { banner.remove(); setupSavedInfoPrompt({ force: true }) }
    inner.append(logo, title, sub, btn, note)
    banner.appendChild(inner)
    document.body.appendChild(banner)
  }

  // При загрузке страницы — проверяем нужно ли что-то делать
  setTimeout(async () => {
    const url = location.href

    // На saved-info: если стоит pending флаг — запускаем setup
    if (url.startsWith('https://gemini.google.com/saved-info')) {
      if (localStorage.getItem('getools_setup_pending') === '1') {
        console.log('[Agent] saved-info: pending флаг найден, запускаем setup')
        setupSavedInfoPrompt({ force: true })
      }
      return
    }

    // На главной: показываем баннер если промпты не настроены
    const needed = await checkPromptsNeeded()
    if (needed) showPromptsBanner()
  }, 2000)

  // Открываем оверлей плагинов по событию от preload
  window.addEventListener('getools:open-plugins', () => openPluginsOverlay())

  // Переустановка промптов из окна preferences
  window.addEventListener('getools:reset-prompts', () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('getools_prompts_done:') || k.startsWith('getools_setup_pending'))
      .forEach(k => localStorage.removeItem(k))
    setupSavedInfoPrompt({ force: true })
  })

  console.log('[Gemini Agent] Готов')
})()
