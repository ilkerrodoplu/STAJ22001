package com.survey.ai.controller;


import com.survey.ai.dto.TableSentimentSummary;
import com.survey.ai.entity.SurveyResponse;
import com.survey.ai.service.SurveyResponseService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/survey-responses")
public class SurveyResponseController {

    @Autowired
    private SurveyResponseService surveyResponseService;

    /**
     * @Valid şart: uç anonim ve gövde doğrudan entity'ye bağlanıyor. Olmadan
     * entity'deki uzunluk/zorunluluk kuralları hiç çalışmıyor, sınırsız boyutta
     * yorum kabul ediliyordu.
     */
    @PostMapping
    public ResponseEntity<SurveyResponse> submitSurveyResponse(@Valid @RequestBody SurveyResponse response) {

        return new ResponseEntity<>(surveyResponseService.saveSurveyResponse(response), HttpStatus.CREATED);
    }

    @GetMapping("/company/{companyId}")
    public ResponseEntity<List<SurveyResponse>> getResponsesBycompanyId(@PathVariable String companyId) {
        return ResponseEntity.ok(surveyResponseService.getResponsesByCompanyId(companyId));
    }

    @GetMapping("/company/{companyId}/date-range")
    public ResponseEntity<List<SurveyResponse>> getResponsesByDateRange(
            @PathVariable String companyId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(surveyResponseService.getResponsesByDateRange(companyId, startDate, endDate));
    }

    /** Masa bazlı özet: yalnızca olumlu/olumsuz sayıları, ayrıntı yok. */
    @GetMapping("/company/{companyId}/tables")
    public ResponseEntity<List<TableSentimentSummary>> getTableSummary(@PathVariable String companyId) {
        return ResponseEntity.ok(surveyResponseService.getTableSentimentSummary(companyId));
    }

    /**
     * Bakım ucu: tüm platformdaki duygu puanı 0 olan yanıtları yeniden analize
     * gönderir. Şirket ayrımı yapmadığı için yalnızca site admininde olmalı;
     * oturumu olan herkese açıkken sıradan bir çalışan bütün sistemin yanıtlarını
     * Kafka'ya yeniden bastırabiliyordu.
     */
    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping("/retry-sentiment-zero")
    public String retrySentimentZero() {
        List<SurveyResponse> responses = surveyResponseService.getSurveyResponsesWithZeroSentimentScore();

        if (responses.isEmpty()) {
            return "No responses found with sentimentScore = 0.";
        }

        for (SurveyResponse response : responses) {
            surveyResponseService.sendSurveyResponseToKafka(response);
        }

        return "Sentiment score 0 responses have been re-sent to Kafka.";
    }
}
