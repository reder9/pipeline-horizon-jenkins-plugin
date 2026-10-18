# Pipeline Horizon Jenkins Plugin

[![CI](https://github.com/reder9/pipeline-horizon-jenkins-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/reder9/pipeline-horizon-jenkins-plugin/actions/workflows/ci.yml)
[![Release](https://github.com/reder9/pipeline-horizon-jenkins-plugin/actions/workflows/release.yml/badge.svg)](https://github.com/reder9/pipeline-horizon-jenkins-plugin/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Pipeline Horizon** is a modern, interactive pipeline visualizer, live step log inspector, and build control center for Jenkins Pipelines. Designed as a fast, lightweight successor to Blue Ocean and the Pipeline Graph View plugin, it integrates directly into existing Jenkins Pipeline jobs and builds without requiring a separate single-page application overhaul.

---

## Quick Installation (Pre-Update Center / Direct `.hpi`)

Before or independent of Jenkins Update Center hosting, you can install **Pipeline Horizon** directly into any Jenkins controller (baseline `2.555+`) using the published `.hpi` artifact from [GitHub Releases](https://github.com/reder9/pipeline-horizon-jenkins-plugin/releases):

### Option 1: Jenkins Web UI (Upload or URL)
1. Download `pipeline-horizon.hpi` from the [**Latest GitHub Release**](https://github.com/reder9/pipeline-horizon-jenkins-plugin/releases/latest/download/pipeline-horizon.hpi).
2. In Jenkins, navigate to **Manage Jenkins** -> **Plugins** -> **Advanced settings**.
3. Under **Deploy Plugin**, upload `pipeline-horizon.hpi` (or paste `https://github.com/reder9/pipeline-horizon-jenkins-plugin/releases/latest/download/pipeline-horizon.hpi`) and click **Deploy**.

### Option 2: `jenkins-plugin-cli` / Dockerfile
```dockerfile
RUN jenkins-plugin-cli --plugins \
    workflow-aggregator \
    pipeline-graph-analysis \
    ionicons-api \
    https://github.com/reder9/pipeline-horizon-jenkins-plugin/releases/latest/download/pipeline-horizon.hpi
```

---

## Key Features

### 1. Interactive Stage Execution DAG (`/job/{jobName}/{buildNumber}/horizon/`)
- **Pan & Zoom Flow Canvas:** Smooth SVG bezier stage connectors with animated in-progress stage glows, Comfort/Compact density toggle, and full-screen mode.
- **Parallel & Nested Stage Grouping:** Clearly groups parallel branches with wall-clock duration headers, `% of par` branch share, and `% of run` timing pills.
- **Conditional (`when`) & Skipped Stages:** Preserves skipped stages in the graph with dashed borders and explicit skip-reason badges (`when condition evaluated to false`, `Upstream Failure`) so pipeline topology never disappears.
- **Bottleneck Detection:** Automatically highlights the slowest stage on the critical path (`Slowest` badge) with proportional duration bars.
- **Multi-Agent Transparency:** Displays the executor node/pod badge directly on each stage card and provides an interactive **Build Agents Breakdown Modal** showing stage distribution across nodes.

### 2. Inline Step Inspector & Live Log Drawer
- **Accordion Step Drawer:** Clicking any stage opens its step execution breakdown (`sh`, `bat`, `checkout`, `junit`, `input`, etc.) with per-step durations and status badges.
- **ANSI Color & Timestamp Support:** Full ANSI 16/256-color and truecolor rendering, optional `[HH:mm:ss]` log timestamps, in-log keyword search with match navigation, raw log download, and one-click copy.
- **Smart Failure Triage Banner:** Automatically pinpoints the exact failed stage and step with a one-click **Jump to Error** button.

### 3. Full Pipeline Control Center
- **Interactive `input` Step Approval:** Detects `PAUSED_INPUT` stages and surfaces a high-visibility approval banner and parameter modal so users can **Approve / Proceed** or **Abort** paused pipelines directly from Horizon.
- **Stop / Cancel Running Builds:** One-click **Stop Build** button on both the Run view and Job Activity table with confirmation and CSRF crumb handling.
- **Restart from Stage & Replay Jenkinsfile:** Trigger **Restart from Stage** (for Declarative Pipelines) or open the built-in **Replay Modal** to edit and re-run the `Jenkinsfile` script in-place.
- **Rebuild with Parameters:** View build parameters or launch a customized **Rebuild** directly from the run header.

### 4. Test Results, Artifacts & SCM Changes Modals
- **JUnit Test Explorer Modal:** Filter tests by `Failed`, `Skipped`, or `Passed`, search by class/test name, and inspect failure stack traces and `stdout`/`stderr`.
- **Build Artifacts Modal:** Browse and download archived build artifacts with file-size formatting.
- **SCM Commits & Changes:** Inspect commits, authors, and affected file counts associated with the run.
- **First-Class Light & Dark Themes:** Automatically adapts to Jenkins Theme Manager (`dark` / `light` / `system`) or user preferences.

---

## Enterprise Performance & Security Architecture

1. **Sub-Millisecond Completed Build Caching:**
   - Completed pipeline builds are immutable. Horizon maintains a thread-safe bounded in-memory LRU cache (256 runs) for `RunDetailsModel`.
   - Subsequent page views and dashboard switches return in **< 1ms** without re-traversing the FlowNode graph or causing GC churn.
2. **Page Visibility API Auto-Throttling:**
   - When a user minimizes or switches away from an in-progress build tab, Horizon detects `document.hidden` and automatically pauses all polling intervals.
   - When the user returns, Horizon refreshes immediately and resumes polling if the build is still active—eliminating background controller flooding.
3. **Tail-Safe Log Streaming:**
   - Inline log drawers cap memory consumption to the last 512 KB (`MAX_LOG_BYTES`) with an automatic notice and direct raw download link for full logs, preventing browser memory exhaustion.
4. **Strict Security & RBAC Enforcement:**
   - All REST APIs (`apiGraph`, `apiLog`, `apiRuns`) strictly enforce `Item.READ` permissions, respecting Jenkins Matrix, Folder-level, and Role-Based Access Control (RBAC).
   - All build mutations (`apiAbort`, `apiRestartStage`, `apiReplayRun`, `apiRebuild`, `apiInputSubmit`, `apiInputAbort`) require POST requests (`@RequirePOST`), appropriate write permissions (`Item.BUILD`, `Item.CANCEL`), and valid CSRF crumbs.

---

## Diagnostics & Logging

Jenkins administrators can monitor and troubleshoot Horizon pipeline parsing in real time without restarting Jenkins:

1. In Jenkins, navigate to **Manage Jenkins** -> **System Log** -> **Add new log recorder**.
2. Name the recorder `Pipeline Horizon` and add the logger:
   - Logger: `io.jenkins.plugins.horizon`
   - Log Level: `FINE` (for graph building and lifecycle events) or `FINER` (for detailed block traversal).

---

## Building from Source

Requirements: **Java 21+** and **Maven 3.9+**.

```bash
# Run unit tests, JenkinsRule integration tests, and SpotBugs checks
mvn clean verify

# Package target/pipeline-horizon.hpi without running tests
mvn clean package -DskipTests
```

---

## License

Licensed under the [MIT License](LICENSE).
