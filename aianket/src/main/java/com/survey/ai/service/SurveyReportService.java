package com.survey.ai.service;

import com.survey.ai.dto.ChoiceBreakdownDTO;
import com.survey.ai.dto.PaginatedCommentsResponse;
import com.survey.ai.dto.QuarterlyReportDTO;
import com.survey.ai.dto.QuestionAnalysisDTO;
import com.survey.ai.dto.RatingEvaluation;
import com.survey.ai.dto.RatingDistributionDTO;
import com.survey.ai.entity.Company;
import com.survey.ai.entity.SurveyQuestion;
import com.survey.ai.entity.SurveyResponse;
import com.survey.ai.entity.SurveyTemplate;
import com.survey.ai.repository.CompanyRepository;
import com.survey.ai.repository.SurveyResponseRepository;
import com.survey.ai.repository.SurveyTemplateRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
public class SurveyReportService {

    private final SurveyResponseRepository surveyResponseRepository;
    private final CompanyRepository companyRepository;
    private final SurveyTemplateRepository surveyTemplateRepository;

    public SurveyReportService(SurveyResponseRepository surveyRepo, CompanyRepository companyRepository,
                               SurveyTemplateRepository surveyTemplateRepository) {
        this.surveyResponseRepository = surveyRepo;
        this.companyRepository = companyRepository;
        this.surveyTemplateRepository = surveyTemplateRepository;
    }

    /**
     * Şirketsiz çağrı ARTIK tüm platformun yanıtlarını döndürmez. Eskiden
     * findAll() çalışıyordu: rapor uçlarında companyId opsiyonel olduğu için
     * herhangi bir şirketin çalışanı parametreyi silip bütün şirketlerin
     * ortalamalarını okuyabiliyordu. CompanyScopeInterceptor da companyId yoksa
     * hiç devreye girmiyor, yani tek koruma buydu.
     */
    public List<SurveyResponse> getAllResponses(String companyId) {
        if (companyId == null || companyId.isBlank()) {
            return List.of();
        }
        return surveyResponseRepository.findAllByCompanyId(companyId);
    }


    /**
     * Yorumlar ekranının kaynağı. Metin yazmayan müşterinin yanıtı da listelenir:
     * yalnızca yorumu olanlar süzüldüğünde doldurulan anketlerin çoğu ekranda hiç
     * görünmüyordu.
     */
    public List<SurveyResponse> getAllResponseWithSurveyTemplateId(String companyId,String surveyTemplateId) {
        if (companyId == null || companyId.isBlank()) {
            // Bkz. getAllResponses: şirketsiz çağrı tüm platformu döndürmez.
            return List.of();
        }else if(surveyTemplateId == null || surveyTemplateId.isBlank())
            return surveyResponseRepository.findAllByCompanyId(companyId);
        else {
            return surveyResponseRepository.findByCompanyIdAndSurveyTemplateId(companyId, surveyTemplateId);
        }
    }

 //   @Cacheable(value = "generalAverage", key = "#companyId != null ? #companyId : 'default'")
    public double getGeneralAverage(String companyId) {
        List<SurveyResponse> responses = getAllResponses(companyId);
        int total = 0, count = 0;
        for (SurveyResponse r : responses) {
            if (r.getRatings() != null) {
                for (Integer value : r.getRatings().values()) {
                    total += value;
                    count++;
                }
            }
        }
        return count == 0 ? 0 : ((double) total / count);
    }

  //  @Cacheable(value = "questionAverages", key = "#companyId != null ? #companyId : 'default'")
    public Map<String, Double> getAveragesPerQuestion(String companyId) {
        List<SurveyResponse> responses = getAllResponses(companyId);
        Map<String, Integer> totals = new HashMap<>();
        Map<String, Integer> counts = new HashMap<>();
        for (SurveyResponse r : responses) {
            if (r.getRatings() != null) {
                for (Map.Entry<String, Integer> e : r.getRatings().entrySet()) {
                    totals.merge(e.getKey(), e.getValue(), Integer::sum);
                    counts.merge(e.getKey(), 1, Integer::sum);
                }
            }
        }
        Map<String, Double> result = new HashMap<>();
        for (String k : totals.keySet()) {
            result.put(k, (double) totals.get(k) / counts.get(k));
        }
        return result;
    }

   // @Cacheable(value = "sentimentCounts", key = "#companyId != null ? #companyId : 'default'")
    public Map<String, Integer> getSentimentCounts(String companyId) {
        List<SurveyResponse> responses = getAllResponses(companyId);
        Map<String, Integer> counts = new HashMap<>();
        for (SurveyResponse r : responses) {
            String sentiment = r.getSentiment();
            if (sentiment != null && !sentiment.isBlank())
                counts.merge(sentiment, 1, Integer::sum);
        }
        return counts;
    }

 //   @Cacheable(value = "responsesPerDay", key = "#companyId != null ? #companyId : 'default'")
    public Map<String, Integer> getResponsesPerDay(String companyId) {
        List<SurveyResponse> responses = getAllResponses(companyId);
        Map<String, Integer> map = new TreeMap<>();
        for (SurveyResponse r : responses) {
            LocalDate date = null;
            if (r.getSubmissionDate() != null) {
                date = r.getSubmissionDate().toLocalDate();
            } else if (r.getVisitDate() != null) {
                date = r.getVisitDate();
            }
            if (date != null) {
                String dateStr = date.toString();
                map.merge(dateStr, 1, Integer::sum);
            }
        }
        return map;
    }

  //  @Cacheable(value = "lastComments", key = "#companyId != null ? #companyId : 'default' + '-' + #limit")
    public List<Map<String, Object>> getLastComments(String companyId,String surveyTemplateId, int limit) {
        List<SurveyResponse> responses = getAllResponseWithSurveyTemplateId(companyId, surveyTemplateId);
        Optional<Company> optionalCompany= companyRepository.findByid(companyId);
        Company company = new Company();
        if(optionalCompany.isPresent()){
            company = optionalCompany.get();
        }


        responses.sort(Comparator.comparing(SurveyResponse::getSubmissionDate, Comparator.nullsLast(Comparator.reverseOrder())));
        List<Map<String, Object>> comments = new ArrayList<>();
        for (int i = 0; i < Math.min(limit, responses.size()); i++) {
            comments.add(commentRow(responses.get(i), company.getName()));
        }
        return comments;
    }

    /**
     * Yorumlar ekranının satırı. Ad/e-posta gitmez: anket artık kişisel bilgi
     * sormuyor, ekranda herkes "Müşteri". Yıldızlar ve şıklar gider ki metin
     * yazmayan yanıtta da verilen cevaplar görülebilsin.
     */
    private static Map<String, Object> commentRow(SurveyResponse r, String companyName) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", r.getId());
        m.put("comment", r.getComment());
        m.put("date", r.getSubmissionDate());
        m.put("companyName", companyName);
        m.put("ratings", r.getRatings());
        m.put("choices", r.getChoices());
        m.put("tableNumber", r.getTableNumber());
        m.put("sentiment", r.getSentiment());
        m.put("sentimentScore", r.getSentimentScore());
        m.put("surveyTemplateId", r.getSurveyTemplateId());
        return m;
    }


    public List<QuarterlyReportDTO> getQuarterlyReport(String surveyTemplateId, Integer year) {
        log.info("Generating quarterly report for template: {} and year: {}", surveyTemplateId, year);

        List<QuarterlyReportDTO> quarterlyData = new ArrayList<>();

        // Her çeyrek dönem için veri oluştur
        for (int quarter = 1; quarter <= 4; quarter++) {
            LocalDate startDate = LocalDate.of(year, (quarter - 1) * 3 + 1, 1);
            LocalDate endDate = startDate.plusMonths(3).minusDays(1);

            Date start = Date.from(startDate.atStartOfDay(ZoneId.systemDefault()).toInstant());
            Date end = Date.from(endDate.atTime(LocalTime.MAX).atZone(ZoneId.systemDefault()).toInstant());

            List<SurveyResponse> responses = surveyResponseRepository
                    .findBySurveyTemplateIdAndSubmissionDateBetween(surveyTemplateId, start, end);

            QuarterlyReportDTO quarterData = new QuarterlyReportDTO();
            quarterData.setQuarter("Q" + quarter + " " + year);
            quarterData.setTotalResponses((long) responses.size());

            if (!responses.isEmpty()) {
                // Ortalama rating hesapla (tüm soruların ortalaması)
                // Yalnızca şıklı sorulardan oluşan ankette ratings null gelir.
                double avgRating = responses.stream()
                        .filter(response -> response.getRatings() != null)
                        .flatMap(response -> response.getRatings().values().stream())
                        .filter(Objects::nonNull)
                        .mapToDouble(Integer::doubleValue)
                        .average()
                        .orElse(0.0);

                quarterData.setAverageRating(Math.round(avgRating * 100.0) / 100.0);

                // Sentiment analizi
                long positive = responses.stream()
                        .filter(r -> "positive".equals(r.getSentiment()))
                        .count();

                long negative = responses.stream()
                        .filter(r -> "negative".equals(r.getSentiment()))
                        .count();

                long neutral = responses.size() - positive - negative;

                quarterData.setPositiveResponses(positive);
                quarterData.setNegativeResponses(negative);
                quarterData.setNeutralResponses(neutral);
            } else {
                quarterData.setAverageRating(0.0);
                quarterData.setPositiveResponses(0L);
                quarterData.setNegativeResponses(0L);
                quarterData.setNeutralResponses(0L);
            }

            quarterlyData.add(quarterData);
        }

        return quarterlyData;
    }

    public List<QuestionAnalysisDTO> getQuestionAnalysis(String surveyTemplateId, Integer year, String questionText) {
        log.info("Generating question analysis for: {}", questionText);

        LocalDate startDate = LocalDate.of(year, 1, 1);
        LocalDate endDate = LocalDate.of(year, 12, 31);

        Date start = Date.from(startDate.atStartOfDay(ZoneId.systemDefault()).toInstant());
        Date end = Date.from(endDate.atTime(LocalTime.MAX).atZone(ZoneId.systemDefault()).toInstant());

        List<SurveyResponse> responses = surveyResponseRepository
                .findBySurveyTemplateIdAndSubmissionDateBetween(surveyTemplateId, start, end);

        List<QuestionAnalysisDTO> monthlyAnalysis = new ArrayList<>();

        // Aylık analiz
        for (int month = 1; month <= 12; month++) {
            LocalDate monthStart = LocalDate.of(year, month, 1);
            LocalDate monthEnd = monthStart.with(TemporalAdjusters.lastDayOfMonth());

            // LocalDate'leri LocalDateTime'a çeviriyoruz
            LocalDateTime monthStartDateTime = monthStart.atStartOfDay(); // 00:00:00
            LocalDateTime monthEndDateTime = monthEnd.atTime(LocalTime.MAX); // 23:59:59.999999999

            // Eğer Date nesnelerine ihtiyaç duyuyorsanız (başka amaçlar için):
            Date monthStartDate = Date.from(monthStartDateTime.atZone(ZoneId.systemDefault()).toInstant());
            Date monthEndDate = Date.from(monthEndDateTime.atZone(ZoneId.systemDefault()).toInstant());

            // Filtreleme işlemi - artık LocalDateTime ile karşılaştırma yapıyoruz
            List<SurveyResponse> monthlyResponses = responses.stream()
                    .filter(r -> r.getSubmissionDate().isAfter(monthStartDateTime) &&
                            r.getSubmissionDate().isBefore(monthEndDateTime))
                    .collect(Collectors.toList());

            // Bu soruya ait rating'leri topla
            List<Integer> questionRatings = monthlyResponses.stream()
                    .filter(response -> response.getRatings() != null
                            && response.getRatings().containsKey(questionText))
                    .map(response -> response.getRatings().get(questionText))
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());

            QuestionAnalysisDTO analysis = new QuestionAnalysisDTO();
            analysis.setQuestionText(questionText);
            analysis.setPeriod(monthStart.format(DateTimeFormatter.ofPattern("yyyy-MM")));
            analysis.setResponseCount((long) questionRatings.size());

            if (!questionRatings.isEmpty()) {
                double avgRating = questionRatings.stream()
                        .mapToInt(Integer::intValue)
                        .average()
                        .orElse(0.0);
                analysis.setAverageRating(Math.round(avgRating * 100.0) / 100.0);

                // Rating dağılımı
                Map<Integer, Long> ratingCounts = questionRatings.stream()
                        .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));

                List<RatingDistributionDTO> distribution = ratingCounts.entrySet().stream()
                        .map(entry -> new RatingDistributionDTO(entry.getKey(), entry.getValue()))
                        .sorted(Comparator.comparing(RatingDistributionDTO::getRating))
                        .collect(Collectors.toList());

                analysis.setRatingDistribution(distribution);
            } else {
                analysis.setAverageRating(0.0);
                analysis.setRatingDistribution(new ArrayList<>());
            }

            monthlyAnalysis.add(analysis);
        }

        return monthlyAnalysis;
    }

    /**
     * Şıklı soruların şık dağılımı: hangi seçenek ne kadar tercih edilmiş.
     * Yeni yanıtlarda choices alanı (soru metni -> seçilen şık) kullanılır; bu alan
     * eklenmeden önceki yanıtlarda şık yoruma yazıldığı için oradan geri okunur.
     */
    public List<ChoiceBreakdownDTO> getChoiceBreakdown(String surveyTemplateId, Integer year) {
        LocalDate startDate = LocalDate.of(year, 1, 1);
        LocalDate endDate = LocalDate.of(year, 12, 31);

        Date start = Date.from(startDate.atStartOfDay(ZoneId.systemDefault()).toInstant());
        Date end = Date.from(endDate.atTime(LocalTime.MAX).atZone(ZoneId.systemDefault()).toInstant());

        List<SurveyResponse> responses = surveyResponseRepository
                .findBySurveyTemplateIdAndSubmissionDateBetween(surveyTemplateId, start, end);

        Map<String, Set<String>> choiceQuestions = choiceQuestions(surveyTemplateId);

        // Soru metni -> (şık -> sayı). Soru sırası ilk görüldüğü hâliyle korunur.
        Map<String, Map<String, Long>> byQuestion = new LinkedHashMap<>();
        responses.forEach(response -> answeredChoices(response, choiceQuestions)
                .forEach((question, choice) -> {
                    if (choice == null || choice.isBlank()) {
                        return;
                    }
                    byQuestion.computeIfAbsent(question, key -> new HashMap<>())
                            .merge(choice, 1L, Long::sum);
                }));

        return byQuestion.entrySet().stream().map(entry -> {
            long total = entry.getValue().values().stream().mapToLong(Long::longValue).sum();
            List<ChoiceBreakdownDTO.ChoiceCount> options = entry.getValue().entrySet().stream()
                    .map(option -> new ChoiceBreakdownDTO.ChoiceCount(option.getKey(), option.getValue(),
                            Math.round(option.getValue() * 1000.0 / total) / 10.0))
                    .sorted(Comparator.comparingLong(ChoiceBreakdownDTO.ChoiceCount::getCount).reversed()
                            .thenComparing(ChoiceBreakdownDTO.ChoiceCount::getOption))
                    .toList();
            return new ChoiceBreakdownDTO(entry.getKey(), total, options);
        }).toList();
    }

    /** Şablondaki şıklı sorular: soru metni -> geçerli şıklar. */
    private Map<String, Set<String>> choiceQuestions(String surveyTemplateId) {
        return surveyTemplateRepository.findById(surveyTemplateId)
                .map(SurveyTemplate::getQuestions)
                .orElseGet(List::of).stream()
                .filter(question -> "MULTIPLE_CHOICE".equals(question.getType()) && question.getText() != null)
                .collect(Collectors.toMap(
                        SurveyQuestion::getText,
                        question -> question.getOptions() == null
                                ? Set.<String>of() : new HashSet<>(question.getOptions()),
                        (first, second) -> first,
                        LinkedHashMap::new));
    }

    /** Yanıtın şıkları: yeni kayıtlarda choices alanı, eskilerde yorum satırları. */
    private static Map<String, String> answeredChoices(SurveyResponse response,
                                                       Map<String, Set<String>> choiceQuestions) {
        if (response.getChoices() != null && !response.getChoices().isEmpty()) {
            return response.getChoices();
        }
        return choicesFromComment(response.getComment(), choiceQuestions);
    }

    /**
     * choices alanı yokken şıklar yoruma "Soru metni: Seçilen şık" satırı olarak
     * yazılıyordu. Eski raporlar boş çıkmasın diye o satırlar geri okunur; yalnızca
     * şablondaki şıklardan biriyle eşleşen değer sayılır, böylece iki nokta içeren
     * serbest metin yanıtları yanlışlıkla şık sayılmaz.
     */
    private static Map<String, String> choicesFromComment(String comment,
                                                          Map<String, Set<String>> choiceQuestions) {
        if (comment == null || comment.isBlank() || choiceQuestions.isEmpty()) {
            return Map.of();
        }

        Map<String, String> found = new LinkedHashMap<>();
        for (String line : comment.split("\\R")) {
            String trimmed = line.trim();
            for (Map.Entry<String, Set<String>> question : choiceQuestions.entrySet()) {
                String prefix = question.getKey() + ":";
                if (trimmed.startsWith(prefix)) {
                    String choice = trimmed.substring(prefix.length()).trim();
                    if (question.getValue().contains(choice)) {
                        found.put(question.getKey(), choice);
                    }
                    break;
                }
            }
        }
        return found;
    }

    public Set<String> getAvailableQuestions(String surveyTemplateId) {
        log.info("Fetching available questions for template: {}", surveyTemplateId);

        List<SurveyResponse> responses = surveyResponseRepository.findBySurveyTemplateId(surveyTemplateId);

        return responses.stream()
                .filter(response -> response.getRatings() != null)
                .flatMap(response -> response.getRatings().keySet().stream())
                .collect(Collectors.toSet());
    }

    /**
     * Şablonun yanıt aldığı yıllar (yeniden eskiye). Rapor ekranındaki yıl listesi
     * elle yazılmak yerine buradan gelir; yanıt yoksa içinde bulunulan yıl döner.
     */
    public List<Integer> getAvailableYears(String surveyTemplateId) {
        List<Integer> years = surveyResponseRepository.findBySurveyTemplateId(surveyTemplateId).stream()
                .map(SurveyResponse::getSubmissionDate)
                .filter(Objects::nonNull)
                .map(LocalDateTime::getYear)
                .distinct()
                .sorted(Comparator.reverseOrder())
                .collect(Collectors.toList());

        return years.isEmpty() ? List.of(LocalDate.now().getYear()) : years;
    }

    public Map<String, Object> getSurveySummary(String surveyTemplateId, Integer year) {
        log.info("Generating summary for template: {} and year: {}", surveyTemplateId, year);

        LocalDate startDate = LocalDate.of(year, 1, 1);
        LocalDate endDate = LocalDate.of(year, 12, 31);

        Date start = Date.from(startDate.atStartOfDay(ZoneId.systemDefault()).toInstant());
        Date end = Date.from(endDate.atTime(LocalTime.MAX).atZone(ZoneId.systemDefault()).toInstant());

        List<SurveyResponse> responses = surveyResponseRepository
                .findBySurveyTemplateIdAndSubmissionDateBetween(surveyTemplateId, start, end);

        Map<String, Object> summary = new HashMap<>();

        // Temel istatistikler
        summary.put("totalResponses", responses.size());

        // Sentiment dağılımı
        Map<String, Long> sentimentCount = responses.stream()
                .filter(r -> r.getSentiment() != null)
                .collect(Collectors.groupingBy(SurveyResponse::getSentiment, Collectors.counting()));

        summary.put("sentimentAnalysis", sentimentCount);

        // Aylık yanıt sayıları
        Map<String, Long> monthlyResponses = responses.stream()
                .collect(Collectors.groupingBy(
                        response -> {
                            LocalDate date = response.getSubmissionDate().toInstant(ZoneOffset.MAX).atZone(ZoneId.systemDefault()).toLocalDate();
                            return date.format(DateTimeFormatter.ofPattern("yyyy-MM"));
                        },
                        Collectors.counting()
                ));

        summary.put("monthlyResponses", monthlyResponses);

        // Genel ortalama rating
        if (!responses.isEmpty()) {
            double overallAverage = responses.stream()
                    .filter(r -> r.getRatings() != null)
                    .flatMap(response -> response.getRatings().values().stream())
                    .filter(Objects::nonNull)
                    .mapToDouble(Integer::doubleValue)
                    .average()
                    .orElse(0.0);

            summary.put("overallAverageRating", Math.round(overallAverage * 100.0) / 100.0);
        } else {
            summary.put("overallAverageRating", 0.0);
        }

        // Yıldızlı soruların 15'lik skaladaki puanı ve karşılığı (Kötü/Ortalama/Mükemmel).
        List<RatingEvaluation> evaluations = responses.stream()
                .map(response -> RatingEvaluation.of(response.getRatings()))
                .filter(Objects::nonNull)
                .toList();

        if (!evaluations.isEmpty()) {
            double average = evaluations.stream().mapToDouble(RatingEvaluation::getScore).average().orElse(0);
            RatingEvaluation overall = RatingEvaluation.of(Math.round(average * 10) / 10.0);
            summary.put("ratingScore", overall.getScore());
            summary.put("ratingScale", RatingEvaluation.SCALE);
            summary.put("ratingLabel", overall.getLabel());
            summary.put("ratingSentiment", overall.getSentiment());
        }

        return summary;
    }

    public PaginatedCommentsResponse getLastCommentsWithPage(String companyId, String surveyTemplateId, int page, int size) {
        List<SurveyResponse> responses = getAllResponseWithSurveyTemplateId(companyId, surveyTemplateId);
        Optional<Company> optionalCompany = companyRepository.findByid(companyId);
        Company company = new Company();
        if(optionalCompany.isPresent()){
            company = optionalCompany.get();
        }

        // Tarihe göre sırala
        responses.sort(Comparator.comparing(SurveyResponse::getSubmissionDate,
                Comparator.nullsLast(Comparator.reverseOrder())));

        // Toplam sayı
        int totalElements = responses.size();
        int totalPages = (int) Math.ceil((double) totalElements / size);

        // Sayfalama için başlangıç ve bitiş indexleri
        int startIndex = page * size;
        int endIndex = Math.min(startIndex + size, responses.size());

        // Bu sayfanın verilerini al
        List<SurveyResponse> paginatedResponses = responses.subList(startIndex, endIndex);

        List<Map<String, Object>> comments = new ArrayList<>();
        for (SurveyResponse r : paginatedResponses) {
            comments.add(commentRow(r, company.getName()));
        }

        // Pagination response oluştur
        PaginatedCommentsResponse response = new PaginatedCommentsResponse();
        response.setContent(comments);
        response.setTotalPages(totalPages);
        response.setTotalElements(totalElements);
        response.setCurrentPage(page);
        response.setSize(size);
        response.setHasNext(page < totalPages - 1);
        response.setHasPrevious(page > 0);

        return response;

    }
}