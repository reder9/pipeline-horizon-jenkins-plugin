package io.jenkins.plugins.horizon;

import edu.umd.cs.findbugs.annotations.NonNull;
import hudson.Extension;
import hudson.model.Run;
import hudson.model.TaskListener;
import hudson.model.listeners.RunListener;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

/**
 * Ensures cached Pipeline Horizon run details and preview cards are invalidated
 * cleanly when a run completes or is deleted.
 */
@Extension
public class HorizonCacheListener extends RunListener<Run<?, ?>> {

    @Override
    public void onCompleted(Run<?, ?> run, @NonNull TaskListener listener) {
        if (run instanceof WorkflowRun) {
            HorizonRunAction.invalidateRunDetailsCache(run.getExternalizableId());
        }
    }

    @Override
    public void onDeleted(Run<?, ?> run) {
        if (run instanceof WorkflowRun) {
            HorizonRunAction.invalidateRunDetailsCache(run.getExternalizableId());
        }
    }
}
