package io.jenkins.plugins.horizon;

import hudson.model.Run;
import io.jenkins.plugins.horizon.analysis.PipelineGraphAnalyzer;
import io.jenkins.plugins.horizon.model.RunDetailsModel;
import jenkins.model.RunAction2;
import net.sf.json.JSONObject;
import org.jenkinsci.plugins.workflow.actions.LogAction;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.FlowGraphWalker;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.kohsuke.stapler.QueryParameter;
import org.kohsuke.stapler.StaplerRequest2;
import org.kohsuke.stapler.StaplerResponse2;
import org.kohsuke.stapler.interceptor.RequirePOST;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class HorizonRunAction implements RunAction2 {

    private transient Run<?, ?> run;

    public HorizonRunAction(Run<?, ?> run) {
        this.run = run;
    }

    @Override
    public void onAttached(Run<?, ?> target) {
        this.run = target;
    }

    @Override
    public void onLoad(Run<?, ?> target) {
        this.run = target;
    }

    public Run<?, ?> getRun() {
        return run;
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
     * REST API: Returns graph, stages, steps, status, timings, and agents for this build.
     */
    public void doApiGraph(StaplerRequest2 req, StaplerResponse2 rsp) throws IOException {
        rsp.setContentType("application/json;charset=UTF-8");
        rsp.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        if (run instanceof WorkflowRun) {
            RunDetailsModel details = PipelineGraphAnalyzer.buildRunDetails((WorkflowRun) run);
            JSONObject.fromObject(details).write(rsp.getWriter());
        } else {
            rsp.setStatus(400);
            rsp.getWriter().write("{\"error\": \"Horizon only supports Pipeline (WorkflowRun) builds\"}");
        }
    }

    private static final long MAX_LOG_BYTES = 512L * 1024L;

    /**
     * REST API: Returns log output for a specific step or entire stage FlowNode.
     * When nodeId points to a stage, aggregates logs across all enclosed steps in chronological order.
     * Applies tail-safe truncation (last 512 KB) for inline viewing while preserving full logs for downloads.
     */
    public void doApiLog(StaplerRequest2 req, StaplerResponse2 rsp,
                         @QueryParameter(fixEmpty = true) String nodeId,
                         @QueryParameter(fixEmpty = true) String download) throws IOException {
        rsp.setContentType("text/plain;charset=UTF-8");
        rsp.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        if (!(run instanceof WorkflowRun) || nodeId == null) {
            rsp.getWriter().write("");
            return;
        }

        WorkflowRun wfRun = (WorkflowRun) run;
        FlowExecution exec = wfRun.getExecution();
        if (exec == null) {
            rsp.getWriter().write("");
            return;
        }

        FlowNode node = exec.getNode(nodeId);
        if (node == null) {
            rsp.getWriter().write("Node not found: " + nodeId);
            return;
        }

        boolean isDownload = "true".equalsIgnoreCase(download) || (req != null && "true".equalsIgnoreCase(req.getParameter("download")));
        if (isDownload) {
            String nodeName = node.getDisplayName();
            if (nodeName == null || nodeName.trim().isEmpty()) {
                nodeName = "node-" + nodeId;
            }
            String safeFileName = (nodeName + "-build-" + wfRun.getNumber() + ".txt")
                    .replaceAll("[^a-zA-Z0-9_.-]", "_");
            rsp.setHeader("Content-Disposition", "attachment; filename=\"" + safeFileName + "\"");
        }

        LogAction logAction = node.getAction(LogAction.class);
        if (logAction != null && logAction.getLogText() != null) {
            hudson.console.AnnotatedLargeText<? extends FlowNode> logText = logAction.getLogText();
            long totalLen = logText.length();
            long startOffset = (!isDownload && totalLen > MAX_LOG_BYTES) ? (totalLen - MAX_LOG_BYTES) : 0L;
            try (OutputStream os = rsp.getOutputStream()) {
                if (startOffset > 0) {
                    String banner = String.format(
                            java.util.Locale.US,
                            "[... Log truncated for inline performance: showing last %s of %s total. Use 'Raw' or 'Download' for full output ...]%n",
                            PipelineGraphAnalyzer.formatBytes(MAX_LOG_BYTES),
                            PipelineGraphAnalyzer.formatBytes(totalLen)
                    );
                    os.write(banner.getBytes(StandardCharsets.UTF_8));
                }
                long written = logText.writeLogTo(startOffset, os);
                if (written < 0) {
                    os.flush();
                }
            }
        } else {
            // Node has no direct LogAction (e.g. it is a Stage or Container block).
            // Aggregate logs from all enclosed descendant FlowNodes in chronological order.
            List<FlowNode> enclosedNodes = new ArrayList<>();
            try {
                for (FlowNode n : new FlowGraphWalker(exec)) {
                    try {
                        List<String> enclosing = n.getAllEnclosingIds();
                        if (enclosing.contains(nodeId)) {
                            LogAction la = n.getAction(LogAction.class);
                            if (la != null && la.getLogText() != null) {
                                enclosedNodes.add(n);
                            }
                        }
                    } catch (Throwable ignored) {}
                }
            } catch (Throwable ignored) {}

            if (!enclosedNodes.isEmpty()) {
                Collections.reverse(enclosedNodes); // Chronological order
                long totalStageBytes = 0L;
                for (FlowNode en : enclosedNodes) {
                    LogAction la = en.getAction(LogAction.class);
                    if (la != null && la.getLogText() != null) {
                        totalStageBytes += Math.max(0L, la.getLogText().length());
                    }
                }
                long bytesToSkip = (!isDownload && totalStageBytes > MAX_LOG_BYTES)
                        ? (totalStageBytes - MAX_LOG_BYTES)
                        : 0L;
                try (OutputStream os = rsp.getOutputStream()) {
                    if (bytesToSkip > 0) {
                        String banner = String.format(
                                java.util.Locale.US,
                                "[... Stage log truncated for inline performance: showing last %s of %s total. Use 'Download' for full output ...]%n",
                                PipelineGraphAnalyzer.formatBytes(MAX_LOG_BYTES),
                                PipelineGraphAnalyzer.formatBytes(totalStageBytes)
                        );
                        os.write(banner.getBytes(StandardCharsets.UTF_8));
                    }
                    long skippedSoFar = 0L;
                    for (FlowNode en : enclosedNodes) {
                        LogAction la = en.getAction(LogAction.class);
                        if (la != null && la.getLogText() != null) {
                            long len = Math.max(0L, la.getLogText().length());
                            if (skippedSoFar + len <= bytesToSkip) {
                                skippedSoFar += len;
                                continue;
                            }
                            long nodeOffset = Math.max(0L, bytesToSkip - skippedSoFar);
                            skippedSoFar = bytesToSkip;
                            long written = la.getLogText().writeLogTo(nodeOffset, os);
                            if (written < 0) {
                                os.flush();
                            }
                        }
                    }
                }
            } else {
                rsp.getWriter().write("[No console output recorded for this stage]");
            }
        }
    }

    /**
     * REST API: Stops/aborts an in-progress pipeline build.
     */
    @RequirePOST
    public void doApiAbort(StaplerRequest2 req, StaplerResponse2 rsp) throws IOException {
        rsp.setContentType("application/json;charset=UTF-8");
        if (!(run instanceof WorkflowRun)) {
            rsp.setStatus(400);
            rsp.getWriter().write("{\"status\":\"error\",\"message\":\"Only pipeline builds can be aborted.\"}");
            return;
        }
        WorkflowRun wfRun = (WorkflowRun) run;
        wfRun.checkPermission(hudson.model.Item.CANCEL);

        if (!wfRun.isBuilding()) {
            JSONObject result = new JSONObject();
            result.put("status", "ok");
            result.put("message", "Build is already finished.");
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
            FlowExecution flowExec = wfRun.getExecution();
            if (flowExec != null) {
                flowExec.interrupt(hudson.model.Result.ABORTED, cause);
            }

            JSONObject result = new JSONObject();
            result.put("status", "ok");
            result.put("message", "Stop signal sent to Build #" + wfRun.getNumber() + ".");
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
     * REST API: Submits/proceeds a pending pipeline input step with optional parameters.
     */
    @RequirePOST
    public void doApiInputSubmit(StaplerRequest2 req, StaplerResponse2 rsp,
                                 @QueryParameter(fixEmpty = true) String inputId) throws IOException {
        rsp.setContentType("application/json;charset=UTF-8");
        if (!(run instanceof WorkflowRun)) {
            rsp.setStatus(400);
            rsp.getWriter().write("{\"status\":\"error\",\"message\":\"Only pipeline builds support input steps.\"}");
            return;
        }
        WorkflowRun wfRun = (WorkflowRun) run;
        wfRun.checkPermission(hudson.model.Item.BUILD);

        try {
            JSONObject bodyJson = null;
            if (req.getContentType() != null && req.getContentType().contains("application/json")) {
                try {
                    String body = new String(req.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                    if (!body.isEmpty()) {
                        bodyJson = JSONObject.fromObject(body);
                        if ((inputId == null || inputId.trim().isEmpty()) && bodyJson.has("inputId")) {
                            inputId = bodyJson.optString("inputId", null);
                        }
                    }
                } catch (Throwable ignored) {
                }
            }

            org.jenkinsci.plugins.workflow.support.steps.input.InputAction inputAction =
                    wfRun.getAction(org.jenkinsci.plugins.workflow.support.steps.input.InputAction.class);
            if (inputAction == null) {
                rsp.setStatus(404);
                rsp.getWriter().write("{\"status\":\"error\",\"message\":\"No pending input action found on this build.\"}");
                return;
            }

            org.jenkinsci.plugins.workflow.support.steps.input.InputStepExecution targetExec = null;
            List<org.jenkinsci.plugins.workflow.support.steps.input.InputStepExecution> executions = inputAction.getExecutions();
            if (executions != null) {
                for (org.jenkinsci.plugins.workflow.support.steps.input.InputStepExecution ex : executions) {
                    if (ex != null && !ex.isSettled()) {
                        if (inputId == null || inputId.trim().isEmpty() || inputId.trim().equals(ex.getId())) {
                            targetExec = ex;
                            break;
                        }
                    }
                }
            }

            if (targetExec == null) {
                rsp.setStatus(404);
                rsp.getWriter().write("{\"status\":\"error\",\"message\":\"Pending input step is no longer active.\"}");
                return;
            }

            JSONObject paramsObj = (bodyJson != null && bodyJson.has("parameters"))
                    ? bodyJson.optJSONObject("parameters")
                    : null;

            org.jenkinsci.plugins.workflow.support.steps.input.InputStep inputStep = targetExec.getInput();
            List<hudson.model.ParameterDefinition> paramDefs = inputStep != null
                    ? inputStep.getParameters()
                    : Collections.emptyList();

            if (paramDefs == null || paramDefs.isEmpty()) {
                targetExec.proceed(null);
            } else if (paramDefs.size() == 1) {
                hudson.model.ParameterDefinition pd = paramDefs.get(0);
                Object val = extractInputParamValue(pd, paramsObj);
                targetExec.proceed(val);
            } else {
                java.util.Map<String, Object> valueMap = new java.util.LinkedHashMap<>();
                for (hudson.model.ParameterDefinition pd : paramDefs) {
                    valueMap.put(pd.getName(), extractInputParamValue(pd, paramsObj));
                }
                targetExec.proceed(valueMap);
            }

            JSONObject result = new JSONObject();
            result.put("status", "ok");
            result.put("message", "Input approved; pipeline execution resumed.");
            result.write(rsp.getWriter());
        } catch (Throwable t) {
            rsp.setStatus(500);
            JSONObject result = new JSONObject();
            result.put("status", "error");
            result.put("message", t.getMessage() != null ? t.getMessage() : t.toString());
            result.write(rsp.getWriter());
        }
    }

    private static Object extractInputParamValue(hudson.model.ParameterDefinition pd, JSONObject paramsObj) {
        String raw = null;
        if (paramsObj != null && paramsObj.has(pd.getName())) {
            raw = paramsObj.optString(pd.getName(), null);
        }
        if (pd instanceof hudson.model.BooleanParameterDefinition) {
            if (raw != null) {
                return Boolean.parseBoolean(raw);
            }
            hudson.model.ParameterValue defVal = pd.getDefaultParameterValue();
            return defVal != null && Boolean.TRUE.equals(defVal.getValue());
        }
        if (pd instanceof hudson.model.StringParameterDefinition
                || pd instanceof hudson.model.TextParameterDefinition
                || pd instanceof hudson.model.ChoiceParameterDefinition) {
            if (raw != null) {
                return raw;
            }
            hudson.model.ParameterValue defVal = pd.getDefaultParameterValue();
            return defVal != null && defVal.getValue() != null ? String.valueOf(defVal.getValue()) : "";
        }
        hudson.model.ParameterValue defVal = pd.getDefaultParameterValue();
        return raw != null ? raw : (defVal != null ? defVal.getValue() : null);
    }

    /**
     * REST API: Aborts/rejects a pending pipeline input step.
     */
    @RequirePOST
    public void doApiInputAbort(StaplerRequest2 req, StaplerResponse2 rsp,
                                @QueryParameter(fixEmpty = true) String inputId) throws IOException {
        rsp.setContentType("application/json;charset=UTF-8");
        if (!(run instanceof WorkflowRun)) {
            rsp.setStatus(400);
            rsp.getWriter().write("{\"status\":\"error\",\"message\":\"Only pipeline builds support input steps.\"}");
            return;
        }
        WorkflowRun wfRun = (WorkflowRun) run;
        wfRun.checkPermission(hudson.model.Item.BUILD);

        try {
            if ((inputId == null || inputId.trim().isEmpty())
                    && req.getContentType() != null && req.getContentType().contains("application/json")) {
                try {
                    String body = new String(req.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                    if (!body.isEmpty()) {
                        JSONObject bodyJson = JSONObject.fromObject(body);
                        if (bodyJson.has("inputId")) {
                            inputId = bodyJson.optString("inputId", null);
                        }
                    }
                } catch (Throwable ignored) {
                }
            }

            org.jenkinsci.plugins.workflow.support.steps.input.InputAction inputAction =
                    wfRun.getAction(org.jenkinsci.plugins.workflow.support.steps.input.InputAction.class);
            if (inputAction == null) {
                rsp.setStatus(404);
                rsp.getWriter().write("{\"status\":\"error\",\"message\":\"No pending input action found on this build.\"}");
                return;
            }

            org.jenkinsci.plugins.workflow.support.steps.input.InputStepExecution targetExec = null;
            List<org.jenkinsci.plugins.workflow.support.steps.input.InputStepExecution> executions = inputAction.getExecutions();
            if (executions != null) {
                for (org.jenkinsci.plugins.workflow.support.steps.input.InputStepExecution ex : executions) {
                    if (ex != null && !ex.isSettled()) {
                        if (inputId == null || inputId.trim().isEmpty() || inputId.trim().equals(ex.getId())) {
                            targetExec = ex;
                            break;
                        }
                    }
                }
            }

            if (targetExec == null) {
                rsp.setStatus(404);
                rsp.getWriter().write("{\"status\":\"error\",\"message\":\"Pending input step is no longer active.\"}");
                return;
            }

            targetExec.doAbort();
            JSONObject result = new JSONObject();
            result.put("status", "ok");
            result.put("message", "Input rejected; pipeline run aborted.");
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
     * REST API: Restarts a declarative pipeline from a specific stage.
     */
    @RequirePOST
    public void doApiRestartStage(StaplerRequest2 req, StaplerResponse2 rsp, @QueryParameter(fixEmpty = true) String stageName) throws IOException {
        rsp.setContentType("application/json;charset=UTF-8");
        if (!(run instanceof WorkflowRun)) {
            rsp.setStatus(400);
            rsp.getWriter().write("{\"status\":\"error\",\"message\":\"Only pipeline builds can be restarted.\"}");
            return;
        }
        WorkflowRun wfRun = (WorkflowRun) run;
        wfRun.getParent().checkPermission(hudson.model.Item.BUILD);

        if (stageName == null || stageName.trim().isEmpty()) {
            rsp.setStatus(400);
            rsp.getWriter().write("{\"status\":\"error\",\"message\":\"stageName parameter is required.\"}");
            return;
        }

        try {
            org.jenkinsci.plugins.pipeline.modeldefinition.actions.RestartDeclarativePipelineAction restartAction =
                    wfRun.getAction(org.jenkinsci.plugins.pipeline.modeldefinition.actions.RestartDeclarativePipelineAction.class);
            if (restartAction == null || !restartAction.isRestartEnabled()) {
                rsp.setStatus(400);
                rsp.getWriter().write("{\"status\":\"error\",\"message\":\"Restart from stage is not enabled for this pipeline run.\"}");
                return;
            }

            hudson.model.Queue.Item queueItem = restartAction.run(stageName.trim());
            JSONObject result = new JSONObject();
            result.put("status", "ok");
            result.put("message", "Restarted pipeline from stage: " + stageName.trim());
            result.put("queueId", queueItem != null ? queueItem.getId() : -1);
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
     * REST API: Replays this pipeline run with original or modified Jenkinsfile script.
     */
    @RequirePOST
    public void doApiReplayRun(StaplerRequest2 req, StaplerResponse2 rsp, @QueryParameter(fixEmpty = true) String script) throws IOException {
        rsp.setContentType("application/json;charset=UTF-8");
        if (!(run instanceof WorkflowRun)) {
            rsp.setStatus(400);
            rsp.getWriter().write("{\"status\":\"error\",\"message\":\"Only pipeline builds can be replayed.\"}");
            return;
        }
        WorkflowRun wfRun = (WorkflowRun) run;
        wfRun.getParent().checkPermission(hudson.model.Item.BUILD);

        try {
            org.jenkinsci.plugins.workflow.cps.replay.ReplayAction replayAction =
                    wfRun.getAction(org.jenkinsci.plugins.workflow.cps.replay.ReplayAction.class);
            if (replayAction == null || !replayAction.isEnabled()) {
                rsp.setStatus(400);
                rsp.getWriter().write("{\"status\":\"error\",\"message\":\"Replay is not enabled for this pipeline run or permission is denied.\"}");
                return;
            }

            if (script == null || script.trim().isEmpty()) {
                if (req.getContentType() != null && req.getContentType().contains("application/json")) {
                    try {
                        String body = new String(req.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                        if (!body.isEmpty()) {
                            JSONObject bodyJson = JSONObject.fromObject(body);
                            if (bodyJson.has("script")) {
                                script = bodyJson.optString("script", null);
                            }
                        }
                    } catch (Throwable ignored) {
                    }
                }
            }

            String targetScript = (script != null && !script.trim().isEmpty()) ? script : replayAction.getOriginalScript();
            java.util.Map<String, String> loaded = replayAction.getOriginalLoadedScripts();
            if (loaded == null) {
                loaded = java.util.Collections.emptyMap();
            }

            hudson.model.Queue.Item queueItem = replayAction.run2(targetScript, loaded);
            JSONObject result = new JSONObject();
            result.put("status", "ok");
            result.put("message", "Pipeline replay scheduled successfully.");
            result.put("queueId", queueItem != null ? queueItem.getId() : -1);
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
     * REST API: Rebuilds this run with the same parameters.
     */
    @RequirePOST
    public void doApiRebuild(StaplerRequest2 req, StaplerResponse2 rsp) throws IOException {
        rsp.setContentType("application/json;charset=UTF-8");
        if (!(run instanceof WorkflowRun)) {
            rsp.setStatus(400);
            rsp.getWriter().write("{\"status\":\"error\",\"message\":\"Run or parent job not found.\"}");
            return;
        }
        WorkflowRun wfRun = (WorkflowRun) run;
        org.jenkinsci.plugins.workflow.job.WorkflowJob wfJob = wfRun.getParent();
        wfJob.checkPermission(hudson.model.Item.BUILD);

        try {
            java.util.List<hudson.model.Action> actions = new java.util.ArrayList<>();
            hudson.model.ParametersAction paramsAction = run.getAction(hudson.model.ParametersAction.class);
            if (paramsAction != null) {
                actions.add(paramsAction);
            }
            actions.add(new hudson.model.CauseAction(new hudson.model.Cause.UserIdCause()));

            wfJob.scheduleBuild2(0, actions.toArray(new hudson.model.Action[0]));
            JSONObject result = new JSONObject();
            result.put("status", "ok");
            result.put("message", "Build #" + wfJob.getNextBuildNumber() + " scheduled successfully.");
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
