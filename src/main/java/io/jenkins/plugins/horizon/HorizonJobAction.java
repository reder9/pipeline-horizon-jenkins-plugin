package io.jenkins.plugins.horizon;

import hudson.model.Action;
import hudson.model.Job;
import io.jenkins.plugins.horizon.analysis.PipelineGraphAnalyzer;
import io.jenkins.plugins.horizon.model.JobSummaryModel;
import net.sf.json.JSONObject;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.kohsuke.stapler.StaplerRequest2;
import org.kohsuke.stapler.StaplerResponse2;
import org.kohsuke.stapler.interceptor.RequirePOST;

import java.io.IOException;

public class HorizonJobAction implements Action {

    private final Job<?, ?> job;

    public HorizonJobAction(Job<?, ?> job) {
        this.job = job;
    }

    public Job<?, ?> getJob() {
        return job;
    }

    @Override
    public String getIconFileName() {
        return "symbol-pulse-outline plugin-ionicons-api";
    }

    @Override
    public String getDisplayName() {
        return "Pipeline Horizon";
    }

    @Override
    public String getUrlName() {
        return "horizon";
    }

    /**
     * REST API: Returns high-level job summary, branches, and recent runs.
     */
    public void doApiRuns(StaplerRequest2 req, StaplerResponse2 rsp) throws IOException {
        rsp.setContentType("application/json;charset=UTF-8");
        rsp.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        if (job instanceof WorkflowJob) {
            JobSummaryModel summary = PipelineGraphAnalyzer.buildJobSummary((WorkflowJob) job);
            JSONObject.fromObject(summary).write(rsp.getWriter());
        } else {
            rsp.setStatus(400);
            rsp.getWriter().write("{\"error\": \"Horizon only supports Pipeline (WorkflowJob) jobs\"}");
        }
    }

    /**
     * REST API: Triggers a new build for this pipeline job.
     */
    @RequirePOST
    public void doApiBuild(StaplerRequest2 req, StaplerResponse2 rsp) throws IOException {
        rsp.setContentType("application/json;charset=UTF-8");
        if (!(job instanceof WorkflowJob)) {
            rsp.setStatus(400);
            rsp.getWriter().write("{\"status\":\"error\",\"message\":\"Only pipeline jobs can be triggered.\"}");
            return;
        }
        WorkflowJob wfJob = (WorkflowJob) job;
        wfJob.checkPermission(hudson.model.Item.BUILD);

        try {
            java.util.List<hudson.model.Action> actions = new java.util.ArrayList<>();
            actions.add(new hudson.model.CauseAction(new hudson.model.Cause.UserIdCause()));
            wfJob.scheduleBuild2(0, actions.toArray(new hudson.model.Action[0]));
            JSONObject result = new JSONObject();
            result.put("status", "ok");
            result.put("message", "Pipeline run queued successfully.");
            result.put("queueId", -1);
            result.write(rsp.getWriter());
        } catch (Throwable t) {
            rsp.setStatus(500);
            JSONObject result = new JSONObject();
            result.put("status", "error");
            result.put("message", t.getMessage() != null ? t.getMessage() : t.toString());
            result.write(rsp.getWriter());
        }
    }

    /**
     * REST API: Stops/aborts a specific in-progress build of this pipeline job.
     */
    @RequirePOST
    public void doApiAbortRun(StaplerRequest2 req, StaplerResponse2 rsp,
                              @ org.kohsuke.stapler.QueryParameter int number) throws IOException {
        rsp.setContentType("application/json;charset=UTF-8");
        if (!(job instanceof WorkflowJob)) {
            rsp.setStatus(400);
            rsp.getWriter().write("{\"status\":\"error\",\"message\":\"Only pipeline jobs are supported.\"}");
            return;
        }
        WorkflowJob wfJob = (WorkflowJob) job;
        org.jenkinsci.plugins.workflow.job.WorkflowRun wfRun = wfJob.getBuildByNumber(number);
        if (wfRun == null) {
            rsp.setStatus(404);
            rsp.getWriter().write("{\"status\":\"error\",\"message\":\"Build #" + number + " not found.\"}");
            return;
        }
        wfRun.checkPermission(hudson.model.Item.CANCEL);

        if (!wfRun.isBuilding()) {
            JSONObject result = new JSONObject();
            result.put("status", "ok");
            result.put("message", "Build #" + number + " is already finished.");
            result.write(rsp.getWriter());
            return;
        }

        try {
            hudson.model.User currentUser = hudson.model.User.current();
            String userId = currentUser != null ? currentUser.getId() : "anonymous";
            jenkins.model.CauseOfInterruption.UserInterruption cause =
                    new jenkins.model.CauseOfInterruption.UserInterruption(userId);

            hudson.model.Executor oneOff = wfRun.getOneOffExecutor();
            if (oneOff != null) {
                oneOff.interrupt(hudson.model.Result.ABORTED, cause);
            }
            hudson.model.Executor exec = wfRun.getExecutor();
            if (exec != null) {
                exec.interrupt(hudson.model.Result.ABORTED, cause);
            }
            org.jenkinsci.plugins.workflow.flow.FlowExecution flowExec = wfRun.getExecution();
            if (flowExec != null) {
                flowExec.interrupt(hudson.model.Result.ABORTED, cause);
            }

            JSONObject result = new JSONObject();
            result.put("status", "ok");
            result.put("message", "Stop signal sent to Build #" + number + ".");
            result.write(rsp.getWriter());
        } catch (Throwable t) {
            rsp.setStatus(500);
            JSONObject result = new JSONObject();
            result.put("status", "error");
            result.put("message", t.getMessage() != null ? t.getMessage() : t.toString());
            result.write(rsp.getWriter());
        }
    }

    public HorizonUserProperty getUserProperty() {
        hudson.model.User current = hudson.model.User.current();
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
        hudson.model.User current = hudson.model.User.current();
        if (current != null) {
            String absUrl = current.getAbsoluteUrl();
            if (!absUrl.isEmpty()) {
                return absUrl.endsWith("/") ? absUrl + "preferences" : absUrl + "/preferences";
            }
            jenkins.model.Jenkins j = jenkins.model.Jenkins.getInstanceOrNull();
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
