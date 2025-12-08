---
description: Create a well-formatted git commit
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git diff:*), Bash(git commit:*), Bash(git log:*)
argument-hint: [optional: commit message override]
---

## Context

Current status:
!`git status --short`

Changes to commit:
!`git diff --cached --stat`
!`git diff --stat`

Recent commit style:
!`git log --oneline -5 2>/dev/null || echo "No previous commits"`

## Task

1. Stage all relevant changes (exclude .env files, secrets, build artifacts)
2. Analyze the changes and create a commit message following conventional commits:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `refactor:` for refactoring
   - `docs:` for documentation
   - `test:` for tests
   - `chore:` for maintenance

3. The commit message should:
   - Be concise but descriptive (max 72 chars for first line)
   - Explain WHY, not just WHAT
   - Reference issue numbers if mentioned

$ARGUMENTS
