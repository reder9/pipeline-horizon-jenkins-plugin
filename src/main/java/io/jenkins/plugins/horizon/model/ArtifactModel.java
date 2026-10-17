package io.jenkins.plugins.horizon.model;

import java.io.Serializable;

public class ArtifactModel implements Serializable {
    private static final long serialVersionUID = 1L;

    private String name;
    private String relativePath;
    private String displayPath;
    private String href;
    private long size;
    private String formattedSize;
    private String stageId;
    private String stageName;

    public ArtifactModel() {
    }

    public ArtifactModel(String name, String relativePath, String displayPath, String href, long size, String formattedSize) {
        this(name, relativePath, displayPath, href, size, formattedSize, null, null);
    }

    public ArtifactModel(String name, String relativePath, String displayPath, String href, long size, String formattedSize, String stageId, String stageName) {
        this.name = name;
        this.relativePath = relativePath;
        this.displayPath = displayPath;
        this.href = href;
        this.size = size;
        this.formattedSize = formattedSize;
        this.stageId = stageId;
        this.stageName = stageName;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRelativePath() {
        return relativePath;
    }

    public void setRelativePath(String relativePath) {
        this.relativePath = relativePath;
    }

    public String getDisplayPath() {
        return displayPath;
    }

    public void setDisplayPath(String displayPath) {
        this.displayPath = displayPath;
    }

    public String getHref() {
        return href;
    }

    public void setHref(String href) {
        this.href = href;
    }

    public long getSize() {
        return size;
    }

    public void setSize(long size) {
        this.size = size;
    }

    public String getFormattedSize() {
        return formattedSize;
    }

    public void setFormattedSize(String formattedSize) {
        this.formattedSize = formattedSize;
    }

    public String getStageId() {
        return stageId;
    }

    public void setStageId(String stageId) {
        this.stageId = stageId;
    }

    public String getStageName() {
        return stageName;
    }

    public void setStageName(String stageName) {
        this.stageName = stageName;
    }
}
