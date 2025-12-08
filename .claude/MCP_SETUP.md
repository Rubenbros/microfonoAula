# MCP Servers Setup Guide

## Available MCP Servers

### GitHub Integration
```bash
# Add GitHub MCP server (requires GitHub authentication)
claude mcp add --transport http github https://api.githubcopilot.com/mcp/

# Authenticate
claude
> /mcp
# Select GitHub and follow OAuth flow
```

### Database Connections

**PostgreSQL:**
```bash
claude mcp add --transport stdio postgres -- npx -y @anthropic-ai/mcp-server-postgres \
  --connection-string "postgresql://user:pass@host:5432/database"
```

**MySQL:**
```bash
claude mcp add --transport stdio mysql -- npx -y @anthropic-ai/mcp-server-mysql \
  --host localhost --user root --password secret --database mydb
```

### Cloud Providers

**AWS:**
```bash
claude mcp add --transport stdio aws -- npx -y @anthropic-ai/mcp-server-aws
# Uses your AWS credentials from ~/.aws/credentials
```

### Error Monitoring

**Sentry:**
```bash
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
# Then authenticate via /mcp
```

### Project Management

**Linear:**
```bash
claude mcp add --transport http linear https://mcp.linear.app/sse
```

**Notion:**
```bash
claude mcp add --transport http notion https://mcp.notion.com/mcp
```

## Managing MCP Servers

```bash
# List all configured servers
claude mcp list

# Get server details
claude mcp get <server-name>

# Remove a server
claude mcp remove <server-name>

# Authenticate with OAuth servers
claude
> /mcp
```

## Scopes

- **local** (default): Only for you, current project (stored in .claude.json)
- **project**: Shared with team via git (stored in .mcp.json)
- **user**: Available across all your projects (stored in ~/.claude.json)

```bash
# Add to specific scope
claude mcp add --scope project --transport http github https://api.githubcopilot.com/mcp/
```

## Windows Notes

For stdio servers on Windows, wrap with `cmd /c`:
```bash
claude mcp add --transport stdio myserver -- cmd /c npx -y @some/package
```

## Troubleshooting

1. **Server not connecting**: Check `claude mcp list` for status
2. **Authentication issues**: Re-run `/mcp` to re-authenticate
3. **Timeout errors**: Set `MCP_TIMEOUT` environment variable (milliseconds)
