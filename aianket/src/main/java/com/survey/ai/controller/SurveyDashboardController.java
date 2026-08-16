package com.survey.ai.controller;

import com.survey.ai.dto.PaginatedCommentsResponse;
import com.survey.ai.service.SurveyReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/v1/reports")
public class SurveyDashboardController {

    private final SurveyReportService reportService;

    public SurveyDashboardController(SurveyReportService reportService) {
        this.reportService = reportService;
    }

    /*
     * companyId zorunludur. Opsiyonel olduğu sürece parametreyi silen istek
     * CompanyScopeInterceptor'a hiç yakalanmıyor, yani şirket kapsamı kontrolü
     * tamamen atlanıyordu. Panel zaten her çağrıda gönderiyor (dashboardService).
     */

    @GetMapping("/general-average")
    public double getGeneralAverage(@RequestParam String companyId) {
        return reportService.getGeneralAverage(companyId);
    }

    @GetMapping("/question-averages")
    public Map<String, Double> getAveragesPerQuestion(@RequestParam String companyId) {
        return reportService.getAveragesPerQuestion(companyId);
    }

    @GetMapping("/sentiments")
    public Map<String, Integer> getSentimentCounts(@RequestParam String companyId) {
        return reportService.getSentimentCounts(companyId);
    }

    @GetMapping("/daily-trend")
    public Map<String, Integer> getResponsesPerDay(@RequestParam String companyId) {
        return reportService.getResponsesPerDay(companyId);
    }


    @GetMapping("/last-comments")
    public ResponseEntity<PaginatedCommentsResponse> getLastCommentsWithPage(
            @RequestParam String companyId,
            @RequestParam(defaultValue = "10", required = false) int limit,
            @RequestParam(required = false) String surveyTemplateId,
            @RequestParam(defaultValue = "0", required = false) int page,
            @RequestParam(defaultValue = "10", required = false) int size) {

        PaginatedCommentsResponse comments = reportService.getLastCommentsWithPage(companyId, surveyTemplateId, page, size);
        return ResponseEntity.ok(comments);
    }
}
