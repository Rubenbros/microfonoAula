# Claude Code Development Environment Template

A comprehensive, pre-configured development environment for [Claude Code](https://claude.ai/code) - Anthropic's official CLI for Claude.

## Features

### Sub-agents (Auto-invoked)
Specialized AI agents that activate automatically when needed:

| Agent | Purpose | Model |
|-------|---------|-------|
| `code-reviewer` | Reviews code for quality, security, maintainability | Sonnet |
| `debugger` | Diagnoses errors and stack traces | Sonnet |
| `test-runner` | Runs tests and fixes failures | Sonnet |
| `architect` | Designs systems and architecture | Opus |
| `security-auditor` | OWASP security audits | Sonnet |

### Slash Commands (User-invoked)
Custom commands for common workflows:

| Command | Description |
|---------|-------------|
| `/review` | Review code changes before committing |
| `/commit` | Create well-formatted conventional commits |
| `/test [pattern]` | Run and analyze tests |
| `/debug <error>` | Debug specific errors |
| `/explain <file>` | Explain code in detail |
| `/refactor <file>` | Refactor code for quality |
| `/pr` | Create GitHub Pull Request |
| `/init-project <type>` | Initialize new project (react/next/node/spring/python) |
| `/security-check` | Run security audit |

### Skills (Auto-discovered)
Capabilities Claude invokes automatically when relevant:

- **code-quality** - Linting, formatting, quality checks
- **testing** - Test patterns, coverage, best practices
- **api-design** - RESTful API design conventions

### Pre-configured Permissions
- Auto-allowed: npm scripts, git read operations
- Requires confirmation: git push, docker, web fetch
- Blocked: .env files, secrets, destructive commands

## Installation

### Option 1: Use as Template
1. Click "Use this template" on GitHub
2. Clone your new repository
3. Start Claude Code: `claude`

### Option 2: Copy to Existing Project
```bash
# Clone this repo
git clone https://github.com/Rubenbros/claude-code-template.git

# Copy .claude folder to your project
cp -r claude-code-template/.claude /your/project/

# Copy .gitignore rules
cat claude-code-template/.gitignore >> /your/project/.gitignore
```

### Option 3: Global Installation
```bash
# Copy to your home directory for personal defaults
cp -r claude-code-template/.claude ~/.claude
```

## MCP Server Setup

This template includes a guide for setting up MCP (Model Context Protocol) servers.

### GitHub Integration
```bash
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer YOUR_GITHUB_TOKEN"
```

### Other Popular MCPs
See [.claude/MCP_SETUP.md](.claude/MCP_SETUP.md) for setup instructions for:
- PostgreSQL / MySQL databases
- Sentry error tracking
- AWS / Cloudflare cloud services
- And more...

## Project Structure

```
.claude/
├── CLAUDE.md                 # Project memory and instructions
├── settings.json             # Shared permissions and config
├── settings.local.json       # Personal settings (gitignored)
├── MCP_SETUP.md              # MCP configuration guide
│
├── agents/                   # Sub-agent definitions
│   ├── code-reviewer.md
│   ├── debugger.md
│   ├── test-runner.md
│   ├── architect.md
│   └── security-auditor.md
│
├── commands/                 # Slash commands
│   ├── review.md
│   ├── commit.md
│   ├── test.md
│   ├── debug.md
│   ├── explain.md
│   ├── refactor.md
│   ├── pr.md
│   ├── init-project.md
│   └── security-check.md
│
└── skills/                   # Auto-invoked skills
    ├── code-quality/
    ├── testing/
    └── api-design/
```

## Customization

### Add Your Own Commands
Create `.claude/commands/your-command.md`:
```yaml
---
description: What this command does
allowed-tools: Bash, Read, Edit
---

Your prompt here. Use $ARGUMENTS for user input.
```

### Add Your Own Agents
Create `.claude/agents/your-agent.md`:
```yaml
---
name: your-agent
description: When Claude should use this agent
tools: Read, Edit, Bash, Grep, Glob
model: sonnet
---

Your agent's system prompt and instructions here.
```

### Add Your Own Skills
Create `.claude/skills/your-skill/SKILL.md`:
```yaml
---
name: your-skill
description: What it does and when to use it
---

Skill instructions and patterns here.
```

## Supported Stacks

This template is optimized for:
- **TypeScript/JavaScript**: Node.js, React, Next.js, Express
- **Java**: Spring Boot, Maven/Gradle
- **Python**: FastAPI, Django
- **Databases**: PostgreSQL, MySQL, MongoDB

## Contributing

Contributions welcome! Please feel free to submit PRs for:
- New useful commands
- Additional agents
- More skills
- Bug fixes

## License

MIT License - Feel free to use and modify for your projects.

---

Made with Claude Code
