package io.jenkins.plugins.horizon;

import hudson.Extension;
import jenkins.model.TransientActionFactory;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

import edu.umd.cs.findbugs.annotations.NonNull;
import java.util.Collection;
import java.util.Collections;

@Extension
public class HorizonRunActionFactory extends TransientActionFactory<WorkflowRun> {

    @Override
    public Class<WorkflowRun> type() {
        return WorkflowRun.class;
    }

    @NonNull
    @Override
    public Collection<HorizonRunAction> createFor(@NonNull WorkflowRun target) {
        return Collections.singleton(new HorizonRunAction(target));
    }
}
