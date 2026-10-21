package io.jenkins.plugins.horizon.model;

import java.io.Serializable;
import java.util.Objects;

/**
 * Model representing a build parameter configured and passed to a pipeline execution.
 */
public class BuildParameterModel implements Serializable {
    private static final long serialVersionUID = 1L;

    private String name;
    private String value;
    private String type;
    private String description;
    private boolean sensitive;

    public BuildParameterModel() {
    }

    public BuildParameterModel(String name, String value, String type, String description, boolean sensitive) {
        this.name = name;
        this.value = value;
        this.type = type;
        this.description = description;
        this.sensitive = sensitive;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
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

    public boolean isSensitive() {
        return sensitive;
    }

    public void setSensitive(boolean sensitive) {
        this.sensitive = sensitive;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        BuildParameterModel that = (BuildParameterModel) o;
        return sensitive == that.sensitive
                && Objects.equals(name, that.name)
                && Objects.equals(value, that.value)
                && Objects.equals(type, that.type)
                && Objects.equals(description, that.description);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, value, type, description, sensitive);
    }

    @Override
    public String toString() {
        return "BuildParameterModel{" +
                "name='" + name + '\'' +
                ", type='" + type + '\'' +
                ", sensitive=" + sensitive +
                '}';
    }
}
