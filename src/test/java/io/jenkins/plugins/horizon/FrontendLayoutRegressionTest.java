package io.jenkins.plugins.horizon;

import org.junit.jupiter.api.Test;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Regression test for Pipeline Horizon layout and single-row auto-fitting logic.
 * Ensures that changes to JavaScript or CSS do not re-introduce premature multi-row wrapping,
 * break the 0.70 readable zoom floor, or strip critical flex-wrap rules.
 */
public class FrontendLayoutRegressionTest {

    private final Path jsPath = Path.of("src", "main", "webapp", "js", "horizon-run.js");
    private final Path cssPath = Path.of("src", "main", "webapp", "css", "horizon-run.css");
    private final Path floatCssPath = Path.of("src", "main", "webapp", "css", "horizon-float.css");
    private final Path floatJsPath = Path.of("src", "main", "webapp", "js", "horizon-float.js");
    private final Path floatingBoxJellyPath = Path.of("src", "main", "resources", "io", "jenkins", "plugins", "horizon", "HorizonJobAction", "floatingBox.jelly");
    private final Path summaryJellyPath = Path.of("src", "main", "resources", "io", "jenkins", "plugins", "horizon", "HorizonRunAction", "summary.jelly");
    private final Path testScriptPath = Path.of("test", "layout-wrap.test.mjs");

    @Test
    public void testJavaScriptLayoutRulesAndConstants() throws Exception {
        assertTrue(Files.exists(jsPath), "horizon-run.js must exist at " + jsPath);
        String js = Files.readString(jsPath, StandardCharsets.UTF_8);

        // 1. Single row threshold constant
        Matcher scaleMatcher = Pattern.compile("var\\s+WRAP_MIN_SINGLE_ROW_SCALE\\s*=\\s*([0-9.]+);").matcher(js);
        assertTrue(scaleMatcher.find(), "WRAP_MIN_SINGLE_ROW_SCALE constant must be declared in horizon-run.js");
        double scale = Double.parseDouble(scaleMatcher.group(1));
        assertEquals(0.70, scale, 0.001, "WRAP_MIN_SINGLE_ROW_SCALE must be exactly 0.70");

        // 2. Natural width measurement function
        assertTrue(js.contains("function measureCanvasNaturalWidth(canvas)"),
                "measureCanvasNaturalWidth function must be defined");
        assertTrue(js.contains("canvas.classList.add('wrap-measuring')"),
                "measureCanvasNaturalWidth must add wrap-measuring class");
        assertTrue(js.contains("canvas.classList.remove('wrap-measuring')"),
                "measureCanvasNaturalWidth must remove wrap-measuring class");

        // 3. Single-row class application in applyCanvasZoom
        assertTrue(js.contains("canvas.classList.add('wrap-single-row')"),
                "applyCanvasZoom must apply wrap-single-row when graph fits single row");
        assertTrue(js.contains("canvas.classList.remove('wrap-single-row')"),
                "applyCanvasZoom must remove wrap-single-row when graph wraps");

        // 4. Auto-fit preference for single row
        assertTrue(js.contains("oneRowScale >= WRAP_MIN_SINGLE_ROW_SCALE"),
                "autoFitPipelineGraph must compare oneRowScale against WRAP_MIN_SINGLE_ROW_SCALE");
    }

    @Test
    public void testCssLayoutRules() throws Exception {
        assertTrue(Files.exists(cssPath), "horizon-run.css must exist at " + cssPath);
        String css = Files.readString(cssPath, StandardCharsets.UTF_8);

        // 1. .wrap-single-row rule
        assertTrue(css.contains(".pipeline-flow.wrap-mode .pipeline-flow-canvas.wrap-single-row"),
                "CSS must define .pipeline-flow.wrap-mode .pipeline-flow-canvas.wrap-single-row");
        Matcher wrapMatcher = Pattern.compile("wrap-single-row\\s*\\{[^}]*flex-wrap:\\s*nowrap", Pattern.DOTALL).matcher(css);
        assertTrue(wrapMatcher.find(), ".wrap-single-row must enforce flex-wrap: nowrap to prevent subpixel breaks");

        // 2. .wrap-measuring probe rule
        assertTrue(css.contains(".wrap-measuring"), "CSS must define .wrap-measuring for layout probes");
        Matcher probeMatcher = Pattern.compile("wrap-measuring\\s*\\{([^}]+)\\}", Pattern.DOTALL).matcher(css);
        assertTrue(probeMatcher.find(), ".wrap-measuring rule body must exist");
        String probeBody = probeMatcher.group(1);
        assertTrue(probeBody.contains("flex-wrap: nowrap !important"),
                ".wrap-measuring must have flex-wrap: nowrap !important");
        assertTrue(probeBody.contains("flex-shrink: 0 !important"),
                ".wrap-measuring must have flex-shrink: 0 !important");
        assertTrue(probeBody.contains("width: max-content !important"),
                ".wrap-measuring must have width: max-content !important");
    }

    @Test
    public void testJobRootFloatingBoxAndArtifactIntegration() throws Exception {
        assertTrue(Files.exists(floatingBoxJellyPath), "floatingBox.jelly must exist");
        String jelly = Files.readString(floatingBoxJellyPath, StandardCharsets.UTF_8);

        assertTrue(jelly.contains("id=\"horizon-job-floating-card\""),
                "floatingBox.jelly must provide id horizon-job-floating-card for layout hoisting");
        assertTrue(jelly.contains("function hoistHorizonCard()"),
                "floatingBox.jelly must include hoistHorizonCard to break out of Jenkins float:right container");
        assertTrue(jelly.contains("details.artifactCount"),
                "floatingBox.jelly must check artifactCount to display artifacts badge");
        assertTrue(jelly.contains("status-artifacts"),
                "floatingBox.jelly must render the status-artifacts badge in the compact header");
        assertTrue(jelly.contains("horizon-floating-actions"),
                "floatingBox.jelly must integrate actions into the compact header");
        assertTrue(jelly.contains("horizon-float-rail-track"),
                "floatingBox.jelly must render segmented rail track for high stage counts");
        assertTrue(jelly.contains("horizon-float-stage-track"),
                "floatingBox.jelly must render compact connected pills for standard stage counts");
        // Verify elimination of redundant file chips that overloaded the view and duplicated the Last Successful Artifacts section below
        assertFalse(jelly.contains("horizon-float-artifacts-strip"),
                "floatingBox.jelly must not render redundant artifact strip which bloats the view");

        // Verify cache-first SSR and non-blocking async hydration on cold cache / live builds
        assertTrue(jelly.contains("cachedLastRunPreview"),
                "floatingBox.jelly must use cachedLastRunPreview to avoid blocking SSR on cold cache");
        assertTrue(jelly.contains("fastLastRunSummary"),
                "floatingBox.jelly must use zero-I/O fastLastRunSummary for immediate SSR shell");
        assertFalse(jelly.contains("action.lastRunDetails"),
                "floatingBox.jelly must not synchronously invoke uncached full run details on SSR");
        assertTrue(jelly.contains("horizon-float-stage-skeleton"),
                "floatingBox.jelly must provide zero-CLS skeleton while hydrating async preview");
        assertTrue(jelly.contains("apiLastRunPreview"),
                "floatingBox.jelly must configure async apiLastRunPreview hydration URL");

        assertTrue(Files.exists(summaryJellyPath), "summary.jelly must exist");
        String summaryJelly = Files.readString(summaryJellyPath, StandardCharsets.UTF_8);
        assertTrue(summaryJelly.contains("cachedRunPreview"),
                "summary.jelly must use cachedRunPreview for non-blocking SSR");
        assertTrue(summaryJelly.contains("apiRunPreview"),
                "summary.jelly must support async apiRunPreview hydration");

        assertTrue(Files.exists(floatJsPath), "horizon-float.js must exist");
        String floatJs = Files.readString(floatJsPath, StandardCharsets.UTF_8);
        assertTrue(floatJs.contains("hydrateCard"), "horizon-float.js must hydrate pending preview cards");

        assertTrue(Files.exists(floatCssPath), "horizon-float.css must exist");
        String floatCss = Files.readString(floatCssPath, StandardCharsets.UTF_8);

        assertTrue(floatCss.contains("width: 100%"), "horizon-float.css must set width: 100% on floating card");
        assertTrue(floatCss.contains("clear: both"), "horizon-float.css must set clear: both on floating card");
        assertTrue(floatCss.contains(".horizon-float-badge.status-artifacts"),
                "horizon-float.css must style status-artifacts badge");
        assertTrue(floatCss.contains(".horizon-float-rail-track"),
                "horizon-float.css must style segmented rail track");
        assertTrue(floatCss.contains(".horizon-float-rail-seg"),
                "horizon-float.css must style segmented rail individual blocks");
        assertTrue(floatCss.contains(".horizon-float-stage-pill"),
                "horizon-float.css must style stage pills");
        assertTrue(floatCss.contains(".horizon-float-stage-skeleton"),
                "horizon-float.css must style loading skeleton");
    }

    @Test
    public void testNodeLayoutTestSuiteExecution() throws Exception {
        if (!Files.exists(testScriptPath)) {
            return;
        }

        // Check if node is available on the host
        boolean nodeAvailable = false;
        try {
            Process p = new ProcessBuilder("node", "--version").start();
            nodeAvailable = (p.waitFor() == 0);
        } catch (Exception ignored) {
            // Node not in path
        }

        if (!nodeAvailable) {
            System.out.println("[INFO] Node.js not detected in PATH; skipped node --test execution in Maven test");
            return;
        }

        // Run node --test test/layout-wrap.test.mjs
        ProcessBuilder pb = new ProcessBuilder("node", "--test", testScriptPath.toString());
        pb.redirectErrorStream(true);
        Process p = pb.start();

        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }
        }

        int exitCode = p.waitFor();
        assertEquals(0, exitCode, "Node layout test suite failed:\n" + output);
    }
}
