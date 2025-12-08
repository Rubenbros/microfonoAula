# Claude Code Development Environment

## Project Overview
This is a multi-purpose development workspace optimized for Claude Code. It supports various project types including web frontend, backend APIs, and full-stack applications.

## Supported Stacks
- **TypeScript/JavaScript**: Node.js, React, Next.js, Express, NestJS
- **Java**: Spring Boot, Maven/Gradle
- **Python**: FastAPI, Django (when needed)
- **Databases**: PostgreSQL, MySQL, MongoDB

## Code Standards

### General
- Use descriptive variable and function names
- Prefer composition over inheritance
- Write self-documenting code; add comments only for complex logic
- Follow SOLID principles
- Keep functions small and focused (single responsibility)

### TypeScript/JavaScript
- Use TypeScript for all new code when possible
- Prefer `const` over `let`, avoid `var`
- Use async/await over raw Promises
- Use ESLint + Prettier for formatting
- Prefer named exports over default exports

### Java Spring
- Follow Spring Boot best practices
- Use constructor injection over field injection
- Keep controllers thin, business logic in services
- Use DTOs for API responses
- Apply proper exception handling with @ControllerAdvice

## Git Workflow
- Branch naming: `feature/description`, `fix/description`, `refactor/description`
- Commit messages: Use conventional commits (feat:, fix:, docs:, refactor:, test:, chore:)
- Require PR reviews before merging
- Squash commits when merging feature branches

## Testing
- Write unit tests for business logic
- Use integration tests for APIs
- Aim for meaningful coverage, not 100%
- Test edge cases and error scenarios

## Security
- Never commit secrets or credentials
- Use environment variables for configuration
- Validate all user input
- Sanitize data before database queries
- Follow OWASP guidelines

## Common Commands
These vary by project. Check project-specific README for details.

## Architecture Patterns
- **Frontend**: Component-based architecture, custom hooks for logic
- **Backend**: Layered architecture (Controller -> Service -> Repository)
- **APIs**: RESTful design, consistent error responses

## When Reviewing Code
1. Check for security vulnerabilities
2. Verify error handling
3. Look for performance issues
4. Ensure tests are adequate
5. Validate code style consistency

## Preferences
- Prefer simple solutions over clever ones
- Avoid premature optimization
- Make changes incrementally
- Test changes before committing
