package io.jenkins.plugins.horizon.model;

import java.util.ArrayList;
import java.util.List;

public class StageModel {
    private String id;
    private String name;
    private String status;
    private String skipReason;
    private long startTimeMillis;
    private long durationMillis;
    private String agent;
    private boolean isParallelBranch;
    private String branchName;
    private String error;
    private boolean optional;
    private int skippedStepsCount;
    private boolean restartable;
    private boolean pausedForInput;
    private boolean hasArtifacts;
    private int artifactCount;
    private List<ArtifactModel> artifacts = new ArrayList<>();
    private List<StepModel> steps = new ArrayList<>();
    private List<StageModel> children = new ArrayList<>();

    public boolean isPausedForInput() {
        return pausedForInput;
    }

    public void setPausedForInput(boolean pausedForInput) {
        this.pausedForInput = pausedForInput;
    }

    public StageModel() {
    }

    public StageModel(String id, String name, String status) {
        this.id = id;
        this.name = name;
        this.status = status;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getSkipReason() {
        return skipReason;
    }

    public void setSkipReason(String skipReason) {
        this.skipReason = skipReason;
    }

    public long getStartTimeMillis() {
        return startTimeMillis;
    }

    public void setStartTimeMillis(long startTimeMillis) {
        this.startTimeMillis = startTimeMillis;
    }

    public long getDurationMillis() {
        return durationMillis;
    }

    public void setDurationMillis(long durationMillis) {
        this.durationMillis = durationMillis;
    }

    public String getAgent() {
        return agent;
    }

    public void setAgent(String agent) {
        this.agent = agent;
    }

    public boolean isParallelBranch() {
        return isParallelBranch;
    }

    public void setParallelBranch(boolean parallelBranch) {
        isParallelBranch = parallelBranch;
    }

    public String getBranchName() {
        return branchName;
    }

    public void setBranchName(String branchName) {
        this.branchName = branchName;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public boolean isOptional() {
        return optional;
    }

    public void setOptional(boolean optional) {
        this.optional = optional;
    }

    public int getSkippedStepsCount() {
        return skippedStepsCount;
    }

    public void setSkippedStepsCount(int skippedStepsCount) {
        this.skippedStepsCount = skippedStepsCount;
    }

    public boolean isRestartable() {
        return restartable;
    }

    public void setRestartable(boolean restartable) {
        this.restartable = restartable;
    }

    public List<StepModel> getSteps() {
        return steps;
    }

    public void setSteps(List<StepModel> steps) {
        this.steps = steps;
    }

    public List<StageModel> getChildren() {
        return children;
    }

    public void setChildren(List<StageModel> children) {
        this.children = children;
    }

    public void addChild(StageModel child) {
        this.children.add(child);
    }

    public boolean isHasArtifacts() {
        return hasArtifacts;
    }

    public void setHasArtifacts(boolean hasArtifacts) {
        this.hasArtifacts = hasArtifacts;
    }

    public int getArtifactCount() {
        return artifactCount;
    }

    public void setArtifactCount(int artifactCount) {
        this.artifactCount = artifactCount;
    }

    public List<ArtifactModel> getArtifacts() {
        return artifacts;
    }

    public void setArtifacts(List<ArtifactModel> artifacts) {
        this.artifacts = artifacts;
    }

    public void addArtifact(ArtifactModel artifact) {
        this.artifacts.add(artifact);
    }

    public void addStep(StepModel step) {
        this.steps.add(step);
    }
}
