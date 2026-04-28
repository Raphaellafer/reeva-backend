# Phase 1 Plan 6: Test Environment and Quality Gate

## Goal

Make the project testable in the intended Java 21 environment and document the quality gate for future GSD execution.

## Context

`mvn test` currently fails under Java 25 because Mockito/Byte Buddy does not support that runtime combination. The project targets Java 21 and Docker uses Java 21.

## Tasks

1. Document JDK 21 as the required local test runtime.
2. Add a project note or script guidance for setting `JAVA_HOME` to JDK 21.
3. Consider Maven Enforcer plugin to catch unsupported Java versions, if it does not hurt developer setup.
4. Run:
   - `mvn test`
   - `mvn -DskipTests package`
   - `npm run build` in `frontend`
5. Record results in `.planning/STATE.md`.

## Verification

- Tests run under JDK 21 or the blocker is clearly documented.
- Future GSD plans know the quality gate.

## Done

The team has a reliable validation path before executing broader MVP work.

