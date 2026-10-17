package io.jenkins.plugins.horizon.model;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RunDetailsModelTest {

    @Test
    void testBasicPropertiesAndFlags() {
        RunDetailsModel model = new RunDetailsModel();
        model.setNumber(42);
        model.setResult("SUCCESS");
        model.setBuilding(false);
        model.setDuration(15420L);
        model.setTimestamp(1700000000000L);
        model.setCauses(Collections.singletonList("Branch indexing"));
        model.setAgentsUsed(Arrays.asList("docker-agent", "built-in"));

        assertEquals(42, model.getNumber());
        assertEquals("SUCCESS", model.getResult());
        assertFalse(model.isBuilding());
        assertEquals(15420L, model.getDuration());
        assertEquals(1700000000000L, model.getTimestamp());
        assertEquals(1, model.getCauses().size());
        assertEquals("Branch indexing", model.getCauses().get(0));
        assertEquals(2, model.getAgentsUsed().size());
    }

    @Test
    void testTestMetrics() {
        RunDetailsModel model = new RunDetailsModel();
        model.setTotalTests(150);
        model.setFailedTests(2);
        model.setSkippedTests(5);

        assertEquals(150, model.getTotalTests());
        assertEquals(2, model.getFailedTests());
        assertEquals(5, model.getSkippedTests());
    }

    @Test
    void testArtifactsCollection() {
        RunDetailsModel model = new RunDetailsModel();
        ArtifactModel a1 = new ArtifactModel("app.tar.gz", "dist/app.tar.gz", "app.tar.gz", "dist/app.tar.gz", 1024L, "1.0 KB");
        ArtifactModel a2 = new ArtifactModel("test.json", "reports/test.json", "test.json", "reports/test.json", 2048L, "2.0 KB");

        model.setArtifacts(Arrays.asList(a1, a2));
        model.setArtifactCount(2);
        model.setTotalArtifactSize(3072L);
        model.setFormattedTotalArtifactSize("3.0 KB");

        assertNotNull(model.getArtifacts());
        assertEquals(2, model.getArtifacts().size());
        assertEquals(2, model.getArtifactCount());
        assertEquals(3072L, model.getTotalArtifactSize());
        assertEquals("3.0 KB", model.getFormattedTotalArtifactSize());
        assertEquals("app.tar.gz", model.getArtifacts().get(0).getName());
    }

    @Test
    void testReplayRebuildRestartCapabilities() {
        RunDetailsModel model = new RunDetailsModel();
        model.setReplayEnabled(true);
        model.setOriginalScript("pipeline { agent any; stages { stage('Build') { steps { echo 'hello' } } } }");
        model.setRebuildEnabled(true);
        model.setRestartEnabled(true);
        model.setRestartableStages(Arrays.asList("Build", "Test", "Deploy"));

        assertTrue(model.isReplayEnabled());
        assertNotNull(model.getOriginalScript());
        assertTrue(model.isRebuildEnabled());
        assertTrue(model.isRestartEnabled());
        assertEquals(3, model.getRestartableStages().size());
        assertEquals("Build", model.getRestartableStages().get(0));
    }

    @Test
    void testStagesAssociation() {
        RunDetailsModel model = new RunDetailsModel();
        StageModel stage = new StageModel();
        stage.setId("10");
        stage.setName("Checkout");
        stage.setStatus("SUCCESS");

        model.setStages(Collections.singletonList(stage));
        assertEquals(1, model.getStages().size());
        assertEquals("Checkout", model.getStages().get(0).getName());
    }

    @Test
    void testAgentQueueMetrics() {
        RunDetailsModel model = new RunDetailsModel();
        model.setControllerQueueWaitMillis(450L);
        model.setFormattedControllerQueueWait("450ms");
        model.setAgentAllocationMillis(1200L);
        model.setFormattedAgentAllocation("1.2s");
        model.setQueueWaitMillis(1650L);
        model.setFormattedQueueWait("1.6s");
        model.setWaitingForAgent(true);
        model.setAgentQueueReason("All nodes with label 'linux' are offline");

        assertEquals(450L, model.getControllerQueueWaitMillis());
        assertEquals("450ms", model.getFormattedControllerQueueWait());
        assertEquals(1200L, model.getAgentAllocationMillis());
        assertEquals("1.2s", model.getFormattedAgentAllocation());
        assertEquals(1650L, model.getQueueWaitMillis());
        assertEquals("1.6s", model.getFormattedQueueWait());
        assertTrue(model.isWaitingForAgent());
        assertEquals("All nodes with label 'linux' are offline", model.getAgentQueueReason());
    }
}
