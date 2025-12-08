---
name: code-quality
description: Ensures code quality through automated checks, linting, and formatting. Use automatically when writing or modifying code to maintain consistent standards.
allowed-tools: Bash, Read, Edit, Glob, Grep
---

# Code Quality Skill

## Purpose
Automatically ensure code quality by running appropriate linters, formatters, and quality checks after code changes.

## Capabilities

### 1. Auto-detect Project Type
Identify the project type and available tools:
- Check for package.json (Node.js/TypeScript)
- Check for pom.xml/build.gradle (Java)
- Check for requirements.txt/pyproject.toml (Python)

### 2. Run Quality Checks

**TypeScript/JavaScript:**
```bash
# ESLint
npx eslint --fix <file>

# Prettier
npx prettier --write <file>

# Type checking
npx tsc --noEmit
```

**Java:**
```bash
# Checkstyle
./mvnw checkstyle:check

# SpotBugs
./mvnw spotbugs:check
```

**Python:**
```bash
# Black formatter
black <file>

# Flake8/pylint
flake8 <file>
```

### 3. Fix Common Issues
- Auto-fix linting errors when possible
- Format code to project standards
- Report unfixable issues for manual review

## Workflow

1. Detect project type from configuration files
2. Run appropriate linter/formatter
3. Apply auto-fixes where safe
4. Report remaining issues
5. Verify changes don't break functionality

## Quality Standards

- No unused variables or imports
- Consistent formatting throughout
- No lint errors or warnings
- Proper type annotations (TypeScript)
- Meaningful variable/function names
