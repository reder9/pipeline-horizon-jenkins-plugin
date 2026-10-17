package io.jenkins.plugins.horizon;

import hudson.util.ListBoxModel;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class HorizonUserPropertyTest {

    @Test
    public void testDefaults() {
        HorizonUserProperty prop = new HorizonUserProperty();
        assertEquals("auto", prop.getThemeChoice());
        assertEquals("scroll", prop.getDefaultLayout());
        assertEquals("comfort", prop.getDefaultDensity());
        assertFalse(prop.isDefaultHideSkipped());
        assertFalse(prop.isAutoCopyLineLink());
    }

    @Test
    public void testSettersAndGetters() {
        HorizonUserProperty prop = new HorizonUserProperty();
        prop.setThemeChoice("dark");
        assertEquals("dark", prop.getThemeChoice());

        prop.setDefaultLayout("wrap");
        assertEquals("wrap", prop.getDefaultLayout());

        prop.setDefaultDensity("compact");
        assertEquals("compact", prop.getDefaultDensity());

        prop.setDefaultHideSkipped(true);
        assertTrue(prop.isDefaultHideSkipped());

        prop.setAutoCopyLineLink(true);
        assertTrue(prop.isAutoCopyLineLink());
    }

    @Test
    public void testNullFallbacks() {
        HorizonUserProperty prop = new HorizonUserProperty();
        prop.setThemeChoice(null);
        assertEquals("auto", prop.getThemeChoice());

        prop.setDefaultLayout("");
        assertEquals("scroll", prop.getDefaultLayout());

        prop.setDefaultDensity(null);
        assertEquals("comfort", prop.getDefaultDensity());
    }

    @Test
    public void testDescriptorListBoxes() {
        HorizonUserProperty.DescriptorImpl descriptor = new HorizonUserProperty.DescriptorImpl();
        assertEquals("Pipeline Horizon Preferences", descriptor.getDisplayName());
        assertTrue(descriptor.isEnabled());

        ListBoxModel themeItems = descriptor.doFillThemeChoiceItems();
        assertNotNull(themeItems);
        assertTrue(themeItems.size() >= 3);
        assertEquals("auto", themeItems.get(0).value);

        ListBoxModel layoutItems = descriptor.doFillDefaultLayoutItems();
        assertNotNull(layoutItems);
        assertEquals("scroll", layoutItems.get(0).value);
        assertEquals("wrap", layoutItems.get(1).value);

        ListBoxModel densityItems = descriptor.doFillDefaultDensityItems();
        assertNotNull(densityItems);
        assertEquals("comfort", densityItems.get(0).value);
        assertEquals("compact", densityItems.get(1).value);
    }
}
