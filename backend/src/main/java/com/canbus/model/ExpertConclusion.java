package com.canbus.model;

import java.util.List;

public class ExpertConclusion {
    private String id;
    private String frameId;
    private int arbitrationId;
    private String dataPattern;
    private boolean anomaly;
    private String anomalyType;
    private String diagnosis;
    private String suggestion;
    private String author;
    private long createdAt;
    private long updatedAt;
    private List<String> tags;

    public ExpertConclusion() {}

    public ExpertConclusion(String id, String frameId, int arbitrationId, String dataPattern,
                            boolean anomaly, String anomalyType, String diagnosis, String suggestion,
                            String author, long createdAt, long updatedAt, List<String> tags) {
        this.id = id;
        this.frameId = frameId;
        this.arbitrationId = arbitrationId;
        this.dataPattern = dataPattern;
        this.anomaly = anomaly;
        this.anomalyType = anomalyType;
        this.diagnosis = diagnosis;
        this.suggestion = suggestion;
        this.author = author;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.tags = tags;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFrameId() { return frameId; }
    public void setFrameId(String frameId) { this.frameId = frameId; }

    public int getArbitrationId() { return arbitrationId; }
    public void setArbitrationId(int arbitrationId) { this.arbitrationId = arbitrationId; }

    public String getDataPattern() { return dataPattern; }
    public void setDataPattern(String dataPattern) { this.dataPattern = dataPattern; }

    public boolean isAnomaly() { return anomaly; }
    public void setAnomaly(boolean anomaly) { this.anomaly = anomaly; }

    public String getAnomalyType() { return anomalyType; }
    public void setAnomalyType(String anomalyType) { this.anomalyType = anomalyType; }

    public String getDiagnosis() { return diagnosis; }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }

    public String getSuggestion() { return suggestion; }
    public void setSuggestion(String suggestion) { this.suggestion = suggestion; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public long getCreatedAt() { return createdAt; }
    public void setCreatedAt(long createdAt) { this.createdAt = createdAt; }

    public long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(long updatedAt) { this.updatedAt = updatedAt; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
}
