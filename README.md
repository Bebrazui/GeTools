<div align="right">

[🇷🇺 Читать на русском](README.ru.md)

</div>

<div align="center">

<img src="transparent.png" alt="GeTools" width="96" height="96" />

# GeTools

**Gemini as a local AI agent on your desktop**

*A thin Electron shell that turns Gemini into a real task executor — with terminal access, file operations, snapshots, and a plugin system.*

[![Electron](https://img.shields.io/badge/Electron-41.x-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows-0078D4?style=flat-square&logo=windows&logoColor=white)](https://www.microsoft.com/windows)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## What is this?

GeTools wraps [Gemini](https://gemini.google.com) in a desktop application and injects a custom agent layer into the page. The result: Gemini can execute shell commands, read and write files, take project snapshots, and be extended with plugins — all without leaving the chat interface.

The model stays the same. The interface stays the same. GeTools just adds the wiring between Gemini's responses and your local machine.

---

## How it works

```
You type a message
    ↓
GeTools prepends the agent marker + optional UltraThink block
    ↓
Gemini responds with [EXECUTE: command] or [CREATE_FILE: {...}]
    ↓
GeTools intercepts the response, shows a confirmation card
    ↓
You approve → command runs → result is silently fed back to Gemini
    ↓
Gemini continues the task
```

The entire loop happens inside the chat window. System messages (`[SYSTEM]`) are hidden from view — Gemini sees them as context, you see a clean conversation.

---

## Features

### 🖥️ Terminal execution
Gemini can run shell commands on your Windows machine. Every command shows a confirmation card before execution. You can always deny.

### 📁 File operations
Create and write files directly from the chat using `[CREATE_FILE: ...]`. No copy-pasting required.

### 🧠 UltraThink mode
Forces Gemini to reason before acting. When enabled, every response starts with a structured analysis block (`# Analysis`) before any command or answer. The reasoning is collapsed into a "Thinking" disclosure widget — visible but out of the way.

### 📸 Snapshots
Take a checkpoint of your project files before a risky operation. Restore with one click if something goes wrong. Snapshots are stored locally in `userData/snapshots/`.

### 🔌 Plugin system
Extend GeTools with custom commands. A plugin is a `plugin.json` manifest + a JS file that calls `window.getools.registerCommand(name, handler)`. Install from a folder or a ZIP archive.

**Example plugin** (`example-plugin/`):
```js
window.getools.registerCommand('READ_URL', async (url) => {
  const res = await fetch(url)
  const text = await res.text()
  return { success: true, stdout: text.slice(0, 8000) }
})
```
Gemini can then use `[READ_URL: https://example.com]` to fetch web content.

### 🌐 Language support
Choose between Russian and English on first launch. The language affects the UI, agent instructions, and Gemini's response language (`Accept-Language` header).

---

## Getting started

**Requirements:** Node.js 18+, Windows

```bash
# Clone and install
git clone https://github.com/bebrazui/getools.git
cd getools
npm install

# Run
npm start

# Build installer
npm run build
```

On first launch, GeTools will ask you to choose a language. After that, it loads Gemini and injects the agent automatically.

---

## Project structure

```
getools/
├── main.js          — Electron main process, IPC handlers, CDP injection
├── inject.js        — Agent script injected into Gemini page
├── preload.js       — IPC bridge (contextBridge)
├── AGENT_PROMPT.md  — System prompt loaded on every session
├── prompts.txt      — Behavioral prompts added to Gemini's saved info
├── prompts.en.txt   — English version of behavioral prompts
├── splash.html      — Loading screen + language selector
├── pluginPage.html  — Plugin management UI
├── example-plugin/  — Example plugin: READ_URL command
│   ├── plugin.json
│   └── plugin.js
└── package.json
```

---

## Writing a plugin

A plugin needs two files:

**`plugin.json`**
```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "What it does",
  "icon": "extension",
  "commands": ["MY_COMMAND"],
  "inject": "plugin.js",
  "prompt": "Optional instruction for Gemini about when to use [MY_COMMAND: ...]"
}
```

**`plugin.js`**
```js
window.getools.registerCommand('MY_COMMAND', async (payload) => {
  // do something with payload
  return { success: true, stdout: 'result' }
}, {
  label: 'My Command',
  icon: 'extension',
  description: 'What this command does'
})
```

Install by opening the plugin panel (via the toolbar or the ⋮ menu → GeTools Plugins) and dropping the folder or ZIP.

If the plugin includes a `prompt` field, GeTools will automatically add it to Gemini's saved instructions so the model knows when and how to use the new command.

---

## Security model

- Every `[EXECUTE: ...]` command requires explicit user approval before running
- Commands run in the configured working directory (`userData/settings.json → cwd`)
- File writes outside the working directory are logged with a warning
- The agent only activates when the message contains the marker `GETOOLS activates`
- Without the marker, Gemini behaves as a normal assistant — no commands, no system messages

---

## Architecture notes

GeTools uses Electron's Chrome DevTools Protocol (CDP) to inject `inject.js` into the Gemini page after it loads. This avoids any modification of Gemini's own code and works regardless of page updates.

The agent prompt (`AGENT_PROMPT.md`) is passed as `window.__geminiAgentPrompt` and added to Gemini's "Saved Info" (personal context) on first run. This makes the instructions persistent across sessions without re-injecting them every time.

---

<div align="center">

Made with ☕ by [Bebrazui](https://github.com/Bebrazui)

</div>
