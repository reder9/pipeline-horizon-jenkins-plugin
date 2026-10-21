package io.jenkins.plugins.horizon;

import hudson.model.Item;
import hudson.model.Run;
import io.jenkins.plugins.horizon.analysis.PipelineGraphAnalyzer;
import io.jenkins.plugins.horizon.model.RunDetailSectionModel;
import io.jenkins.plugins.horizon.model.RunDetailsModel;
import io.jenkins.plugins.horizon.model.StageModel;
import io.jenkins.plugins.horizon.model.StepModel;
import io.jenkins.plugins.horizon.util.EncodingUtils;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

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

    private static final Logger LOGGER = Logger.getLogger(HorizonRunAction.class.getName());

    /**
     * Bounded thread-safe LRU cache for immutable completed builds. A single entry
     * carries the canvas, legacy/full, and on-demand detail representations so
     * opening a secondary panel does not evict the already-rendered canvas.
     */
    private static final Map<String, CachedRunAnalysis> COMPLETED_RUN_DETAILS_CACHE =
            Collections.synchronizedMap(new LinkedHashMap<String, CachedRunAnalysis>(128, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, CachedRunAnalysis> eldest) {
                    return size() > 256;
                }
            });

    private static final class CachedRunAnalysis {
        private RunDetailsModel canvasDetails;
        private RunDetailsModel fullDetails;
        private final Map<String, RunDetailSectionModel> sections = new LinkedHashMap<>();
    }

    public static void invalidateRunDetailsCache(String runExternalizableId) {
        if (runExternalizableId != null) {
            COMPLETED_RUN_DETAILS_CACHE.remove(runExternalizableId);
        }
    }

    public static void clearRunDetailsCache() {
        COMPLETED_RUN_DETAILS_CACHE.clear();
        PipelineGraphAnalyzer.clearCaches();
    }

    /**
     * REST API: Returns graph, stages, steps, status, timings, and agents for this build.
     * The default remains the legacy full response; {@code view=canvas} omits
     * large, nonessential data for a faster first render.
     */
    public void doApiGraph(StaplerRequest2 req, StaplerResponse2 rsp,
                           @QueryParameter(fixEmpty = true) String view) throws IOException {
        rsp.setContentType("application/json;charset=UTF-8");
        rsp.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        if (run != null) {
            run.checkPermission(Item.READ);
        }
        if (run instanceof WorkflowRun) {
            long startedAt = System.nanoTime();
            WorkflowRun wfRun = (WorkflowRun) run;
            RunDetailsModel details = "canvas".equalsIgnoreCase(view)
                    ? getOrBuildRunGraphDetails(wfRun)
                    : getOrBuildRunDetails(wfRun);
            setAnalysisTimingHeader(rsp, startedAt);
            JSONObject.fromObject(details).write(rsp.getWriter());
        } else {
            rsp.setStatus(400);
            rsp.getWriter().write("{\"error\": \"Horizon only supports Pipeline (WorkflowRun) builds\"}");
        }
    }

    /**
     * REST API: Returns one expensive build-detail section after it is requested
     * by the user, rather than making the pipeline canvas wait for it.
     */
    public void doApiDetails(StaplerRequest2 req, StaplerResponse2 rsp,
                             @QueryParameter(fixEmpty = true) String section) throws IOException {
        rsp.setContentType("application/json;charset=UTF-8");
        rsp.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        if (run != null) {
            run.checkPermission(Item.READ);
        }
        if (!(run instanceof WorkflowRun)) {
            rsp.setStatus(400);
            rsp.getWriter().write("{\"error\": \"Horizon only supports Pipeline (WorkflowRun) builds\"}");
            return;
        }

        String normalizedSection = normalizeDetailSection(section);
        if (normalizedSection == null) {
            rsp.setStatus(400);
            rsp.getWriter().write("{\"error\": \"Unsupported detail section\"}");
            return;
        }

        long startedAt = System.nanoTime();
        WorkflowRun wfRun = (WorkflowRun) run;
        RunDetailSectionModel details = getOrBuildRunDetailSection(wfRun, normalizedSection);
        setAnalysisTimingHeader(rsp, startedAt);
        JSONObject.fromObject(details).write(rsp.getWriter());
    }

    public RunDetailsModel getOrBuildRunDetails(WorkflowRun wfRun) {
        return getOrBuildRunDetails(wfRun, false);
    }

    /**
     * Returns the initial-view representation, which excludes deferred sections.
     */
    public RunDetailsModel getOrBuildRunGraphDetails(WorkflowRun wfRun) {
        return getOrBuildRunDetails(wfRun, true);
    }

    private RunDetailsModel getOrBuildRunDetails(WorkflowRun wfRun, boolean canvasOnly) {
        if (wfRun == null) {
            return null;
        }
        if (wfRun.isBuilding()) {
            return canvasOnly
                    ? PipelineGraphAnalyzer.buildCanvasDetails(wfRun)
                    : PipelineGraphAnalyzer.buildRunDetails(wfRun);
        }

        String cacheKey = wfRun.getExternalizableId();
        synchronized (COMPLETED_RUN_DETAILS_CACHE) {
            CachedRunAnalysis cached = COMPLETED_RUN_DETAILS_CACHE.get(cacheKey);
            if (cached != null) {
                RunDetailsModel details = canvasOnly ? cached.canvasDetails : cached.fullDetails;
                if (details != null) {
                    return details;
                }
            }
        }

        RunDetailsModel builtDetails = canvasOnly
                ? PipelineGraphAnalyzer.buildCanvasDetails(wfRun)
                : PipelineGraphAnalyzer.buildRunDetails(wfRun);
        if (wfRun.isBuilding()) {
            return builtDetails;
        }

        synchronized (COMPLETED_RUN_DETAILS_CACHE) {
            CachedRunAnalysis cached = COMPLETED_RUN_DETAILS_CACHE.get(cacheKey);
            if (cached == null) {
                cached = new CachedRunAnalysis();
                COMPLETED_RUN_DETAILS_CACHE.put(cacheKey, cached);
            }
            RunDetailsModel existing = canvasOnly ? cached.canvasDetails : cached.fullDetails;
            if (existing != null) {
                return existing;
            }
            if (canvasOnly) {
                cached.canvasDetails = builtDetails;
            } else {
                cached.fullDetails = builtDetails;
            }
            return builtDetails;
        }
    }

    private RunDetailSectionModel getOrBuildRunDetailSection(WorkflowRun wfRun, String section) {
        if (wfRun == null) {
            return new RunDetailSectionModel();
        }
        if (!wfRun.isBuilding()) {
            String cacheKey = wfRun.getExternalizableId();
            synchronized (COMPLETED_RUN_DETAILS_CACHE) {
                CachedRunAnalysis cached = COMPLETED_RUN_DETAILS_CACHE.get(cacheKey);
                if (cached != null) {
                    RunDetailSectionModel existing = cached.sections.get(section);
                    if (existing != null) {
                        return existing;
                    }
                }
            }

            RunDetailsModel canvasDetails = getOrBuildRunGraphDetails(wfRun);
            RunDetailSectionModel builtSection = PipelineGraphAnalyzer.buildDetailSection(
                    wfRun, section, canvasDetails != null ? canvasDetails.getStages() : Collections.emptyList());
            if (!wfRun.isBuilding()) {
                synchronized (COMPLETED_RUN_DETAILS_CACHE) {
                    CachedRunAnalysis cached = COMPLETED_RUN_DETAILS_CACHE.get(cacheKey);
                    if (cached == null) {
                        cached = new CachedRunAnalysis();
                        COMPLETED_RUN_DETAILS_CACHE.put(cacheKey, cached);
                    }
                    RunDetailSectionModel existing = cached.sections.get(section);
                    if (existing != null) {
                        return existing;
                    }
                    cached.sections.put(section, builtSection);
                }
            }
            return builtSection;
        }

        RunDetailsModel canvasDetails = getOrBuildRunGraphDetails(wfRun);
        return PipelineGraphAnalyzer.buildDetailSection(
                wfRun, section, canvasDetails != null ? canvasDetails.getStages() : Collections.emptyList());
    }

    private static String normalizeDetailSection(String section) {
        if (section == null) {
            return null;
        }
        String normalized = section.trim().toLowerCase(java.util.Locale.ROOT);
        if ("tests".equals(normalized) || "artifacts".equals(normalized)
                || "replay".equals(normalized) || "trends".equals(normalized)) {
            return normalized;
        }
        return null;
    }

    private static void setAnalysisTimingHeader(StaplerResponse2 rsp, long startedAtNanos) {
        long elapsedMillis = Math.max(0L, (System.nanoTime() - startedAtNanos) / 1_000_000L);
        rsp.setHeader("Server-Timing", "horizon;dur=" + elapsedMillis);
    }

    private void collectStageStepIds(StageModel stage, List<String> stepIds) {
        if (stage == null) {
            return;
        }
        if (stage.getSteps() != null) {
            for (StepModel s : stage.getSteps()) {
                if (s != null && s.getId() != null) {
                    stepIds.add(s.getId());
                }
            }
        }
        if (stage.getChildren() != null) {
            for (StageModel child : stage.getChildren()) {
                collectStageStepIds(child, stepIds);
            }
        }
    }

    private static final long MAX_LOG_BYTES = 512L * 1024L;

    /**
     * REST API: Returns log output for a specific step or entire stage FlowNode.
     * When nodeId points to a stage, aggregates logs across all enclosed steps in chronological order.
     * Supports incremental byte-offset polling via startOffset parameter, tail-safe inline truncation (last 512 KB),
     * and full streams for downloads.
     */
    public void doApiLog(StaplerRequest2 req, StaplerResponse2 rsp,
                         @QueryParameter(fixEmpty = true) String nodeId,
                         @QueryParameter(fixEmpty = true) String download,
                         @QueryParameter(fixEmpty = true) String startOffset) throws IOException {
        rsp.setContentType("text/plain;charset=UTF-8");
        rsp.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        rsp.setHeader("Access-Control-Expose-Headers", "X-Text-Size, X-More-Data");
        if (run != null) {
            run.checkPermission(Item.READ);
        }
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

        if (startOffset == null && req != null) {
            startOffset = req.getParameter("startOffset");
        }
        long reqOffset = -1L;
        if (startOffset != null && !startOffset.trim().isEmpty()) {
            try {
                reqOffset = Long.parseLong(startOffset.trim());
            } catch (NumberFormatException ignored) {}
        }

        LogAction logAction = node.getAction(LogAction.class);
        if (logAction != null && logAction.getLogText() != null) {
            hudson.console.AnnotatedLargeText<? extends FlowNode> logText = logAction.getLogText();
            long totalLen = Math.max(0L, logText.length());
            boolean hasMore = !logText.isComplete();
            rsp.setHeader("X-Text-Size", String.valueOf(totalLen));
            rsp.setHeader("X-More-Data", String.valueOf(hasMore));

            if (reqOffset >= 0) {
                // Incremental byte-offset streaming: return empty if no new bytes
                if (reqOffset >= totalLen) {
                    return;
                }
                try (OutputStream os = rsp.getOutputStream()) {
                    long written = logText.writeLogTo(reqOffset, os);
                    if (written < 0) {
                        os.flush();
                    }
                }
                return;
            }

            // Initial view or download (reqOffset < 0)
            long fromByte = (!isDownload && totalLen > MAX_LOG_BYTES) ? (totalLen - MAX_LOG_BYTES) : 0L;
            try (OutputStream os = rsp.getOutputStream()) {
                if (fromByte > 0) {
                    String banner = String.format(
                            java.util.Locale.US,
                            "[... Log truncated for inline performance: showing last %s of %s total. Use 'Raw' or 'Download' for full output ...]%n",
                            PipelineGraphAnalyzer.formatBytes(MAX_LOG_BYTES),
                            PipelineGraphAnalyzer.formatBytes(totalLen)
                    );
                    os.write(banner.getBytes(StandardCharsets.UTF_8));
                }
                long written = logText.writeLogTo(fromByte, os);
                if (written < 0) {
                    os.flush();
                }
            }
        } else {
            // Node has no direct LogAction (e.g. it is a Stage or Container block).
            // Directly resolve enclosed step FlowNodes in O(1) via StageModel; fall back to FlowGraphWalker if unmodeled.
            List<FlowNode> enclosedNodes = new ArrayList<>();
            RunDetailsModel details = getOrBuildRunGraphDetails(wfRun);
            StageModel targetStage = (details != null && details.getStages() != null)
                    ? PipelineGraphAnalyzer.findStageById(details.getStages(), nodeId)
                    : null;

            if (targetStage != null) {
                List<String> stepIds = new ArrayList<>();
                collectStageStepIds(targetStage, stepIds);
                for (String stepId : stepIds) {
                    try {
                        FlowNode sn = exec.getNode(stepId);
                        if (sn != null) {
                            LogAction la = sn.getAction(LogAction.class);
                            if (la != null && la.getLogText() != null) {
                                enclosedNodes.add(sn);
                            }
                        }
                    } catch (Throwable ignored) {}
                }
            } else {
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
                    Collections.reverse(enclosedNodes); // Chronological order
                } catch (Throwable ignored) {}
            }

            if (!enclosedNodes.isEmpty()) {
                long totalStageBytes = 0L;
                for (FlowNode en : enclosedNodes) {
                    LogAction la = en.getAction(LogAction.class);
                    if (la != null && la.getLogText() != null) {
                        totalStageBytes += Math.max(0L, la.getLogText().length());
                    }
                }
                rsp.setHeader("X-Text-Size", String.valueOf(totalStageBytes));
                rsp.setHeader("X-More-Data", String.valueOf(wfRun.isBuilding()));

                if (reqOffset >= 0 && reqOffset >= totalStageBytes) {
                    return; // No new log data
                }

                long bytesToSkip = (reqOffset >= 0)
                        ? reqOffset
                        : ((!isDownload && totalStageBytes > MAX_LOG_BYTES) ? (totalStageBytes - MAX_LOG_BYTES) : 0L);

                try (OutputStream os = rsp.getOutputStream()) {
                    if (reqOffset < 0 && bytesToSkip > 0) {
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
                rsp.setHeader("X-Text-Size", "0");
                rsp.setHeader("X-More-Data", String.valueOf(wfRun.isBuilding()));
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
            targetScript = EncodingUtils.fixMojibake(targetScript);
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
     * REST API: Validates Declarative or Scripted pipeline syntax without executing.
     */
    @RequirePOST
    public void doApiValidatePipeline(StaplerRequest2 req, StaplerResponse2 rsp, @QueryParameter(fixEmpty = true) String script) throws IOException {
        rsp.setContentType("application/json;charset=UTF-8");
        run.getParent().checkPermission(hudson.model.Item.EXTENDED_READ);

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

        script = EncodingUtils.fixMojibake(script);

        JSONObject result = new JSONObject();
        if (script == null || script.trim().isEmpty()) {
            result.put("status", "error");
            result.put("valid", false);
            result.put("message", "Pipeline script cannot be empty.");
            result.write(rsp.getWriter());
            return;
        }

        String trimmed = script.trim();
        boolean isDeclarative = trimmed.startsWith("pipeline") || trimmed.contains("pipeline {") || trimmed.contains("pipeline{");

        if (isDeclarative) {
            try {
                org.jenkinsci.plugins.pipeline.modeldefinition.ast.ModelASTPipelineDef def =
                        org.jenkinsci.plugins.pipeline.modeldefinition.parser.Converter.scriptToPipelineDef(script);
                if (def != null) {
                    result.put("status", "ok");
                    result.put("valid", true);
                    result.put("type", "declarative");
                    result.put("message", "Declarative Pipeline syntax is valid.");
                } else {
                    result.put("status", "error");
                    result.put("valid", false);
                    result.put("type", "declarative");
                    result.put("message", "Failed to parse Declarative Pipeline definition.");
                }
            } catch (Throwable t) {
                result.put("status", "error");
                result.put("valid", false);
                result.put("type", "declarative");
                extractCompilationErrorInfo(t, script, result);
            }
        } else {
            try {
                groovy.lang.GroovyShell shell = new groovy.lang.GroovyShell();
                shell.parse(script);
                result.put("status", "ok");
                result.put("valid", true);
                result.put("type", "scripted");
                result.put("message", "Scripted Pipeline syntax is valid Groovy.");
            } catch (Throwable t) {
                result.put("status", "error");
                result.put("valid", false);
                result.put("type", "scripted");
                extractCompilationErrorInfo(t, script, result);
            }
        }
        result.write(rsp.getWriter());
    }

    private static final java.util.regex.Pattern LINE_COL_PATTERN = java.util.regex.Pattern.compile(
            "(?:@ line|at line|line:?)\\s*(\\d+)(?:,?\\s*(?:col|column)?:?\\s*(\\d+))?",
            java.util.regex.Pattern.CASE_INSENSITIVE
    );

    private static final java.util.regex.Pattern WORKFLOW_SCRIPT_PATTERN = java.util.regex.Pattern.compile(
            "WorkflowScript:\\s*(\\d+):",
            java.util.regex.Pattern.CASE_INSENSITIVE
    );

    static void extractCompilationErrorInfo(Throwable t, String script, JSONObject result) {
        int line = -1;
        int col = -1;
        String cleanMessage = t.getMessage() != null ? t.getMessage() : t.toString();

        Throwable current = t;
        while (current != null) {
            if (current instanceof org.codehaus.groovy.control.MultipleCompilationErrorsException) {
                org.codehaus.groovy.control.MultipleCompilationErrorsException mcee =
                        (org.codehaus.groovy.control.MultipleCompilationErrorsException) current;
                org.codehaus.groovy.control.ErrorCollector collector = mcee.getErrorCollector();
                if (collector != null && collector.getErrorCount() > 0) {
                    org.codehaus.groovy.syntax.SyntaxException se = collector.getSyntaxError(0);
                    if (se != null) {
                        line = se.getLine();
                        col = se.getStartColumn();
                        if (se.getOriginalMessage() != null && !se.getOriginalMessage().isEmpty()) {
                            cleanMessage = se.getOriginalMessage();
                        }
                        break;
                    }
                }
            }
            current = current.getCause();
        }

        if (line <= 0 && cleanMessage != null) {
            java.util.regex.Matcher m = LINE_COL_PATTERN.matcher(cleanMessage);
            if (m.find()) {
                try {
                    String lineGroup = m.group(1);
                    if (lineGroup != null) {
                        line = Integer.parseInt(lineGroup);
                    }
                    String colGroup = m.group(2);
                    if (colGroup != null) {
                        col = Integer.parseInt(colGroup);
                    }
                } catch (NumberFormatException ignored) {
                }
            } else {
                java.util.regex.Matcher m2 = WORKFLOW_SCRIPT_PATTERN.matcher(cleanMessage);
                if (m2.find()) {
                    try {
                        String lineGroup = m2.group(1);
                        if (lineGroup != null) {
                            line = Integer.parseInt(lineGroup);
                        }
                    } catch (NumberFormatException ignored) {
                    }
                }
            }
        }

        if (cleanMessage != null) {
            cleanMessage = cleanMessage.replaceFirst("(?s)^startup failed:\\s*", "").trim();
            cleanMessage = cleanMessage.replaceAll("(?m)^\\d+\\s+errors?\\s*$", "").trim();
        }

        result.put("message", (cleanMessage != null && !cleanMessage.isEmpty()) ? cleanMessage : "Pipeline syntax error.");
        if (line > 0) {
            result.put("line", line);
            if (col > 0) {
                result.put("column", col);
            }
            if (script != null) {
                String[] scriptLines = script.split("\r?\n", -1);
                if (line <= scriptLines.length) {
                    result.put("errorLineText", scriptLines[line - 1]);
                }
            }
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
