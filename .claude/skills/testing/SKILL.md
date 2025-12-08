---
name: testing
description: Comprehensive testing skill for writing, running, and maintaining tests. Use when creating new features, fixing bugs, or ensuring test coverage.
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

# Testing Skill

## Purpose
Provide comprehensive testing capabilities including test writing, execution, and coverage analysis.

## Test Frameworks

### JavaScript/TypeScript
- **Jest**: Full-featured testing framework
- **Vitest**: Fast, Vite-native testing
- **Cypress**: E2E testing
- **Playwright**: Cross-browser E2E

### Java
- **JUnit 5**: Unit testing
- **Mockito**: Mocking framework
- **Spring Boot Test**: Integration testing

### Python
- **pytest**: Flexible testing framework
- **unittest**: Standard library testing

## Testing Patterns

### Unit Tests
```typescript
describe('functionName', () => {
  it('should handle normal case', () => {
    // Arrange
    const input = ...;

    // Act
    const result = functionName(input);

    // Assert
    expect(result).toEqual(expected);
  });

  it('should handle edge case', () => {...});
  it('should throw on invalid input', () => {...});
});
```

### Integration Tests
```typescript
describe('API endpoint', () => {
  it('should return correct data', async () => {
    const response = await request(app).get('/api/resource');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({...});
  });
});
```

### Test Best Practices
1. One assertion per test when possible
2. Descriptive test names (should...)
3. Arrange-Act-Assert pattern
4. Independent tests (no shared state)
5. Test behavior, not implementation
6. Mock external dependencies

## Coverage Guidelines

- Focus on critical paths
- Test edge cases and error scenarios
- Don't chase 100% coverage blindly
- Prioritize meaningful tests

## Capabilities

1. **Write Tests**: Generate appropriate tests for code
2. **Run Tests**: Execute test suites
3. **Analyze Failures**: Debug failing tests
4. **Improve Coverage**: Identify untested code paths
5. **Maintain Tests**: Update tests when code changes
