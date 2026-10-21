package io.jenkins.plugins.horizon.model;

import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class QueueItemModelTest {

    @Test
    void testQueueItemProperties() {
        QueueItemModel model = new QueueItemModel();
        model.setId(42L);
        model.setWhy("Waiting for next available executor on docker-agent");
        model.setInQueueSince(1700000000000L);
        model.setTimeInQueue("15s");
        model.setBlocked(false);
        model.setBuildable(true);
        model.setStuck(false);
        model.setCanCancel(true);
        model.setCauses(Collections.singletonList("Started by user admin"));

        Map<String, String> params = new HashMap<>();
        params.put("ENV", "staging");
        model.setParameters(params);
        model.setTriggeredByUserId("admin");
        model.setTriggeredByUserName("Administrator");
        model.setTriggeredByUserUrl("/user/admin/");

        assertEquals(42L, model.getId());
        assertEquals("Waiting for next available executor on docker-agent", model.getWhy());
        assertEquals(1700000000000L, model.getInQueueSince());
        assertEquals("15s", model.getTimeInQueue());
        assertFalse(model.isBlocked());
        assertTrue(model.isBuildable());
        assertFalse(model.isStuck());
        assertTrue(model.isCanCancel());

        assertNotNull(model.getCauses());
        assertEquals(1, model.getCauses().size());
        assertEquals("Started by user admin", model.getCauses().get(0));

        assertNotNull(model.getParameters());
        assertEquals("staging", model.getParameters().get("ENV"));
        assertEquals("admin", model.getTriggeredByUserId());
        assertEquals("Administrator", model.getTriggeredByUserName());
        assertEquals("/user/admin/", model.getTriggeredByUserUrl());
    }
}
