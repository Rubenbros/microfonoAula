---
description: Run tests and analyze failures
allowed-tools: Bash, Read, Grep, Glob
argument-hint: [optional: specific test file or pattern]
---

## Context

Detect test framework:
!`if [ -f "package.json" ]; then cat package.json | grep -E "(jest|vitest|mocha|cypress)" | head -5; fi`
!`if [ -f "pom.xml" ]; then echo "Maven project detected"; fi`
!`if [ -f "build.gradle" ]; then echo "Gradle project detected"; fi`

## Task

1. Identify the test framework and configuration
2. Run the appropriate test command:
   - For JS/TS: `npm test` or `npm run test`
   - For Java Maven: `./mvnw test`
   - For Java Gradle: `./gradlew test`

3. If tests fail:
   - Analyze the failure messages
   - Identify the root cause
   - Suggest or implement fixes
   - Re-run to verify

4. Report summary with pass/fail counts

Target: $ARGUMENTS
