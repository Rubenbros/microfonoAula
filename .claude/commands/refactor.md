---
description: Refactor code for better quality
allowed-tools: Read, Edit, Grep, Glob, Bash
argument-hint: <file or area to refactor>
---

## Task

Refactor: $ARGUMENTS

## Guidelines

1. **Preserve behavior**: No functional changes unless explicitly requested
2. **Incremental changes**: Small, reviewable improvements
3. **Run tests**: Verify nothing breaks after each change
4. **Explain changes**: Document what was improved and why

## Common Refactoring Patterns

- **Extract function**: Break large functions into smaller ones
- **Rename**: Improve naming for clarity
- **Remove duplication**: DRY principle
- **Simplify conditionals**: Reduce complexity
- **Improve structure**: Better organization

## Process

1. Analyze current code quality
2. Identify specific improvements
3. Make changes incrementally
4. Run tests after each change
5. Summarize all improvements made
