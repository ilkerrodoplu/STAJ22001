package com.survey.ai.service;


import com.survey.ai.dto.*;
import com.survey.ai.dto.PeriodRatingDTO;
import com.survey.ai.dto.QuestionReportDTO;
import com.survey.ai.dto.SurveyResponseDTO;
import com.survey.ai.entity.QuestionDefinition;
import com.survey.ai.entity.SurveyResponse;
import com.survey.ai.repository.QuestionDefinitionRepository;
import com.survey.ai.repository.SurveyResponseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SurveyService {

    private final SurveyResponseRepository surveyResponseRepository;
    private final QuestionDefinitionRepository questionDefinitionRepository;


    /**
     * Varsayılan soruları veritabanına ekler (uygulama ilk çalıştığında)
     */
    public void initializeDefaultQuestions() {
        // Veritabanında hiç soru yoksa, varsayılan soruları ekle
        if (questionDefinitionRepository.count() == 0) {
            List<QuestionDefinition> defaultQuestions = java.util.Arrays.asList(
                    new QuestionDefinition(null, "Restoranın genel temizliğini nasıl değerlendirirsiniz?", "temizlik", 1, true),
                    new QuestionDefinition(null, "Sipariş sürecinde personelin tutumu nasıldı?", "hizmet", 2, true),
                    new QuestionDefinition(null, "Yemeklerin lezzeti beklentilerinizi karşıladı mı?", "yemek", 3, true),
                    new QuestionDefinition(null, "Servis hızı nasıldı?", "hizmet", 4, true),
                    new QuestionDefinition(null, "Yemeklerin sunumu ve görünümü nasıldı?", "yemek", 5, true),
                    new QuestionDefinition(null, "Fiyat-performans oranını nasıl değerlendirirsiniz?", "değer", 6, true),
                    new QuestionDefinition(null, "Restoranın ambiyansı/atmosferi nasıldı?", "ambiyans", 7, true),
                    new QuestionDefinition(null, "Menü çeşitliliği yeterli miydi?", "menü", 8, true),
                    new QuestionDefinition(null, "Restoranın konumu ve ulaşılabilirliği nasıldı?", "konum", 9, true),
                    new QuestionDefinition(null, "Tekrar ziyaret etme olasılığınız nedir?", "genel", 10, true)
            );

            questionDefinitionRepository.saveAll(defaultQuestions);
        }
    }

    /**
     * Aktif tüm soruları sıralı şekilde getirir
     */
    public List<QuestionDefinition> getAllActiveQuestions() {
        return questionDefinitionRepository.findByActiveOrderByDisplayOrderAsc(true);
    }

    /**
     * Yeni bir anket cevabı kaydeder
     */
    public SurveyResponse saveSurveyResponse(SurveyResponseDTO responseDTO) {
        SurveyResponse response = new SurveyResponse();
        response.setCompanyId(responseDTO.getCompanyId());
        response.setName(responseDTO.getName());
        response.setComment(responseDTO.getComment());
        response.setRatings(responseDTO.getRatings());
        response.setEmail(responseDTO.getEmail());
        response.setSubmissionDate(LocalDateTime.now());

        return surveyResponseRepository.save(response);
    }

    /**
     * Belirtilen soru için aylık raporlama
     */
    public QuestionReportDTO getMonthlyReportForQuestion(String questionId, int year) {
        QuestionDefinition question = findQuestionById(questionId);

        List<PeriodRatingDTO> monthlyRatings = new ArrayList<>();

        // Yılın her ayı için ortalama derecelendirmeleri hesapla
        for (int month = 1; month <= 12; month++) {
            YearMonth yearMonth = YearMonth.of(year, month);
            LocalDateTime startOfMonth = yearMonth.atDay(1).atStartOfDay();
            LocalDateTime endOfMonth = yearMonth.atEndOfMonth().atTime(23, 59, 59);

            PeriodRatingDTO monthRating = calculateAverageRatingForPeriod(
                    questionId,
                    startOfMonth,
                    endOfMonth,
                    yearMonth.format(DateTimeFormatter.ofPattern("yyyy-MM"))
            );

            monthlyRatings.add(monthRating);
        }

        return new QuestionReportDTO(questionId, question.getQuestionText(), question.getCategory(), monthlyRatings);
    }

    /**
     * Belirtilen soru için çeyrek yıl raporlama
     */
    public QuestionReportDTO getQuarterlyReportForQuestion(String questionId, int year) {
        QuestionDefinition question = findQuestionById(questionId);

        List<PeriodRatingDTO> quarterlyRatings = new ArrayList<>();

        // Yılın her çeyreği için ortalama derecelendirmeleri hesapla
        for (int quarter = 1; quarter <= 4; quarter++) {
            int startMonth = (quarter - 1) * 3 + 1;

            LocalDateTime startOfQuarter = LocalDate.of(year, startMonth, 1).atStartOfDay();
            LocalDateTime endOfQuarter = YearMonth.of(year, startMonth + 2).atEndOfMonth().atTime(23, 59, 59);

            PeriodRatingDTO quarterRating = calculateAverageRatingForPeriod(
                    questionId,
                    startOfQuarter,
                    endOfQuarter,
                    year + "-Q" + quarter
            );

            quarterlyRatings.add(quarterRating);
        }

        return new QuestionReportDTO(questionId, question.getQuestionText(), question.getCategory(), quarterlyRatings);
    }

    /**
     * Belirtilen soru için yıllık raporlama
     */
    public QuestionReportDTO getYearlyReportForQuestion(String questionId, int startYear, int endYear) {
        QuestionDefinition question = findQuestionById(questionId);

        List<PeriodRatingDTO> yearlyRatings = new ArrayList<>();

        // Belirtilen yıl aralığı için ortalama derecelendirmeleri hesapla
        for (int year = startYear; year <= endYear; year++) {
            LocalDateTime startOfYear = LocalDate.of(year, 1, 1).atStartOfDay();
            LocalDateTime endOfYear = LocalDate.of(year, 12, 31).atTime(23, 59, 59);

            PeriodRatingDTO yearRating = calculateAverageRatingForPeriod(
                    questionId,
                    startOfYear,
                    endOfYear,
                    String.valueOf(year)
            );

            yearlyRatings.add(yearRating);
        }

        return new QuestionReportDTO(questionId, question.getQuestionText(), question.getCategory(), yearlyRatings);
    }

    /**
     * Belirli bir dönem için ortalama derecelendirmeyi hesaplar
     */
    private PeriodRatingDTO calculateAverageRatingForPeriod(
            String questionId, LocalDateTime start, LocalDateTime end, String periodLabel) {

        List<SurveyResponse> responses = surveyResponseRepository
                .findRatingsForQuestionInPeriod(questionId, start, end);

        if (responses.isEmpty()) {
            return new PeriodRatingDTO(periodLabel, 0.0, 0L);
        }

        // Yalnızca bu soruya yanıt içeren yanıtları filtrele ve derecelendirmeleri çıkar
        List<Integer> ratings = new ArrayList<>();

        for (SurveyResponse response : responses) {
            java.util.Map<String, Integer> ratingsMap = response.getRatings();
            if (ratingsMap != null && ratingsMap.containsKey(questionId)) {
                ratings.add(ratingsMap.get(questionId));
            }
        }

        double averageRating = 0.0;
        if (!ratings.isEmpty()) {
            int sum = 0;
            for (Integer rating : ratings) {
                sum += rating;
            }
            averageRating = (double) sum / ratings.size();
        }

        return new PeriodRatingDTO(periodLabel, averageRating, (long) ratings.size());
    }

    /**
     * ID'ye göre soru tanımını bulur, bulamazsa hata fırlatır
     */
    private QuestionDefinition findQuestionById(String questionId) {
        return questionDefinitionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Soru bulunamadı: " + questionId));
    }


    /**
     * Yeni bir soru tanımı kaydeder
     */
    public QuestionDefinition saveQuestion(QuestionDefinition question) {
        return questionDefinitionRepository.save(question);
    }
/*
    public List<QuestionReportDTO> getMonthlyReportsForAllQuestion(int year) {
        List<QuestionDefinition> questions = questionDefinitionRepository.findByActive(true);

        List<PeriodRatingDTO> monthlyRatings = new ArrayList<>();
        List<QuestionReportDTO> questionReportDTOS = new ArrayList<>();
        // Yılın her ayı için ortalama derecelendirmeleri hesapla
        for (QuestionDefinition q : questions){
              for (int month = 1; month <= 12; month++) {
            YearMonth yearMonth = YearMonth.of(year, month);
            LocalDateTime startOfMonth = yearMonth.atDay(1).atStartOfDay();
            LocalDateTime endOfMonth = yearMonth.atEndOfMonth().atTime(23, 59, 59);

            PeriodRatingDTO monthRating = calculateAverageRatingForPeriod(
                    questionId,
                    startOfMonth,
                    endOfMonth,
                    yearMonth.format(DateTimeFormatter.ofPattern("yyyy-MM"))
            );

            monthlyRatings.add(monthRating);
            questionReportDTOS.add(new QuestionReportDTO(q.getId, q.getQuestionText(), q.getCategory(), monthlyRatings));
        }

      }

        return questionReportDTOS;
    }*/
}