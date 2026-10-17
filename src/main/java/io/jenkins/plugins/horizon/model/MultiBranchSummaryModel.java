package io.jenkins.plugins.horizon.model;

import java.util.ArrayList;
import java.util.List;

public class MultiBranchSummaryModel {
    private String name;
    private String fullName;
    private String url;
    private String horizonUrl;
    private String description;
    private int totalBranches;
    private int totalPullRequests;
    private List<BranchSummaryModel> branches = new ArrayList<>();
    private List<BranchSummaryModel> pullRequests = new ArrayList<>();

    public MultiBranchSummaryModel() {
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

    public int getTotalBranches() {
        return totalBranches;
    }

    public void setTotalBranches(int totalBranches) {
        this.totalBranches = totalBranches;
    }

    public int getTotalPullRequests() {
        return totalPullRequests;
    }

    public void setTotalPullRequests(int totalPullRequests) {
        this.totalPullRequests = totalPullRequests;
    }

    public List<BranchSummaryModel> getBranches() {
        return branches;
    }

    public void setBranches(List<BranchSummaryModel> branches) {
        this.branches = branches;
    }

    public List<BranchSummaryModel> getPullRequests() {
        return pullRequests;
    }

    public void setPullRequests(List<BranchSummaryModel> pullRequests) {
        this.pullRequests = pullRequests;
    }
}
