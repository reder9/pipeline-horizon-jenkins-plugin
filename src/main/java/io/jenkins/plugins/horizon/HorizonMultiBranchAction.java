package io.jenkins.plugins.horizon;

import hudson.model.Action;
import hudson.model.Item;
import hudson.model.Queue;
import hudson.model.User;
import hudson.scm.ChangeLogSet;
import io.jenkins.plugins.horizon.analysis.PipelineGraphAnalyzer;
import io.jenkins.plugins.horizon.model.BranchSummaryModel;
import io.jenkins.plugins.horizon.model.MultiBranchSummaryModel;
import io.jenkins.plugins.horizon.util.ScmLinkResolver;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import jenkins.model.Jenkins;
import jenkins.scm.api.SCMHead;
import jenkins.scm.api.metadata.ContributorMetadataAction;
import jenkins.scm.api.metadata.ObjectMetadataAction;
import jenkins.scm.api.mixin.ChangeRequestSCMHead;
import net.sf.json.JSONObject;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.multibranch.BranchJobProperty;
import org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject;
import org.kohsuke.stapler.StaplerRequest2;
import org.kohsuke.stapler.StaplerResponse2;
import org.kohsuke.stapler.interceptor.RequirePOST;

public class HorizonMultiBranchAction implements Action {

    private final WorkflowMultiBranchProject project;

    public HorizonMultiBranchAction(WorkflowMultiBranchProject project) {
        this.project = project;
    }

    public WorkflowMultiBranchProject getProject() {
        return project;
    }

    @Override
    public String getIconFileName() {
        return "symbol-git-branch-outline plugin-ionicons-api";
    }

    @Override
    public String getDisplayName() {
        return "Pipeline Horizon";
    }

    @Override
    public String getUrlName() {
        return "horizon";
    }

    public MultiBranchSummaryModel getSummary() {
        project.checkPermission(Item.READ);
        MultiBranchSummaryModel model = new MultiBranchSummaryModel();
        model.setName(project.getName());
        model.setFullName(project.getFullName());
        model.setUrl(project.getUrl());
        model.setHorizonUrl(project.getUrl() + "horizon/");
        model.setDescription(project.getDescription());

        List<BranchSummaryModel> branches = new ArrayList<>();
        List<BranchSummaryModel> pullRequests = new ArrayList<>();

        for (WorkflowJob branchJob : project.getItems()) {
            if (branchJob == null) {
                continue;
            }
            BranchSummaryModel bModel = new BranchSummaryModel();
            bModel.setName(branchJob.getName());
            bModel.setDisplayName(branchJob.getDisplayName());
            bModel.setUrl(branchJob.getUrl());
            bModel.setHorizonUrl(branchJob.getUrl() + "horizon/");

            // Check if this branch is a ChangeRequest (Pull Request)
            boolean isPr = false;
            BranchJobProperty bjp = branchJob.getProperty(BranchJobProperty.class);
            if (bjp != null) {
                SCMHead head = bjp.getBranch().getHead();
                if (head instanceof ChangeRequestSCMHead) {
                    isPr = true;
                    ChangeRequestSCMHead crHead = (ChangeRequestSCMHead) head;
                    bModel.setPullRequestTitle("PR #" + crHead.getId());
                    bModel.setPullRequestTarget(crHead.getTarget().getName());
                }
            }
            if (!isPr && branchJob.getName().startsWith("PR-")) {
                isPr = true;
            }
            bModel.setPullRequest(isPr);

            ContributorMetadataAction cma = branchJob.getAction(ContributorMetadataAction.class);
            if (cma != null && cma.getContributor() != null) {
                bModel.setPullRequestAuthor(cma.getContributor());
            }

            ObjectMetadataAction oma = branchJob.getAction(ObjectMetadataAction.class);
            if (oma != null) {
                if (bModel.getPullRequestTitle() == null && oma.getObjectDisplayName() != null) {
                    bModel.setPullRequestTitle(oma.getObjectDisplayName());
                }
            }

            WorkflowRun lastRun = branchJob.getLastBuild();
            if (lastRun != null) {
                bModel.setLastBuildNumber(lastRun.getNumber());
                bModel.setLastBuildTimestamp(lastRun.getStartTimeInMillis());
                bModel.setTimeAgo(lastRun.getTimestampString() + " ago");
                bModel.setLastBuildDurationMillis(lastRun.getDuration());
                bModel.setFormattedDuration(PipelineGraphAnalyzer.formatDuration(lastRun.getDuration()));

                hudson.model.Result res = lastRun.getResult();
                if (lastRun.isBuilding()) {
                    bModel.setLastBuildResult("IN_PROGRESS");
                } else if (res != null) {
                    bModel.setLastBuildResult(res.toString());
                } else {
                    bModel.setLastBuildResult("UNKNOWN");
                }

                // SCM commit message & author extraction
                try {
                    List<ChangeLogSet<? extends ChangeLogSet.Entry>> changeSets = lastRun.getChangeSets();
                    if (!changeSets.isEmpty()) {
                        for (ChangeLogSet<? extends ChangeLogSet.Entry> cs : changeSets) {
                            for (ChangeLogSet.Entry entry : cs) {
                                if (entry != null) {
                                    bModel.setCommitMessage(entry.getMsg());
                                    if (entry.getAuthor() != null) {
                                        bModel.setCommitAuthor(entry.getAuthor().getDisplayName());
                                    }
                                    if (bModel.getCommitSha() == null && entry.getCommitId() != null) {
                                        bModel.setCommitSha(entry.getCommitId());
                                    }
                                    break;
                                }
                            }
                            if (bModel.getCommitMessage() != null) {
                                break;
                            }
                        }
                    }
                } catch (Throwable ignored) {
                }

                // Fallback to SCMRevisionAction or BuildData if commitSha not extracted from changelog
                if (bModel.getCommitSha() == null) {
                    for (hudson.model.Action a : lastRun.getAllActions()) {
                        if (a != null) {
                            String actionName = a.getClass().getName();
                            if (actionName.contains("SCMRevisionAction")) {
                                try {
                                    Object rev = a.getClass().getMethod("getRevision").invoke(a);
                                    if (rev != null) {
                                        try {
                                            Object h = rev.getClass().getMethod("getHash").invoke(rev);
                                            if (h != null) {
                                                bModel.setCommitSha(String.valueOf(h));
                                            }
                                        } catch (Throwable t) {
                                            bModel.setCommitSha(String.valueOf(rev));
                                        }
                                    }
                                } catch (Throwable ignored) {
                                }
                            } else if (actionName.contains("BuildData")) {
                                try {
                                    Object rev = a.getClass().getMethod("getLastBuiltRevision").invoke(a);
                                    if (rev != null) {
                                        Object sha = rev.getClass().getMethod("getSha1String").invoke(rev);
                                        if (sha != null) {
                                            bModel.setCommitSha(String.valueOf(sha));
                                        }
                                    }
                                } catch (Throwable ignored) {
                                }
                            }
                            if (bModel.getCommitSha() != null) {
                                break;
                            }
                        }
                    }
                }
            } else {
                bModel.setLastBuildResult("NOT_BUILT");
                bModel.setFormattedDuration("—");
                bModel.setTimeAgo("Never built");
            }

            // SCM Web Links (GitHub, GitLab, Bitbucket, Azure DevOps, Gitea)
            try {
                ScmLinkResolver.ScmLinks scmLinks = ScmLinkResolver.resolveForBranch(project, branchJob, lastRun, bModel.getName());
                if (scmLinks != null) {
                    bModel.setRepositoryUrl(scmLinks.getRepositoryUrl());
                    bModel.setBranchUrl(scmLinks.getBranchUrl());
                    bModel.setCommitUrl(scmLinks.getCommitUrl());
                }
            } catch (Throwable ignored) {
            }

            if (isPr) {
                pullRequests.add(bModel);
            } else {
                branches.add(bModel);
            }
        }

        // Sort branches by last build timestamp descending (active first)
        Comparator<BranchSummaryModel> comp = (a, b) -> Long.compare(b.getLastBuildTimestamp(), a.getLastBuildTimestamp());
        branches.sort(comp);
        pullRequests.sort(comp);

        model.setBranches(branches);
        model.setPullRequests(pullRequests);
        model.setTotalBranches(branches.size());
        model.setTotalPullRequests(pullRequests.size());

        return model;
    }

    public void doApiBranches(StaplerRequest2 req, StaplerResponse2 rsp) throws IOException {
        rsp.setContentType("application/json;charset=UTF-8");
        MultiBranchSummaryModel summary = getSummary();
        JSONObject json = JSONObject.fromObject(summary);
        json.write(rsp.getWriter());
    }

    @RequirePOST
    public void doApiScan(StaplerRequest2 req, StaplerResponse2 rsp) throws IOException {
        rsp.setContentType("application/json;charset=UTF-8");
        project.checkPermission(Item.BUILD);

        Queue.Item item = project.scheduleBuild2(0);
        JSONObject result = new JSONObject();
        if (item != null) {
            result.put("status", "ok");
            result.put("message", "Multibranch repository indexing scheduled.");
        } else {
            result.put("status", "ok");
            result.put("message", "Indexing already queued or in progress.");
        }
        result.write(rsp.getWriter());
    }

    public HorizonUserProperty getUserProperty() {
        User current = User.current();
        if (current != null) {
            HorizonUserProperty prop = current.getProperty(HorizonUserProperty.class);
            if (prop != null) {
                return prop;
            }
        }
        return new HorizonUserProperty();
    }

    public String getUserPreferencesJson() {
        HorizonUserProperty prop = getUserProperty();
        JSONObject json = new JSONObject();
        json.put("themeChoice", prop.getThemeChoice());
        json.put("defaultLayout", prop.getDefaultLayout());
        json.put("defaultDensity", prop.getDefaultDensity());
        json.put("defaultHideSkipped", prop.isDefaultHideSkipped());
        json.put("autoCopyLineLink", prop.isAutoCopyLineLink());
        return json.toString();
    }

    public String getUserProfileUrl() {
        User current = User.current();
        if (current != null) {
            String absUrl = current.getAbsoluteUrl();
            if (!absUrl.isEmpty()) {
                return absUrl.endsWith("/") ? absUrl + "preferences" : absUrl + "/preferences";
            }
            Jenkins j = Jenkins.getInstanceOrNull();
            String root = j != null ? j.getRootUrl() : "/";
            if (root == null) root = "/";
            String userUrl = current.getUrl();
            if (userUrl.startsWith("/")) userUrl = userUrl.substring(1);
            if (!root.endsWith("/")) root += "/";
            return root + userUrl + (userUrl.endsWith("/") ? "preferences" : "/preferences");
        }
        return null;
    }
}
