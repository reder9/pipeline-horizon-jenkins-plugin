package io.jenkins.plugins.horizon.model;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StageAndStepModelTest {

    @Test
    void testStepModelProperties() {
        StepModel step = new StepModel();
        step.setId("42");
        step.setName("sh");
        step.setDisplayName("Shell Script");
        step.setStatus("SUCCESS");
        step.setDurationMillis(2300L);
        step.setStartTimeMillis(1700000002000L);
        step.setHasLogs(true);
        step.setOptional(false);
        step.setError("");

        assertEquals("42", step.getId());
        assertEquals("sh", step.getName());
        assertEquals("Shell Script", step.getDisplayName());
        assertEquals("SUCCESS", step.getStatus());
        assertEquals(2300L, step.getDurationMillis());
        assertEquals(1700000002000L, step.getStartTimeMillis());
        assertTrue(step.isHasLogs());
        assertFalse(step.isOptional());
        assertEquals("", step.getError());
    }

    @Test
    void testStepModelOptionalAndError() {
        StepModel step = new StepModel();
        step.setId("43");
        step.setName("warnError");
        step.setDisplayName("Catch error and set build and stage result to unstable");
        step.setStatus("UNSTABLE");
        step.setOptional(true);
        step.setError("Non-fatal warning detected");

        assertTrue(step.isOptional());
        assertEquals("UNSTABLE", step.getStatus());
        assertEquals("Non-fatal warning detected", step.getError());
    }

    @Test
    void testStageModelSequentialProperties() {
        StageModel stage = new StageModel();
        stage.setId("10");
        stage.setName("Compile & Unit Test");
        stage.setStatus("SUCCESS");
        stage.setDurationMillis(8500L);
        stage.setStartTimeMillis(1700000000000L);
        stage.setAgent("maven-agent");
        stage.setOptional(false);
        stage.setRestartable(true);
        stage.setParallelBranch(false);
        stage.setSkipReason("");
        stage.setSkippedStepsCount(0);

        assertEquals("10", stage.getId());
        assertEquals("Compile & Unit Test", stage.getName());
        assertEquals("SUCCESS", stage.getStatus());
        assertEquals(8500L, stage.getDurationMillis());
        assertEquals("maven-agent", stage.getAgent());
        assertFalse(stage.isOptional());
        assertTrue(stage.isRestartable());
        assertFalse(stage.isParallelBranch());
    }

    @Test
    void testStageModelParallelAndChildren() {
        StageModel parentStage = new StageModel();
        parentStage.setId("20");
        parentStage.setName("Parallel Test Matrix");
        parentStage.setStatus("SUCCESS");

        StageModel branch1 = new StageModel();
        branch1.setId("21");
        branch1.setName("Unit Tests (Java 17)");
        branch1.setBranchName("Java 17");
        branch1.setParallelBranch(true);
        branch1.setStatus("SUCCESS");

        StageModel branch2 = new StageModel();
        branch2.setId("22");
        branch2.setName("Unit Tests (Java 21)");
        branch2.setBranchName("Java 21");
        branch2.setParallelBranch(true);
        branch2.setStatus("SUCCESS");

        parentStage.setChildren(Arrays.asList(branch1, branch2));

        assertEquals(2, parentStage.getChildren().size());
        assertTrue(parentStage.getChildren().get(0).isParallelBranch());
        assertEquals("Java 17", parentStage.getChildren().get(0).getBranchName());
        assertEquals("Java 21", parentStage.getChildren().get(1).getBranchName());
    }

    @Test
    void testStageModelSkippedConditional() {
        StageModel skippedStage = new StageModel();
        skippedStage.setId("30");
        skippedStage.setName("Security Vulnerability Scan");
        skippedStage.setStatus("SKIPPED_CONDITIONAL");
        skippedStage.setSkipReason("when condition evaluated to false");
        skippedStage.setSkippedStepsCount(4);

        assertEquals("SKIPPED_CONDITIONAL", skippedStage.getStatus());
        assertEquals("when condition evaluated to false", skippedStage.getSkipReason());
        assertEquals(4, skippedStage.getSkippedStepsCount());
    }

    @Test
    void testStageStepsAssociation() {
        StageModel stage = new StageModel();
        StepModel step1 = new StepModel();
        step1.setId("1");
        step1.setName("echo");
        StepModel step2 = new StepModel();
        step2.setId("2");
        step2.setName("sh");

        stage.setSteps(Arrays.asList(step1, step2));
        assertNotNull(stage.getSteps());
        assertEquals(2, stage.getSteps().size());
        assertEquals("echo", stage.getSteps().get(0).getName());
        assertEquals("sh", stage.getSteps().get(1).getName());
    }

    @Test
    void testStageArtifactsAssociation() {
        StageModel stage = new StageModel("15", "Package", "SUCCESS");
        assertFalse(stage.isHasArtifacts());
        assertEquals(0, stage.getArtifactCount());
        assertNotNull(stage.getArtifacts());
        assertTrue(stage.getArtifacts().isEmpty());

        ArtifactModel artifact = new ArtifactModel("release.zip", "dist/release.zip", "release.zip", "dist/release.zip", 2048L, "2.0 KB");
        stage.addArtifact(artifact);
        stage.setHasArtifacts(true);
        stage.setArtifactCount(1);

        assertTrue(stage.isHasArtifacts());
        assertEquals(1, stage.getArtifactCount());
        assertEquals(1, stage.getArtifacts().size());
        assertEquals("release.zip", stage.getArtifacts().get(0).getName());
    }
}
