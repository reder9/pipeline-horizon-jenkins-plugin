package io.jenkins.plugins.horizon.model;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class RunSummaryModel {
    private int number;
    private String id;
    private String displayName;
    private String result;
    private boolean building;
    private long timestamp;
    private long duration;
    private List<String> causes = new ArrayList<>();
    private String branch;
    private String commitSha;
    private String commitMessage;
    private Map<String, String> parameters = new LinkedHashMap<>();
    private String url;
    private String horizonUrl;
    private int stageCount;
    private int failedStageCount;
    private boolean pausedForInput;

    public RunSummaryModel() {
    }

    public boolean isPausedForInput() {
        return pausedForInput;
    }

    public void setPausedForInput(boolean pausedForInput) {
        this.pausedForInput = pausedForInput;
    }

    public int getNumber() {
        return number;
    }

    public void setNumber(int number) {
        this.number = number;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }

    public boolean isBuilding() {
        return building;
    }

    public void setBuilding(boolean building) {
        this.building = building;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public long getDuration() {
        return duration;
    }

    public void setDuration(long duration) {
        this.duration = duration;
    }

    public List<String> getCauses() {
        return causes;
    }

    public void setCauses(List<String> causes) {
        this.causes = causes;
    }

    public String getBranch() {
        return branch;
    }

    public void setBranch(String branch) {
        this.branch = branch;
    }

    public String getCommitSha() {
        return commitSha;
    }

    public void setCommitSha(String commitSha) {
        this.commitSha = commitSha;
    }

    public String getCommitMessage() {
        return commitMessage;
    }

    public void setCommitMessage(String commitMessage) {
        this.commitMessage = commitMessage;
    }

    private String commitAuthor;
    private int changeSetCount;
    private List<String> culprits = new ArrayList<>();

    public String getCommitAuthor() {
        return commitAuthor;
    }

    public void setCommitAuthor(String commitAuthor) {
        this.commitAuthor = commitAuthor;
    }

    private String commitUrl;
    private String branchUrl;
    private String repositoryUrl;

    public String getCommitUrl() {
        return commitUrl;
    }

    public void setCommitUrl(String commitUrl) {
        this.commitUrl = commitUrl;
    }

    public String getBranchUrl() {
        return branchUrl;
    }

    public void setBranchUrl(String branchUrl) {
        this.branchUrl = branchUrl;
    }

    public String getRepositoryUrl() {
        return repositoryUrl;
    }

    public void setRepositoryUrl(String repositoryUrl) {
        this.repositoryUrl = repositoryUrl;
    }

    public int getChangeSetCount() {
        return changeSetCount;
    }

    public void setChangeSetCount(int changeSetCount) {
        this.changeSetCount = changeSetCount;
    }

    public List<String> getCulprits() {
        return culprits;
    }

    public void setCulprits(List<String> culprits) {
        this.culprits = culprits;
    }

    public Map<String, String> getParameters() {
        return parameters;
    }

    public void setParameters(Map<String, String> parameters) {
        this.parameters = parameters;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getHorizonUrl() {
        return horizonUrl;
    }

    public void setHorizonUrl(String horizonUrl) {
        this.horizonUrl = horizonUrl;
    }

    public int getStageCount() {
        return stageCount;
    }

    public void setStageCount(int stageCount) {
        this.stageCount = stageCount;
    }

    public int getFailedStageCount() {
        return failedStageCount;
    }

    public void setFailedStageCount(int failedStageCount) {
        this.failedStageCount = failedStageCount;
    }
}
