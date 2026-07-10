# Reagen AI

> 🧠 Multi-Agent AI Coding IDE — Your intelligent coding companion.

![Reagen AI](resources/icon.png)

## Features

- 💬 **AI Chat** — Chat about your codebase with intelligent agents
- 📝 **Code Generation** — Generate and edit code across multiple files
- 🔍 **Semantic Search** — Search your entire project semantically
- 🧠 **Memory** — Remembers previous conversations and project context
- 🖥️ **Integrated Terminal** — Run commands directly from the IDE
- 🧪 **Test Agent** — Execute tests and fix errors automatically
- 🌐 **Browser Agent** — Browse documentation and the web
- 📦 **Package Management** — Install dependencies via AI
- 🐳 **Docker** — Build and run Docker containers
- 🔀 **Git Integration** — Commit, branch, merge with AI assistance

## Architecture

```
Orchestrator Agent
       │
┌──────┼──────┬──────────┬──────────┐
│      │      │          │          │
Planner Memory Context  Search
│      │      │          │
├──────┴──────┴──────────┤
│                        │
Coder Agent       Reviewer Agent
│                        │
├──────┬──────┬──────────┤
│      │      │
Terminal Test  Git Agent
│
Browser Agent
│
Documentation Agent
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- (Optional) Docker Desktop
- (Optional) Ollama for local AI

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/reagen-ai.git
cd reagen-ai

# Install dependencies
npm install

# Start development
npm run dev
```

### Build Executable (.exe)

```bash
# Build and package for Windows
npm run package

# Output will be in the `release/` directory
```

## Configuration

1. Launch Reagen AI
2. Open Settings (Ctrl+,)
3. Select your LLM provider:
   - **OpenAI** — Paste your API key (sk-...)
   - **Anthropic** — Paste your API key (sk-ant-...)
   - **Ollama** — Make sure Ollama is running locally
4. Choose your preferred model
5. Start coding with AI!

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Desktop | Electron |
| Frontend | React + TypeScript |
| Editor | Monaco Editor |
| Terminal | xterm.js + node-pty |
| AI | OpenAI / Anthropic / Ollama |
| Git | simple-git |
| Docker | dockerode |
| State | Zustand |
| Packaging | electron-builder |

## License

MIT © Reagen AI
