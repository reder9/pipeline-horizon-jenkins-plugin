package io.jenkins.plugins.horizon.model;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JobSummaryModelTest {

    @Test
    void testJobSummaryProperties() {
        JobSummaryModel model = new JobSummaryModel();
        model.setName("payment-service");
        model.setFullName("services/payment-service");
        model.setUrl("job/payment-service/");
        model.setHorizonUrl("job/payment-service/horizon/");
        model.setDescription("Production payment processor pipeline");
        model.setBuildable(true);
        model.setParameterized(true);
        model.setWeatherScore(85);
        model.setLastBuildNumber(142);
        model.setLastSuccessfulBuildNumber(140);
        model.setLastFailedBuildNumber(141);

        assertEquals("payment-service", model.getName());
        assertEquals("services/payment-service", model.getFullName());
        assertEquals("job/payment-service/", model.getUrl());
        assertEquals("job/payment-service/horizon/", model.getHorizonUrl());
        assertEquals("Production payment processor pipeline", model.getDescription());
        assertTrue(model.isBuildable());
        assertTrue(model.isParameterized());
        assertEquals(85, model.getWeatherScore());
        assertEquals(142, model.getLastBuildNumber());
        assertEquals(140, model.getLastSuccessfulBuildNumber());
        assertEquals(141, model.getLastFailedBuildNumber());
    }

    @Test
    void testParametersAndRunsAssociation() {
        JobSummaryModel model = new JobSummaryModel();

        JobParameterModel param1 = new JobParameterModel("ENV", "ChoiceParameterDefinition", "Target deployment environment", "staging");
        JobParameterModel param2 = new JobParameterModel("RUN_TESTS", "BooleanParameterDefinition", "Run test suite", "true");
        model.setParameters(Arrays.asList(param1, param2));

        assertEquals(2, model.getParameters().size());
        assertEquals("ENV", model.getParameters().get(0).getName());
        assertEquals("ChoiceParameterDefinition", model.getParameters().get(0).getType());
        assertEquals("staging", model.getParameters().get(0).getDefaultValue());
        assertEquals("Target deployment environment", model.getParameters().get(0).getDescription());

        RunSummaryModel run = new RunSummaryModel();
        run.setNumber(142);
        run.setResult("SUCCESS");
        run.setBuilding(false);
        run.setDuration(12000L);
        run.setTimestamp(1700000000000L);
        run.setCauses(Collections.singletonList("SCM Push"));

        model.setRuns(Collections.singletonList(run));
        assertEquals(1, model.getRuns().size());
        assertEquals(142, model.getRuns().get(0).getNumber());
        assertEquals("SUCCESS", model.getRuns().get(0).getResult());
        assertEquals(1700000000000L, model.getRuns().get(0).getTimestamp());
    }
}
