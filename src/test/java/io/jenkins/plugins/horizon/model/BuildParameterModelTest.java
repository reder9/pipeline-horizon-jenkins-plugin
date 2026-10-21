package io.jenkins.plugins.horizon.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BuildParameterModelTest {

    @Test
    void testConstructorAndGettersSetters() {
        BuildParameterModel model = new BuildParameterModel("BRANCH_NAME", "main", "String", "Git branch to build", false);
        assertEquals("BRANCH_NAME", model.getName());
        assertEquals("main", model.getValue());
        assertEquals("String", model.getType());
        assertEquals("Git branch to build", model.getDescription());
        assertFalse(model.isSensitive());

        model.setName("API_KEY");
        model.setValue("********");
        model.setType("Password");
        model.setDescription("Secret key");
        model.setSensitive(true);

        assertEquals("API_KEY", model.getName());
        assertEquals("********", model.getValue());
        assertEquals("Password", model.getType());
        assertEquals("Secret key", model.getDescription());
        assertTrue(model.isSensitive());
    }

    @Test
    void testNoArgConstructor() {
        BuildParameterModel model = new BuildParameterModel();
        model.setName("ENV");
        model.setValue("production");
        model.setType("Choice");
        model.setDescription("Deployment environment");
        model.setSensitive(false);

        assertEquals("ENV", model.getName());
        assertEquals("production", model.getValue());
        assertEquals("Choice", model.getType());
        assertEquals("Deployment environment", model.getDescription());
        assertFalse(model.isSensitive());
    }

    @Test
    void testEqualsAndHashCode() {
        BuildParameterModel p1 = new BuildParameterModel("KEY", "val", "String", "desc", false);
        BuildParameterModel p2 = new BuildParameterModel("KEY", "val", "String", "desc", false);
        BuildParameterModel p3 = new BuildParameterModel("KEY2", "val", "String", "desc", false);
        BuildParameterModel p4 = new BuildParameterModel("KEY", "other", "String", "desc", false);
        BuildParameterModel p5 = new BuildParameterModel("KEY", "val", "Password", "desc", true);

        assertEquals(p1, p1);
        assertEquals(p1, p2);
        assertEquals(p1.hashCode(), p2.hashCode());

        assertNotEquals(p1, null);
        assertNotEquals(p1, "some-string");
        assertNotEquals(p1, p3);
        assertNotEquals(p1, p4);
        assertNotEquals(p1, p5);
    }

    @Test
    void testToStringSafety() {
        BuildParameterModel sensitiveParam = new BuildParameterModel("SECRET_PASS", "super_secret_123", "Password", "Master password", true);
        String str = sensitiveParam.toString();
        assertTrue(str.contains("SECRET_PASS"));
        assertTrue(str.contains("Password"));
        assertTrue(str.contains("sensitive=true"));
        assertFalse(str.contains("super_secret_123"), "toString must not expose parameter value");
    }
}
