package com.survey.ai.service;


import com.survey.ai.dto.RatingEvaluation;
import com.survey.ai.dto.TableSentimentSummary;
import com.survey.ai.entity.Company;
import com.survey.ai.entity.SurveyResponse;
import com.survey.ai.entity.SurveyTemplate;
import com.survey.ai.exception.ResourceNotFoundException;
import com.survey.ai.repository.CompanyRepository;
import com.survey.ai.repository.SurveyResponseRepository;
import com.survey.ai.repository.SurveyTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SurveyResponseService {

    private final SurveyResponseRepository surveyResponseRepository;

    private final SurveyTemplateRepository surveyTemplateRepository;

    private final CompanyRepository companyRepository;

    private final KafkaTemplate<String, SurveyResponse> kafkaTemplate;

    private final SurveyNotificationService surveyNotificationService;


    /**
     * Anket yanıtını kaydeder. QR ile gelen katılımcı oturumsuzdur; bu yüzden
     * yanıtın hangi ankete ve şirkete yazılacağı istemciden değil şablondan
     * okunur. Aksi halde gövdeye başka bir companyId yazıp o şirketin
     * raporlarını kirletmek mümkün olurdu.
     */
   // @CacheEvict(value = "lastComments", key = "#response.getCompanyId() != null ? #response.getCompanyId() : 'default' + '-*'")
    public SurveyResponse saveSurveyResponse(SurveyResponse response) {
        SurveyTemplate template = surveyTemplateRepository
                .findById(response.getSurveyTemplateId() == null ? "" : response.getSurveyTemplateId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Anket", "id", response.getSurveyTemplateId()));

        // Anketin kendi askısının yanında şirket düzeyindeki yaptırım da geçerli:
        // dondurulmuş şirket veri toplamaya devam etmemeli.
        boolean companySuspended = companyRepository.findById(template.getCompanyId() == null
                        ? "" : template.getCompanyId())
                .map(Company::isSuspended)
                .orElse(false);

        if (Boolean.FALSE.equals(template.getActive()) || template.isSuspendedByAdmin() || companySuspended) {
            throw new IllegalStateException("Bu anket şu anda yanıt kabul etmiyor.");
        }

        sanitizeSubmission(response, template);
        applyRatingEvaluation(response);

         SurveyResponse savedResponse =  surveyResponseRepository.save(response);

        // Şirketin bildirimi anket doldurulur doldurulmaz düşer; duygu analizi
        // sonucu gelince aynı bildirim güncellenir. Bildirim yazılamazsa
        // müşterinin yanıtı kaybolmamalı.
        try {
            surveyNotificationService.saveResponseNotification(savedResponse);
        } catch (Exception e) {
            log.error("Anket bildirimi yazılamadı ({}): {}", savedResponse.getId(), e.getMessage());
        }


        // Yorumu olmayan yanıt da analize gider: yıldızlar da duygu taşır.
        sendSurveyResponseToKafka(savedResponse);

         return savedResponse;

    }

    /**
     * Gövdeden gelen yanıtta yalnızca katılımcının gerçekten doldurduğu alanlar
     * bırakılır; kalan her şey sunucu tarafından belirlenir.
     * <p>
     * Uç anonimdir ve gövde doğrudan entity'ye bağlanıyor. Temizlenmediğinde:
     * <ul>
     *   <li><b>id</b>: var olan bir yanıtın id'si gönderilirse Mongo {@code save()}
     *       üzerine yazıyordu - başka birinin yanıtı silinebiliyordu.</li>
     *   <li><b>sentiment / sentimentScore / ratingScore</b>: yıldız gönderilmezse
     *       {@link #applyRatingEvaluation} erken dönüyor ve istemcinin yazdığı
     *       duygu değeri olduğu gibi kaydediliyordu; raporlar zehirlenebiliyordu.
     *       Gerçek değer ya yıldızlardan ya da Kafka analizinden gelir.</li>
     *   <li><b>name / email</b>: anket artık kişisel bilgi sormuyor (alanlar
     *       {@code @Deprecated}); istemcinin buraya veri yazması için sebep yok.</li>
     * </ul>
     */
    private static void sanitizeSubmission(SurveyResponse response, SurveyTemplate template) {
        response.setId(null);
        response.setCompanyId(template.getCompanyId());
        response.setSurveyTemplateId(template.getId());
        response.setSubmissionDate(LocalDateTime.now());

        response.setSentiment(null);
        response.setSentimentScore(0);
        response.setRatingScore(null);

        response.setName(null);
        response.setEmail(null);
    }

    /**
     * Yıldızlı soruların puanını (15'lik skala) yazar ve duygu analizine katar.
     * Yorumu olmayan yanıtın duygusu şimdiye kadar hiç oluşmuyordu; artık puandan
     * geliyor. Yorumu olanlarda bu değer başlangıç durumudur, yorum analizi
     * (Kafka sonucu) gelince onun sonucu geçerli olur. Puan Kafka mesajında da
     * gider, böylece yorum analizi puanı hesaba katabilir.
     */
    static void applyRatingEvaluation(SurveyResponse response) {
        RatingEvaluation evaluation = RatingEvaluation.of(response.getRatings());
        if (evaluation == null) {
            return;
        }
        response.setRatingScore(evaluation.getScore());
        response.setSentiment(evaluation.getSentiment());
        response.setSentimentScore(evaluation.getScore() / RatingEvaluation.SCALE);
    }

    /**
     * Restorana ait tüm anket yanıtlarını getirir
     */
    public List<SurveyResponse> getResponsesByCompanyId(String companyId) {
        return surveyResponseRepository.findByCompanyId(companyId);
    }

    /**
     * Belirli bir tarih aralığındaki anket yanıtlarını getirir
     */
    public List<SurveyResponse> getResponsesByDateRange(String companyId, LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);
        return surveyResponseRepository.findByCompanyIdAndSubmissionDateBetween(companyId, start, end);
    }

    /**
     * Masa bazlı özet: her masa için yalnızca olumlu/olumsuz sayısı.
     * Yorumu olan yanıtlarda duygu analizi sonucu, olmayanlarda puan
     * ortalaması (>= 3 olumlu) belirleyicidir.
     */
    public List<TableSentimentSummary> getTableSentimentSummary(String companyId) {
        return surveyResponseRepository.findByCompanyIdAndTableNumberNotNull(companyId).stream()
                .collect(Collectors.groupingBy(SurveyResponse::getTableNumber, TreeMap::new, Collectors.toList()))
                .entrySet().stream()
                .map(entry -> new TableSentimentSummary(
                        entry.getKey(),
                        entry.getValue().stream().filter(r -> isPositive(r) == Boolean.TRUE).count(),
                        entry.getValue().stream().filter(r -> isPositive(r) == Boolean.FALSE).count(),
                        entry.getValue().size()))
                .toList();
    }

    /** Olumlu/olumsuz; karar verilemiyorsa (nötr ya da veri yok) null. */
    static Boolean isPositive(SurveyResponse response) {
        String sentiment = response.getSentiment();
        if (sentiment == null) {
            // Eski kayıtlarda duygu yok; puan varsa aynı eşiklerle değerlendirilir.
            RatingEvaluation evaluation = RatingEvaluation.of(response.getRatings());
            sentiment = evaluation == null ? null : evaluation.getSentiment();
        }
        if (sentiment == null) {
            return null;
        }
        return switch (sentiment.toLowerCase()) {
            case "positive" -> Boolean.TRUE;
            case "negative" -> Boolean.FALSE;
            default -> null;
        };
    }

    // MongoDB'den sentimentScore = 0 olan verileri çekme
    public List<SurveyResponse> getSurveyResponsesWithZeroSentimentScore() {
        return surveyResponseRepository.findBySentimentScore(0);
    }

    /** 1-5 yıldızın sözel karşılığı; duygu modeli sayıyı değil ifadeyi anlıyor. */
    private static final Map<Integer, String> STAR_LABELS = Map.of(
            1, "çok kötü", 2, "kötü", 3, "nötr", 4, "iyi", 5, "çok iyi");

    /**
     * Duygu analizine gönderilecek metin: her yıldızlı soru tek tek, puanın
     * sözel karşılığıyla ("Servis: çok iyi"), en sonda varsa serbest yorum.
     * Böylece model yalnızca yorumu değil, verilen puanları da değerlendirir.
     */
    static String analysisText(SurveyResponse response) {
        StringBuilder text = new StringBuilder();

        if (response.getRatings() != null) {
            // Sıra deterministik olsun diye soru metnine göre sıralanır.
            new TreeMap<>(response.getRatings()).forEach((question, stars) -> {
                String label = stars == null ? null : STAR_LABELS.get(stars);
                if (label != null) {
                    text.append(question).append(": ").append(label).append("\n");
                }
            });
        }

        if (response.getComment() != null && !response.getComment().isBlank()) {
            text.append(response.getComment().trim());
        }

        return text.toString().trim();
    }

    /**
     * Kafka'ya analiz için gönderir. Kayıttaki yorum bozulmasın diye mesaj kopya
     * üzerinden gider: comment alanına analiz metni yazılır, veritabanındaki
     * yanıt olduğu gibi kalır.
     */
    public void sendSurveyResponseToKafka(SurveyResponse response) {
        String text = analysisText(response);
        if (text.isBlank()) {
            return;
        }

        SurveyResponse message = new SurveyResponse();
        message.setId(response.getId());
        message.setCompanyId(response.getCompanyId());
        message.setSurveyTemplateId(response.getSurveyTemplateId());
        message.setRatings(response.getRatings());
        message.setRatingScore(response.getRatingScore());
        message.setComment(text);

        kafkaTemplate.send("customer-comments", message);
    }


}

