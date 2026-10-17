package io.jenkins.plugins.horizon.model;

public class StepModel {
    private String id;
    private String name;
    private String displayName;
    private String status;
    private long startTimeMillis;
    private long durationMillis;
    private boolean hasLogs;
    private String error;
    private boolean optional;
    private String arguments;

    public StepModel() {
    }

    public StepModel(String id, String name, String displayName, String status, long startTimeMillis, long durationMillis, boolean hasLogs, String error) {
        this.id = id;
        this.name = name;
        this.displayName = displayName;
        this.status = status;
        this.startTimeMillis = startTimeMillis;
        this.durationMillis = durationMillis;
        this.hasLogs = hasLogs;
        this.error = error;
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

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
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

    public boolean isHasLogs() {
        return hasLogs;
    }

    public void setHasLogs(boolean hasLogs) {
        this.hasLogs = hasLogs;
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

    public String getArguments() {
        return arguments;
    }

    public void setArguments(String arguments) {
        this.arguments = arguments;
    }
}
