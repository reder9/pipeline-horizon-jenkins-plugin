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
