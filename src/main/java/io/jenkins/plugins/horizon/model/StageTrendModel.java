package io.jenkins.plugins.horizon.model;

/**
 * Lightweight historical-duration information for one stage.
 *
 * <p>This is intentionally separate from {@link StageModel} so the canvas can
 * render before the optional historical analysis has completed.</p>
 */
public class StageTrendModel {
    private String stageId;
    private Long avgDurationMillis;
    private Double variancePercent;
    private String formattedVariance;
    private boolean spike;
    private boolean faster;

    public String getStageId() {
        return stageId;
    }

    public void setStageId(String stageId) {
        this.stageId = stageId;
    }

    public Long getAvgDurationMillis() {
        return avgDurationMillis;
    }

    public void setAvgDurationMillis(Long avgDurationMillis) {
        this.avgDurationMillis = avgDurationMillis;
    }

    public Double getVariancePercent() {
        return variancePercent;
    }

    public void setVariancePercent(Double variancePercent) {
        this.variancePercent = variancePercent;
    }

    public String getFormattedVariance() {
        return formattedVariance;
    }

    public void setFormattedVariance(String formattedVariance) {
        this.formattedVariance = formattedVariance;
    }

    public boolean isSpike() {
        return spike;
    }

    public void setSpike(boolean spike) {
        this.spike = spike;
    }

    public boolean isFaster() {
        return faster;
    }

    public void setFaster(boolean faster) {
        this.faster = faster;
    }
}
