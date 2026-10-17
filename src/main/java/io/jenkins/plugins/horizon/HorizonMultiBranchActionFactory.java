package io.jenkins.plugins.horizon;

import hudson.Extension;
import hudson.model.Action;
import java.util.Collection;
import java.util.Collections;
import jenkins.model.TransientActionFactory;
import org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject;

@Extension
public class HorizonMultiBranchActionFactory extends TransientActionFactory<WorkflowMultiBranchProject> {

    @Override
    public Class<WorkflowMultiBranchProject> type() {
        return WorkflowMultiBranchProject.class;
    }

    @Override
    public Collection<? extends Action> createFor(WorkflowMultiBranchProject target) {
        return Collections.singleton(new HorizonMultiBranchAction(target));
    }
}
