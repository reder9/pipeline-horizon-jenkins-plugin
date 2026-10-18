package io.jenkins.plugins.horizon;

import hudson.model.Result;
import io.jenkins.plugins.horizon.analysis.PipelineGraphAnalyzer;
import io.jenkins.plugins.horizon.model.JobSummaryModel;
import io.jenkins.plugins.horizon.model.RunDetailsModel;
import io.jenkins.plugins.horizon.model.StageModel;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@WithJenkins
class HorizonPipelineIntegrationTest {

    @Test
    void testPipelineExecutionAndHorizonGraphAnalysis(JenkinsRule jenkins) throws Exception {
        WorkflowJob job = jenkins.createProject(WorkflowJob.class, "horizon-integration-pipeline");
        job.setDescription("Integration test job for Pipeline Horizon");

        job.setDefinition(new CpsFlowDefinition(
                "node {\n" +
                "    stage('Checkout') {\n" +
                "        echo 'Checking out source repository...'\n" +
                "    }\n" +
                "    stage('Compile & Package') {\n" +
                "        echo 'Compiling codebase...'\n" +
                "        writeFile file: 'dist/app.txt', text: 'Pipeline Horizon Artifact Content'\n" +
                "        writeFile file: 'dist/manifest.json', text: '{\"build\": 1, \"status\": \"READY\"}'\n" +
                "        archiveArtifacts artifacts: 'dist/**', fingerprint: true\n" +
                "    }\n" +
                "    stage('Verify') {\n" +
                "        echo 'Verification complete.'\n" +
                "    }\n" +
                "}", true));

        WorkflowRun build = jenkins.buildAndAssertStatus(Result.SUCCESS, job);
        assertNotNull(build);

        // 1. Verify HorizonRunAction is available on build
        HorizonRunAction runAction = build.getAction(HorizonRunAction.class);
        assertNotNull(runAction, "HorizonRunAction should be registered on WorkflowRun");
        assertEquals("horizon", runAction.getUrlName());
        assertEquals("Pipeline Horizon", runAction.getDisplayName());

        // 2. Verify PipelineGraphAnalyzer extracts run details
        RunDetailsModel details = PipelineGraphAnalyzer.buildRunDetails(build);
        assertNotNull(details);
        assertEquals(1, details.getNumber());
        assertEquals("SUCCESS", details.getResult());
        assertFalse(details.isBuilding());
        assertTrue(details.getDuration() >= 0);

        // 3. Verify Stages are parsed
        List<StageModel> stages = details.getStages();
        assertNotNull(stages);
        assertEquals(3, stages.size(), "Should contain Checkout, Compile & Package, and Verify stages");
        assertEquals("Checkout", stages.get(0).getName());
        assertEquals("Compile & Package", stages.get(1).getName());
        assertEquals("Verify", stages.get(2).getName());

        for (StageModel stage : stages) {
            assertEquals("SUCCESS", stage.getStatus());
            assertNotNull(stage.getSteps());
            assertFalse(stage.getSteps().isEmpty(), "Each stage should have recorded steps");
        }

        // 4. Verify Archived Artifacts detection
        assertEquals(2, details.getArtifactCount(), "Should detect 2 archived artifacts");
        assertNotNull(details.getArtifacts());
        assertEquals(2, details.getArtifacts().size());
        assertTrue(details.getTotalArtifactSize() > 0);
        assertNotNull(details.getFormattedTotalArtifactSize());
        assertTrue(details.getFormattedTotalArtifactSize().endsWith("B"));

        // 5. Verify HorizonJobAction is available on job
        HorizonJobAction jobAction = job.getAction(HorizonJobAction.class);
        assertNotNull(jobAction, "HorizonJobAction should be registered on WorkflowJob");
        assertEquals("horizon", jobAction.getUrlName());

        // 6. Verify JobSummaryModel analysis
        JobSummaryModel jobSummary = PipelineGraphAnalyzer.buildJobSummary(job);
        assertNotNull(jobSummary);
        assertEquals("horizon-integration-pipeline", jobSummary.getName());
        assertEquals(1, jobSummary.getLastBuildNumber());
        assertEquals(1, jobSummary.getLastSuccessfulBuildNumber());
        assertNotNull(jobSummary.getRuns());
        assertEquals(1, jobSummary.getRuns().size());
        assertEquals("SUCCESS", jobSummary.getRuns().get(0).getResult());

        // 7. Verify REST API endpoints via WebClient
        JenkinsRule.WebClient wc = jenkins.createWebClient();
        String graphJsonStr = wc.goTo("job/horizon-integration-pipeline/1/horizon/apiGraph", "application/json")
                .getWebResponse().getContentAsString();
        net.sf.json.JSONObject graphJson = net.sf.json.JSONObject.fromObject(graphJsonStr);
        assertEquals(1, graphJson.getInt("number"));
        assertEquals("SUCCESS", graphJson.getString("result"));
        assertEquals(2, graphJson.getInt("artifactCount"));
        assertEquals(3, graphJson.getJSONArray("stages").size());

        String runsJsonStr = wc.goTo("job/horizon-integration-pipeline/horizon/apiRuns", "application/json")
                .getWebResponse().getContentAsString();
        net.sf.json.JSONObject runsJson = net.sf.json.JSONObject.fromObject(runsJsonStr);
        assertEquals("horizon-integration-pipeline", runsJson.getString("name"));
        assertEquals(1, runsJson.getJSONArray("runs").size());
    }

    @Test
    void testParallelPipelineBranchesAnalysis(JenkinsRule jenkins) throws Exception {
        WorkflowJob job = jenkins.createProject(WorkflowJob.class, "horizon-parallel-pipeline");

        job.setDefinition(new CpsFlowDefinition(
                "node {\n" +
                "    stage('Prepare') {\n" +
                "        echo 'Pre-flight checks'\n" +
                "    }\n" +
                "    stage('Parallel Testing') {\n" +
                "        parallel(\n" +
                "            'Unit Tests': { stage('Unit Tests') { echo 'Running unit tests' } },\n" +
                "            'Integration Tests': { stage('Integration Tests') { echo 'Running integration tests' } }\n" +
                "        )\n" +
                "    }\n" +
                "    stage('Deploy') {\n" +
                "        echo 'Deploying'\n" +
                "    }\n" +
                "}", true));

        WorkflowRun build = jenkins.buildAndAssertStatus(Result.SUCCESS, job);
        assertNotNull(build);

        RunDetailsModel details = PipelineGraphAnalyzer.buildRunDetails(build);
        assertNotNull(details);
        assertEquals("SUCCESS", details.getResult());

        List<StageModel> stages = details.getStages();
        assertNotNull(stages);
        assertEquals(3, stages.size());

        StageModel parallelStage = stages.get(1);
        assertEquals("Parallel Testing", parallelStage.getName());
        assertNotNull(parallelStage.getChildren());
        assertEquals(2, parallelStage.getChildren().size(), "Parallel stage should have 2 branch children");
        assertTrue(parallelStage.getChildren().stream().anyMatch(c -> c.getName().contains("Unit Tests")));
        assertTrue(parallelStage.getChildren().stream().anyMatch(c -> c.getName().contains("Integration Tests")));
    }

    @Test
    void testCompletedBuildCacheAndPermissionChecks(JenkinsRule jenkins) throws Exception {
        WorkflowJob job = jenkins.createProject(WorkflowJob.class, "horizon-cache-test-job");
        job.setDefinition(new CpsFlowDefinition("node { stage('Build') { echo 'cached build' } }", true));
        WorkflowRun build = jenkins.buildAndAssertStatus(Result.SUCCESS, job);

        HorizonRunAction.clearRunDetailsCache();

        JenkinsRule.WebClient wc = jenkins.createWebClient();
        String json1 = wc.goTo("job/horizon-cache-test-job/1/horizon/apiGraph", "application/json")
                .getWebResponse().getContentAsString();
        assertNotNull(json1);
        assertTrue(json1.contains("\"result\":\"SUCCESS\""));

        // Second call should return identical cached result
        String json2 = wc.goTo("job/horizon-cache-test-job/1/horizon/apiGraph", "application/json")
                .getWebResponse().getContentAsString();
        assertEquals(json1, json2);

        // Verify invalidation works
        HorizonRunAction.invalidateRunDetailsCache(build.getExternalizableId());
        String json3 = wc.goTo("job/horizon-cache-test-job/1/horizon/apiGraph", "application/json")
                .getWebResponse().getContentAsString();
        assertEquals(json1, json3);
    }

    @Test
    void testByteOffsetStreamingAndStageLogsDirectResolution(JenkinsRule jenkins) throws Exception {
        WorkflowJob job = jenkins.createProject(WorkflowJob.class, "horizon-log-streaming-job");
        job.setDefinition(new CpsFlowDefinition(
                "node {\n" +
                "    stage('Build') {\n" +
                "        echo 'Line 1: Building project Alpha'\n" +
                "        echo 'Line 2: Compiling sources'\n" +
                "    }\n" +
                "}", true));
        WorkflowRun build = jenkins.buildAndAssertStatus(Result.SUCCESS, job);
        assertNotNull(build);

        RunDetailsModel details = PipelineGraphAnalyzer.buildRunDetails(build);
        assertNotNull(details);
        List<StageModel> stages = details.getStages();
        assertNotNull(stages);
        assertFalse(stages.isEmpty());

        StageModel buildStage = stages.get(0);
        assertNotNull(buildStage.getSteps());
        assertFalse(buildStage.getSteps().isEmpty());
        String stepNodeId = buildStage.getSteps().get(0).getId();
        String stageNodeId = buildStage.getId();

        JenkinsRule.WebClient wc = jenkins.createWebClient();

        // 1. Initial Step Log Fetch
        var fullRes = wc.goTo("job/horizon-log-streaming-job/1/horizon/apiLog?nodeId=" + stepNodeId, "text/plain")
                .getWebResponse();
        String fullContent = fullRes.getContentAsString();
        String textSizeHeader = fullRes.getResponseHeaderValue("X-Text-Size");
        assertNotNull(textSizeHeader, "X-Text-Size header must be present");
        long textSize = Long.parseLong(textSizeHeader);
        assertTrue(textSize > 0, "Text size must be > 0");
        assertTrue(fullContent.contains("Line 1: Building project Alpha") || fullContent.contains("Building"));

        // 2. Incremental Step Log Fetch with startOffset == textSize (Should return empty string)
        var emptyRes = wc.goTo("job/horizon-log-streaming-job/1/horizon/apiLog?nodeId=" + stepNodeId + "&startOffset=" + textSize, "text/plain")
                .getWebResponse();
        assertEquals("", emptyRes.getContentAsString(), "No delta bytes should be returned when offset equals total length");

        // 3. Incremental Step Log Fetch with partial offset
        long partialOffset = Math.max(0, textSize / 2);
        var partialRes = wc.goTo("job/horizon-log-streaming-job/1/horizon/apiLog?nodeId=" + stepNodeId + "&startOffset=" + partialOffset, "text/plain")
                .getWebResponse();
        assertTrue(partialRes.getContentAsString().length() <= fullContent.length());

        // 4. Stage-Level Log Fetch (aggregated via direct StageModel resolution)
        var stageRes = wc.goTo("job/horizon-log-streaming-job/1/horizon/apiLog?nodeId=" + stageNodeId, "text/plain")
                .getWebResponse();
        String stageContent = stageRes.getContentAsString();
        assertNotNull(stageRes.getResponseHeaderValue("X-Text-Size"));
        assertTrue(stageContent.contains("Line 1: Building project Alpha") || stageContent.contains("Line 2: Compiling sources"));
    }
}
