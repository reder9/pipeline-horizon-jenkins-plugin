package io.jenkins.plugins.horizon;

import hudson.model.FreeStyleProject;
import hudson.model.Job;
import hudson.model.Result;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

import java.util.Collection;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

@WithJenkins
class HorizonActionTest {

    @Test
    void testHorizonJobActionAndFactory(JenkinsRule jenkins) throws Exception {
        WorkflowJob job = jenkins.createProject(WorkflowJob.class, "test-horizon-job");
        HorizonJobAction action = new HorizonJobAction(job);

        assertSame(job, action.getJob());
        assertEquals("symbol-pulse-outline plugin-ionicons-api", action.getIconFileName());
        assertEquals("Pipeline Horizon", action.getDisplayName());
        assertEquals("horizon", action.getUrlName());

        HorizonJobActionFactory factory = new HorizonJobActionFactory();
        assertEquals(Job.class, factory.type());

        Collection<HorizonJobAction> workflowActions = factory.createFor(job);
        assertNotNull(workflowActions);
        assertEquals(1, workflowActions.size());
        assertSame(job, workflowActions.iterator().next().getJob());

        // Non-workflow job should return empty list
        FreeStyleProject freeStyle = jenkins.createProject(FreeStyleProject.class, "freestyle-job");
        Collection<HorizonJobAction> nonWorkflowActions = factory.createFor(freeStyle);
        assertNotNull(nonWorkflowActions);
        assertTrue(nonWorkflowActions.isEmpty());
    }

    @Test
    void testHorizonRunActionAndFactory(JenkinsRule jenkins) throws Exception {
        WorkflowJob job = jenkins.createProject(WorkflowJob.class, "test-horizon-run-job");
        job.setDefinition(new CpsFlowDefinition("node { echo 'test' }", true));
        WorkflowRun run = jenkins.buildAndAssertStatus(Result.SUCCESS, job);

        HorizonRunAction action = new HorizonRunAction(run);
        assertSame(run, action.getRun());
        assertEquals("symbol-pulse-outline plugin-ionicons-api", action.getIconFileName());
        assertEquals("Pipeline Horizon", action.getDisplayName());
        assertEquals("horizon", action.getUrlName());

        WorkflowRun build2 = jenkins.buildAndAssertStatus(Result.SUCCESS, job);
        action.onAttached(build2);
        assertSame(build2, action.getRun());

        action.onLoad(run);
        assertSame(run, action.getRun());

        HorizonRunActionFactory factory = new HorizonRunActionFactory();
        assertEquals(WorkflowRun.class, factory.type());

        Collection<HorizonRunAction> runActions = factory.createFor(run);
        assertNotNull(runActions);
        assertEquals(1, runActions.size());
        assertSame(run, runActions.iterator().next().getRun());
    }
}
