package io.jenkins.plugins.horizon.model;

import java.util.ArrayList;
import java.util.List;

public class RunDetailsModel extends RunSummaryModel {
    private Integer previousBuildNumber;
    private Integer nextBuildNumber;
    private List<StageModel> stages = new ArrayList<>();
    private List<String> agentsUsed = new ArrayList<>();
    private int totalSteps;
    private int failedSteps;
    private int totalTests;
    private int failedTests;
    private int skippedTests;
    private boolean restartEnabled;
    private List<String> restartableStages = new ArrayList<>();
    private boolean replayEnabled;
    private boolean rebuildEnabled;
    private String originalScript;

    public RunDetailsModel() {
    }

    public Integer getPreviousBuildNumber() {
        return previousBuildNumber;
    }

    public void setPreviousBuildNumber(Integer previousBuildNumber) {
        this.previousBuildNumber = previousBuildNumber;
    }

    public Integer getNextBuildNumber() {
        return nextBuildNumber;
    }

    public void setNextBuildNumber(Integer nextBuildNumber) {
        this.nextBuildNumber = nextBuildNumber;
    }

    public List<StageModel> getStages() {
        return stages;
    }

    public void setStages(List<StageModel> stages) {
        this.stages = stages;
    }

    public List<String> getAgentsUsed() {
        return agentsUsed;
    }

    public void setAgentsUsed(List<String> agentsUsed) {
        this.agentsUsed = agentsUsed;
    }

    public int getTotalSteps() {
        return totalSteps;
    }

    public void setTotalSteps(int totalSteps) {
        this.totalSteps = totalSteps;
    }

    public int getFailedSteps() {
        return failedSteps;
    }

    public void setFailedSteps(int failedSteps) {
        this.failedSteps = failedSteps;
    }

    public int getTotalTests() {
        return totalTests;
    }

    public void setTotalTests(int totalTests) {
        this.totalTests = totalTests;
    }

    public int getFailedTests() {
        return failedTests;
    }

    public void setFailedTests(int failedTests) {
        this.failedTests = failedTests;
    }

    public int getSkippedTests() {
        return skippedTests;
    }

    public void setSkippedTests(int skippedTests) {
        this.skippedTests = skippedTests;
    }

    public boolean isRestartEnabled() {
        return restartEnabled;
    }

    public void setRestartEnabled(boolean restartEnabled) {
        this.restartEnabled = restartEnabled;
    }

    public List<String> getRestartableStages() {
        return restartableStages;
    }

    public void setRestartableStages(List<String> restartableStages) {
        this.restartableStages = restartableStages;
    }

    public boolean isReplayEnabled() {
        return replayEnabled;
    }

    public void setReplayEnabled(boolean replayEnabled) {
        this.replayEnabled = replayEnabled;
    }

    public boolean isRebuildEnabled() {
        return rebuildEnabled;
    }

    public void setRebuildEnabled(boolean rebuildEnabled) {
        this.rebuildEnabled = rebuildEnabled;
    }

    public String getOriginalScript() {
        return originalScript;
    }

    public void setOriginalScript(String originalScript) {
        this.originalScript = originalScript;
    }

    private List<ArtifactModel> artifacts = new ArrayList<>();
    private int artifactCount;
    private long totalArtifactSize;
    private String formattedTotalArtifactSize;

    public List<ArtifactModel> getArtifacts() {
        return artifacts;
    }

    public void setArtifacts(List<ArtifactModel> artifacts) {
        this.artifacts = artifacts;
    }

    public int getArtifactCount() {
        return artifactCount;
    }

    public void setArtifactCount(int artifactCount) {
        this.artifactCount = artifactCount;
    }

    public long getTotalArtifactSize() {
        return totalArtifactSize;
    }

    public void setTotalArtifactSize(long totalArtifactSize) {
        this.totalArtifactSize = totalArtifactSize;
    }

    public String getFormattedTotalArtifactSize() {
        return formattedTotalArtifactSize;
    }

    public void setFormattedTotalArtifactSize(String formattedTotalArtifactSize) {
        this.formattedTotalArtifactSize = formattedTotalArtifactSize;
    }

    private boolean abortEnabled;
    private List<PendingInputModel> pendingInputs = new ArrayList<>();
    private List<TestCaseModel> testCases = new ArrayList<>();

    public boolean isAbortEnabled() {
        return abortEnabled;
    }

    public void setAbortEnabled(boolean abortEnabled) {
        this.abortEnabled = abortEnabled;
    }

    public List<PendingInputModel> getPendingInputs() {
        return pendingInputs;
    }

    public void setPendingInputs(List<PendingInputModel> pendingInputs) {
        this.pendingInputs = pendingInputs;
    }

    public List<TestCaseModel> getTestCases() {
        return testCases;
    }

    public void setTestCases(List<TestCaseModel> testCases) {
        this.testCases = testCases;
    }

    private long queueWaitMillis;
    private String formattedQueueWait;
    private long agentAllocationMillis;
    private String formattedAgentAllocation;

    public long getQueueWaitMillis() {
        return queueWaitMillis;
    }

    public void setQueueWaitMillis(long queueWaitMillis) {
        this.queueWaitMillis = queueWaitMillis;
    }

    public String getFormattedQueueWait() {
        return formattedQueueWait;
    }

    public void setFormattedQueueWait(String formattedQueueWait) {
        this.formattedQueueWait = formattedQueueWait;
    }

    public long getAgentAllocationMillis() {
        return agentAllocationMillis;
    }

    public void setAgentAllocationMillis(long agentAllocationMillis) {
        this.agentAllocationMillis = agentAllocationMillis;
    }

    public String getFormattedAgentAllocation() {
        return formattedAgentAllocation;
    }

    public void setFormattedAgentAllocation(String formattedAgentAllocation) {
        this.formattedAgentAllocation = formattedAgentAllocation;
    }

    private long controllerQueueWaitMillis;
    private String formattedControllerQueueWait;
    private boolean isWaitingForAgent;
    private String agentQueueReason;

    public long getControllerQueueWaitMillis() {
        return controllerQueueWaitMillis;
    }

    public void setControllerQueueWaitMillis(long controllerQueueWaitMillis) {
        this.controllerQueueWaitMillis = controllerQueueWaitMillis;
    }

    public String getFormattedControllerQueueWait() {
        return formattedControllerQueueWait;
    }

    public void setFormattedControllerQueueWait(String formattedControllerQueueWait) {
        this.formattedControllerQueueWait = formattedControllerQueueWait;
    }

    public boolean isWaitingForAgent() {
        return isWaitingForAgent;
    }

    public void setWaitingForAgent(boolean waitingForAgent) {
        isWaitingForAgent = waitingForAgent;
    }

    public String getAgentQueueReason() {
        return agentQueueReason;
    }

    public void setAgentQueueReason(String agentQueueReason) {
        this.agentQueueReason = agentQueueReason;
    }
}
