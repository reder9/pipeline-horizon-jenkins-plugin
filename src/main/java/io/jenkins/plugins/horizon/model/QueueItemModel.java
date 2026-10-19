package io.jenkins.plugins.horizon.model;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Model representing a build waiting in the Jenkins Queue.
 */
public class QueueItemModel {
    private long id;
    private String why;
    private long inQueueSince;
    private String timeInQueue;
    private List<String> causes = new ArrayList<>();
    private Map<String, String> parameters = new LinkedHashMap<>();
    private boolean blocked;
    private boolean buildable;
    private boolean stuck;
    private boolean canCancel;

    public QueueItemModel() {
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public String getWhy() {
        return why;
    }

    public void setWhy(String why) {
        this.why = why;
    }

    public long getInQueueSince() {
        return inQueueSince;
    }

    public void setInQueueSince(long inQueueSince) {
        this.inQueueSince = inQueueSince;
    }

    public String getTimeInQueue() {
        return timeInQueue;
    }

    public void setTimeInQueue(String timeInQueue) {
        this.timeInQueue = timeInQueue;
    }

    public List<String> getCauses() {
        return causes != null ? new ArrayList<>(causes) : new ArrayList<>();
    }

    public void setCauses(List<String> causes) {
        this.causes = causes != null ? new ArrayList<>(causes) : new ArrayList<>();
    }

    public Map<String, String> getParameters() {
        return parameters != null ? new LinkedHashMap<>(parameters) : new LinkedHashMap<>();
    }

    public void setParameters(Map<String, String> parameters) {
        this.parameters = parameters != null ? new LinkedHashMap<>(parameters) : new LinkedHashMap<>();
    }

    public boolean isBlocked() {
        return blocked;
    }

    public void setBlocked(boolean blocked) {
        this.blocked = blocked;
    }

    public boolean isBuildable() {
        return buildable;
    }

    public void setBuildable(boolean buildable) {
        this.buildable = buildable;
    }

    public boolean isStuck() {
        return stuck;
    }

    public void setStuck(boolean stuck) {
        this.stuck = stuck;
    }

    public boolean isCanCancel() {
        return canCancel;
    }

    public void setCanCancel(boolean canCancel) {
        this.canCancel = canCancel;
    }
}
