---
description: Review code changes for quality and security
allowed-tools: Read, Grep, Glob, Bash
---

## Context

Current git status:
!`git status --short 2>/dev/null || echo "Not a git repository"`

Recent changes (staged and unstaged):
!`git diff HEAD --stat 2>/dev/null || echo "No git history"`

## Task

Review all recent code changes focusing on:
1. **Security**: Look for vulnerabilities, exposed secrets, injection risks
2. **Logic**: Verify correctness, edge cases, error handling
3. **Performance**: Identify potential bottlenecks
4. **Style**: Check consistency with project conventions
5. **Tests**: Verify adequate test coverage

Provide actionable feedback organized by priority (Critical > Warning > Suggestion).

$ARGUMENTS
