package com.canbus.controller;

import com.canbus.model.ExpertConclusion;
import com.canbus.service.ExpertConclusionService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/conclusions")
@CrossOrigin(origins = "*")
public class ConclusionController {

    private final ExpertConclusionService conclusionService;

    public ConclusionController(ExpertConclusionService conclusionService) {
        this.conclusionService = conclusionService;
    }

    @PostMapping
    public ExpertConclusion createConclusion(@RequestBody ExpertConclusion conclusion) {
        return conclusionService.createConclusion(conclusion);
    }

    @PutMapping("/{id}")
    public ExpertConclusion updateConclusion(@PathVariable String id, @RequestBody ExpertConclusion conclusion) {
        ExpertConclusion updated = conclusionService.updateConclusion(id, conclusion);
        if (updated == null) {
            throw new RuntimeException("Conclusion not found with id: " + id);
        }
        return updated;
    }

    @DeleteMapping("/{id}")
    public Map<String, Boolean> deleteConclusion(@PathVariable String id) {
        boolean deleted = conclusionService.deleteConclusion(id);
        return Map.of("success", deleted);
    }

    @GetMapping("/{id}")
    public ExpertConclusion getConclusion(@PathVariable String id) {
        ExpertConclusion conclusion = conclusionService.getConclusion(id);
        if (conclusion == null) {
            throw new RuntimeException("Conclusion not found with id: " + id);
        }
        return conclusion;
    }

    @GetMapping
    public List<ExpertConclusion> getAllConclusions(
            @RequestParam(required = false) String frameId,
            @RequestParam(required = false) Integer arbitrationId,
            @RequestParam(required = false) Boolean anomaly,
            @RequestParam(required = false) String keyword) {

        if (frameId != null && !frameId.isEmpty()) {
            return conclusionService.getConclusionsByFrameId(frameId);
        }
        if (arbitrationId != null) {
            return conclusionService.getConclusionsByArbitrationId(arbitrationId);
        }
        if (anomaly != null && anomaly) {
            return conclusionService.getAnomalyConclusions();
        }
        if (keyword != null && !keyword.isEmpty()) {
            return conclusionService.searchConclusions(keyword);
        }
        return conclusionService.getAllConclusions();
    }

    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        return conclusionService.getConclusionStats();
    }
}
