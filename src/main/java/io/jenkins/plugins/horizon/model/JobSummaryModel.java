package io.jenkins.plugins.horizon.model;

import java.util.ArrayList;
import java.util.List;

public class JobSummaryModel {
    private String name;
    private String fullName;
    private String url;
    private String horizonUrl;
    private String description;
    private boolean buildable;
    private boolean parameterized;
    private int weatherScore;
    private Integer lastBuildNumber;
    private Integer lastSuccessfulBuildNumber;
    private Integer lastFailedBuildNumber;
    private List<RunSummaryModel> runs = new ArrayList<>();
    private List<JobParameterModel> parameters = new ArrayList<>();
    private List<String> branches = new ArrayList<>();

    public JobSummaryModel() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isBuildable() {
        return buildable;
    }

    public void setBuildable(boolean buildable) {
        this.buildable = buildable;
    }

    public boolean isParameterized() {
        return parameterized;
    }

    public void setParameterized(boolean parameterized) {
        this.parameterized = parameterized;
    }

    public int getWeatherScore() {
        return weatherScore;
    }

    public void setWeatherScore(int weatherScore) {
        this.weatherScore = weatherScore;
    }

    public Integer getLastBuildNumber() {
        return lastBuildNumber;
    }

    public void setLastBuildNumber(Integer lastBuildNumber) {
        this.lastBuildNumber = lastBuildNumber;
    }

    public Integer getLastSuccessfulBuildNumber() {
        return lastSuccessfulBuildNumber;
    }

    public void setLastSuccessfulBuildNumber(Integer lastSuccessfulBuildNumber) {
        this.lastSuccessfulBuildNumber = lastSuccessfulBuildNumber;
    }

    public Integer getLastFailedBuildNumber() {
        return lastFailedBuildNumber;
    }

    public void setLastFailedBuildNumber(Integer lastFailedBuildNumber) {
        this.lastFailedBuildNumber = lastFailedBuildNumber;
    }

    public List<RunSummaryModel> getRuns() {
        return runs;
    }

    public void setRuns(List<RunSummaryModel> runs) {
        this.runs = runs;
    }

    public List<JobParameterModel> getParameters() {
        return parameters;
    }

    public void setParameters(List<JobParameterModel> parameters) {
        this.parameters = parameters;
    }

    public List<String> getBranches() {
        return branches;
    }

    public void setBranches(List<String> branches) {
        this.branches = branches;
    }
}
