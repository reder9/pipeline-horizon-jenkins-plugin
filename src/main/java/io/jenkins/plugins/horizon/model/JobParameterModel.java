package io.jenkins.plugins.horizon.model;

import java.util.ArrayList;
import java.util.List;

public class JobParameterModel {
    private String name;
    private String type;
    private String description;
    private String defaultValue;
    private List<String> choices = new ArrayList<>();

    public JobParameterModel() {
    }

    public JobParameterModel(String name, String type, String description, String defaultValue) {
        this.name = name;
        this.type = type;
        this.description = description;
        this.defaultValue = defaultValue;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getDefaultValue() {
        return defaultValue;
    }

    public void setDefaultValue(String defaultValue) {
        this.defaultValue = defaultValue;
    }

    public List<String> getChoices() {
        return choices;
    }

    public void setChoices(List<String> choices) {
        this.choices = choices;
    }
}
