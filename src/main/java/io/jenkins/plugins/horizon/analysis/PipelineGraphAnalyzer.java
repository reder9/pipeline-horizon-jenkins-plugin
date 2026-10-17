package io.jenkins.plugins.horizon.analysis;

import hudson.model.Result;
import hudson.scm.ChangeLogSet;
import hudson.tasks.test.AbstractTestResultAction;
import io.jenkins.plugins.horizon.model.ArtifactModel;
import io.jenkins.plugins.horizon.model.JobParameterModel;
import io.jenkins.plugins.horizon.model.JobSummaryModel;
import io.jenkins.plugins.horizon.model.PendingInputModel;
import io.jenkins.plugins.horizon.model.RunDetailsModel;
import io.jenkins.plugins.horizon.model.RunSummaryModel;
import io.jenkins.plugins.horizon.model.StageModel;
import io.jenkins.plugins.horizon.model.StepModel;
import io.jenkins.plugins.horizon.model.TestCaseModel;
import org.jenkinsci.plugins.workflow.actions.ArgumentsAction;
import org.jenkinsci.plugins.workflow.actions.ErrorAction;
import org.jenkinsci.plugins.workflow.actions.LabelAction;
import org.jenkinsci.plugins.workflow.actions.LogAction;
import org.jenkinsci.plugins.workflow.actions.TagsAction;
import org.jenkinsci.plugins.workflow.actions.ThreadNameAction;
import org.jenkinsci.plugins.workflow.actions.TimingAction;
import org.jenkinsci.plugins.workflow.actions.WorkspaceAction;
import org.jenkinsci.plugins.workflow.cps.nodes.StepStartNode;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.BlockEndNode;
import org.jenkinsci.plugins.workflow.graph.BlockStartNode;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.graph.StepNode;
import org.jenkinsci.plugins.workflow.graphanalysis.DepthFirstScanner;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class PipelineGraphAnalyzer {

    /**
     * Builds full details and graph representation for a specific build run.
     */
    public static RunDetailsModel buildRunDetails(WorkflowRun run) {
        RunDetailsModel details = new RunDetailsModel();
        populateSummaryMetadata(run, details);
        details.setAbortEnabled(run.isBuilding());

        WorkflowRun prev = run.getPreviousBuild();
        if (prev != null) {
            details.setPreviousBuildNumber(prev.getNumber());
        }

        WorkflowRun next = run.getNextBuild();
        if (next != null) {
            details.setNextBuildNumber(next.getNumber());
        }

        // Test results if JUnit or similar test reporting plugin was run
        try {
            AbstractTestResultAction<?> testAction = run.getAction(AbstractTestResultAction.class);
            if (testAction != null) {
                details.setTotalTests(testAction.getTotalCount());
                details.setFailedTests(testAction.getFailCount());
                details.setSkippedTests(testAction.getSkipCount());
                extractTestCases(testAction, details);
            }
        } catch (Throwable ignored) {
        }

        FlowExecution exec = run.getExecution();
        if (exec == null) {
            return details;
        }

        DepthFirstScanner scanner = new DepthFirstScanner();
        List<FlowNode> allNodes = scanner.allNodes(exec);
        if (allNodes.isEmpty()) {
            return details;
        }

        // Order nodes chronologically
        Collections.reverse(allNodes);

        // Map start and end block nodes
        Map<String, FlowNode> nodeMap = new HashMap<>();
        Map<String, BlockEndNode> startToEndMap = new HashMap<>();
        for (FlowNode n : allNodes) {
            nodeMap.put(n.getId(), n);
            if (n instanceof BlockEndNode) {
                BlockEndNode end = (BlockEndNode) n;
                startToEndMap.put(end.getStartNode().getId(), end);
            }
        }

        // Detect default agent for whole run if any WorkspaceAction exists
        String defaultAgent = null;
        for (FlowNode n : allNodes) {
            WorkspaceAction wa = n.getAction(WorkspaceAction.class);
            if (wa != null) {
                defaultAgent = formatAgentName(wa.getNode());
                break;
            }
        }

        // Identify Stages & Branches
        List<StageModel> rawStages = new ArrayList<>();
        Set<String> allAgentsUsed = new HashSet<>();
        if (defaultAgent != null) {
            allAgentsUsed.add(defaultAgent);
        }

        // Pre-scan to find which branch nodes have inner stages
        Set<String> branchNodesWithInnerStages = new HashSet<>();
        for (FlowNode node : allNodes) {
            LabelAction la = node.getAction(LabelAction.class);
            String laDisp = la != null ? la.getDisplayName() : null;
            if (laDisp != null && !laDisp.trim().startsWith("Branch: ")) {
                try {
                    for (BlockStartNode bsn : node.iterateEnclosingBlocks()) {
                        if (bsn.getAction(ThreadNameAction.class) != null) {
                            branchNodesWithInnerStages.add(bsn.getId());
                        }
                    }
                } catch (Throwable ignored) {}
            }
        }

        for (FlowNode node : allNodes) {
            LabelAction labelAction = node.getAction(LabelAction.class);
            ThreadNameAction threadNameAction = node.getAction(ThreadNameAction.class);

            String rawLabelName = labelAction != null ? labelAction.getDisplayName() : null;
            if (rawLabelName != null) {
                String labelName = rawLabelName.trim();

                // If this is a branch launcher wrapper (e.g. "Branch: Unit Tests")
                if (labelName.startsWith("Branch: ")) {
                    // Only skip if the branch contains an inner stage (which has the real stage name)
                    if (branchNodesWithInnerStages.contains(node.getId())) {
                        continue;
                    }
                    // Otherwise, use the branch name as the stage name
                    labelName = labelName.substring("Branch: ".length()).trim();
                }

                StageModel stage = createStageModel(node, labelName, startToEndMap.get(node.getId()), defaultAgent);

                // Detect parallel branch name from ThreadNameAction on node or its enclosing blocks
                ThreadNameAction tna = threadNameAction;
                if (tna == null) {
                    try {
                        for (BlockStartNode bsn : node.iterateEnclosingBlocks()) {
                            tna = bsn.getAction(ThreadNameAction.class);
                            if (tna != null) break;
                        }
                    } catch (Throwable ignored) {}
                }

                if (tna != null) {
                    stage.setParallelBranch(true);
                    stage.setBranchName(tna.getThreadName());
                }

                if (stage.getAgent() != null) {
                    allAgentsUsed.add(stage.getAgent());
                }

                rawStages.add(stage);
            }
        }

        // Sort stages chronologically by FlowNode ID
        rawStages.sort(Comparator.comparingLong(s -> {
            try {
                return Long.parseLong(s.getId());
            } catch (NumberFormatException e) {
                return 0L;
            }
        }));

        Map<String, List<String>> stageArtifactPatterns = new HashMap<>();

        // Collect steps within each stage
        for (StageModel stage : rawStages) {
            if (stage.getStatus() != null && stage.getStatus().startsWith("SKIPPED")) {
                continue;
            }

            FlowNode startNode = nodeMap.get(stage.getId());
            BlockEndNode endNode = startToEndMap.get(stage.getId());
            long stageEndIndex = endNode != null ? Long.parseLong(endNode.getId()) : Long.MAX_VALUE;
            long stageStartIndex = Long.parseLong(startNode.getId());

            for (int i = 0; i < allNodes.size(); i++) {
                FlowNode n = allNodes.get(i);
                long currentId;
                try {
                    currentId = Long.parseLong(n.getId());
                } catch (NumberFormatException e) {
                    continue;
                }

                boolean isEnclosed = false;
                try {
                    List<String> enclosing = n.getAllEnclosingIds();
                    if (!enclosing.isEmpty()) {
                        isEnclosed = enclosing.contains(stage.getId());
                    }
                } catch (Throwable ignored) {}

                if (!isEnclosed) {
                    try {
                        if (n.getAllEnclosingIds().isEmpty()) {
                            isEnclosed = (currentId > stageStartIndex && currentId < stageEndIndex);
                        }
                    } catch (Throwable ignored) {
                        isEnclosed = (currentId > stageStartIndex && currentId < stageEndIndex);
                    }
                }

                if (isEnclosed) {
                    WorkspaceAction wa = n.getAction(WorkspaceAction.class);
                    if (wa != null) {
                        String stageAgent = formatAgentName(wa.getNode());
                        stage.setAgent(stageAgent);
                        allAgentsUsed.add(stageAgent);
                    }

                    if (isArchiveArtifactsStep(n)) {
                        String pattern = extractArchivePattern(n);
                        stageArtifactPatterns.computeIfAbsent(stage.getId(), k -> new ArrayList<>()).add(pattern);
                    }

                    if (isStepNode(n)) {
                        StepModel step = createStepModel(n, startToEndMap, allNodes, i);
                        stage.addStep(step);
                        if ("SKIPPED".equalsIgnoreCase(step.getStatus()) || "NOT_EXECUTED".equalsIgnoreCase(step.getStatus())) {
                            stage.setSkippedStepsCount(stage.getSkippedStepsCount() + 1);
                        }
                    }

                    // Check for WarningAction indicating unstable execution in stage
                    org.jenkinsci.plugins.workflow.actions.WarningAction warningAction = n.getAction(org.jenkinsci.plugins.workflow.actions.WarningAction.class);
                    if (warningAction != null) {
                        if (!"FAILED".equals(stage.getStatus())) {
                            stage.setStatus("UNSTABLE");
                        }
                        String warnMsg = warningAction.getMessage();
                        if (warnMsg != null && warnMsg.toLowerCase(java.util.Locale.ROOT).contains("optional")) {
                            stage.setOptional(true);
                        }
                    }
                }
            }
        }

        // Count overall total steps and failures across run
        int totalStepsCount = 0;
        int failedStepsCount = 0;
        for (FlowNode n : allNodes) {
            if (isStepNode(n)) {
                totalStepsCount++;
                if (n.getError() != null) {
                    failedStepsCount++;
                }
            }
        }

        // Archived Artifacts detection & per-stage mapping
        try {
            List<? extends hudson.model.Run<?, ?>.Artifact> rawArtifacts = run.getArtifacts();
            if (!rawArtifacts.isEmpty()) {
                List<ArtifactModel> artifactList = new ArrayList<>();
                long totalSize = 0;
                for (hudson.model.Run<?, ?>.Artifact a : rawArtifacts) {
                    long size = a.getFileSize();
                    totalSize += Math.max(0, size);
                    String formatted = formatBytes(size);
                    artifactList.add(new ArtifactModel(
                            a.getFileName(),
                            a.relativePath,
                            a.getDisplayPath(),
                            a.getHref(),
                            size,
                            formatted
                    ));
                }
                details.setArtifacts(artifactList);
                details.setArtifactCount(artifactList.size());
                details.setTotalArtifactSize(totalSize);
                details.setFormattedTotalArtifactSize(formatBytes(totalSize));

                // Map artifacts directly to the stage that generated them
                associateArtifactsWithStages(rawStages, artifactList, stageArtifactPatterns);
            }
        } catch (Throwable ignored) {
        }

        // Detect active InputStepExecutions and associate with stages & steps
        populatePendingInputs(run, details, rawStages, startToEndMap);

        // Group parallel branches into their parent stage
        List<StageModel> consolidatedStages = consolidateStages(rawStages, nodeMap, startToEndMap);

        // Propagate agent to stages and parallel children that didn't have explicit WorkspaceAction
        for (StageModel s : consolidatedStages) {
            if (s.getAgent() == null || s.getAgent().trim().isEmpty()) {
                if (defaultAgent != null) {
                    s.setAgent(defaultAgent);
                    allAgentsUsed.add(defaultAgent);
                } else if (!"SKIPPED".equalsIgnoreCase(s.getStatus()) && !"NOT_EXECUTED".equalsIgnoreCase(s.getStatus())) {
                    s.setAgent("Built-In Node");
                    allAgentsUsed.add("Built-In Node");
                }
            }
            if (s.getChildren() != null) {
                for (StageModel child : s.getChildren()) {
                    if (child.getAgent() == null || child.getAgent().trim().isEmpty()) {
                        if (s.getAgent() != null) {
                            child.setAgent(s.getAgent());
                        } else if (defaultAgent != null) {
                            child.setAgent(defaultAgent);
                            allAgentsUsed.add(defaultAgent);
                        } else if (!"SKIPPED".equalsIgnoreCase(child.getStatus()) && !"NOT_EXECUTED".equalsIgnoreCase(child.getStatus())) {
                            child.setAgent("Built-In Node");
                            allAgentsUsed.add("Built-In Node");
                        }
                    }
                }
            }
        }
        if (allAgentsUsed.isEmpty()) {
            allAgentsUsed.add("Built-In Node");
        }

        details.setStages(consolidatedStages);
        details.setStageCount(consolidatedStages.size());
        details.setTotalSteps(totalStepsCount);
        details.setFailedSteps(failedStepsCount);
        details.setAgentsUsed(new ArrayList<>(allAgentsUsed));

        // Restart Declarative Pipeline detection
        try {
            org.jenkinsci.plugins.pipeline.modeldefinition.actions.RestartDeclarativePipelineAction restartAction =
                    run.getAction(org.jenkinsci.plugins.pipeline.modeldefinition.actions.RestartDeclarativePipelineAction.class);
            if (restartAction != null && restartAction.isRestartEnabled()) {
                details.setRestartEnabled(true);
                List<String> restartable = restartAction.getRestartableStages();
                if (restartable != null) {
                    details.setRestartableStages(new ArrayList<>(restartable));
                    Set<String> restartSet = new HashSet<>(restartable);
                    for (StageModel s : consolidatedStages) {
                        if (restartSet.contains(s.getName())) {
                            s.setRestartable(true);
                            for (StageModel child : s.getChildren()) {
                                child.setRestartable(true);
                            }
                        }
                    }
                }
            }
        } catch (Throwable ignored) {
        }

        // Replay Action detection
        try {
            org.jenkinsci.plugins.workflow.cps.replay.ReplayAction replayAction =
                    run.getAction(org.jenkinsci.plugins.workflow.cps.replay.ReplayAction.class);
            if (replayAction != null && replayAction.isEnabled()) {
                details.setReplayEnabled(true);
                details.setOriginalScript(replayAction.getOriginalScript());
            }
        } catch (Throwable ignored) {
        }

        // Rebuild capability
        details.setRebuildEnabled(run.getParent().isBuildable());

        return details;
    }

    public static String formatBytes(long bytes) {
        if (bytes <= 0) return "0 B";
        if (bytes < 1024) return bytes + " B";
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        char pre = "KMGTPE".charAt(exp - 1);
        return String.format(java.util.Locale.US, "%.1f %cB", bytes / Math.pow(1024, exp), pre);
    }

    /**
     * Builds summary of a Job including recent runs and parameters.
     */
    public static JobSummaryModel buildJobSummary(WorkflowJob job) {
        JobSummaryModel model = new JobSummaryModel();
        model.setName(job.getName());
        model.setFullName(job.getFullName());
        model.setUrl(job.getUrl());
        model.setHorizonUrl(job.getUrl() + "horizon/");
        model.setDescription(job.getDescription());
        model.setBuildable(job.isBuildable());
        model.setParameterized(job.isParameterized());
        model.setWeatherScore(job.getBuildHealth().getScore());

        WorkflowRun lastBuild = job.getLastBuild();
        if (lastBuild != null) {
            model.setLastBuildNumber(lastBuild.getNumber());
        }
        WorkflowRun lastSuccess = job.getLastSuccessfulBuild();
        if (lastSuccess != null) {
            model.setLastSuccessfulBuildNumber(lastSuccess.getNumber());
        }
        WorkflowRun lastFailed = job.getLastFailedBuild();
        if (lastFailed != null) {
            model.setLastFailedBuildNumber(lastFailed.getNumber());
        }

        // Populate parameters if parameterized
        if (job.isParameterized()) {
            hudson.model.ParametersDefinitionProperty prop = job.getProperty(hudson.model.ParametersDefinitionProperty.class);
            if (prop != null) {
                for (hudson.model.ParameterDefinition pd : prop.getParameterDefinitions()) {
                    JobParameterModel param = new JobParameterModel();
                    param.setName(pd.getName());
                    param.setType(pd.getType());
                    param.setDescription(pd.getDescription());
                    hudson.model.ParameterValue defParamVal = pd.getDefaultParameterValue();
                    if (defParamVal != null) {
                        param.setDefaultValue(String.valueOf(defParamVal.getValue()));
                    }
                    if (pd instanceof hudson.model.ChoiceParameterDefinition) {
                        param.setChoices(((hudson.model.ChoiceParameterDefinition) pd).getChoices());
                    }
                    model.getParameters().add(param);
                }
            }
        }

        // Collect recent runs (up to 30)
        List<RunSummaryModel> runs = new ArrayList<>();
        int count = 0;
        for (WorkflowRun r : job.getBuilds()) {
            if (count++ >= 30) {
                break;
            }
            RunSummaryModel runSum = new RunSummaryModel();
            populateSummaryMetadata(r, runSum);
            runs.add(runSum);
        }
        model.setRuns(runs);

        return model;
    }

    private static void populateSummaryMetadata(WorkflowRun run, RunSummaryModel summary) {
        summary.setNumber(run.getNumber());
        summary.setId(run.getId());
        summary.setDisplayName(run.getDisplayName());
        summary.setBuilding(run.isBuilding());
        summary.setTimestamp(run.getStartTimeInMillis());
        summary.setDuration(run.getDuration() > 0 ? run.getDuration() : (System.currentTimeMillis() - run.getStartTimeInMillis()));
        summary.setUrl(run.getUrl());
        summary.setHorizonUrl(run.getUrl() + "horizon/");

        Result result = run.getResult();
        if (run.isBuilding()) {
            summary.setResult("IN_PROGRESS");
            try {
                org.jenkinsci.plugins.workflow.support.steps.input.InputAction inputAction =
                        run.getAction(org.jenkinsci.plugins.workflow.support.steps.input.InputAction.class);
                if (inputAction != null) {
                    List<org.jenkinsci.plugins.workflow.support.steps.input.InputStepExecution> executions = inputAction.getExecutions();
                    if (executions != null && !executions.isEmpty()) {
                        summary.setPausedForInput(true);
                    }
                }
            } catch (Throwable ignored) {
            }
        } else if (result != null) {
            summary.setResult(result.toString());
        } else {
            summary.setResult("UNKNOWN");
        }

        // Causes
        for (hudson.model.Cause c : run.getCauses()) {
            summary.getCauses().add(c.getShortDescription());
        }

        // Parameters
        hudson.model.ParametersAction pa = run.getAction(hudson.model.ParametersAction.class);
        if (pa != null) {
            for (hudson.model.ParameterValue pv : pa.getParameters()) {
                if (pv != null && pv.getValue() != null) {
                    summary.getParameters().put(pv.getName(), String.valueOf(pv.getValue()));
                }
            }
        }

        // Git SCM details
        for (ChangeLogSet<? extends ChangeLogSet.Entry> changeSet : run.getChangeSets()) {
            for (ChangeLogSet.Entry entry : changeSet) {
                if (summary.getCommitSha() == null && entry.getCommitId() != null) {
                    summary.setCommitSha(entry.getCommitId());
                }
                if (summary.getCommitMessage() == null && entry.getMsg() != null) {
                    summary.setCommitMessage(entry.getMsg());
                }
            }
        }
    }

    private static boolean isStepNode(FlowNode node) {
        String funcName = node.getDisplayFunctionName();
        if (funcName == null || funcName.isEmpty()) {
            return false;
        }
        if ("stage".equals(funcName) || "parallel".equals(funcName) || "getContext".equals(funcName) || "script".equals(funcName)) {
            return false;
        }
        if ("{".equals(funcName) || "}".equals(funcName) || funcName.startsWith("//")) {
            return false;
        }
        return (node instanceof StepNode) || (node.getAction(LogAction.class) != null);
    }

    private static StageModel createStageModel(FlowNode startNode, String stageName, BlockEndNode endNode, String defaultAgent) {
        StageModel stage = new StageModel();
        stage.setId(startNode.getId());
        stage.setName(stageName);
        stage.setAgent(defaultAgent);

        if (stageName != null && stageName.toLowerCase(java.util.Locale.ROOT).matches(".*\\boptional\\b.*")) {
            stage.setOptional(true);
        }

        long startTime = TimingAction.getStartTime(startNode);
        stage.setStartTimeMillis(startTime);

        if (endNode != null) {
            long endTime = TimingAction.getStartTime(endNode);
            stage.setDurationMillis(Math.max(0, endTime - startTime));
        } else if (startNode.isActive()) {
            stage.setDurationMillis(System.currentTimeMillis() - startTime);
        }

        // Status & Condition analysis
        TagsAction tags = startNode.getAction(TagsAction.class);
        if (tags != null) {
            String stageStatus = tags.getTagValue("STAGE_STATUS");
            if ("SKIPPED_FOR_CONDITIONAL".equals(stageStatus)) {
                stage.setStatus("SKIPPED_CONDITIONAL");
                stage.setSkipReason("when condition evaluated to false");
                return stage;
            } else if ("SKIPPED_FOR_FAILURE".equals(stageStatus)) {
                stage.setStatus("SKIPPED_UPSTREAM");
                stage.setSkipReason("Skipped due to upstream failure");
                return stage;
            } else if ("SKIPPED_FOR_UNSTABLE".equals(stageStatus)) {
                stage.setStatus("SKIPPED_UNSTABLE");
                stage.setSkipReason("Skipped due to unstable upstream");
                return stage;
            }
        }

        ErrorAction errorAction = startNode.getAction(ErrorAction.class);
        if (endNode != null && errorAction == null) {
            errorAction = endNode.getAction(ErrorAction.class);
        }

        if (errorAction != null) {
            Throwable th = errorAction.getError();
            boolean isAborted = (th instanceof org.jenkinsci.plugins.workflow.steps.FlowInterruptedException)
                    || (th.getMessage() != null && th.getMessage().toLowerCase(java.util.Locale.ROOT).contains("abort"))
                    || (th.getClass().getName().contains("Interrupted"));
            if (isAborted) {
                stage.setStatus("ABORTED");
                stage.setError(th.getMessage() != null ? th.getMessage() : "Stage was aborted");
            } else {
                stage.setStatus("FAILED");
                stage.setError(th.getMessage() != null ? th.getMessage() : "Stage failed");
            }
        } else if (startNode.isActive()) {
            stage.setStatus("IN_PROGRESS");
        } else {
            stage.setStatus("SUCCESS");
        }

        return stage;
    }

    private static StepModel createStepModel(FlowNode node, Map<String, BlockEndNode> startToEndMap, List<FlowNode> allNodes, int nodeIndex) {
        StepModel step = new StepModel();
        step.setId(node.getId());
        step.setName(node.getDisplayFunctionName());
        step.setDisplayName(node.getDisplayName());

        try {
            String argsStr = ArgumentsAction.getStepArgumentsAsString(node);
            if (argsStr == null || argsStr.trim().isEmpty()) {
                Map<String, Object> args = ArgumentsAction.getArguments(node);
                if (!args.isEmpty()) {
                    List<String> parts = new ArrayList<>();
                    for (Map.Entry<String, Object> entry : args.entrySet()) {
                        String key = entry.getKey();
                        Object rawVal = entry.getValue();
                        String val = rawVal != null ? rawVal.toString().trim() : "";
                        if (val.isEmpty() || "OVERSIZE_VALUE".equals(val) || "OVERSIZE_VALUE".equals(key)) {
                            continue;
                        }
                        if ("<anonymous>".equals(key)) {
                            parts.add(val);
                        } else {
                            parts.add(key + ": " + val);
                        }
                    }
                    if (!parts.isEmpty()) {
                        argsStr = String.join(", ", parts);
                    }
                }
            }
            if (argsStr != null && !argsStr.trim().isEmpty()) {
                step.setArguments(argsStr.trim());
            }
        } catch (Throwable ignored) {}

        if (step.getName() != null && step.getName().toLowerCase(java.util.Locale.ROOT).contains("optional")
                || (step.getDisplayName() != null && step.getDisplayName().toLowerCase(java.util.Locale.ROOT).contains("optional"))) {
            step.setOptional(true);
        }

        long startTime = TimingAction.getStartTime(node);
        step.setStartTimeMillis(startTime);
        step.setHasLogs(node.getAction(LogAction.class) != null);

        // Calculate step execution duration
        long duration = 0;
        if (startToEndMap != null && startToEndMap.containsKey(node.getId())) {
            BlockEndNode end = startToEndMap.get(node.getId());
            if (end != null) {
                long endTime = TimingAction.getStartTime(end);
                duration = Math.max(0, endTime - startTime);
            }
        } else if (allNodes != null && nodeIndex >= 0 && nodeIndex < allNodes.size() - 1) {
            for (int k = nodeIndex + 1; k < allNodes.size(); k++) {
                FlowNode next = allNodes.get(k);
                long nextTime = TimingAction.getStartTime(next);
                if (nextTime > startTime) {
                    duration = Math.max(0, nextTime - startTime);
                    break;
                }
            }
        }
        if (duration == 0 && node.isActive()) {
            duration = Math.max(0, System.currentTimeMillis() - startTime);
        }
        step.setDurationMillis(duration);

        ErrorAction ea = node.getAction(ErrorAction.class);
        if (ea != null) {
            Throwable th = ea.getError();
            boolean isAborted = (th instanceof org.jenkinsci.plugins.workflow.steps.FlowInterruptedException)
                    || (th.getMessage() != null && th.getMessage().toLowerCase(java.util.Locale.ROOT).contains("abort"))
                    || (th.getClass().getName().contains("Interrupted"));
            if (isAborted) {
                step.setStatus("ABORTED");
                step.setError(th.getMessage() != null ? th.getMessage() : "Step was aborted");
            } else {
                step.setStatus("FAILED");
                step.setError(th.getMessage() != null ? th.getMessage() : "Step failed");
            }
        } else {
            org.jenkinsci.plugins.workflow.actions.WarningAction wa = node.getAction(org.jenkinsci.plugins.workflow.actions.WarningAction.class);
            if (wa != null) {
                step.setStatus("UNSTABLE");
                String waMsg = wa.getMessage();
                if (waMsg != null && waMsg.toLowerCase(java.util.Locale.ROOT).contains("optional")) {
                    step.setOptional(true);
                }
            } else if (node.isActive()) {
                step.setStatus("IN_PROGRESS");
            } else {
                step.setStatus("SUCCESS");
            }
        }

        return step;
    }

    static List<StageModel> consolidateStages(List<StageModel> stages, Map<String, FlowNode> nodeMap, Map<String, BlockEndNode> startToEndMap) {
        List<StageModel> result = new ArrayList<>();
        Map<String, StageModel> stageById = new HashMap<>();
        for (StageModel s : stages) {
            stageById.put(s.getId(), s);
        }

        for (StageModel s : stages) {
            FlowNode sNode = nodeMap != null ? nodeMap.get(s.getId()) : null;
            StageModel parentStage = null;

            // 1. Primary resolution: Use FlowNode enclosing blocks hierarchy (works for both completed AND in-flight runs)
            if (sNode != null) {
                try {
                    for (BlockStartNode bsn : sNode.iterateEnclosingBlocks()) {
                        StageModel candidate = stageById.get(bsn.getId());
                        if (candidate != null && candidate != s) {
                            parentStage = candidate;
                            break;
                        }
                    }
                } catch (Throwable ignored) {
                }
            }

            // 2. Secondary fallback (e.g. for synthetic graphs or mocks): BlockEndNode span check
            if (parentStage == null && startToEndMap != null) {
                long sId = 0L;
                try {
                    sId = Long.parseLong(s.getId());
                } catch (NumberFormatException ignored) {}

                if (sId > 0) {
                    for (StageModel candidateParent : result) {
                        BlockEndNode parentEnd = startToEndMap.get(candidateParent.getId());
                        if (parentEnd != null) {
                            try {
                                long parentStartId = Long.parseLong(candidateParent.getId());
                                long parentEndId = Long.parseLong(parentEnd.getId());
                                if (sId > parentStartId && sId < parentEndId) {
                                    parentStage = candidateParent;
                                    break;
                                }
                            } catch (NumberFormatException ignored) {}
                        }
                    }
                }
            }

            if (parentStage != null) {
                parentStage.addChild(s);
                s.setParallelBranch(true);
                if (s.isHasArtifacts()) {
                    parentStage.setHasArtifacts(true);
                    parentStage.setArtifactCount(parentStage.getArtifactCount() + s.getArtifactCount());
                    if (parentStage.getArtifacts() == null) {
                        parentStage.setArtifacts(new ArrayList<>());
                    }
                    for (ArtifactModel art : s.getArtifacts()) {
                        if (!parentStage.getArtifacts().contains(art)) {
                            parentStage.addArtifact(art);
                        }
                    }
                }
            } else {
                result.add(s);
            }
        }

        // Synchronize parent stage status and duration with children
        for (StageModel s : result) {
            if (s.getChildren() != null && !s.getChildren().isEmpty()) {
                boolean hasFailure = false;
                boolean hasUnstable = false;
                boolean hasInProgress = false;
                boolean hasPausedInput = false;
                boolean allSkipped = true;
                long maxChildDuration = 0L;

                for (StageModel child : s.getChildren()) {
                    String cStatus = child.getStatus();
                    if ("FAILED".equals(cStatus) || "FAILURE".equals(cStatus)) {
                        hasFailure = true;
                    } else if ("UNSTABLE".equals(cStatus)) {
                        hasUnstable = true;
                    } else if ("PAUSED_INPUT".equals(cStatus) || child.isPausedForInput()) {
                        hasPausedInput = true;
                    } else if ("IN_PROGRESS".equals(cStatus)) {
                        hasInProgress = true;
                    }

                    if (cStatus == null || !cStatus.contains("SKIPPED")) {
                        allSkipped = false;
                    }

                    if (child.getDurationMillis() > maxChildDuration) {
                        maxChildDuration = child.getDurationMillis();
                    }
                }

                if (s.getDurationMillis() <= 0 && maxChildDuration > 0) {
                    s.setDurationMillis(maxChildDuration);
                }

                if (hasPausedInput) {
                    s.setPausedForInput(true);
                    s.setStatus("PAUSED_INPUT");
                } else if (hasInProgress) {
                    s.setStatus("IN_PROGRESS");
                } else if (hasFailure) {
                    s.setStatus("FAILED");
                } else if (hasUnstable) {
                    s.setStatus("UNSTABLE");
                } else if (allSkipped) {
                    s.setStatus("SKIPPED_CONDITIONAL");
                }
            }
        }

        return result;
    }

    private static void populatePendingInputs(
            WorkflowRun run,
            RunDetailsModel details,
            List<StageModel> rawStages,
            Map<String, BlockEndNode> startToEndMap) {
        if (!run.isBuilding()) {
            return;
        }
        try {
            org.jenkinsci.plugins.workflow.support.steps.input.InputAction inputAction =
                    run.getAction(org.jenkinsci.plugins.workflow.support.steps.input.InputAction.class);
            if (inputAction == null) {
                return;
            }
            List<org.jenkinsci.plugins.workflow.support.steps.input.InputStepExecution> executions = inputAction.getExecutions();
            if (executions == null || executions.isEmpty()) {
                return;
            }

            List<PendingInputModel> pendingList = new ArrayList<>();
            for (org.jenkinsci.plugins.workflow.support.steps.input.InputStepExecution execItem : executions) {
                if (execItem == null || execItem.isSettled()) {
                    continue;
                }
                PendingInputModel model = new PendingInputModel();
                model.setId(execItem.getId());

                org.jenkinsci.plugins.workflow.support.steps.input.InputStep inputStep = execItem.getInput();
                if (inputStep != null) {
                    model.setMessage(inputStep.getMessage() != null && !inputStep.getMessage().trim().isEmpty()
                            ? inputStep.getMessage().trim()
                            : "Proceed or Abort pipeline execution?");
                    model.setOk(inputStep.getOk() != null && !inputStep.getOk().trim().isEmpty()
                            ? inputStep.getOk().trim()
                            : "Proceed");
                    model.setSubmitter(inputStep.getSubmitter());

                    List<hudson.model.ParameterDefinition> paramDefs = inputStep.getParameters();
                    if (paramDefs != null) {
                        for (hudson.model.ParameterDefinition pd : paramDefs) {
                            JobParameterModel jp = new JobParameterModel();
                            jp.setName(pd.getName());
                            jp.setType(pd.getType());
                            jp.setDescription(pd.getDescription());
                            hudson.model.ParameterValue defVal = pd.getDefaultParameterValue();
                            if (defVal != null && defVal.getValue() != null) {
                                jp.setDefaultValue(String.valueOf(defVal.getValue()));
                            }
                            if (pd instanceof hudson.model.ChoiceParameterDefinition) {
                                jp.setChoices(((hudson.model.ChoiceParameterDefinition) pd).getChoices());
                            }
                            model.getParameters().add(jp);
                        }
                    }
                } else {
                    model.setMessage("Proceed or Abort pipeline execution?");
                    model.setOk("Proceed");
                }

                // Associate with enclosing stage & step
                StageModel matchedStage = null;
                try {
                    FlowNode inputNode = execItem.getContext().get(FlowNode.class);
                    if (inputNode != null) {
                        model.setStepId(inputNode.getId());
                        List<String> enclosingIds = inputNode.getAllEnclosingIds();
                        for (StageModel s : rawStages) {
                            if (s.getSteps() != null) {
                                for (StepModel st : s.getSteps()) {
                                    if (inputNode.getId().equals(st.getId())) {
                                        st.setStatus("PAUSED_INPUT");
                                        matchedStage = s;
                                    }
                                }
                            }
                            if (enclosingIds.contains(s.getId())) {
                                matchedStage = s;
                            }
                        }
                        if (matchedStage == null) {
                            long nodeIdLong = Long.parseLong(inputNode.getId());
                            for (StageModel s : rawStages) {
                                long sStart = Long.parseLong(s.getId());
                                BlockEndNode end = startToEndMap != null ? startToEndMap.get(s.getId()) : null;
                                long sEnd = end != null ? Long.parseLong(end.getId()) : Long.MAX_VALUE;
                                if (nodeIdLong >= sStart && nodeIdLong <= sEnd) {
                                    matchedStage = s;
                                }
                            }
                        }
                    }
                } catch (Throwable ignored) {
                }

                if (matchedStage == null) {
                    for (StageModel s : rawStages) {
                        if ("IN_PROGRESS".equals(s.getStatus())) {
                            matchedStage = s;
                        }
                    }
                }

                if (matchedStage != null) {
                    matchedStage.setPausedForInput(true);
                    matchedStage.setStatus("PAUSED_INPUT");
                    model.setStageId(matchedStage.getId());
                    model.setStageName(matchedStage.getName());
                }

                pendingList.add(model);
            }

            if (!pendingList.isEmpty()) {
                details.setPausedForInput(true);
                details.setPendingInputs(pendingList);
            }
        } catch (Throwable ignored) {
        }
    }

    private static void extractTestCases(AbstractTestResultAction<?> testAction, RunDetailsModel details) {
        List<TestCaseModel> cases = new ArrayList<>();
        try {
            Object rawResult = testAction.getResult();
            if (rawResult instanceof hudson.tasks.junit.TestResult) {
                hudson.tasks.junit.TestResult junitResult = (hudson.tasks.junit.TestResult) rawResult;
                for (hudson.tasks.junit.SuiteResult suite : junitResult.getSuites()) {
                    String suiteName = suite.getName();
                    for (hudson.tasks.junit.CaseResult cr : suite.getCases()) {
                        TestCaseModel tc = new TestCaseModel();
                        tc.setName(cr.getName());
                        tc.setClassName(cr.getClassName());
                        tc.setSuiteName(suiteName);
                        tc.setDurationSeconds(cr.getDuration());
                        tc.setFormattedDuration(formatTestDuration(cr.getDuration()));
                        tc.setAge(cr.getAge());

                        if (cr.isSkipped()) {
                            tc.setStatus("SKIPPED");
                            tc.setSkippedMessage(cr.getSkippedMessage());
                        } else if (!cr.isPassed()) {
                            tc.setStatus(cr.getAge() == 1 ? "REGRESSION" : "FAILED");
                            tc.setErrorDetails(cr.getErrorDetails());
                            tc.setErrorStackTrace(cr.getErrorStackTrace());
                        } else {
                            tc.setStatus(cr.getStatus() == hudson.tasks.junit.CaseResult.Status.FIXED ? "FIXED" : "PASSED");
                        }
                        cases.add(tc);
                    }
                }
            } else if (testAction.getFailedTests() != null) {
                for (hudson.tasks.test.TestResult tr : testAction.getFailedTests()) {
                    TestCaseModel tc = new TestCaseModel();
                    tc.setName(tr.getName());
                    tc.setClassName(tr.getParent() != null ? tr.getParent().getDisplayName() : "");
                    tc.setStatus("FAILED");
                    tc.setDurationSeconds(tr.getDuration());
                    tc.setFormattedDuration(formatTestDuration(tr.getDuration()));
                    tc.setErrorDetails(tr.getErrorDetails());
                    tc.setErrorStackTrace(tr.getErrorStackTrace());
                    cases.add(tc);
                }
            }
        } catch (Throwable ignored) {
        }

        if (!cases.isEmpty()) {
            cases.sort((a, b) -> {
                int rankA = getTestStatusRank(a.getStatus());
                int rankB = getTestStatusRank(b.getStatus());
                if (rankA != rankB) {
                    return Integer.compare(rankA, rankB);
                }
                return Double.compare(b.getDurationSeconds(), a.getDurationSeconds());
            });
            if (cases.size() > 300) {
                cases = new ArrayList<>(cases.subList(0, 300));
            }
            details.setTestCases(cases);
        }
    }

    private static int getTestStatusRank(String status) {
        if ("REGRESSION".equals(status)) return 0;
        if ("FAILED".equals(status)) return 1;
        if ("SKIPPED".equals(status)) return 2;
        if ("FIXED".equals(status)) return 3;
        return 4;
    }

    private static String formatTestDuration(double seconds) {
        if (seconds <= 0d) return "<1ms";
        if (seconds < 1.0d) {
            long ms = Math.max(1L, Math.round(seconds * 1000d));
            return ms + "ms";
        }
        if (seconds < 60d) {
            return String.format(java.util.Locale.US, "%.2fs", seconds);
        }
        int mins = (int) (seconds / 60d);
        double rem = seconds - (mins * 60d);
        return String.format(java.util.Locale.US, "%dm %.1fs", mins, rem);
    }

    private static boolean isArchiveArtifactsStep(FlowNode node) {
        String funcName = node.getDisplayFunctionName();
        if (funcName != null && ("archiveArtifacts".equalsIgnoreCase(funcName) || funcName.toLowerCase(java.util.Locale.ROOT).contains("archiveartifact"))) {
            return true;
        }
        return false;
    }

    private static String extractArchivePattern(FlowNode node) {
        try {
            Map<String, Object> args = ArgumentsAction.getArguments(node);
            Object art = args.get("artifacts");
            if (art == null) {
                art = args.get("<anonymous>");
            }
            if (art != null) {
                return art.toString();
            }
        } catch (Throwable ignored) {
        }
        return "**";
    }

    private static void associateArtifactsWithStages(List<StageModel> rawStages, List<ArtifactModel> artifacts, Map<String, List<String>> stageArtifactPatterns) {
        if (artifacts.isEmpty() || rawStages.isEmpty()) {
            return;
        }

        // Filter stages that actually executed archiveArtifacts
        Map<String, StageModel> archiverStages = new HashMap<>();
        for (StageModel stage : rawStages) {
            if (stageArtifactPatterns.containsKey(stage.getId())) {
                archiverStages.put(stage.getId(), stage);
            }
        }

        if (archiverStages.isEmpty()) {
            return;
        }

        // If only one stage archived artifacts, all artifacts belong to this stage
        if (archiverStages.size() == 1) {
            StageModel stage = archiverStages.values().iterator().next();
            for (ArtifactModel a : artifacts) {
                a.setStageId(stage.getId());
                a.setStageName(stage.getName());
                stage.addArtifact(a);
            }
            stage.setHasArtifacts(true);
            stage.setArtifactCount(stage.getArtifacts().size());
            return;
        }

        // If multiple stages archived artifacts, match by pattern or path
        for (ArtifactModel a : artifacts) {
            StageModel matchedStage = null;
            for (Map.Entry<String, StageModel> entry : archiverStages.entrySet()) {
                List<String> patterns = stageArtifactPatterns.get(entry.getKey());
                if (patterns != null) {
                    for (String p : patterns) {
                        if (matchesAntPattern(p, a.getRelativePath())) {
                            matchedStage = entry.getValue();
                            break;
                        }
                    }
                }
                if (matchedStage != null) {
                    break;
                }
            }

            if (matchedStage == null) {
                matchedStage = archiverStages.values().iterator().next();
            }

            if (matchedStage != null) {
                a.setStageId(matchedStage.getId());
                a.setStageName(matchedStage.getName());
                matchedStage.addArtifact(a);
                matchedStage.setHasArtifacts(true);
                matchedStage.setArtifactCount(matchedStage.getArtifacts().size());
            }
        }
    }

    public static boolean matchesAntPattern(String pattern, String path) {
        if (pattern == null || pattern.isEmpty() || path == null) {
            return false;
        }
        String normPath = path.replace('\\', '/').trim();
        String normPat = pattern.replace('\\', '/').trim();
        if (normPat.equals("*") || normPat.equals("**") || normPat.equals("**/*") || normPat.equals(normPath)) {
            return true;
        }
        try {
            StringBuilder sb = new StringBuilder();
            int len = normPat.length();
            for (int i = 0; i < len; i++) {
                char c = normPat.charAt(i);
                if (c == '*') {
                    if (i + 1 < len && normPat.charAt(i + 1) == '*') {
                        i++;
                        if (i + 1 < len && normPat.charAt(i + 1) == '/') {
                            i++;
                            sb.append("(?:.+/)?");
                        } else {
                            sb.append(".*");
                        }
                    } else {
                        sb.append("[^/]*");
                    }
                } else if (c == '?') {
                    sb.append("[^/]");
                } else if (".+()[]{}|^$\\".indexOf(c) != -1) {
                    sb.append('\\').append(c);
                } else {
                    sb.append(c);
                }
            }
            String regex = sb.toString();
            return normPath.matches("^" + regex + "$");
        } catch (RuntimeException e) {
            return normPath.contains(normPat);
        }
    }

    private static String formatAgentName(String rawNode) {
        if (rawNode == null || rawNode.trim().isEmpty()) {
            return "Built-In Node";
        }
        return rawNode.trim();
    }
}
