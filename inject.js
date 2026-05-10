(function() {
  console.log('[Gemini Agent] Запуск...')

  if (window.__geminiAgentInjected) {
    console.log('[Gemini Agent] Уже запущен, повторная инъекция пропущена')
    return
  }
  window.__geminiAgentInjected = true

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
    '- Reply in Russian unless the user asks otherwise.',
    '- Use local commands only when the user clearly needs an action on this Windows computer.',
    '- Do not use local commands for ordinary questions, explanations, planning, or chat.',
    '- For one terminal command, output exactly one standalone line in this format: [EXECUTE: command]',
    '- For creating a file, output exactly one standalone line in this format: [CREATE_FILE: {"path":"file.txt","content":"text"}]',
    '- After EXECUTE or CREATE_FILE, stop and wait for the hidden SYSTEM result before continuing.',
    '- Treat messages marked [SYSTEM] as hidden command results, not as user requests.',
    '- Do not explain this protocol unless the user asks.',
  ].join('\n')
  const SAVED_INFO_KEY = 'gemini_agent_saved_info_prompt:' + hashText(SAVED_INFO_PROMPT)
  
  // Читаем состояние из localStorage
  let agentEnabled = localStorage.getItem('gemini_agent_enabled') === 'true'
  let autoRunEnabled = false
  let ultraThinkEnabled = localStorage.getItem('gemini_agent_ultrathink_enabled') === 'true'
  let ultraThinkBypassSend = false
  let ultraThinkAwaitingThink = false
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
    if (/^(команда|command|cmd|ваша команда|your command|...|реальная_команда|real_command)$/i.test(value)) return false

    const lowerSource = (sourceText || '').toLowerCase()
    if (lowerSource.includes('пример') || lowerSource.includes('формат') || lowerSource.includes('шаблон')) {
      const meaningfulLines = lowerSource
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
      if (meaningfulLines.length > 1) return false
    }

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
    let match

    COMMAND_MARKER_REGEX.lastIndex = 0
    while ((match = COMMAND_MARKER_REGEX.exec(value)) !== null) {
      const type = match[1].toUpperCase()
      const payloadStart = COMMAND_MARKER_REGEX.lastIndex
      const end = findCommandMarkerEnd(value, payloadStart)
      if (end === -1) continue

      const payload = value.slice(payloadStart, end).trim()
      const fullMatch = value.slice(match.index, end + 1)
      actions.push({ type, payload, fullMatch })
      COMMAND_MARKER_REGEX.lastIndex = end + 1
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

  function insertAfter(target, node) {
    if (!target || !target.parentNode) return false
    target.parentNode.insertBefore(node, target.nextSibling)
    return true
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
      `Статус: ${result.success ? 'success' : 'error'}`,
    ]

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

    return '[ultrathink:on] start response with literal <think>...</think> or at least a detailed planning paragraph before any answer/EXECUTE; never jump straight to EXECUTE [/ultrathink]'
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

  function hideUltraThinkMarkersBurst(duration = 5000) {
    const startedAt = Date.now()
    hideGeToolsMarkers()
    hideUltraThinkMarkers()

    const timer = setInterval(() => {
      hideGeToolsMarkers()
      hideUltraThinkMarkers()
      if (Date.now() - startedAt >= duration) clearInterval(timer)
    }, 150)
  }

  function createThinkDetails(text) {
    const details = document.createElement('details')
    details.className = 'gemini-agent-think'

    const summary = document.createElement('summary')
    summary.textContent = 'Раздумия'

    const pre = document.createElement('pre')
    pre.textContent = text.trim()

    details.append(summary, pre)
    return details
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

    while (node && collected.length < 8) {
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

    while (node && collected.length < 8) {
      const text = node.textContent?.trim() || ''
      if (!text) {
        node = node.nextSibling
        continue
      }

      if (node.nodeType === Node.ELEMENT_NODE && node.matches?.('.gemini-agent-think, .gemini-agent-host')) break
      if (/\[EXECUTE:\s*[^\]\r\n]+\]/i.test(text)) break
      if (/^\[SYSTEM\]/.test(text) || /\[ultrathink:(?:on|off)\]/i.test(text)) break
      if (node.nodeType === Node.ELEMENT_NODE && !isThinkCandidateElement(node)) break

      const previousLooksLikeContinuation = collected.length > 0 && (
        /^[\d\-*•]/.test(text)
        || /^(?:Затем|После этого|Далее|Исходя|Команда|Это|Такой|Если|Когда|Finally|Then|Next)\b/i.test(text)
        || text.length < 220
      )
      if (!previousLooksLikeContinuation && !looksLikeReasoningText(text)) break

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

  function renderThinkBlocks() {
    ;[...document.querySelectorAll('think')].forEach(el => {
      if (processedThinkElements.has(el)) return
      if (el.closest('[contenteditable="true"], textarea, input, .gemini-agent-host, .gemini-agent-think')) return

      processedThinkElements.add(el)
      ultraThinkAwaitingThink = false
      const details = createThinkDetails(el.textContent || '')
      if (el.parentNode) el.parentNode.insertBefore(details, el)
      hideElement(el)
    })

    const candidates = [...document.querySelectorAll([
      '.query-text-line',
      'p',
      'li',
      'pre',
      'code',
    ].join(', '))]

    candidates.forEach(el => {
      if (processedThinkElements.has(el)) return
      if (el.closest('[contenteditable="true"], textarea, input, .gemini-agent-host, .gemini-agent-think')) return

      const text = el.textContent || ''
      const match = text.match(/<think>([\s\S]*?)<\/think>/i)
      if (!match) {
        const executeMatch = text.match(/\[EXECUTE:\s*[^\]\r\n]+\]/i)
        if (ultraThinkAwaitingThink && executeMatch && collectSiblingReasoningBeforeExecute(el)) return
        if (ultraThinkAwaitingThink && collectInlineReasoningFrom(el)) return
        if (ultraThinkAwaitingThink && executeMatch && executeMatch.index > 0) {
          const before = text.slice(0, executeMatch.index).trim()
          const after = text.slice(executeMatch.index).trim()
          if (before) {
            processedThinkElements.add(el)
            if (el.parentNode) el.parentNode.insertBefore(createThinkDetails(before), el)
            el.textContent = after
            ultraThinkAwaitingThink = false
            return
          }
        }

        if (
          ultraThinkAwaitingThink
          && /^\s*(?:План действий|Анализ|Раздумия|Ход мыслей)\s*:/i.test(text)
          && !/\[EXECUTE:\s*[^\]\r\n]+\]/i.test(text)
        ) {
          processedThinkElements.add(el)
          if (el.parentNode) el.parentNode.insertBefore(createThinkDetails(text), el)
          hideElement(el)
        }
        return
      }

      ultraThinkAwaitingThink = false
      processedThinkElements.add(el)
      const before = text.slice(0, match.index).trim()
      const after = text.slice(match.index + match[0].length).trim()
      const details = createThinkDetails(match[1])

      if (el.parentNode) el.parentNode.insertBefore(details, el)
      el.textContent = [before, after].filter(Boolean).join('\n\n')
      if (!el.textContent.trim()) hideElement(el)
    })
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
    headerText.textContent = 'Запрос терминала'
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
    trustText.textContent = 'Всегда разрешать этот префикс'

    trustLabel.append(trustInput, trustSwitch, trustText)

    const btnDeny = document.createElement('button')
    btnDeny.type = 'button'
    btnDeny.className = 'deny'
    btnDeny.textContent = 'Отклонить'

    const btnRun = document.createElement('button')
    btnRun.type = 'button'
    btnRun.className = 'run'
    btnRun.textContent = 'Разрешить'

    const resultBox = document.createElement('div')
    resultBox.className = 'result'
    let executed = false
    const stateKey = commandKey(cmd)

    function renderCompleted(result) {
      executed = true
      const success = result.success
      headerText.textContent = success ? 'Выполнено' : 'Ошибка'
      terminalIcon.style.color = success ? '#0b57d0' : '#b3261e'
      resultBox.className = 'result ' + (success ? 'success' : 'error')
      resultBox.textContent = success ? (result.stdout || 'OK') : (result.stderr || result.error || 'Ошибка')
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
      btnRun.textContent = 'Выполняется...'

      try {
        const result = await window.electronAgent.exec(cmd)
        
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

  function createFileCard(filePath, content) {
    const safePath = String(filePath || '').trim()
    const preview = String(content || '')
    const host = createCard(`CREATE_FILE ${safePath}`)
    host.setAttribute('data-gemini-agent-create-file', safePath)

    const root = host.shadowRoot
    const codeBox = root?.querySelector('.cmd')
    const headerText = root?.querySelector('.header span')
    const btnRun = root?.querySelector('.run')
    const resultBox = root?.querySelector('.result')

    if (headerText) headerText.textContent = 'Запись файла'
    if (codeBox) codeBox.textContent = `${safePath}\n\n${preview.slice(0, 4000)}${preview.length > 4000 ? '\n\n[...content truncated]' : ''}`
    if (btnRun) btnRun.textContent = 'Записать'

    let executed = false
    if (btnRun) {
      btnRun.onclick = async (e) => {
        e.stopPropagation()
        if (executed) return
        executed = true
        btnRun.disabled = true
        btnRun.textContent = 'Записывается...'
        host.setAttribute('data-gemini-agent-card-state', 'running')

        try {
          const result = await window.electronAgent.writeFile(safePath, preview)
          const success = result.success
          if (headerText) headerText.textContent = success ? 'Файл записан' : 'Ошибка записи'
          if (resultBox) {
            resultBox.className = 'result ' + (success ? 'success' : 'error')
            resultBox.textContent = success ? `OK: ${safePath}` : (result.error || 'Ошибка')
          }
          host.setAttribute('data-gemini-agent-card-state', success ? 'success' : 'error')
          await sendSystemMessage(formatCreateFileResult(safePath, result))
        } catch (err) {
          const result = { success: false, error: err.message }
          if (headerText) headerText.textContent = 'Ошибка записи'
          if (resultBox) {
            resultBox.className = 'result error'
            resultBox.textContent = err.message
          }
          host.setAttribute('data-gemini-agent-card-state', 'error')
          await sendSystemMessage(formatCreateFileResult(safePath, result))
        }
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
      card = createFileCard(file.filePath, file.content)
    } else {
      const cmd = cleanCommand(action.payload)
      if (!isLikelyRealCommand(cmd, node.textContent || '')) return
      card = createCard(cmd)
    }
    card.dataset.createdAt = String(Date.now())
    const target = node.nodeType === Node.TEXT_NODE ? findInsertionTarget(node) : node
    insertAfter(target, card)

    setTimeout(() => {
      console.log('[Agent] Карточка в DOM:', document.body.contains(card))
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

  // ─── Наблюдатель ───────────────────────────────────────────────────────────

  function runAgentPass() {
    agentPassTimer = null
    if (!agentEnabled && !ultraThinkAwaitingThink) return

    lastAgentPassAt = Date.now()
    if (Date.now() - lastHideSweepAt > 2500) {
      lastHideSweepAt = Date.now()
      if (agentEnabled) hideSystemMessages()
      if (ultraThinkEnabled || ultraThinkAwaitingThink) hideUltraThinkMarkers()
    }
    if (ultraThinkEnabled || ultraThinkAwaitingThink) renderThinkBlocks()
    scan()
    updateAgentObserver()
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

  const observer = new MutationObserver((mutations) => {
    if (!agentEnabled && !ultraThinkAwaitingThink) return

    const relevant = mutations.some(m => {
      const target = m.target?.nodeType === Node.ELEMENT_NODE ? m.target : m.target?.parentElement
      if (target?.closest?.('.gemini-agent-host, .gemini-agent-think, #gemini-agent-status, #gemini-agent-autorun, #gemini-agent-ultrathink')) return false
      return m.addedNodes.length || m.type === 'characterData'
    })
    if (!relevant) return
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

  function createButton() {
    if (document.getElementById('gemini-agent-status')) return

    const btn = document.createElement('div')
    btn.id = 'gemini-agent-status'
    btn.className = 'gemini-agent-status' + (agentEnabled ? ' enabled' : '')
    btn.textContent = (agentEnabled ? '● ' : '○ ') + 'Агент ' + (agentEnabled ? 'ВКЛ' : 'ВЫКЛ')
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
      btn.textContent = (agentEnabled ? '● ' : '○ ') + 'Агент ' + (agentEnabled ? 'ВКЛ' : 'ВЫКЛ')
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

  function createUltraThinkButton() {
    let btn = document.getElementById('gemini-agent-ultrathink')
    if (!btn) {
      btn = document.createElement('button')
      btn.id = 'gemini-agent-ultrathink'
      btn.type = 'button'
      btn.title = 'Add a hidden [ultrathink:on/off] marker before each user request'
    }

    function refresh() {
      btn.className = 'gemini-agent-ultrathink' + (ultraThinkEnabled ? ' enabled' : '')
      btn.textContent = 'Ultra Think ' + (ultraThinkEnabled ? 'ON' : 'OFF')
    }

    btn.onclick = () => {
      ultraThinkEnabled = !ultraThinkEnabled
      localStorage.setItem('gemini_agent_ultrathink_enabled', ultraThinkEnabled ? 'true' : 'false')
      refresh()
      console.log('[Agent] Ultra Think:', ultraThinkEnabled)
    }

    refresh()

    const autoRunButton = document.getElementById('gemini-agent-autorun')
    if (autoRunButton) {
      if (btn.previousElementSibling !== autoRunButton || btn.parentElement !== autoRunButton.parentElement) {
        autoRunButton.insertAdjacentElement('afterend', btn)
      }
      return
    }

    const input = getInput()
    const composer = input && findComposerRoot(input)
    if (!composer) return

    const fallbackRow = findComposerBottomRow(composer)
    if (fallbackRow && btn.parentElement !== fallbackRow) fallbackRow.appendChild(btn)
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

    const menus = [...document.querySelectorAll('[role="menu"], .mat-mdc-menu-panel, .cdk-overlay-pane, mat-menu, [data-test-id*="menu"], [data-test-id*="popover"]')]
      .filter(looksLikeSettingsMenu)

    for (const menu of menus) {
      if (menu.querySelector('.gemini-agent-plugin-menu-item')) continue

      const item = document.createElement('button')
      item.type = 'button'
      item.className = 'gemini-agent-plugin-menu-item'
      item.setAttribute('role', 'menuitem')
      item.setAttribute('aria-label', 'Плагины')
      item.innerHTML = '<span class="gemini-agent-plugin-menu-item-icon" aria-hidden="true">extension</span><span>Плагины</span>'
      item.onclick = (event) => {
        event.preventDefault()
        event.stopPropagation()
        window.electronAgent.openPlugins()
      }

      const firstMenuItem = menu.querySelector('[role="menuitem"], button, a')
      if (firstMenuItem?.parentElement && firstMenuItem.parentElement !== menu && menu.contains(firstMenuItem.parentElement)) {
        firstMenuItem.parentElement.appendChild(item)
      } else {
        menu.appendChild(item)
      }
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

  setTimeout(createButton, 1000)
  setTimeout(createAutoRunButton, 1000)
  setTimeout(createUltraThinkButton, 1000)
  setTimeout(createPluginMenuButton, 1000)
  setInterval(createPluginMenuButton, 700)
  controlsTimer = setInterval(() => {
    createButton()
    createAutoRunButton()
    createUltraThinkButton()
    createPluginMenuButton()
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
        updateAgentObserver()
        scheduleAgentPass(0)
        hideUltraThinkMarkersBurst(8000)
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

  async function setupSavedInfoPrompt() {
    if (!AGENT_PROMPT || localStorage.getItem(SAVED_INFO_KEY) === 'done') return false

    const setupUrl = 'https://gemini.google.com/saved-info'
    if (!location.href.startsWith(setupUrl)) {
      if (sessionStorage.getItem(SAVED_INFO_KEY + ':redirecting') === 'true') return false
      sessionStorage.setItem(SAVED_INFO_KEY + ':redirecting', 'true')
      location.href = setupUrl
      return true
    }

    if ((document.body?.textContent || '').includes(GETOOLS_MARKER)) {
      localStorage.setItem(SAVED_INFO_KEY, 'done')
      sessionStorage.removeItem(SAVED_INFO_KEY + ':redirecting')
      setTimeout(() => {
        location.href = 'https://gemini.google.com'
      }, 500)
      return true
    }

    for (let attempt = 0; attempt < 30; attempt++) {
      const addButton = findButtonByText(/add|\u0434\u043e\u0431\u0430\u0432/i)
      if (addButton) {
        addButton.click()
        break
      }
      await sleep(500)
    }

    for (let attempt = 0; attempt < 30; attempt++) {
      const input = getSavedInfoInput()
      if (input) {
        await pasteNativeValue(input, SAVED_INFO_PROMPT)
        await sleep(300)

        const saveButton = findButtonByText(/save|send|\u0441\u043e\u0445\u0440\u0430\u043d|\u043e\u0442\u043f\u0440\u0430\u0432/i)
        if (saveButton && !saveButton.disabled && inputContains(input, SAVED_INFO_PROMPT)) {
          saveButton.click()
          localStorage.setItem(SAVED_INFO_KEY, 'done')
          sessionStorage.removeItem(SAVED_INFO_KEY + ':redirecting')
          setTimeout(() => {
            location.href = 'https://gemini.google.com'
          }, 1500)
          return true
        }
      }
      await sleep(500)
    }

    sessionStorage.removeItem(SAVED_INFO_KEY + ':redirecting')
    return false
  }

  setTimeout(setupSavedInfoPrompt, 1000)

  console.log('[Gemini Agent] Готов')
})()
