---
description: Create a pull request with proper description
allowed-tools: Bash(git:*), Bash(gh:*), Read, Grep
argument-hint: [optional: PR title]
---

## Context

Current branch:
!`git branch --show-current`

Commits in this branch (vs main):
!`git log main..HEAD --oneline 2>/dev/null || git log origin/main..HEAD --oneline 2>/dev/null || echo "Could not determine commits"`

Changed files:
!`git diff main --stat 2>/dev/null || git diff origin/main --stat 2>/dev/null || echo "Could not determine changes"`

## Task

Create a pull request:

1. Ensure all changes are committed
2. Push branch to remote if needed
3. Create PR with:
   - Clear, descriptive title
   - Summary of changes (bullet points)
   - Test plan (how to verify)
   - Any breaking changes or migration notes

Title override: $ARGUMENTS
