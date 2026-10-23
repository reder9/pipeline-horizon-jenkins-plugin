package io.jenkins.plugins.horizon.analysis;

import hudson.model.Result;
import hudson.scm.ChangeLogSet;
import hudson.tasks.test.AbstractTestResultAction;
import io.jenkins.plugins.horizon.model.ArtifactModel;
import io.jenkins.plugins.horizon.model.BuildParameterModel;
import io.jenkins.plugins.horizon.model.JobParameterModel;
import io.jenkins.plugins.horizon.model.JobSummaryModel;
import io.jenkins.plugins.horizon.model.PendingInputModel;
import io.jenkins.plugins.horizon.model.QueueItemModel;
import io.jenkins.plugins.horizon.model.RunDetailSectionModel;
import io.jenkins.plugins.horizon.model.RunDetailsModel;
import io.jenkins.plugins.horizon.model.RunSummaryModel;
import io.jenkins.plugins.horizon.model.StageModel;
import io.jenkins.plugins.horizon.model.StageTrendModel;
import io.jenkins.plugins.horizon.model.StepModel;
import io.jenkins.plugins.horizon.model.TestCaseModel;
import io.jenkins.plugins.horizon.util.EncodingUtils;
import io.jenkins.plugins.horizon.util.ScmLinkResolver;
import org.jenkinsci.plugins.workflow.actions.ArgumentsAction;
import org.jenkinsci.plugins.workflow.actions.ErrorAction;
import org.jenkinsci.plugins.workflow.actions.LabelAction;
import org.jenkinsci.plugins.workflow.actions.LogAction;
import org.jenkinsci.plugins.workflow.actions.QueueItemAction;
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
import org.jenkinsci.plugins.workflow.steps.StepDescriptor;


import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class PipelineGraphAnalyzer {

    private static final Logger LOGGER = Logger.getLogger(PipelineGraphAnalyzer.class.getName());
    private static final Pattern ARCHIVE_ARTIFACTS_ARGUMENT = Pattern.compile(
            "(?i)(?:^|[,\\s{])artifacts\\s*[:=]\\s*(?:'([^']*)'|\\\"([^\\\"]*)\\\"|([^,}]+))");

    /**
     * Historical stage averages are shared by live polling requests. The previous implementation
     * re-traversed up to ten completed FlowGraphs every time a running build refreshed, even
     * though that history cannot change until a new build completes.
     */
    private static final Map<String, StageHistorySnapshot> STAGE_HISTORY_CACHE =
            Collections.synchronizedMap(new LinkedHashMap<String, StageHistorySnapshot>(128, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, StageHistorySnapshot> eldest) {
                    return size() > 128;
                }
            });

    /**
     * Per-build cache of stage durations for completed runs, keyed by {@code run.getExternalizableId()}.
     * Ensures each historical build's {@code FlowExecution} is scanned at most once across the JVM lifetime.
     */
    private static final Map<String, Map<String, List<Long>>> COMPLETED_RUN_STAGE_DURATIONS_CACHE =
            Collections.synchronizedMap(new LinkedHashMap<String, Map<String, List<Long>>>(256, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, Map<String, List<Long>>> eldest) {
                    return size() > 512;
                }
            });

    /**
     * Bounded LRU cache of immutable {@link RunSummaryModel} instances for completed builds,
     * keyed by {@code run.getExternalizableId()}. Avoids re-parsing changelogs, parameters,
     * and SCM actions across 30 builds on every Job summary poll.
     */
    private static final Map<String, RunSummaryModel> COMPLETED_RUN_SUMMARY_CACHE =
            Collections.synchronizedMap(new LinkedHashMap<String, RunSummaryModel>(256, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, RunSummaryModel> eldest) {
                    return size() > 512;
                }
            });

    public static void clearCaches() {
        STAGE_HISTORY_CACHE.clear();
        COMPLETED_RUN_STAGE_DURATIONS_CACHE.clear();
        COMPLETED_RUN_SUMMARY_CACHE.clear();
    }

    private static final class StageHistorySnapshot {
        private final int lastCompletedBuildNumber;
        private final Map<String, List<Long>> durationsByStage;

        private StageHistorySnapshot(int lastCompletedBuildNumber, Map<String, List<Long>> durationsByStage) {
            this.lastCompletedBuildNumber = lastCompletedBuildNumber;
            this.durationsByStage = durationsByStage;
        }
    }

    /**
     * Keeps the first canvas response focused on the data required to draw and
     * interact with the execution graph. The remaining sections have focused,
     * on-demand endpoints in {@code HorizonRunAction}.
     */
    public enum AnalysisScope {
        FULL(true, true, true, true),
        CANVAS(false, false, false, false);

        private final boolean includeTestCases;
        private final boolean includeArtifacts;
        private final boolean includeStageTrends;
        private final boolean includeOriginalScript;

        AnalysisScope(boolean includeTestCases, boolean includeArtifacts,
                      boolean includeStageTrends, boolean includeOriginalScript) {
            this.includeTestCases = includeTestCases;
            this.includeArtifacts = includeArtifacts;
            this.includeStageTrends = includeStageTrends;
            this.includeOriginalScript = includeOriginalScript;
        }
    }

    private static final class ArtifactSummary {
        private final List<ArtifactModel> artifacts;
        private final long totalSize;

        private ArtifactSummary(List<ArtifactModel> artifacts, long totalSize) {
            this.artifacts = artifacts;
            this.totalSize = totalSize;
        }
    }

    /**
     * Builds full details and graph representation for a specific build run.
     */
    public static RunDetailsModel buildRunDetails(WorkflowRun run) {
        return buildRunDetails(run, AnalysisScope.FULL);
    }

    /**
     * Builds only the information required for the initial pipeline canvas.
     * Large test, artifact, replay, and historical-trend payloads are fetched
     * separately once a user asks to see them.
     */
    public static RunDetailsModel buildCanvasDetails(WorkflowRun run) {
        return buildRunDetails(run, AnalysisScope.CANVAS);
    }

    public static RunDetailsModel buildRunDetails(WorkflowRun run, AnalysisScope scope) {
        if (run == null) {
            return new RunDetailsModel();
        }
        if (LOGGER.isLoggable(Level.FINE)) {
            LOGGER.log(Level.FINE, "Analyzing pipeline graph for build {0}", run.getFullDisplayName());
        }
        RunDetailsModel details = new RunDetailsModel();
        details.setTestCasesLoaded(scope.includeTestCases);
        details.setArtifactsLoaded(scope.includeArtifacts);
        details.setReplayScriptLoaded(scope.includeOriginalScript);
        details.setStageTrendsLoaded(scope.includeStageTrends);
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
                if (scope.includeTestCases) {
                    details.setTestCases(extractTestCases(testAction));
                }
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

        // Controller Queue Wait Calculation (time waiting in Jenkins build queue before execution)
        long runScheduled = run.getTimeInMillis();
        long runStarted = run.getStartTimeInMillis();
        long controllerQueueWait = (runStarted > 0 && runScheduled > 0 && runStarted > runScheduled) ? (runStarted - runScheduled) : 0L;
        details.setControllerQueueWaitMillis(controllerQueueWait);
        details.setFormattedControllerQueueWait(formatDuration(controllerQueueWait));

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
            if (!(node instanceof BlockStartNode)) {
                continue;
            }
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
            // Atomic steps (e.g. `sh label: '...'`) carry a LabelAction too, but are not stages
            if (!(node instanceof BlockStartNode)) {
                continue;
            }
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
                    stage.setBranchName(EncodingUtils.fixMojibake(tna.getThreadName()));
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

        if (!run.isBuilding()) {
            try {
                String runExtId = run.getExternalizableId();
                if (!COMPLETED_RUN_STAGE_DURATIONS_CACHE.containsKey(runExtId)) {
                    Map<String, List<Long>> runStageDurations = new HashMap<>();
                    for (StageModel s : rawStages) {
                        if (s.getName() != null && s.getDurationMillis() > 0L) {
                            runStageDurations.computeIfAbsent(s.getName(), k -> new ArrayList<>()).add(s.getDurationMillis());
                        }
                    }
                    COMPLETED_RUN_STAGE_DURATIONS_CACHE.put(runExtId, runStageDurations);
                }
            } catch (Throwable ignored) {
            }
        }

        // Enclosure resolution is relatively expensive in workflow-api. Resolve it once per
        // node and keep a stage lookup map so the step/stage pass is linear in the number of
        // FlowNodes instead of repeating getAllEnclosingIds() for every stage.
        Map<String, StageModel> stageById = new HashMap<>();
        for (StageModel stage : rawStages) {
            stageById.put(stage.getId(), stage);
        }
        Map<String, List<String>> enclosingIdsByNode = new HashMap<>();
        for (FlowNode node : allNodes) {
            try {
                List<String> enclosing = node.getAllEnclosingIds();
                enclosingIdsByNode.put(node.getId(), enclosing.isEmpty()
                        ? Collections.emptyList()
                        : new ArrayList<>(enclosing));
            } catch (Throwable ignored) {
                enclosingIdsByNode.put(node.getId(), Collections.emptyList());
            }
        }

        Map<String, List<String>> stageArtifactPatterns = new HashMap<>();

        // Collect steps within each stage
        for (int i = 0; i < allNodes.size(); i++) {
            FlowNode n = allNodes.get(i);
            List<StageModel> enclosingStages = new ArrayList<>();
            List<String> enclosingIds = enclosingIdsByNode.get(n.getId());
            if (enclosingIds != null && !enclosingIds.isEmpty()) {
                for (String enclosingId : enclosingIds) {
                    StageModel stage = stageById.get(enclosingId);
                    if (stage != null && (stage.getStatus() == null || !stage.getStatus().startsWith("SKIPPED"))) {
                        enclosingStages.add(stage);
                    }
                }
            } else {
                // Preserve the old numeric-range fallback for synthetic/incomplete FlowGraphs.
                long currentId;
                try {
                    currentId = Long.parseLong(n.getId());
                } catch (NumberFormatException e) {
                    continue;
                }
                for (StageModel stage : rawStages) {
                    if (stage.getStatus() != null && stage.getStatus().startsWith("SKIPPED")) {
                        continue;
                    }
                    try {
                        FlowNode startNode = nodeMap.get(stage.getId());
                        BlockEndNode endNode = startToEndMap.get(stage.getId());
                        long stageStartIndex = Long.parseLong(startNode.getId());
                        long stageEndIndex = endNode != null ? Long.parseLong(endNode.getId()) : Long.MAX_VALUE;
                        if (currentId > stageStartIndex && currentId < stageEndIndex) {
                            enclosingStages.add(stage);
                        }
                    } catch (RuntimeException ignored) {
                    }
                }
            }

            for (StageModel stage : enclosingStages) {
                    WorkspaceAction wa = n.getAction(WorkspaceAction.class);
                    if (wa != null) {
                        String stageAgent = formatAgentName(wa.getNode());
                        stage.setAgent(stageAgent);
                        allAgentsUsed.add(stageAgent);
                    }

                    if (scope.includeArtifacts && isArchiveArtifactsStep(n)) {
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

        // Agent Allocation & Queue Wait Calculation
        long totalAgentAllocationMillis = 0L;
        boolean runWaitingForAgent = false;
        String runWaitingReason = null;

        // Index body nodes once. The previous implementation searched the remainder of the
        // graph for every node step start, which made large fan-out pipelines quadratic.
        Map<String, StepStartNode> bodyNodeByEnclosingId = new HashMap<>();
        for (FlowNode candidate : allNodes) {
            if (!(candidate instanceof StepStartNode) || !((StepStartNode) candidate).isBody()) {
                continue;
            }
            StepStartNode bodyNode = (StepStartNode) candidate;
            try {
                for (FlowNode parent : candidate.getParents()) {
                    bodyNodeByEnclosingId.putIfAbsent(parent.getId(), bodyNode);
                }
                for (BlockStartNode enclosing : candidate.iterateEnclosingBlocks()) {
                    bodyNodeByEnclosingId.putIfAbsent(enclosing.getId(), bodyNode);
                }
            } catch (Throwable ignored) {
            }
        }

        for (int i = 0; i < allNodes.size(); i++) {
            FlowNode n = allNodes.get(i);
            if (isNodeStepStart(n)) {
                long reqStart = TimingAction.getStartTime(n);
                StepStartNode bodyNode = bodyNodeByEnclosingId.get(n.getId());

                long allocTime = 0L;
                boolean isNodeQueued = false;
                String nodeQueueReason = null;

                try {
                    QueueItemAction.QueueState qState = QueueItemAction.getNodeState(n);
                    if (qState == QueueItemAction.QueueState.QUEUED) {
                        isNodeQueued = true;
                        hudson.model.Queue.Item qItem = QueueItemAction.getQueueItem(n);
                        if (qItem != null) {
                            nodeQueueReason = qItem.getWhy();
                        }
                    }
                } catch (Throwable ignored) {
                }

                if (bodyNode != null) {
                    long bodyStart = TimingAction.getStartTime(bodyNode);
                    if (reqStart > 0 && bodyStart >= reqStart) {
                        allocTime = bodyStart - reqStart;
                    }
                } else if (isNodeQueued) {
                    if (reqStart > 0) {
                        allocTime = Math.max(0, System.currentTimeMillis() - reqStart);
                    }
                }

                totalAgentAllocationMillis += allocTime;
                if (isNodeQueued) {
                    runWaitingForAgent = true;
                    if (runWaitingReason == null) {
                        runWaitingReason = nodeQueueReason != null ? nodeQueueReason : "Waiting for available agent executor";
                    }
                }

                // Associate with innermost enclosing stage if applicable
                StageModel enclosingStage = null;
                try {
                    List<String> nodeEnclosingIds = enclosingIdsByNode.get(n.getId());
                    for (String encId : nodeEnclosingIds) {
                        enclosingStage = stageById.get(encId);
                        if (enclosingStage != null) {
                            break;
                        }
                    }
                } catch (Throwable ignored) {
                }

                if (enclosingStage != null) {
                    long stageAlloc = enclosingStage.getAgentAllocationMillis() + allocTime;
                    enclosingStage.setAgentAllocationMillis(stageAlloc);
                    enclosingStage.setFormattedAgentAllocation(formatDuration(stageAlloc));
                    if (isNodeQueued) {
                        enclosingStage.setWaitingForAgent(true);
                        enclosingStage.setAgentQueueReason(nodeQueueReason != null ? nodeQueueReason : "Waiting for available agent executor");
                    }
                }
            }
        }

        // Check if any FlowNode in allNodes is currently queued
        for (FlowNode n : allNodes) {
            try {
                if (QueueItemAction.getNodeState(n) == QueueItemAction.QueueState.QUEUED) {
                    runWaitingForAgent = true;
                    if (runWaitingReason == null) {
                        hudson.model.Queue.Item item = QueueItemAction.getQueueItem(n);
                        if (item != null && item.getWhy() != null) {
                            runWaitingReason = item.getWhy();
                        }
                    }
                }
            } catch (Throwable ignored) {
            }
        }

        details.setAgentAllocationMillis(totalAgentAllocationMillis);
        details.setFormattedAgentAllocation(formatDuration(totalAgentAllocationMillis));
        details.setWaitingForAgent(runWaitingForAgent);
        details.setAgentQueueReason(runWaitingReason);

        long combinedQueueWait = controllerQueueWait + totalAgentAllocationMillis;
        details.setQueueWaitMillis(combinedQueueWait);
        details.setFormattedQueueWait(formatDuration(combinedQueueWait));

        // Archived artifact enumeration can be expensive for builds with large archives.
        // Retain it for the legacy/full API response, but defer it from the first canvas load.
        if (scope.includeArtifacts) {
            ArtifactSummary artifactSummary = collectArtifacts(run);
            details.setArtifacts(artifactSummary.artifacts);
            details.setArtifactCount(artifactSummary.artifacts.size());
            details.setTotalArtifactSize(artifactSummary.totalSize);
            details.setFormattedTotalArtifactSize(formatBytes(artifactSummary.totalSize));
            associateArtifactsWithStages(rawStages, artifactSummary.artifacts, stageArtifactPatterns);
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
            if (s.getChildren() != null && !s.getChildren().isEmpty()) {
                long maxChildAlloc = s.getAgentAllocationMillis();
                for (StageModel child : s.getChildren()) {
                    if (child.isWaitingForAgent()) {
                        s.setWaitingForAgent(true);
                        if (s.getAgentQueueReason() == null) {
                            s.setAgentQueueReason(child.getAgentQueueReason());
                        }
                    }
                    if (child.getAgentAllocationMillis() > maxChildAlloc) {
                        maxChildAlloc = child.getAgentAllocationMillis();
                    }
                }
                if (maxChildAlloc > s.getAgentAllocationMillis()) {
                    s.setAgentAllocationMillis(maxChildAlloc);
                    s.setFormattedAgentAllocation(formatDuration(maxChildAlloc));
                }
            }
        }
        if (allAgentsUsed.isEmpty()) {
            allAgentsUsed.add("Built-In Node");
        }

        // Post-process stage steps to identify closures, hierarchy depth, and self-duration
        postProcessAllStageSteps(consolidatedStages, nodeMap);

        details.setStages(consolidatedStages);
        details.setStageCount(consolidatedStages.size());
        details.setTotalSteps(totalStepsCount);
        details.setFailedSteps(failedStepsCount);
        details.setAgentsUsed(new ArrayList<>(allAgentsUsed));

        // Historical comparisons require traversing prior FlowGraphs. They are useful,
        // but not a prerequisite for an interactive first paint.
        if (scope.includeStageTrends) {
            applyStageTrends(consolidatedStages, buildStageTrends(run, consolidatedStages));
        }

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
                if (scope.includeOriginalScript) {
                    details.setOriginalScript(EncodingUtils.fixMojibake(replayAction.getOriginalScript()));
                }
            }
        } catch (Throwable ignored) {
        }

        // Rebuild capability
        details.setRebuildEnabled(run.getParent().isBuildable());

        return details;
    }

    /**
     * Builds the optional data for a single deferred build-view section.
     */
    public static RunDetailSectionModel buildDetailSection(WorkflowRun run, String section,
                                                           List<StageModel> stages) {
        RunDetailSectionModel sectionDetails = new RunDetailSectionModel();
        sectionDetails.setSection(section);
        if (run == null || section == null) {
            return sectionDetails;
        }

        if ("tests".equals(section)) {
            try {
                AbstractTestResultAction<?> testAction = run.getAction(AbstractTestResultAction.class);
                if (testAction != null) {
                    sectionDetails.setTestCases(extractTestCases(testAction));
                }
            } catch (Throwable ignored) {
                // Individual test details are an enhancement; preserve the canvas if a test plugin misbehaves.
            }
        } else if ("artifacts".equals(section)) {
            ArtifactSummary artifactSummary = collectArtifacts(run);
            associateArtifactsWithStageIds(stages, artifactSummary.artifacts);
            sectionDetails.setArtifacts(artifactSummary.artifacts);
            sectionDetails.setArtifactCount(artifactSummary.artifacts.size());
            sectionDetails.setTotalArtifactSize(artifactSummary.totalSize);
            sectionDetails.setFormattedTotalArtifactSize(formatBytes(artifactSummary.totalSize));
        } else if ("replay".equals(section)) {
            try {
                org.jenkinsci.plugins.workflow.cps.replay.ReplayAction replayAction =
                        run.getAction(org.jenkinsci.plugins.workflow.cps.replay.ReplayAction.class);
                if (replayAction != null && replayAction.isEnabled()) {
                    sectionDetails.setOriginalScript(EncodingUtils.fixMojibake(replayAction.getOriginalScript()));
                }
            } catch (Throwable ignored) {
                // A missing Replay plugin must not prevent the view from loading.
            }
        } else if ("trends".equals(section)) {
            List<StageTrendModel> trends = buildStageTrends(run, stages);
            applyStageTrends(stages, trends);
            sectionDetails.setStageTrends(trends);
        }
        return sectionDetails;
    }

    /**
     * Returns historical timing comparisons without mutating the cached canvas graph.
     */
    public static List<StageTrendModel> buildStageTrends(WorkflowRun currentRun,
                                                         List<StageModel> currentStages) {
        if (currentRun == null || currentStages == null || currentStages.isEmpty()) {
            return Collections.emptyList();
        }
        try {
            WorkflowJob job = currentRun.getParent();
            WorkflowRun lastCompleted = job.getLastCompletedBuild();
            int lastCompletedBuildNumber = lastCompleted != null ? lastCompleted.getNumber() : -1;
            String historyKey = job.getFullName() + "#" + currentRun.getNumber();
            StageHistorySnapshot cached = STAGE_HISTORY_CACHE.get(historyKey);
            Map<String, List<Long>> historyMap;
            if (cached != null && cached.lastCompletedBuildNumber == lastCompletedBuildNumber) {
                historyMap = cached.durationsByStage;
            } else {
                historyMap = collectStageHistory(currentRun, job);
                STAGE_HISTORY_CACHE.put(historyKey, new StageHistorySnapshot(lastCompletedBuildNumber, historyMap));
            }

            List<StageTrendModel> trends = new ArrayList<>();
            collectStageTrends(currentStages, historyMap, trends);
            return trends;
        } catch (Throwable ignored) {
            return Collections.emptyList();
        }
    }

    private static Map<String, List<Long>> collectStageHistory(WorkflowRun currentRun, WorkflowJob job) {
        Map<String, List<Long>> historyMap = new HashMap<>();
        int checked = 0;
        int inspected = 0;
        for (WorkflowRun previousRun : job.getBuilds()) {
            if (previousRun == null || previousRun.equals(currentRun)) {
                continue;
            }
            if (++inspected > 15) {
                break;
            }
            if (previousRun.isBuilding()) {
                continue;
            }
            String prevExtId = null;
            try {
                prevExtId = previousRun.getExternalizableId();
            } catch (Throwable ignored) {
            }
            Map<String, List<Long>> perRunDurations = prevExtId != null
                    ? COMPLETED_RUN_STAGE_DURATIONS_CACHE.get(prevExtId)
                    : null;
            if (perRunDurations == null) {
                perRunDurations = extractStageDurationsForRun(previousRun);
                if (prevExtId != null) {
                    COMPLETED_RUN_STAGE_DURATIONS_CACHE.put(prevExtId, perRunDurations);
                }
            }
            for (Map.Entry<String, List<Long>> entry : perRunDurations.entrySet()) {
                List<Long> durs = entry.getValue();
                if (durs != null && !durs.isEmpty()) {
                    historyMap.computeIfAbsent(entry.getKey(), key -> new ArrayList<>()).addAll(durs);
                }
            }
            if (++checked >= 10) {
                break;
            }
        }
        return historyMap;
    }

    private static Map<String, List<Long>> extractStageDurationsForRun(WorkflowRun previousRun) {
        Map<String, List<Long>> runDurations = new HashMap<>();
        FlowExecution exec = previousRun.getExecution();
        if (exec != null) {
            try {
                for (FlowNode node : new DepthFirstScanner().allNodes(exec)) {
                    if (!(node instanceof BlockStartNode)) {
                        continue;
                    }
                    LabelAction labelAction = node.getAction(LabelAction.class);
                    if (labelAction == null) {
                        continue;
                    }
                    String displayName = labelAction.getDisplayName();
                    if (displayName == null) {
                        continue;
                    }
                    String stageName = displayName.trim();
                    if (stageName.startsWith("Branch: ")) {
                        stageName = stageName.substring("Branch: ".length()).trim();
                    }
                    BlockEndNode end = ((BlockStartNode) node).getEndNode();
                    long start = TimingAction.getStartTime(node);
                    long duration = end != null
                            ? Math.max(0L, TimingAction.getStartTime(end) - start) : 0L;
                    if (duration > 0L) {
                        runDurations.computeIfAbsent(stageName, key -> new ArrayList<>()).add(duration);
                    }
                }
            } catch (Throwable ignored) {
                // A corrupted or partially discarded historical FlowGraph is safely skipped.
            }
        }
        return runDurations;
    }

    private static void collectStageTrends(List<StageModel> stages, Map<String, List<Long>> historyMap,
                                           List<StageTrendModel> trends) {
        if (stages == null) {
            return;
        }
        for (StageModel stage : stages) {
            StageTrendModel trend = calculateStageTrend(stage, historyMap);
            if (trend != null) {
                trends.add(trend);
            }
            collectStageTrends(stage.getChildren(), historyMap, trends);
        }
    }

    private static StageTrendModel calculateStageTrend(StageModel stage, Map<String, List<Long>> historyMap) {
        if (stage == null || stage.getName() == null || stage.getDurationMillis() <= 0L) {
            return null;
        }
        List<Long> priorDurations = historyMap.get(stage.getName());
        if (priorDurations == null || priorDurations.isEmpty()) {
            return null;
        }
        long total = 0L;
        for (Long duration : priorDurations) {
            if (duration != null) {
                total += duration;
            }
        }
        long average = total / priorDurations.size();
        if (average <= 0L) {
            return null;
        }

        double difference = (double) (stage.getDurationMillis() - average);
        double percentage = (difference / (double) average) * 100.0;
        StageTrendModel trend = new StageTrendModel();
        trend.setStageId(stage.getId());
        trend.setAvgDurationMillis(average);
        trend.setVariancePercent(percentage);
        trend.setFormattedVariance(String.format(java.util.Locale.ROOT, "%+.0f%%", percentage));
        trend.setSpike(percentage >= 30.0 && difference >= 3000.0);
        trend.setFaster(percentage <= -20.0 && difference <= -3000.0);
        return trend;
    }

    private static void applyStageTrends(List<StageModel> stages, List<StageTrendModel> trends) {
        if (stages == null || stages.isEmpty() || trends == null || trends.isEmpty()) {
            return;
        }
        Map<String, StageTrendModel> trendsByStageId = new HashMap<>();
        for (StageTrendModel trend : trends) {
            if (trend != null && trend.getStageId() != null) {
                trendsByStageId.put(trend.getStageId(), trend);
            }
        }
        applyStageTrends(stages, trendsByStageId);
    }

    private static void applyStageTrends(List<StageModel> stages,
                                         Map<String, StageTrendModel> trendsByStageId) {
        if (stages == null) {
            return;
        }
        for (StageModel stage : stages) {
            StageTrendModel trend = trendsByStageId.get(stage.getId());
            if (trend != null) {
                stage.setAvgDurationMillis(trend.getAvgDurationMillis());
                stage.setVariancePercent(trend.getVariancePercent());
                stage.setFormattedVariance(trend.getFormattedVariance());
                stage.setSpike(trend.isSpike());
                stage.setFaster(trend.isFaster());
            }
            applyStageTrends(stage.getChildren(), trendsByStageId);
        }
    }

    public static String formatDuration(long millis) {
        if (millis <= 0) return "0s";
        long seconds = millis / 1000;
        if (seconds < 60) return seconds + "s";
        long minutes = seconds / 60;
        long remSeconds = seconds % 60;
        if (minutes < 60) return minutes + "m " + remSeconds + "s";
        long hours = minutes / 60;
        long remMinutes = minutes % 60;
        return hours + "h " + remMinutes + "m";
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

        // Collect recent runs (up to 30), using cached RunSummaryModel for completed builds
        List<RunSummaryModel> runs = new ArrayList<>();
        int count = 0;
        for (WorkflowRun r : job.getBuilds()) {
            if (count++ >= 30) {
                break;
            }
            runs.add(getOrBuildRunSummary(r));
        }
        model.setRuns(runs);

        // Collect queued items for this job
        List<QueueItemModel> queueItems = new ArrayList<>();
        try {
            jenkins.model.Jenkins j = jenkins.model.Jenkins.getInstanceOrNull();
            if (j != null) {
                hudson.model.Queue queue = j.getQueue();
                if (queue != null) {
                    for (hudson.model.Queue.Item item : queue.getItems()) {
                        if (item != null && job.equals(item.task)) {
                            QueueItemModel qm = new QueueItemModel();
                            qm.setId(item.getId());
                            qm.setWhy(item.getWhy());
                            qm.setInQueueSince(item.getInQueueSince());
                            long durationInQueue = Math.max(0, System.currentTimeMillis() - item.getInQueueSince());
                            qm.setTimeInQueue(formatDuration(durationInQueue));
                            qm.setBlocked(item.isBlocked());
                            qm.setBuildable(item.isBuildable());
                            qm.setStuck(item.isStuck());

                            try {
                                qm.setCanCancel(item.hasCancelPermission());
                            } catch (Throwable t) {
                                qm.setCanCancel(job.hasPermission(hudson.model.Item.CANCEL));
                            }

                            if (item.getCauses() != null) {
                                for (hudson.model.Cause c : item.getCauses()) {
                                    if (c != null) {
                                        if (c.getShortDescription() != null) {
                                            qm.getCauses().add(c.getShortDescription());
                                        }
                                        if (qm.getTriggeredByUserId() == null && c instanceof hudson.model.Cause.UserIdCause) {
                                            hudson.model.Cause.UserIdCause uic = (hudson.model.Cause.UserIdCause) c;
                                            String uId = uic.getUserId();
                                            if (uId != null) {
                                                qm.setTriggeredByUserId(uId);
                                                if (!uId.trim().isEmpty()) {
                                                    qm.setTriggeredByUserUrl("/user/" + uId + "/");
                                                }
                                            }
                                            qm.setTriggeredByUserName(uic.getUserName());
                                        }
                                    }
                                }
                            }

                            hudson.model.ParametersAction pa = item.getAction(hudson.model.ParametersAction.class);
                            if (pa != null && pa.getParameters() != null) {
                                Map<String, String> pMap = new LinkedHashMap<>();
                                for (hudson.model.ParameterValue pv : pa.getParameters()) {
                                    if (pv != null && pv.getName() != null && pv.getValue() != null) {
                                        pMap.put(pv.getName(), String.valueOf(pv.getValue()));
                                    }
                                }
                                qm.setParameters(pMap);
                            }

                            queueItems.add(qm);
                        }
                    }
                }
            }
        } catch (Throwable ignored) {
        }
        model.setQueueItems(queueItems);

        return model;
    }

    private static RunSummaryModel getOrBuildRunSummary(WorkflowRun run) {
        if (run == null) {
            return new RunSummaryModel();
        }
        if (run.isBuilding()) {
            RunSummaryModel liveSummary = new RunSummaryModel();
            populateSummaryMetadata(run, liveSummary);
            return liveSummary;
        }
        String cacheKey = null;
        try {
            cacheKey = run.getExternalizableId();
        } catch (Throwable ignored) {
        }
        if (cacheKey != null) {
            RunSummaryModel cached = COMPLETED_RUN_SUMMARY_CACHE.get(cacheKey);
            if (cached != null) {
                return cached;
            }
        }
        RunSummaryModel summary = new RunSummaryModel();
        populateSummaryMetadata(run, summary);
        if (!run.isBuilding() && cacheKey != null) {
            COMPLETED_RUN_SUMMARY_CACHE.put(cacheKey, summary);
        }
        return summary;
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

        // Causes & Trigger Identity
        for (hudson.model.Cause c : run.getCauses()) {
            if (c != null) {
                if (c.getShortDescription() != null) {
                    summary.getCauses().add(c.getShortDescription());
                }
                if (summary.getTriggeredByUserId() == null && c instanceof hudson.model.Cause.UserIdCause) {
                    hudson.model.Cause.UserIdCause uic = (hudson.model.Cause.UserIdCause) c;
                    String uId = uic.getUserId();
                    if (uId != null) {
                        summary.setTriggeredByUserId(uId);
                        if (!uId.trim().isEmpty()) {
                            summary.setTriggeredByUserUrl("/user/" + uId + "/");
                        }
                    }
                    summary.setTriggeredByUserName(uic.getUserName());
                } else if (summary.getUpstreamProject() == null && c instanceof hudson.model.Cause.UpstreamCause) {
                    hudson.model.Cause.UpstreamCause uc = (hudson.model.Cause.UpstreamCause) c;
                    summary.setUpstreamProject(uc.getUpstreamProject());
                    summary.setUpstreamBuild(uc.getUpstreamBuild());
                    String upUrl = uc.getUpstreamUrl();
                    if (upUrl != null && !upUrl.isEmpty()) {
                        if (!upUrl.startsWith("/")) {
                            upUrl = "/" + upUrl;
                        }
                        if (!upUrl.endsWith("/")) {
                            upUrl = upUrl + "/";
                        }
                        summary.setUpstreamUrl(upUrl);
                    }
                }
            }
        }

        // Parameters
        hudson.model.ParametersAction pa = run.getAction(hudson.model.ParametersAction.class);
        if (pa != null && pa.getParameters() != null) {
            Map<String, hudson.model.ParameterDefinition> defMap = new HashMap<>();
            try {
                if (run.getParent().isParameterized()) {
                    hudson.model.ParametersDefinitionProperty prop = run.getParent().getProperty(hudson.model.ParametersDefinitionProperty.class);
                    if (prop != null && prop.getParameterDefinitions() != null) {
                        for (hudson.model.ParameterDefinition pd : prop.getParameterDefinitions()) {
                            if (pd != null) {
                                defMap.put(pd.getName(), pd);
                            }
                        }
                    }
                }
            } catch (Throwable ignored) {
            }

            List<BuildParameterModel> bParams = new ArrayList<>();
            for (hudson.model.ParameterValue pv : pa.getParameters()) {
                if (pv != null && pv.getName() != null) {
                    BuildParameterModel bpm = new BuildParameterModel();
                    bpm.setName(pv.getName());
                    boolean sensitive = pv.isSensitive();
                    bpm.setSensitive(sensitive);

                    if (sensitive) {
                        bpm.setValue("********");
                        summary.getParameters().put(pv.getName(), "********");
                    } else if (pv.getValue() != null) {
                        String strVal = String.valueOf(pv.getValue());
                        bpm.setValue(strVal);
                        summary.getParameters().put(pv.getName(), strVal);
                    } else {
                        bpm.setValue("");
                        summary.getParameters().put(pv.getName(), "");
                    }

                    String typeName = pv.getClass().getSimpleName();
                    if (typeName.endsWith("ParameterValue")) {
                        typeName = typeName.substring(0, typeName.length() - "ParameterValue".length());
                    }
                    bpm.setType(typeName);

                    String desc = pv.getDescription();
                    if ((desc == null || desc.trim().isEmpty()) && defMap.containsKey(pv.getName())) {
                        hudson.model.ParameterDefinition pd = defMap.get(pv.getName());
                        if (pd != null) {
                            desc = pd.getDescription();
                        }
                    }
                    bpm.setDescription(desc != null ? desc : "");

                    bParams.add(bpm);
                }
            }
            summary.setBuildParameters(bParams);
        }

        // Branch extraction (Multibranch or Git)
        if (summary.getBranch() == null && run.getParent().getParent() instanceof org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject) {
            summary.setBranch(run.getParent().getDisplayName());
        }

        // Git SCM details & ChangeLog
        int changeCount = 0;
        Set<String> culpritNames = new LinkedHashSet<>();
        for (ChangeLogSet<? extends ChangeLogSet.Entry> changeSet : run.getChangeSets()) {
            for (ChangeLogSet.Entry entry : changeSet) {
                changeCount++;
                if (summary.getCommitSha() == null && entry.getCommitId() != null) {
                    summary.setCommitSha(entry.getCommitId());
                }
                if (summary.getCommitMessage() == null && entry.getMsg() != null) {
                    summary.setCommitMessage(EncodingUtils.fixMojibake(entry.getMsg()));
                }
                if (entry.getAuthor() != null) {
                    String authorName = EncodingUtils.fixMojibake(entry.getAuthor().getDisplayName());
                    if (summary.getCommitAuthor() == null) {
                        summary.setCommitAuthor(authorName);
                    }
                    if (authorName != null && !authorName.trim().isEmpty()) {
                        culpritNames.add(authorName);
                    }
                }
            }
        }
        summary.setChangeSetCount(changeCount);

        // Fallback Git action extraction if commit SHA or branch not found from ChangeLog
        if (summary.getCommitSha() == null || summary.getBranch() == null) {
            for (hudson.model.Action a : run.getAllActions()) {
                if (a != null) {
                    String actionName = a.getClass().getName();
                    if (summary.getCommitSha() == null && actionName.contains("SCMRevisionAction")) {
                        try {
                            Object rev = a.getClass().getMethod("getRevision").invoke(a);
                            if (rev != null) {
                                try {
                                    Object h = rev.getClass().getMethod("getHash").invoke(rev);
                                    if (h != null) {
                                        summary.setCommitSha(String.valueOf(h));
                                    }
                                } catch (Throwable t) {
                                    summary.setCommitSha(String.valueOf(rev));
                                }
                            }
                        } catch (Throwable ignored) {
                        }
                    } else if (actionName.contains("BuildData")) {
                        try {
                            Object rev = a.getClass().getMethod("getLastBuiltRevision").invoke(a);
                            if (rev != null) {
                                if (summary.getCommitSha() == null) {
                                    Object sha = rev.getClass().getMethod("getSha1String").invoke(rev);
                                    if (sha != null) {
                                        summary.setCommitSha(String.valueOf(sha));
                                    }
                                }
                                if (summary.getBranch() == null) {
                                    java.util.Collection<?> branches = (java.util.Collection<?>) rev.getClass().getMethod("getBranches").invoke(rev);
                                    if (branches != null && !branches.isEmpty()) {
                                        Object firstBranch = branches.iterator().next();
                                        if (firstBranch != null) {
                                            Object bName = firstBranch.getClass().getMethod("getName").invoke(firstBranch);
                                            if (bName != null) {
                                                String branchStr = String.valueOf(bName);
                                                // strip remote prefix like "refs/remotes/origin/"
                                                int lastSlash = branchStr.lastIndexOf('/');
                                                summary.setBranch(lastSlash >= 0 ? branchStr.substring(lastSlash + 1) : branchStr);
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (Throwable ignored) {
                        }
                    }
                }
            }
        }

        // SCM Web Links (GitHub, GitLab, Bitbucket, Azure DevOps, Gitea, etc.)
        ScmLinkResolver.ScmLinks scmLinks = ScmLinkResolver.resolve(run, summary.getCommitSha(), summary.getBranch());
        if (scmLinks != null) {
            summary.setRepositoryUrl(scmLinks.getRepositoryUrl());
            summary.setCommitUrl(scmLinks.getCommitUrl());
            summary.setBranchUrl(scmLinks.getBranchUrl());
        }

        // Culprits: derive from this run's changeset authors or persisted culpritIds without
        // calling run.getCulprits() (which recursively walks backwards across build history on disk).
        try {
            if (culpritNames.isEmpty()) {
                Set<String> culpritIds = run.getCulpritIds();
                if (culpritIds != null && !culpritIds.isEmpty()) {
                    for (String cId : culpritIds) {
                        if (cId != null && !cId.trim().isEmpty()) {
                            hudson.model.User u = hudson.model.User.getById(cId, false);
                            culpritNames.add(EncodingUtils.fixMojibake(u != null ? u.getDisplayName() : cId));
                        }
                    }
                }
            }
            summary.getCulprits().addAll(culpritNames);
        } catch (Throwable ignored) {
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
        String cleanStageName = EncodingUtils.fixMojibake(stageName);
        stage.setName(cleanStageName);
        stage.setAgent(defaultAgent);

        if (cleanStageName != null && cleanStageName.toLowerCase(java.util.Locale.ROOT).matches(".*\\boptional\\b.*")) {
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
                stage.setError(EncodingUtils.fixMojibake(th.getMessage() != null ? th.getMessage() : "Stage was aborted"));
            } else {
                stage.setStatus("FAILED");
                stage.setError(EncodingUtils.fixMojibake(th.getMessage() != null ? th.getMessage() : "Stage failed"));
            }
        } else if (startNode.isActive()) {
            stage.setStatus("IN_PROGRESS");
        } else {
            stage.setStatus("SUCCESS");
        }

        return stage;
    }

    /**
     * Recursively searches for a stage by ID across top-level and parallel child stages.
     */
    public static StageModel findStageById(List<StageModel> stages, String stageId) {
        if (stages == null || stageId == null || stageId.isEmpty()) {
            return null;
        }
        for (StageModel st : stages) {
            if (stageId.equals(st.getId())) {
                return st;
            }
            if (st.getChildren() != null && !st.getChildren().isEmpty()) {
                StageModel found = findStageById(st.getChildren(), stageId);
                if (found != null) {
                    return found;
                }
            }
        }
        return null;
    }

    private static StepModel createStepModel(FlowNode node, Map<String, BlockEndNode> startToEndMap, List<FlowNode> allNodes, int nodeIndex) {
        StepModel step = new StepModel();
        step.setId(node.getId());
        step.setName(EncodingUtils.fixMojibake(node.getDisplayFunctionName()));
        String dispName = EncodingUtils.fixMojibake(node.getDisplayName());
        if (dispName != null) {
            if (dispName.endsWith(" : Start")) {
                dispName = dispName.substring(0, dispName.length() - " : Start".length()).trim();
            }
            if (dispName.endsWith(" : Body")) {
                dispName = dispName.substring(0, dispName.length() - " : Body".length()).trim();
            }
        }
        step.setDisplayName(dispName);

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
                step.setArguments(EncodingUtils.fixMojibake(argsStr.trim()));
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
        step.setSelfDurationMillis(duration);

        ErrorAction ea = node.getAction(ErrorAction.class);
        if (ea != null) {
            Throwable th = ea.getError();
            boolean isAborted = (th instanceof org.jenkinsci.plugins.workflow.steps.FlowInterruptedException)
                    || (th.getMessage() != null && th.getMessage().toLowerCase(java.util.Locale.ROOT).contains("abort"))
                    || (th.getClass().getName().contains("Interrupted"));
            if (isAborted) {
                step.setStatus("ABORTED");
                step.setError(EncodingUtils.fixMojibake(th.getMessage() != null ? th.getMessage() : "Step was aborted"));
            } else {
                step.setStatus("FAILED");
                step.setError(EncodingUtils.fixMojibake(th.getMessage() != null ? th.getMessage() : "Step failed"));
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

    static String formatMatrixAxes(String rawAxes, boolean shortFormat) {
        if (rawAxes == null || rawAxes.trim().isEmpty()) {
            return "";
        }
        String[] parts = rawAxes.split(",\\s*");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            String part = parts[i].trim();
            int eqIdx = part.indexOf('=');
            if (eqIdx != -1) {
                String key = part.substring(0, eqIdx).trim();
                String val = part.substring(eqIdx + 1).trim();
                if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith("\"") && val.endsWith("\""))) {
                    val = val.substring(1, val.length() - 1).trim();
                }
                if (sb.length() > 0) {
                    sb.append(" · ");
                }
                if (shortFormat) {
                    sb.append(val);
                } else {
                    sb.append(key).append(": ").append(val);
                }
            } else {
                if (sb.length() > 0) {
                    sb.append(" · ");
                }
                sb.append(part);
            }
        }
        return sb.toString();
    }

    static boolean isParallelChildOf(FlowNode childNode, FlowNode parentNode) {
        if (childNode == null || parentNode == null) {
            return false;
        }
        if (childNode.getAction(ThreadNameAction.class) != null) {
            return true;
        }
        try {
            for (BlockStartNode bsn : childNode.iterateEnclosingBlocks()) {
                if (bsn.getId().equals(parentNode.getId())) {
                    break;
                }
                if (bsn.getAction(ThreadNameAction.class) != null) {
                    return true;
                }
                if (bsn instanceof StepStartNode) {
                    StepDescriptor desc = ((StepStartNode) bsn).getDescriptor();
                    if (desc != null && "parallel".equals(desc.getFunctionName())) {
                        return true;
                    }
                }
            }
        } catch (Throwable ignored) {
        }
        return false;
    }

    static List<StageModel> consolidateStages(List<StageModel> stages, Map<String, FlowNode> nodeMap, Map<String, BlockEndNode> startToEndMap) {
        if (stages == null || stages.isEmpty()) {
            return Collections.emptyList();
        }

        Map<String, StageModel> stageById = new HashMap<>();
        for (StageModel s : stages) {
            stageById.put(s.getId(), s);
        }

        Map<String, List<StageModel>> parallelChildrenMap = new LinkedHashMap<>();
        Map<String, List<StageModel>> sequentialChildrenMap = new LinkedHashMap<>();
        Set<String> absorbedStages = new HashSet<>();

        for (StageModel s : stages) {
            FlowNode sNode = nodeMap != null ? nodeMap.get(s.getId()) : null;
            StageModel parentStage = null;
            boolean isParallelChild = false;

            // 1. Primary resolution: Use FlowNode enclosing blocks hierarchy
            if (sNode != null) {
                try {
                    for (BlockStartNode bsn : sNode.iterateEnclosingBlocks()) {
                        StageModel candidate = stageById.get(bsn.getId());
                        if (candidate != null && candidate != s) {
                            parentStage = candidate;
                            FlowNode parentNode = nodeMap.get(candidate.getId());
                            isParallelChild = isParallelChildOf(sNode, parentNode);
                            break;
                        }
                    }
                } catch (Throwable ignored) {
                }
            } else {
                // Secondary fallback ONLY for synthetic graphs or unit-test mocks where nodeMap is absent:
                if (s.isParallelBranch() && startToEndMap != null) {
                    long sId = 0L;
                    try {
                        sId = Long.parseLong(s.getId());
                    } catch (NumberFormatException ignored) {}

                    if (sId > 0) {
                        for (StageModel candidateParent : stages) {
                            if (candidateParent == s) continue;
                            BlockEndNode parentEnd = startToEndMap.get(candidateParent.getId());
                            if (parentEnd != null) {
                                try {
                                    long parentStartId = Long.parseLong(candidateParent.getId());
                                    long parentEndId = Long.parseLong(parentEnd.getId());
                                    if (sId > parentStartId && sId < parentEndId) {
                                        parentStage = candidateParent;
                                        isParallelChild = true;
                                        break;
                                    }
                                } catch (NumberFormatException ignored) {}
                            }
                        }
                    }
                }
            }

            if (parentStage != null) {
                if (isParallelChild) {
                    s.setParallelBranch(true);
                    parallelChildrenMap.computeIfAbsent(parentStage.getId(), k -> new ArrayList<>()).add(s);
                    absorbedStages.add(s.getId());
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
                    s.setParallelBranch(false);
                    sequentialChildrenMap.computeIfAbsent(parentStage.getId(), k -> new ArrayList<>()).add(s);
                }
            }
        }

        List<StageModel> result = new ArrayList<>();
        for (StageModel s : stages) {
            if (absorbedStages.contains(s.getId())) {
                continue;
            }

            List<StageModel> parChildren = parallelChildrenMap.get(s.getId());
            List<StageModel> seqChildren = sequentialChildrenMap.get(s.getId());

            if (parChildren != null && !parChildren.isEmpty()) {
                // Stage has true parallel branches
                boolean anyMatrixChild = false;
                for (StageModel child : parChildren) {
                    // Check if child is a matrix combination
                    String rawMatrixStr = null;
                    if (child.getName() != null && (child.getName().startsWith("Matrix - ") || child.getName().startsWith("Matrix: "))) {
                        rawMatrixStr = child.getName().replaceFirst("^Matrix\\s*[-:]\\s*", "").trim();
                    } else if (child.getBranchName() != null && (child.getBranchName().startsWith("Matrix - ") || child.getBranchName().startsWith("Matrix: "))) {
                        rawMatrixStr = child.getBranchName().replaceFirst("^Matrix\\s*[-:]\\s*", "").trim();
                    }
                    if (rawMatrixStr != null) {
                        child.setMatrix(true);
                        anyMatrixChild = true;
                        String shortAxes = formatMatrixAxes(rawMatrixStr, true);
                        String fullAxes = formatMatrixAxes(rawMatrixStr, false);
                        child.setMatrixShortAxes(shortAxes);
                        child.setMatrixCell(fullAxes);
                        if (child.getName() != null && (child.getName().startsWith("Matrix - ") || child.getName().startsWith("Matrix: "))) {
                            child.setName(!shortAxes.isEmpty() ? shortAxes : fullAxes);
                        }
                    }

                    // Absorb any sequential children belonging to this parallel child
                    List<StageModel> childSeq = sequentialChildrenMap.get(child.getId());
                    if (childSeq != null && !childSeq.isEmpty()) {
                        if (childSeq.size() == 1) {
                            StageModel sub = childSeq.get(0);
                            absorbedStages.add(sub.getId());
                            if (child.isMatrix()) {
                                if (sub.getName() != null && !sub.getName().trim().isEmpty()) {
                                    child.setName(sub.getName().trim());
                                    String axes = child.getMatrixShortAxes();
                                    child.setBranchName(axes != null && !axes.isEmpty() ? axes : sub.getName().trim());
                                }
                            } else {
                                if (sub.getName() != null && !sub.getName().trim().isEmpty()
                                        && !sub.getName().trim().equalsIgnoreCase(child.getName().trim())) {
                                    child.setBranchName(sub.getName().trim());
                                }
                            }
                            if (child.getSteps().isEmpty() && !sub.getSteps().isEmpty()) {
                                child.setSteps(new ArrayList<>(sub.getSteps()));
                            } else if (!sub.getSteps().isEmpty()) {
                                for (StepModel cStep : sub.getSteps()) {
                                    boolean exists = false;
                                    for (StepModel exStep : child.getSteps()) {
                                        if (exStep.getId().equals(cStep.getId())) {
                                            exists = true;
                                            break;
                                        }
                                    }
                                    if (!exists) {
                                        child.addStep(cStep);
                                    }
                                }
                            }
                            if (child.getDurationMillis() <= 0 && sub.getDurationMillis() > 0) {
                                child.setDurationMillis(sub.getDurationMillis());
                            }
                            if ((child.getAgent() == null || child.getAgent().isEmpty()) && sub.getAgent() != null) {
                                child.setAgent(sub.getAgent());
                            }
                            if (sub.getStatus() != null && !"SUCCESS".equalsIgnoreCase(sub.getStatus())) {
                                child.setStatus(sub.getStatus());
                            }
                            if (sub.getError() != null && child.getError() == null) {
                                child.setError(sub.getError());
                            }
                            if (sub.isHasArtifacts()) {
                                child.setHasArtifacts(true);
                                child.setArtifactCount(child.getArtifactCount() + sub.getArtifactCount());
                                if (child.getArtifacts() == null) {
                                    child.setArtifacts(new ArrayList<>());
                                }
                                for (ArtifactModel art : sub.getArtifacts()) {
                                    if (!child.getArtifacts().contains(art)) {
                                        child.addArtifact(art);
                                    }
                                }
                            }
                        } else {
                            long totalSubDur = 0L;
                            for (StageModel sub : childSeq) {
                                absorbedStages.add(sub.getId());
                                if (sub.getDurationMillis() > 0) {
                                    totalSubDur += sub.getDurationMillis();
                                }
                                if (sub.getSteps() != null) {
                                    for (StepModel cStep : sub.getSteps()) {
                                        boolean exists = false;
                                        for (StepModel exStep : child.getSteps()) {
                                            if (exStep.getId().equals(cStep.getId())) {
                                                exists = true;
                                                break;
                                            }
                                        }
                                        if (!exists) {
                                            child.addStep(cStep);
                                        }
                                    }
                                }
                                if (sub.getStatus() != null && !"SUCCESS".equalsIgnoreCase(sub.getStatus()) && !"FAILED".equalsIgnoreCase(child.getStatus())) {
                                    child.setStatus(sub.getStatus());
                                }
                                if (sub.getError() != null && child.getError() == null) {
                                    child.setError(sub.getError());
                                }
                                if (sub.isHasArtifacts()) {
                                    child.setHasArtifacts(true);
                                    child.setArtifactCount(child.getArtifactCount() + sub.getArtifactCount());
                                    if (child.getArtifacts() == null) {
                                        child.setArtifacts(new ArrayList<>());
                                    }
                                    for (ArtifactModel art : sub.getArtifacts()) {
                                        if (!child.getArtifacts().contains(art)) {
                                            child.addArtifact(art);
                                        }
                                    }
                                }
                            }
                            if (child.getDurationMillis() <= 0 && totalSubDur > 0) {
                                child.setDurationMillis(totalSubDur);
                            }
                            child.setChildren(childSeq);
                        }
                    }
                }
                if (anyMatrixChild) {
                    s.setMatrix(true);
                }
                s.setChildren(parChildren);
                result.add(s);
            } else if (seqChildren != null && !seqChildren.isEmpty()) {
                if (seqChildren.size() == 1) {
                    // Single sequential sub-stage (e.g. stage('Add Git Tag') { stages { stage('Test42 Common Git Tagging') } })
                    StageModel child = seqChildren.get(0);
                    absorbedStages.add(child.getId());
                    if (child.getName() != null && !child.getName().trim().isEmpty()
                            && !child.getName().trim().equalsIgnoreCase(s.getName().trim())) {
                        s.setBranchName(child.getName().trim());
                    }
                    if (s.getSteps().isEmpty() && !child.getSteps().isEmpty()) {
                        s.setSteps(new ArrayList<>(child.getSteps()));
                    } else if (!child.getSteps().isEmpty()) {
                        for (StepModel cStep : child.getSteps()) {
                            boolean exists = false;
                            for (StepModel exStep : s.getSteps()) {
                                if (exStep.getId().equals(cStep.getId())) {
                                    exists = true;
                                    break;
                                }
                            }
                            if (!exists) {
                                s.addStep(cStep);
                            }
                        }
                    }
                    if (s.getDurationMillis() <= 0 && child.getDurationMillis() > 0) {
                        s.setDurationMillis(child.getDurationMillis());
                    }
                    if ((s.getAgent() == null || s.getAgent().isEmpty()) && child.getAgent() != null) {
                        s.setAgent(child.getAgent());
                    }
                    if (child.getStatus() != null && !"SUCCESS".equalsIgnoreCase(child.getStatus())) {
                        s.setStatus(child.getStatus());
                    }
                    if (child.getError() != null && s.getError() == null) {
                        s.setError(child.getError());
                    }
                    if (child.isHasArtifacts()) {
                        s.setHasArtifacts(true);
                        s.setArtifactCount(s.getArtifactCount() + child.getArtifactCount());
                        if (s.getArtifacts() == null) {
                            s.setArtifacts(new ArrayList<>());
                        }
                        for (ArtifactModel art : child.getArtifacts()) {
                            if (!s.getArtifacts().contains(art)) {
                                s.addArtifact(art);
                            }
                        }
                    }
                    List<StageModel> childPar = parallelChildrenMap.get(child.getId());
                    if (childPar != null && !childPar.isEmpty()) {
                        s.setChildren(childPar);
                    }
                    result.add(s);
                } else {
                    // Multiple sequential sub-stages (or outer pipeline wrapper)
                    // Flatten sequential children into the result flow
                    for (StageModel child : seqChildren) {
                        List<StageModel> childPar = parallelChildrenMap.get(child.getId());
                        if (childPar != null && !childPar.isEmpty()) {
                            child.setChildren(childPar);
                        }
                        result.add(child);
                        absorbedStages.add(child.getId());
                    }
                }
            } else {
                result.add(s);
            }
        }

        // Synchronize parent stage status and duration with children for parallel stages
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

    static void postProcessAllStageSteps(List<StageModel> stages, Map<String, FlowNode> nodeMap) {
        if (stages == null) {
            return;
        }
        for (StageModel s : stages) {
            postProcessStageSteps(s, nodeMap);
            if (s.getChildren() != null) {
                postProcessAllStageSteps(s.getChildren(), nodeMap);
            }
        }
    }

    static void postProcessStageSteps(StageModel stage, Map<String, FlowNode> nodeMap) {
        if (stage == null || stage.getSteps() == null || stage.getSteps().isEmpty()) {
            return;
        }

        List<StepModel> steps = stage.getSteps();
        Map<String, StepModel> stepById = new HashMap<>();
        for (StepModel st : steps) {
            stepById.put(st.getId(), st);
            st.setSelfDurationMillis(st.getDurationMillis());
            st.setDepth(0);
            st.setParentStepId(null);
            st.setBlock(false);
            st.setClosure(false);
            st.setChildStepsCount(0);
        }

        // 1. Determine immediate parent step for each step using enclosing IDs
        for (StepModel st : steps) {
            FlowNode fn = nodeMap != null ? nodeMap.get(st.getId()) : null;
            if (fn != null) {
                try {
                    for (String encId : fn.getAllEnclosingIds()) {
                        if (stepById.containsKey(encId) && !encId.equals(st.getId())) {
                            st.setParentStepId(encId);
                            break;
                        }
                    }
                } catch (Throwable ignored) {
                }
            }
        }

        // 2. Build parent -> children map
        Map<String, List<StepModel>> childrenMap = new LinkedHashMap<>();
        for (StepModel st : steps) {
            if (st.getParentStepId() != null) {
                childrenMap.computeIfAbsent(st.getParentStepId(), k -> new ArrayList<>()).add(st);
            }
        }

        // 3. Compute depth for each step
        for (StepModel st : steps) {
            int depth = 0;
            String currParent = st.getParentStepId();
            Set<String> visited = new HashSet<>();
            while (currParent != null && visited.add(currParent)) {
                depth++;
                StepModel p = stepById.get(currParent);
                currParent = (p != null) ? p.getParentStepId() : null;
            }
            st.setDepth(depth);
        }

        // 4. Mark closures and calculate self-duration
        for (StepModel st : steps) {
            List<StepModel> immediateChildren = childrenMap.get(st.getId());
            if (immediateChildren != null && !immediateChildren.isEmpty()) {
                st.setBlock(true);
                st.setClosure(true);
                st.setChildStepsCount(immediateChildren.size());

                long childrenDurationSum = 0;
                for (StepModel child : immediateChildren) {
                    childrenDurationSum += child.getDurationMillis();
                }
                long selfDuration = Math.max(0, st.getDurationMillis() - childrenDurationSum);
                st.setSelfDurationMillis(selfDuration);
            }
        }
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

    private static List<TestCaseModel> extractTestCases(AbstractTestResultAction<?> testAction) {
        List<TestCaseModel> cases = new ArrayList<>();
        try {
            Object rawResult = testAction.getResult();
            if (rawResult instanceof hudson.tasks.junit.TestResult) {
                hudson.tasks.junit.TestResult junitResult = (hudson.tasks.junit.TestResult) rawResult;
                int ownerNumber = (testAction.run != null) ? testAction.run.getNumber() : 0;
                for (hudson.tasks.junit.SuiteResult suite : junitResult.getSuites()) {
                    String suiteName = suite.getName();
                    for (hudson.tasks.junit.CaseResult cr : suite.getCases()) {
                        TestCaseModel tc = new TestCaseModel();
                        tc.setName(cr.getName());
                        tc.setClassName(cr.getClassName());
                        tc.setSuiteName(suiteName);
                        tc.setDurationSeconds(cr.getDuration());
                        tc.setFormattedDuration(formatTestDuration(cr.getDuration()));

                        if (cr.isSkipped()) {
                            tc.setAge(0);
                            tc.setStatus("SKIPPED");
                            tc.setSkippedMessage(cr.getSkippedMessage());
                        } else if (!cr.isPassed()) {
                            int failedSince = cr.getFailedSince();
                            int age = (failedSince > 0 && ownerNumber >= failedSince)
                                    ? (ownerNumber - failedSince + 1)
                                    : 1;
                            tc.setAge(age);
                            tc.setStatus("FAILED");
                            tc.setErrorDetails(cr.getErrorDetails());
                            tc.setErrorStackTrace(cr.getErrorStackTrace());
                        } else {
                            tc.setAge(0);
                            tc.setStatus("PASSED");
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
        }
        return cases;
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

    private static ArtifactSummary collectArtifacts(WorkflowRun run) {
        if (run == null) {
            return new ArtifactSummary(Collections.emptyList(), 0L);
        }
        List<ArtifactModel> artifacts = new ArrayList<>();
        long totalSize = 0L;
        try {
            List<? extends hudson.model.Run<?, ?>.Artifact> rawArtifacts = run.getArtifacts();
            for (hudson.model.Run<?, ?>.Artifact artifact : rawArtifacts) {
                long size = artifact.getFileSize();
                totalSize += Math.max(0L, size);
                artifacts.add(new ArtifactModel(
                        artifact.getFileName(),
                        artifact.relativePath,
                        artifact.getDisplayPath(),
                        artifact.getHref(),
                        size,
                        formatBytes(size)
                ));
            }
        } catch (Throwable ignored) {
            // Artifact managers may be remote or temporarily unavailable. An empty section is safer than failing the view.
        }
        return new ArtifactSummary(artifacts, totalSize);
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

    /**
     * Associates deferred artifact details with the already-built canvas tree
     * without re-walking the complete FlowGraph.
     */
    private static void associateArtifactsWithStageIds(List<StageModel> stages, List<ArtifactModel> artifacts) {
        if (stages == null || stages.isEmpty() || artifacts == null || artifacts.isEmpty()) {
            return;
        }

        Map<String, StageModel> archiverStages = new LinkedHashMap<>();
        Map<String, List<String>> stagePatterns = new LinkedHashMap<>();
        collectArtifactStages(stages, archiverStages, stagePatterns);
        if (archiverStages.isEmpty()) {
            return;
        }

        for (StageModel st : archiverStages.values()) {
            st.getArtifacts().clear();
            st.setHasArtifacts(false);
            st.setArtifactCount(0);
        }

        if (archiverStages.size() == 1) {
            StageModel stage = archiverStages.values().iterator().next();
            for (ArtifactModel artifact : artifacts) {
                artifact.setStageId(stage.getId());
                artifact.setStageName(stage.getName());
                stage.addArtifact(artifact);
            }
            stage.setHasArtifacts(true);
            stage.setArtifactCount(stage.getArtifacts().size());
            return;
        }

        for (ArtifactModel artifact : artifacts) {
            StageModel matchedStage = null;
            for (Map.Entry<String, StageModel> entry : archiverStages.entrySet()) {
                List<String> patterns = stagePatterns.get(entry.getKey());
                if (patterns == null) {
                    continue;
                }
                for (String pattern : patterns) {
                    if (matchesAntPattern(pattern, artifact.getRelativePath())) {
                        matchedStage = entry.getValue();
                        break;
                    }
                }
                if (matchedStage != null) {
                    break;
                }
            }
            if (matchedStage == null) {
                matchedStage = archiverStages.values().iterator().next();
            }
            artifact.setStageId(matchedStage.getId());
            artifact.setStageName(matchedStage.getName());
            matchedStage.addArtifact(artifact);
            matchedStage.setHasArtifacts(true);
            matchedStage.setArtifactCount(matchedStage.getArtifacts().size());
        }
    }

    private static void collectArtifactStages(List<StageModel> stages, Map<String, StageModel> archiverStages,
                                              Map<String, List<String>> stagePatterns) {
        if (stages == null) {
            return;
        }
        for (StageModel stage : stages) {
            List<String> patterns = new ArrayList<>();
            if (stage.getSteps() != null) {
                for (StepModel step : stage.getSteps()) {
                    if (isArchiveArtifactsStep(step)) {
                        patterns.add(extractArchivePattern(step.getArguments()));
                    }
                }
            }
            if (!patterns.isEmpty()) {
                archiverStages.put(stage.getId(), stage);
                stagePatterns.put(stage.getId(), patterns);
            }
            collectArtifactStages(stage.getChildren(), archiverStages, stagePatterns);
        }
    }

    private static boolean isArchiveArtifactsStep(StepModel step) {
        if (step == null || step.getName() == null) {
            return false;
        }
        String name = step.getName();
        return "archiveArtifacts".equalsIgnoreCase(name)
                || name.toLowerCase(java.util.Locale.ROOT).contains("archiveartifact");
    }

    private static String extractArchivePattern(String stepArguments) {
        if (stepArguments == null || stepArguments.trim().isEmpty()) {
            return "**";
        }
        Matcher matcher = ARCHIVE_ARTIFACTS_ARGUMENT.matcher(stepArguments);
        if (matcher.find()) {
            String pattern = matcher.group(1);
            if (pattern == null) {
                pattern = matcher.group(2);
            }
            if (pattern == null) {
                pattern = matcher.group(3);
            }
            if (pattern != null && !pattern.trim().isEmpty()) {
                return pattern.trim();
            }
        }

        String candidate = stepArguments.trim();
        if (candidate.indexOf(':') < 0 && candidate.indexOf('=') < 0 && candidate.indexOf(',') < 0) {
            if ((candidate.startsWith("\"") && candidate.endsWith("\""))
                    || (candidate.startsWith("'") && candidate.endsWith("'"))) {
                candidate = candidate.substring(1, candidate.length() - 1);
            }
            if (!candidate.isEmpty()) {
                return candidate;
            }
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

    private static boolean isNodeStepStart(FlowNode n) {
        if (n instanceof StepStartNode) {
            StepStartNode ssn = (StepStartNode) n;
            if (!ssn.isBody()) {
                try {
                    if ("node".equals(ssn.getDisplayFunctionName())) {
                        return true;
                    }
                    org.jenkinsci.plugins.workflow.steps.StepDescriptor desc = ssn.getDescriptor();
                    if (desc != null && "node".equals(desc.getFunctionName())) {
                        return true;
                    }
                } catch (Throwable ignored) {
                }
                try {
                    if (n.getAction(QueueItemAction.class) != null) {
                        return true;
                    }
                } catch (Throwable ignored) {
                }
            }
        }
        return false;
    }
}
