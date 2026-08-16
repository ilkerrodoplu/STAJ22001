package com.survey.ai.controller;

import com.survey.ai.dto.*;
import com.survey.ai.dto.QuestionDTO;
import com.survey.ai.dto.QuestionReportDTO;
import com.survey.ai.dto.SurveyResponseDTO;
import com.survey.ai.entity.QuestionDefinition;
import com.survey.ai.entity.SurveyResponse;
import com.survey.ai.service.*;
import com.survey.ai.service.SurveyDataGenerator;
import com.survey.ai.service.SurveyService;
import jakarta.validation.Valid;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SurveyController {

    @Autowired
    private SurveyDataGenerator surveyDataGenerator;

    private final SurveyService surveyService;

    @PostConstruct
    public void init() {
        // Uygulama başladığında varsayılan soruları yükler
        surveyService.initializeDefaultQuestions();
    }

    @GetMapping("/feedback/questions")
    public ResponseEntity<List<QuestionDTO>> getAllQuestions() {
        List<QuestionDefinition> questions = surveyService.getAllActiveQuestions();

        List<QuestionDTO> questionDTOs = questions.stream()
                .map(q -> new QuestionDTO(q.getId(), q.getQuestionText(), q.getDisplayOrder()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(questionDTOs);
    }


    @PostMapping("/feedback")
    public ResponseEntity<SurveyResponse> submitSurveyResponse(@Valid @RequestBody SurveyResponseDTO responseDTO) {
        SurveyResponse savedResponse = surveyService.saveSurveyResponse(responseDTO);
        return new ResponseEntity<>(savedResponse, HttpStatus.CREATED);
    }

    @GetMapping("/questions")
    public ResponseEntity<List<QuestionDefinition>> getAllActiveQuestions() {
        return ResponseEntity.ok(surveyService.getAllActiveQuestions());
    }

    @PostMapping("/questions")
    public ResponseEntity<QuestionDefinition> createQuestion(@RequestBody QuestionDefinition question) {
        QuestionDefinition savedQuestion = surveyService.saveQuestion(question);
        return new ResponseEntity<>(savedQuestion, HttpStatus.CREATED);
    }

    @GetMapping("/reports/monthly/{questionId}")
    public ResponseEntity<QuestionReportDTO> getMonthlyReport(
            @PathVariable String questionId,
            @RequestParam(defaultValue = "2023") int year) {

        QuestionReportDTO report = surveyService.getMonthlyReportForQuestion(questionId, year);
        return ResponseEntity.ok(report);
    }

    @GetMapping("/reports/quarterly/{questionId}")
    public ResponseEntity<QuestionReportDTO> getQuarterlyReport(
            @PathVariable String questionId,
            @RequestParam(defaultValue = "2023") int year) {

        QuestionReportDTO report = surveyService.getQuarterlyReportForQuestion(questionId, year);
        return ResponseEntity.ok(report);
    }
    /*
 @GetMapping("/reports/quarterly")
    public ResponseEntity<QuestionReportDTO> getQuarterlyReports(
            @RequestParam(defaultValue = "2023") int year) {

        QuestionReportDTO report = surveyService.getQuarterlyReportsForAllQuestion(year);
        return ResponseEntity.ok(report);
    }

     */
    @GetMapping("/reports/yearly/{questionId}")
    public ResponseEntity<QuestionReportDTO> getYearlyReport(
            @PathVariable String questionId,
            @RequestParam(defaultValue = "2020") int startYear,
            @RequestParam(defaultValue = "2023") int endYear) {

        QuestionReportDTO report = surveyService.getYearlyReportForQuestion(questionId, startYear, endYear);
        return ResponseEntity.ok(report);
    }



    @GetMapping("/generate/{count}/{companyId}/{surveyTemplateId}")
    public String generateSurveys(@PathVariable int count,@PathVariable String companyId,@PathVariable String surveyTemplateId) {
        int generated = surveyDataGenerator.generateRandomSurveyResponses(count,companyId,surveyTemplateId);
        return String.format("%d adet rastgele anket yanıtı oluşturuldu ve veritabanına eklendi.", generated);
    }

}  