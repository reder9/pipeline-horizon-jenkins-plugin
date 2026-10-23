package io.jenkins.plugins.horizon.analysis;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PipelineGraphAnalyzerTest {

    @Test
    void testFormatBytesZeroAndNegative() {
        assertEquals("0 B", PipelineGraphAnalyzer.formatBytes(0));
        assertEquals("0 B", PipelineGraphAnalyzer.formatBytes(-1));
        assertEquals("0 B", PipelineGraphAnalyzer.formatBytes(-1024));
    }

    @Test
    void testFormatBytesSubKilobyte() {
        assertEquals("1 B", PipelineGraphAnalyzer.formatBytes(1));
        assertEquals("122 B", PipelineGraphAnalyzer.formatBytes(122));
        assertEquals("512 B", PipelineGraphAnalyzer.formatBytes(512));
        assertEquals("1023 B", PipelineGraphAnalyzer.formatBytes(1023));
    }

    @Test
    void testFormatBytesKilobytes() {
        assertEquals("1.0 KB", PipelineGraphAnalyzer.formatBytes(1024));
        assertEquals("1.5 KB", PipelineGraphAnalyzer.formatBytes(1536));
        assertEquals("10.0 KB", PipelineGraphAnalyzer.formatBytes(10240));
        assertEquals("512.0 KB", PipelineGraphAnalyzer.formatBytes(524288));
    }

    @Test
    void testFormatBytesMegabytes() {
        assertEquals("1.0 MB", PipelineGraphAnalyzer.formatBytes(1048576));
        assertEquals("14.2 MB", PipelineGraphAnalyzer.formatBytes(14889984L));
        assertEquals("100.0 MB", PipelineGraphAnalyzer.formatBytes(104857600L));
    }

    @Test
    void testFormatBytesGigabytes() {
        assertEquals("1.0 GB", PipelineGraphAnalyzer.formatBytes(1073741824L));
        assertEquals("4.5 GB", PipelineGraphAnalyzer.formatBytes(4831838208L));
    }

    @Test
    void testMatchesAntPattern() {
        org.junit.jupiter.api.Assertions.assertTrue(PipelineGraphAnalyzer.matchesAntPattern("dist/**", "dist/binaries/app.bin"));
        org.junit.jupiter.api.Assertions.assertTrue(PipelineGraphAnalyzer.matchesAntPattern("dist/**", "dist/manifest.json"));
        org.junit.jupiter.api.Assertions.assertTrue(PipelineGraphAnalyzer.matchesAntPattern("*.xml", "test.xml"));
        org.junit.jupiter.api.Assertions.assertTrue(PipelineGraphAnalyzer.matchesAntPattern("target/*.hpi", "target/pipeline-horizon.hpi"));
        org.junit.jupiter.api.Assertions.assertFalse(PipelineGraphAnalyzer.matchesAntPattern("target/*.hpi", "src/Main.java"));
        org.junit.jupiter.api.Assertions.assertTrue(PipelineGraphAnalyzer.matchesAntPattern("**", "any/file/at/all.txt"));
    }

    @Test
    void testPendingInputModelAndTestCaseModel() {
        io.jenkins.plugins.horizon.model.PendingInputModel input = new io.jenkins.plugins.horizon.model.PendingInputModel();
        input.setId("DeployApproval");
        input.setMessage("Deploy to production?");
        input.setOk("Deploy Now");
        input.setSubmitter("ops-team");
        input.setStepId("42");

        assertEquals("DeployApproval", input.getId());
        assertEquals("Deploy to production?", input.getMessage());
        assertEquals("Deploy Now", input.getOk());
        assertEquals("Deploy Now", input.getOkLabel());
        assertEquals("ops-team", input.getSubmitter());
        assertEquals("42", input.getStepId());

        io.jenkins.plugins.horizon.model.TestCaseModel tc = new io.jenkins.plugins.horizon.model.TestCaseModel();
        tc.setName("shouldCalculateTotal");
        tc.setClassName("com.example.CartTest");
        tc.setSuiteName("CartSuite");
        tc.setStatus("FAILED");
        tc.setDurationSeconds(0.125);
        tc.setErrorDetails("Expected 100 but was 99");
        tc.setErrorStackTrace("java.lang.AssertionError: Expected 100 but was 99");
        tc.setAge(3);

        assertEquals("shouldCalculateTotal", tc.getName());
        assertEquals("com.example.CartTest", tc.getClassName());
        assertEquals("CartSuite", tc.getSuiteName());
        assertEquals("FAILED", tc.getStatus());
        assertEquals(0.125, tc.getDurationSeconds());
        assertEquals("Expected 100 but was 99", tc.getErrorDetails());
        assertEquals(3, tc.getAge());
    }

    @Test
    void testFormatMatrixAxes() {
        assertEquals("", PipelineGraphAnalyzer.formatMatrixAxes(null, true));
        assertEquals("", PipelineGraphAnalyzer.formatMatrixAxes("", false));

        String raw = "PLATFORM = 'linux', BROWSER = 'chrome'";
        assertEquals("linux · chrome", PipelineGraphAnalyzer.formatMatrixAxes(raw, true));
        assertEquals("PLATFORM: linux · BROWSER: chrome", PipelineGraphAnalyzer.formatMatrixAxes(raw, false));

        String rawUnquoted = "OS = windows, JDK = 21";
        assertEquals("windows · 21", PipelineGraphAnalyzer.formatMatrixAxes(rawUnquoted, true));
        assertEquals("OS: windows · JDK: 21", PipelineGraphAnalyzer.formatMatrixAxes(rawUnquoted, false));

        String single = "ARCH = arm64";
        assertEquals("arm64", PipelineGraphAnalyzer.formatMatrixAxes(single, true));
        assertEquals("ARCH: arm64", PipelineGraphAnalyzer.formatMatrixAxes(single, false));
    }
}

