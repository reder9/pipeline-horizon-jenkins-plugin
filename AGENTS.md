# AGENTS.md — Jenkins Pipeline Horizon Plugin (`pipeline-horizon`)

## Overview
- **Plugin ID**: `pipeline-horizon`
- **Repository**: `reder9/pipeline-horizon-jenkins-plugin` (`jenkinsci/pipeline-horizon-plugin`)
- **Java Package**: `io.jenkins.plugins.horizon`
- **Jenkins Baseline**: `2.555.x` (`org.jenkins-ci.plugins:plugin:6.2250.va_d01d559a_209`, Java 17 / 21+)

Provides a modern pipeline visualization, stage/step graph analyzer, log explorer, test failure inspector, SCM commit linker, and multi-branch dashboard for Jenkins Pipeline jobs and runs.

---

## Build, Test & Verification Commands

### Prerequisites
- **JDK**: Java 21 (recommended) or Java 17+
- **Maven**: Apache Maven `3.9+`

### Core Maven Commands
```bash
# Full build, unit/integration tests, SpotBugs, and Enforcer checks (always run before opening a PR)
mvn clean verify

# Run unit tests quickly (skipping slow InjectedTest Jelly scan during development)
mvn test -Dtest=!InjectedTest

# Run a specific test class
mvn test -Dtest=PipelineGraphAnalyzerTest
mvn test -Dtest=HorizonPipelineIntegrationTest

# Run SpotBugs and Maven Enforcer checks directly
mvn spotbugs:check enforcer:enforce

# Package the .hpi plugin artifact without running tests
mvn clean package -DskipTests

# Start a local Jenkins instance at http://localhost:8080/jenkins
mvn hpi:run
```

---

## Architecture & Source Layout

- `src/main/java/io/jenkins/plugins/horizon/`
  - `HorizonJobAction.java` & `HorizonJobActionFactory.java` — Job-level pipeline dashboard action, floating trend box, and JSON API endpoints.
  - `HorizonRunAction.java` & `HorizonRunActionFactory.java` — Run-level pipeline DAG viewer, stage/step log streaming, test failure inspector, pending input handler, and build summary widget.
  - `HorizonMultiBranchAction.java` & `HorizonMultiBranchActionFactory.java` — Multi-branch pipeline health overview (`WorkflowMultiBranchProject`).
  - `HorizonUserProperty.java` — Per-user preferences for Pipeline Horizon views.
  - `analysis/PipelineGraphAnalyzer.java` — Traverses `FlowExecution` / `FlowNode` graphs (`BlockStartNode`, `StepAtomNode`, parallel branches) into structured stage and step models.
  - `model/` — Immutable view models (`JobSummaryModel`, `MultiBranchSummaryModel`, `RunSummaryModel`, `RunDetailsModel`, `StageModel`, `StageTrendModel`, `StepModel`, `TestCaseModel`, `ArtifactModel`, `PendingInputModel`, `QueueItemModel`, `BuildParameterModel`, `JobParameterModel`).
  - `util/EncodingUtils.java` & `util/ScmLinkResolver.java` — Safe HTML/JSON encoding and GitHub/GitLab/Bitbucket commit/branch URL resolution.
- `src/main/resources/io/jenkins/plugins/horizon/` & `src/main/webapp/`
  - Jelly views (`HorizonJobAction/`, `HorizonRunAction/`, `HorizonMultiBranchAction/`, `HorizonUserProperty/`) and frontend assets (`css/horizon-*.css`, `js/horizon-*.js`).
- `src/test/java/io/jenkins/plugins/horizon/`
  - `HorizonActionTest.java`, `HorizonPipelineIntegrationTest.java`, `PipelineValidationTest.java`, `FrontendLayoutRegressionTest.java`, `HorizonUserPropertyTest.java`, `analysis/PipelineGraphAnalyzerTest.java`, `model/*Test.java`, `util/*Test.java`.

---

## Coding, Security & UI Guardrails

1. **Endpoint Security & Permissions**:
   - Require `@POST` (`@RequirePOST`) on all mutating Stapler endpoints (such as triggering builds, submitting `InputAction` approvals/aborts, or replaying runs).
   - Enforce `Item.READ`, `Item.BUILD`, or `Run.Replay` permissions appropriately before returning data or executing actions.
2. **Jenkins CSP & UI Standards**:
   - Keep all JavaScript in `src/main/webapp/js/horizon-*.js` and CSS in `src/main/webapp/css/horizon-*.css` without inline `<script>` blocks or inline event handlers in `.jelly` files.
   - Use theme-aware CSS variables so both Jenkins light and dark themes are supported.
   - Never use raw emojis in UI templates, Java strings, or badges; use SVG iconography.
   - Never call native browser `alert()`, `confirm()`, or `prompt()`; use custom styled modals, inline drawers, or toast notifications.
3. **Pull Request & Dependency Hygiene**:
   - Keep BOM/parent POM updates separate from feature/bugfix PRs unless required by an API change, and verify `mvn spotbugs:check` passes with 0 warnings.
