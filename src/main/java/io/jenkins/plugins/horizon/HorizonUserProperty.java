package io.jenkins.plugins.horizon;

import hudson.Extension;
import hudson.model.User;
import hudson.model.UserProperty;
import hudson.model.UserPropertyDescriptor;
import hudson.util.ListBoxModel;
import org.kohsuke.stapler.DataBoundConstructor;
import org.kohsuke.stapler.DataBoundSetter;

/**
 * User profile configuration for Pipeline Horizon preferences (theme, default graph layout, density, and filter settings).
 */
public class HorizonUserProperty extends UserProperty {

    private String themeChoice = "auto";
    private String defaultLayout = "scroll";
    private String defaultDensity = "comfort";
    private boolean defaultHideSkipped = false;
    private boolean autoCopyLineLink = false;

    @DataBoundConstructor
    public HorizonUserProperty() {
    }

    public String getThemeChoice() {
        return (themeChoice != null && !themeChoice.isEmpty()) ? themeChoice : "auto";
    }

    @DataBoundSetter
    public void setThemeChoice(String themeChoice) {
        this.themeChoice = themeChoice;
    }

    public String getDefaultLayout() {
        return (defaultLayout != null && !defaultLayout.isEmpty()) ? defaultLayout : "scroll";
    }

    @DataBoundSetter
    public void setDefaultLayout(String defaultLayout) {
        this.defaultLayout = defaultLayout;
    }

    public String getDefaultDensity() {
        return (defaultDensity != null && !defaultDensity.isEmpty()) ? defaultDensity : "comfort";
    }

    @DataBoundSetter
    public void setDefaultDensity(String defaultDensity) {
        this.defaultDensity = defaultDensity;
    }

    public boolean isDefaultHideSkipped() {
        return defaultHideSkipped;
    }

    @DataBoundSetter
    public void setDefaultHideSkipped(boolean defaultHideSkipped) {
        this.defaultHideSkipped = defaultHideSkipped;
    }

    public boolean isAutoCopyLineLink() {
        return autoCopyLineLink;
    }

    @DataBoundSetter
    public void setAutoCopyLineLink(boolean autoCopyLineLink) {
        this.autoCopyLineLink = autoCopyLineLink;
    }

    @Extension
    public static final class DescriptorImpl extends UserPropertyDescriptor {

        @Override
        public String getDisplayName() {
            return "Pipeline Horizon Preferences";
        }

        @Override
        public UserProperty newInstance(User user) {
            return new HorizonUserProperty();
        }

        @Override
        public boolean isEnabled() {
            return true;
        }

        @Override
        public hudson.model.userproperty.UserPropertyCategory getUserPropertyCategory() {
            return hudson.model.userproperty.UserPropertyCategory.get(hudson.model.userproperty.UserPropertyCategory.Preferences.class);
        }

        public ListBoxModel doFillThemeChoiceItems() {
            ListBoxModel items = new ListBoxModel();
            items.add("Auto (Follow Jenkins Theme / System)", "auto");
            items.add("Dark Theme", "dark");
            items.add("Light Theme", "light");
            return items;
        }

        public ListBoxModel doFillDefaultLayoutItems() {
            ListBoxModel items = new ListBoxModel();
            items.add("Interactive Canvas Flow (Pan & Zoom)", "scroll");
            items.add("Wrap Flow (Multi-Row Layout)", "wrap");
            return items;
        }

        public ListBoxModel doFillDefaultDensityItems() {
            ListBoxModel items = new ListBoxModel();
            items.add("Comfort (Expanded with Details)", "comfort");
            items.add("Compact (High-Density Overview)", "compact");
            return items;
        }
    }
}
