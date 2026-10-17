package io.jenkins.plugins.horizon;

import net.sf.json.JSONObject;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PipelineValidationTest {

    @Test
    void testGroovySyntaxExceptionExtraction() {
        String script = "node {\n    echo 'line 1'\n    def a = (\n}";
        boolean threw = false;
        try {
            new groovy.lang.GroovyShell().parse(script);
        } catch (Throwable t) {
            threw = true;
            JSONObject result = new JSONObject();
            result.put("status", "error");
            result.put("valid", false);
            result.put("type", "scripted");

            HorizonRunAction.extractCompilationErrorInfo(t, script, result);

            assertEquals(4, result.getInt("line"));
            assertTrue(result.getInt("column") > 0);
            assertEquals("}", result.getString("errorLineText"));
            assertNotNull(result.getString("message"));
        }
        assertTrue(threw, "GroovyShell should have thrown compilation error");
    }

    @Test
    void testRegexFallbackExtraction() {
        String script = "node {\n    echo 'line 1'\n    def a = \n}";
        Exception ex = new RuntimeException("startup failed:\nWorkflowScript: 3: unexpected token: } @ line 3, column 1.\n1 error");

        JSONObject result = new JSONObject();
        result.put("status", "error");
        result.put("valid", false);
        result.put("type", "scripted");

        HorizonRunAction.extractCompilationErrorInfo(ex, script, result);

        assertEquals(3, result.getInt("line"));
        assertEquals(1, result.getInt("column"));
        assertEquals("    def a = ", result.getString("errorLineText"));
        assertFalse(result.getString("message").startsWith("startup failed:"));
    }

    @Test
    void testRegexWorkflowScriptFallbackWithoutColumn() {
        String script = "pipeline {\n    agent any\n    stages {\n        stage('Build') {\n            invalidSyntax\n        }\n    }\n}";
        Exception ex = new RuntimeException("WorkflowScript: 5: Method definition not allowed here");

        JSONObject result = new JSONObject();
        result.put("status", "error");
        result.put("valid", false);
        result.put("type", "declarative");

        HorizonRunAction.extractCompilationErrorInfo(ex, script, result);

        assertEquals(5, result.getInt("line"));
        assertEquals("            invalidSyntax", result.getString("errorLineText"));
    }
}
