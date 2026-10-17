package io.jenkins.plugins.horizon.model;

import java.util.ArrayList;
import java.util.List;

public class PendingInputModel {
    private String id;
    private String message;
    private String ok;
    private String submitter;
    private String stageId;
    private String stageName;
    private String stepId;
    private List<JobParameterModel> parameters = new ArrayList<>();

    public PendingInputModel() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getOk() {
        return ok;
    }

    public String getOkLabel() {
        return ok;
    }

    public void setOk(String ok) {
        this.ok = ok;
    }

    public String getSubmitter() {
        return submitter;
    }

    public void setSubmitter(String submitter) {
        this.submitter = submitter;
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

    public String getStepId() {
        return stepId;
    }

    public void setStepId(String stepId) {
        this.stepId = stepId;
    }

    public List<JobParameterModel> getParameters() {
        return parameters;
    }

    public void setParameters(List<JobParameterModel> parameters) {
        this.parameters = parameters;
    }
}
