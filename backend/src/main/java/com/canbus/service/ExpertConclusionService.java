package com.canbus.service;

import com.canbus.model.ExpertConclusion;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class ExpertConclusionService {

    private final Map<String, ExpertConclusion> conclusions = new ConcurrentHashMap<>();
    private int conclusionCounter = 0;

    public ExpertConclusion createConclusion(ExpertConclusion conclusion) {
        String id = "conclusion-" + (++conclusionCounter);
        long now = System.currentTimeMillis();
        conclusion.setId(id);
        conclusion.setCreatedAt(now);
        conclusion.setUpdatedAt(now);
        conclusions.put(id, conclusion);
        return conclusion;
    }

    public ExpertConclusion updateConclusion(String id, ExpertConclusion conclusion) {
        ExpertConclusion existing = conclusions.get(id);
        if (existing == null) {
            return null;
        }
        conclusion.setId(id);
        conclusion.setCreatedAt(existing.getCreatedAt());
        conclusion.setUpdatedAt(System.currentTimeMillis());
        conclusions.put(id, conclusion);
        return conclusion;
    }

    public boolean deleteConclusion(String id) {
        return conclusions.remove(id) != null;
    }

    public ExpertConclusion getConclusion(String id) {
        return conclusions.get(id);
    }

    public List<ExpertConclusion> getAllConclusions() {
        return new ArrayList<>(conclusions.values());
    }

    public List<ExpertConclusion> getConclusionsByFrameId(String frameId) {
        return conclusions.values().stream()
                .filter(c -> frameId.equals(c.getFrameId()))
                .collect(Collectors.toList());
    }

    public List<ExpertConclusion> getConclusionsByArbitrationId(int arbitrationId) {
        return conclusions.values().stream()
                .filter(c -> c.getArbitrationId() == arbitrationId)
                .collect(Collectors.toList());
    }

    public List<ExpertConclusion> getAnomalyConclusions() {
        return conclusions.values().stream()
                .filter(ExpertConclusion::isAnomaly)
                .collect(Collectors.toList());
    }

    public List<ExpertConclusion> searchConclusions(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return getAllConclusions();
        }
        String lowerKeyword = keyword.toLowerCase();
        return conclusions.values().stream()
                .filter(c -> containsKeyword(c, lowerKeyword))
                .collect(Collectors.toList());
    }

    private boolean containsKeyword(ExpertConclusion c, String keyword) {
        return (c.getDiagnosis() != null && c.getDiagnosis().toLowerCase().contains(keyword))
                || (c.getSuggestion() != null && c.getSuggestion().toLowerCase().contains(keyword))
                || (c.getAnomalyType() != null && c.getAnomalyType().toLowerCase().contains(keyword))
                || (c.getAuthor() != null && c.getAuthor().toLowerCase().contains(keyword))
                || (c.getTags() != null && c.getTags().stream().anyMatch(t -> t.toLowerCase().contains(keyword)));
    }

    public Map<String, Object> getConclusionStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        long total = conclusions.size();
        long anomalyCount = conclusions.values().stream().filter(ExpertConclusion::isAnomaly).count();
        Set<String> authors = conclusions.values().stream()
                .map(ExpertConclusion::getAuthor)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Set<String> anomalyTypes = conclusions.values().stream()
                .map(ExpertConclusion::getAnomalyType)
                .filter(t -> t != null && !t.isEmpty())
                .collect(Collectors.toSet());

        stats.put("totalConclusions", total);
        stats.put("anomalyCount", anomalyCount);
        stats.put("normalCount", total - anomalyCount);
        stats.put("authorCount", authors.size());
        stats.put("anomalyTypeCount", anomalyTypes.size());
        stats.put("lastUpdate", System.currentTimeMillis());
        return stats;
    }
}
