package io.jenkins.plugins.horizon.model;

import java.util.ArrayList;
import java.util.List;

/**
 * Response payload for an on-demand portion of a Pipeline Horizon build view.
 *
 * <p>The graph endpoint stays focused on data required to draw the canvas.
 * Expensive or potentially large detail sets are returned only when a user
 * opens the corresponding view.</p>
 */
public class RunDetailSectionModel {
    private String section;

    private List<TestCaseModel> testCases = new ArrayList<>();

    private List<ArtifactModel> artifacts = new ArrayList<>();
    private int artifactCount;
    private long totalArtifactSize;
    private String formattedTotalArtifactSize;

    private String originalScript;

    private List<StageTrendModel> stageTrends = new ArrayList<>();

    public String getSection() {
        return section;
    }

    public void setSection(String section) {
        this.section = section;
    }

    public List<TestCaseModel> getTestCases() {
        return testCases;
    }

    public void setTestCases(List<TestCaseModel> testCases) {
        this.testCases = testCases != null ? testCases : new ArrayList<>();
    }

    public List<ArtifactModel> getArtifacts() {
        return artifacts;
    }

    public void setArtifacts(List<ArtifactModel> artifacts) {
        this.artifacts = artifacts != null ? artifacts : new ArrayList<>();
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

    public String getOriginalScript() {
        return originalScript;
    }

    public void setOriginalScript(String originalScript) {
        this.originalScript = originalScript;
    }

    public List<StageTrendModel> getStageTrends() {
        return stageTrends;
    }

    public void setStageTrends(List<StageTrendModel> stageTrends) {
        this.stageTrends = stageTrends != null ? stageTrends : new ArrayList<>();
    }
}
