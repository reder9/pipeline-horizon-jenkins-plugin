package io.jenkins.plugins.horizon.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class ArtifactModelTest {

    @Test
    void testConstructorAndGetters() {
        ArtifactModel model = new ArtifactModel(
                "build.tar.gz",
                "dist/build.tar.gz",
                "build.tar.gz",
                "dist/build.tar.gz",
                14889984L,
                "14.2 MB"
        );

        assertEquals("build.tar.gz", model.getName());
        assertEquals("dist/build.tar.gz", model.getRelativePath());
        assertEquals("build.tar.gz", model.getDisplayPath());
        assertEquals("dist/build.tar.gz", model.getHref());
        assertEquals(14889984L, model.getSize());
        assertEquals("14.2 MB", model.getFormattedSize());
    }

    @Test
    void testSettersAndDefaults() {
        ArtifactModel model = new ArtifactModel();
        assertNull(model.getName());
        assertEquals(0L, model.getSize());

        model.setName("manifest.json");
        model.setRelativePath("reports/manifest.json");
        model.setDisplayPath("reports/manifest.json");
        model.setHref("reports/manifest.json");
        model.setSize(512L);
        model.setFormattedSize("512 B");

        model.setStageId("42");
        model.setStageName("Package Stage");

        assertEquals("manifest.json", model.getName());
        assertEquals("reports/manifest.json", model.getRelativePath());
        assertEquals("reports/manifest.json", model.getDisplayPath());
        assertEquals("reports/manifest.json", model.getHref());
        assertEquals(512L, model.getSize());
        assertEquals("512 B", model.getFormattedSize());
        assertEquals("42", model.getStageId());
        assertEquals("Package Stage", model.getStageName());
    }

    @Test
    void testFullConstructorWithStage() {
        ArtifactModel model = new ArtifactModel(
                "app.bin",
                "dist/bin/app.bin",
                "app.bin",
                "dist/bin/app.bin",
                1024L,
                "1.0 KB",
                "10",
                "Build & Package"
        );
        assertEquals("10", model.getStageId());
        assertEquals("Build & Package", model.getStageName());
    }
}
