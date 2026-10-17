package io.jenkins.plugins.horizon;

import hudson.Extension;
import hudson.model.Job;
import jenkins.model.TransientActionFactory;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;

import edu.umd.cs.findbugs.annotations.NonNull;
import java.util.Collection;
import java.util.Collections;

@Extension
public class HorizonJobActionFactory extends TransientActionFactory<Job> {

    @Override
    public Class<Job> type() {
        return Job.class;
    }

    @NonNull
    @Override
    public Collection<HorizonJobAction> createFor(@NonNull Job target) {
        if (target instanceof WorkflowJob) {
            return Collections.singleton(new HorizonJobAction(target));
        }
        return Collections.emptyList();
    }
}
