---
description: Run security checks on the codebase
allowed-tools: Bash, Read, Grep, Glob
---

## Task

Perform a security audit of the current codebase.

## Checks

1. **Secrets Detection**
   - Hardcoded passwords, API keys, tokens
   - .env files in repository
   - Configuration files with credentials

2. **Dependency Vulnerabilities**
   - Run `npm audit` for Node.js
   - Check for known CVEs in dependencies

3. **Code Patterns**
   - SQL/NoSQL injection risks
   - XSS vulnerabilities
   - Command injection
   - Path traversal
   - Insecure deserialization

4. **Configuration**
   - CORS settings
   - Cookie security flags
   - HTTPS enforcement
   - Error message exposure

## Output

Provide a security report with:
- Severity-ranked findings
- Specific file:line locations
- Remediation steps for each issue
