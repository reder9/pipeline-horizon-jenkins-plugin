package io.jenkins.plugins.horizon.model;

public class BranchSummaryModel {
    private String name;
    private String displayName;
    private String url;
    private String horizonUrl;
    private boolean pullRequest;
    private String pullRequestTitle;
    private String pullRequestAuthor;
    private String pullRequestTarget;
    private Integer lastBuildNumber;
    private String lastBuildResult;
    private long lastBuildDurationMillis;
    private String formattedDuration;
    private long lastBuildTimestamp;
    private String timeAgo;
    private String commitMessage;
    private String commitAuthor;

    public BranchSummaryModel() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
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

    public boolean isPullRequest() {
        return pullRequest;
    }

    public void setPullRequest(boolean pullRequest) {
        this.pullRequest = pullRequest;
    }

    public String getPullRequestTitle() {
        return pullRequestTitle;
    }

    public void setPullRequestTitle(String pullRequestTitle) {
        this.pullRequestTitle = pullRequestTitle;
    }

    public String getPullRequestAuthor() {
        return pullRequestAuthor;
    }

    public void setPullRequestAuthor(String pullRequestAuthor) {
        this.pullRequestAuthor = pullRequestAuthor;
    }

    public String getPullRequestTarget() {
        return pullRequestTarget;
    }

    public void setPullRequestTarget(String pullRequestTarget) {
        this.pullRequestTarget = pullRequestTarget;
    }

    public Integer getLastBuildNumber() {
        return lastBuildNumber;
    }

    public void setLastBuildNumber(Integer lastBuildNumber) {
        this.lastBuildNumber = lastBuildNumber;
    }

    public String getLastBuildResult() {
        return lastBuildResult;
    }

    public void setLastBuildResult(String lastBuildResult) {
        this.lastBuildResult = lastBuildResult;
    }

    public long getLastBuildDurationMillis() {
        return lastBuildDurationMillis;
    }

    public void setLastBuildDurationMillis(long lastBuildDurationMillis) {
        this.lastBuildDurationMillis = lastBuildDurationMillis;
    }

    public String getFormattedDuration() {
        return formattedDuration;
    }

    public void setFormattedDuration(String formattedDuration) {
        this.formattedDuration = formattedDuration;
    }

    public long getLastBuildTimestamp() {
        return lastBuildTimestamp;
    }

    public void setLastBuildTimestamp(long lastBuildTimestamp) {
        this.lastBuildTimestamp = lastBuildTimestamp;
    }

    public String getTimeAgo() {
        return timeAgo;
    }

    public void setTimeAgo(String timeAgo) {
        this.timeAgo = timeAgo;
    }

    public String getCommitMessage() {
        return commitMessage;
    }

    public void setCommitMessage(String commitMessage) {
        this.commitMessage = commitMessage;
    }

    public String getCommitAuthor() {
        return commitAuthor;
    }

    public void setCommitAuthor(String commitAuthor) {
        this.commitAuthor = commitAuthor;
    }

    private String commitSha;
    private String commitUrl;
    private String branchUrl;
    private String repositoryUrl;

    public String getCommitSha() {
        return commitSha;
    }

    public void setCommitSha(String commitSha) {
        this.commitSha = commitSha;
    }

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
}
