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
    headerText.textContent = 'Запись файла'
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
    btnDeny.textContent = 'Отклонить'

    const btnRun = document.createElement('button')
    btnRun.type = 'button'
    btnRun.className = 'run'
    btnRun.textContent = 'Записать'

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
      btnRun.textContent = 'Записывается...'
      host.setAttribute('data-gemini-agent-card-state', 'running')

      try {
        const result = await window.electronAgent.writeFile(safePath, preview)
        const success = result.success
        headerText.textContent = success ? 'Файл записан' : 'Ошибка записи'
        resultBox.className = 'result ' + (success ? 'success' : 'error')
        resultBox.textContent = success ? `✓ ${safePath}` : (result.error || 'Ошибка')
        card.classList.add('done')
        host.setAttribute('data-gemini-agent-card-state', success ? 'success' : 'error')
        await sendSystemMessage(formatCreateFileResult(safePath, result))
      } catch (err) {
        const result = { success: false, error: err.message }
        headerText.textContent = 'Ошибка записи'
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
      card = createFileCard(file.filePath, file.content)
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
    titleText.textContent = 'Плагины GeTools'
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
    urlLabelText.textContent = 'Подключить по ссылке'
    urlLabel.append(urlLabelText)

    const urlRow = document.createElement('div')
    setImportant(urlRow, { display: 'flex', gap: '10px' })
    const urlInput = document.createElement('input')
    urlInput.type = 'text'
    urlInput.placeholder = 'https://example.com/plugin.json'
    urlInput.className = 'getools-input'
    const urlBtn = document.createElement('button')
    urlBtn.className = 'getools-btn-primary'
    urlBtn.textContent = 'Подключить'
    urlRow.append(urlInput, urlBtn)
    urlSection.append(urlLabel, urlRow)

    // Upload zone
    const uploadZone = document.createElement('div')
    uploadZone.className = 'getools-upload-zone'
    uploadZone.append(
      matIcon('folder_zip', 'font-size:36px;color:#a8c7fa;'),
      Object.assign(document.createElement('p'), { textContent: 'Загрузить ZIP архив', style: { margin: '0', color: '#a8c7fa', fontWeight: '500', fontSize: '14px' } }),
      Object.assign(document.createElement('p'), { textContent: 'Перетащите файл или нажмите для выбора', style: { margin: '0', color: '#5f6368', fontSize: '12px' } })
    )
    uploadZone.onclick = () => {
      const inp = document.createElement('input')
      inp.type = 'file'; inp.accept = '.zip'
      inp.onchange = (e) => { if (e.target.files[0]) alert('Загрузка: ' + e.target.files[0].name) }
      inp.click()
    }

    // Divider
    const divider = document.createElement('div')
    setImportant(divider, { 'border-top': '1px solid #2d2f31' })

    // Installed plugins header
    const installedHeader = document.createElement('div')
    setImportant(installedHeader, { display: 'flex', 'align-items': 'center', 'justify-content': 'space-between' })
    const installedTitle = document.createElement('span')
    installedTitle.textContent = 'Установленные плагины'
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
    promptsTitle.textContent = 'Системные промпты'
    promptsTitle.style.cssText = 'font-size:14px;font-weight:500;'
    const promptsDesc = document.createElement('div')
    promptsDesc.textContent = 'Настроить инструкции из prompts.txt'
    promptsDesc.style.cssText = 'font-size:12px;color:#9aa0a6;margin-top:2px;'
    promptsInfo.append(promptsTitle, promptsDesc)
    promptsLeft.append(promptsIcon, promptsInfo)
    const promptsArrow = matIcon('arrow_forward', 'font-size:18px;color:#9aa0a6;')
    promptsSection.append(promptsLeft, promptsArrow)
    promptsSection.onclick = () => {
      // Сбрасываем флаг "done" чтобы промпты добавились заново
      Object.keys(localStorage)
        .filter(k => k.startsWith('getools_prompts_done:') || k.startsWith('getools_prompts_added_count:'))
        .forEach(k => localStorage.removeItem(k))
      overlay.style.setProperty('display', 'none', 'important')
      location.href = 'https://gemini.google.com/saved-info'
    }
    promptsSection.onmouseenter = () => promptsSection.style.setProperty('border-color', '#444746', 'important')
    promptsSection.onmouseleave = () => promptsSection.style.setProperty('border-color', '#2d2f31', 'important')

    // Plugin list (заглушка)
    const pluginList = document.createElement('div')
    setImportant(pluginList, { display: 'flex', 'flex-direction': 'column', gap: '10px' })

    const plugins = [
      { name: 'Web Research Pro', desc: 'Поиск по документации в реальном времени', icon: 'search', color: '#4285f4', enabled: true },
      { name: 'Notion Sync', desc: 'Синхронизация заметок и задач', icon: 'sync', color: '#34a853', enabled: false },
      { name: 'Code Interpreter', desc: 'Запуск локальных скриптов', icon: 'code', color: '#9c27b0', enabled: true },
    ]

    plugins.forEach(p => {
      const card = document.createElement('div')
      card.className = 'getools-plugin-card'
      setImportant(card, { display: 'flex', 'align-items': 'center', gap: '14px' })

      const iconBox = document.createElement('div')
      setImportant(iconBox, {
        width: '44px', height: '44px', 'border-radius': '12px',
        display: 'flex', 'align-items': 'center', 'justify-content': 'center',
        background: p.color + '22', color: p.color, 'flex-shrink': '0',
        overflow: 'hidden',
      })
      const ic = matIcon(p.icon)
      ic.style.cssText = 'font-size:22px;line-height:1;display:block;color:inherit;'
      iconBox.append(ic)

      const info = document.createElement('div')
      setImportant(info, { flex: '1', 'min-width': '0' })
      const pName = document.createElement('div')
      pName.textContent = p.name
      pName.style.cssText = 'font-size:14px;font-weight:500;'
      const pDesc = document.createElement('div')
      pDesc.textContent = p.desc
      pDesc.style.cssText = 'font-size:12px;color:#9aa0a6;margin-top:2px;'
      info.append(pName, pDesc)

      const sw = document.createElement('label')
      sw.className = 'getools-switch'
      const swInput = document.createElement('input')
      swInput.type = 'checkbox'
      swInput.checked = p.enabled
      const swSlider = document.createElement('span')
      swSlider.className = 'getools-slider'
      sw.append(swInput, swSlider)

      card.append(iconBox, info, sw)
      pluginList.append(card)
    })

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
    label.textContent = 'Плагины GeTools'
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

  // Парсит prompts.txt — разделитель: строка вида "первый промпт:", "второй промпт:" и т.д.
  function parsePromptsFile(text) {
    const lines = text.split(/\r?\n/)
    const prompts = []
    let current = null

    for (const line of lines) {
      if (/^[а-яёa-z\d]+\s+промпт\s*:/i.test(line.trim())) {
        if (current !== null) prompts.push(current.trim())
        current = ''
      } else if (current !== null) {
        current += (current ? '\n' : '') + line
      }
    }
    if (current !== null && current.trim()) prompts.push(current.trim())
    return prompts.filter(Boolean)
  }

  async function setupSavedInfoPrompt() {
    if (!AGENT_PROMPT) return false

    const setupUrl = 'https://gemini.google.com/saved-info'

    // Сбрасываем старый формат ключа (миграция)
    Object.keys(localStorage)
      .filter(k => k.startsWith('gemini_agent_saved_info_prompt:'))
      .forEach(k => localStorage.removeItem(k))

    // Читаем prompts.txt через electronAgent
    let prompts = []
    if (window.electronAgent?.readFile && window.__geminiAgentAppPath) {
      try {
        const result = await window.electronAgent.readFile(window.__geminiAgentAppPath + '\\prompts.txt')
        if (result?.success && result.content) {
          prompts = parsePromptsFile(result.content)
          console.log('[Agent] Загружено промптов:', prompts.length)
        }
      } catch (e) {
        console.warn('[Agent] Не удалось прочитать prompts.txt:', e)
      }
    }
    if (!prompts.length) prompts = [SAVED_INFO_PROMPT]

    const doneKey = 'getools_prompts_done:' + hashText(prompts.join('|'))
    const addedKey = 'getools_prompts_added_count:' + hashText(prompts.join('|'))

    // Все промпты уже добавлены
    if (localStorage.getItem(doneKey) === 'done') return false

    // Не на странице saved-info — редиректим
    if (!location.href.startsWith(setupUrl)) {
      location.href = setupUrl
      return true
    }

    let addedCount = parseInt(localStorage.getItem(addedKey) || '0', 10)

    if (addedCount >= prompts.length) {
      localStorage.setItem(doneKey, 'done')
      setTimeout(() => { location.href = 'https://gemini.google.com' }, 300)
      return true
    }

    const promptToAdd = prompts[addedCount]
    console.log(`[Agent] Добавляю промпт ${addedCount + 1}/${prompts.length}`)

    // Ждём появления кнопки "Добавить"
    let addButton = null
    for (let attempt = 0; attempt < 30; attempt++) {
      addButton = findButtonByText(/^add$|^добавить$/i)
        || [...document.querySelectorAll('button')].find(b => {
          const t = (b.textContent || '').trim()
          return /^add$/i.test(t) || /^добавить$/i.test(t)
        })
      if (addButton) { addButton.click(); break }
      await sleep(500)
    }

    await sleep(1500)

    // Ждём появления textarea/input для ввода промпта
    for (let attempt = 0; attempt < 30; attempt++) {
      const input = getSavedInfoInput()
      if (input) {
        await pasteNativeValue(input, promptToAdd)
        await sleep(400)

        if (!inputContains(input, promptToAdd)) {
          await pasteNativeValue(input, promptToAdd)
          await sleep(400)
        }

        // Ищем кнопку сохранения — строго по тексту "Save" / "Сохранить" / "Отправить"
        // Исключаем toggle/switch элементы
        const saveButton = [...document.querySelectorAll('button')].find(b => {
          if (b.closest('mat-slide-toggle, [role="switch"], .mdc-switch')) return false
          if (b.getAttribute('role') === 'switch') return false
          const t = (b.textContent || '').replace(/\s+/g, ' ').trim()
          const label = (b.getAttribute('aria-label') || '').trim()
          return /^(save|сохранить|сохранить изменения|отправить|submit)$/i.test(t)
            || /^(save|сохранить|отправить)$/i.test(label)
        })

        console.log('[Agent] Кнопка сохранения:', saveButton?.textContent?.trim(), '| disabled:', saveButton?.disabled)

        if (saveButton && !saveButton.disabled && inputContains(input, promptToAdd)) {
          saveButton.click()
          addedCount++
          localStorage.setItem(addedKey, String(addedCount))
          console.log(`[Agent] Промпт ${addedCount}/${prompts.length} сохранён`)
          await sleep(5000)

          if (addedCount >= prompts.length) {
            localStorage.setItem(doneKey, 'done')
            setTimeout(() => { location.href = 'https://gemini.google.com' }, 500)
          } else {
            setTimeout(() => { location.reload() }, 800)
          }
          return true
        }
      }
      await sleep(500)
    }

    sessionStorage.removeItem('getools_prompts_redirecting')
    return false
  }

  setTimeout(setupSavedInfoPrompt, 1000)

  // Открываем оверлей плагинов по событию от preload
  window.addEventListener('getools:open-plugins', () => openPluginsOverlay())

  console.log('[Gemini Agent] Готов')
})()
