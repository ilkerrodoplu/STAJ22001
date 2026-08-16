package com.survey.ai.controller;

import com.survey.ai.dto.ChoiceBreakdownDTO;
import com.survey.ai.dto.QuarterlyReportDTO;
import com.survey.ai.dto.QuestionAnalysisDTO;
import com.survey.ai.service.SurveyReportService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/v1/survey-reports")
@Slf4j
public class SurveyReportController {

    @Autowired
    private SurveyReportService surveyReportService;

    @GetMapping("/quarterly")
    public ResponseEntity<List<QuarterlyReportDTO>> getQuarterlyReport(
            @RequestParam String surveyTemplateId,
            @RequestParam Integer year) {

        log.info("Quarterly report requested for template: {} and year: {}", surveyTemplateId, year);

        try {
            List<QuarterlyReportDTO> report = surveyReportService.getQuarterlyReport(surveyTemplateId, year);
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            log.error("Error generating quarterly report", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/question-analysis")
    public ResponseEntity<List<QuestionAnalysisDTO>> getQuestionAnalysis(
            @RequestParam String surveyTemplateId,
            @RequestParam Integer year,
            @RequestParam String questionText) {

        log.info("Question analysis requested for template: {}, year: {}, question: {}",
                surveyTemplateId, year, questionText);

        try {
            List<QuestionAnalysisDTO> analysis = surveyReportService.getQuestionAnalysis(
                    surveyTemplateId, year, questionText);
            return ResponseEntity.ok(analysis);
        } catch (Exception e) {
            log.error("Error generating question analysis", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /** Şıklı soruların şık dağılımı: hangi seçenek ne kadar tercih edilmiş. */
    @GetMapping("/choice-breakdown")
    public ResponseEntity<List<ChoiceBreakdownDTO>> getChoiceBreakdown(
            @RequestParam String surveyTemplateId,
            @RequestParam Integer year) {
        try {
            return ResponseEntity.ok(surveyReportService.getChoiceBreakdown(surveyTemplateId, year));
        } catch (Exception e) {
            log.error("Error generating choice breakdown", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/available-questions")
    public ResponseEntity<Set<String>> getAvailableQuestions(@RequestParam String surveyTemplateId) {
        log.info("Available questions requested for template: {}", surveyTemplateId);

        try {
            Set<String> questions = surveyReportService.getAvailableQuestions(surveyTemplateId);
            return ResponseEntity.ok(questions);
        } catch (Exception e) {
            log.error("Error fetching available questions", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/available-years")
    public ResponseEntity<List<Integer>> getAvailableYears(@RequestParam String surveyTemplateId) {
        log.info("Available years requested for template: {}", surveyTemplateId);

        try {
            return ResponseEntity.ok(surveyReportService.getAvailableYears(surveyTemplateId));
        } catch (Exception e) {
            log.error("Error fetching available years", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSurveySummary(
            @RequestParam String surveyTemplateId,
            @RequestParam Integer year) {

        log.info("Survey summary requested for template: {} and year: {}", surveyTemplateId, year);

        try {
            Map<String, Object> summary = surveyReportService.getSurveySummary(surveyTemplateId, year);
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            log.error("Error generating survey summary", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

}
