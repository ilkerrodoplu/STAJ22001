package com.survey.ai.service;

import com.survey.ai.entity.Company;
import com.survey.ai.entity.SurveyNotification;
import com.survey.ai.entity.SurveyResponse;
import com.survey.ai.entity.SurveyTemplate;
import com.survey.ai.entity.User;
import com.survey.ai.enums.UserRole;
import com.survey.ai.exception.ResourceNotFoundException;
import com.survey.ai.repository.CompanyRepository;
import com.survey.ai.repository.SurveyNotificationRepository;
import com.survey.ai.repository.SurveyTemplateRepository;
import com.survey.ai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SurveyNotificationService {

    private final SurveyNotificationRepository notificationRepository;

    private final SurveyTemplateRepository surveyTemplateRepository;

    private final CompanyRepository companyRepository;

    private final UserRepository userRepository;

    private final EmailService emailService;

    private final SecurityService securityService;

    /**
     * Olumsuz yanıt şirket sahibinin gelen kutusuna da düşer. Panel bildirimi her
     * yanıt için yazılıyor; e-posta yalnızca müdahale gerektiren yanıt için gider,
     * yoksa memnun müşteri trafiği kutuyu doldurur ve uyarı değerini yitirir.
     * <p>
     * Yalnızca duygu analizi sonucundan (Kafka) çağrılır: yanıt kaydedilirken duygu
     * puandan geliyor, yorumun kendisi ancak analizden sonra biliniyor. Kayıt anında
     * bakıldığında 9/15 puanlı ama yorumu ağır bir yanıt "neutral" sayılıp e-posta
     * hiç gitmiyordu. Tek çağrı yeri olması aynı yanıt için iki e-posta gitmesini
     * de engelliyor.
     */
    // ponytail: yanıt başına tek e-posta; günde onlarca olumsuz yanıt alan
    // şirketlerde günlük özete çevirmek gerekir.
    public void emailOwnerOnNegative(SurveyResponse response) {
        if (!"negative".equalsIgnoreCase(response.getSentiment()) || response.getCompanyId() == null) {
            return;
        }
        try {
            String companyName = companyRepository.findById(response.getCompanyId())
                    .map(Company::getName).orElse("Şirketiniz");
            String surveyName = surveyTemplateRepository.findById(
                            response.getSurveyTemplateId() == null ? "" : response.getSurveyTemplateId())
                    .map(SurveyTemplate::getName).orElse("Anketiniz");

            userRepository.findByCompanyIdAndRole(response.getCompanyId(), UserRole.COMPANY_OWNER.name())
                    .stream().findFirst()
                    .ifPresent(owner -> emailService.sendNewResponseNotification(
                            owner.getEmail(), owner.getName(), companyName, surveyName));
        } catch (Exception e) {
            log.error("Olumsuz yanıt e-postası gönderilemedi ({}): {}", response.getId(), e.getMessage());
        }
    }

    // 🔔 Ana method - Filtreleme ve pagination ile
    public Page<SurveyNotification> getNotifications(String companyId, int page, int size,
                                                     String type, String status) {
        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "createdAt"));

        // Status filtreleme
        if ("unread".equals(status)) {
            return notificationRepository.findByCompanyIdAndIsReadFalse(companyId, pageable);
        } else if ("read".equals(status)) {
            return notificationRepository.findByCompanyIdAndIsReadTrue(companyId, pageable);
        }

        // Type filtreleme (sentiment tabanlı)
        if (type != null && !type.isEmpty()) {
            return notificationRepository.findByCompanyIdAndSentiment(companyId, type, pageable);
        }

        // Tümü
        return notificationRepository.findByCompanyId(companyId, pageable);
    }

    public List<SurveyNotification> getNotificationsByCompany(String companyId) {
        return notificationRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);
    }

    public Page<SurveyNotification> getNotificationsByCompany(String companyId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return notificationRepository.findByCompanyId(companyId, pageable);
    }

    public List<SurveyNotification> getUnreadNotifications(String companyId) {
        return notificationRepository.findByCompanyIdAndIsReadFalseOrderByCreatedAtDesc(companyId);
    }

    public long getUnreadNotificationCount(String companyId) {
        return notificationRepository.countByCompanyIdAndIsReadFalse(companyId);
    }

    public SurveyNotification markAsRead(String notificationId) {
        SurveyNotification notification = requireOwnNotification(notificationId);

        notification.setRead(true); // ✅ setRead() method'u kullan
        notification.setReadAt(LocalDateTime.now());
        return notificationRepository.save(notification);
    }

    public void markAllAsRead(String companyId) {
        // ❌ Hatalı method adını düzelt ve List kullan
        List<SurveyNotification> unreadNotifications =
                notificationRepository.findByCompanyIdAndIsReadFalseOrderByCreatedAtDesc(companyId);

        unreadNotifications.forEach(notification -> {
            notification.setRead(true); // ✅ setRead() method'u kullan
            notification.setReadAt(LocalDateTime.now());
        });

        notificationRepository.saveAll(unreadNotifications);
    }

    public void deleteNotification(String notificationId) {
        notificationRepository.delete(requireOwnNotification(notificationId));
    }

    /**
     * Bildirimi bulur ve oturumdaki kullanıcının şirketine ait olduğunu doğrular.
     * <p>
     * Uçlar bildirimi {@code notificationId} ile alıyor, {@code companyId} ile
     * değil; bu yüzden CompanyScopeInterceptor devreye girmiyor ve tek koruma
     * burasıdır. Kontrol yokken herhangi bir şirketin kullanıcısı, id'sini
     * bildiği başka bir şirketin bildirimini okundu yapabiliyor ya da
     * silebiliyordu. Site admini muaftır (tüm şirketleri denetler).
     */
    private SurveyNotification requireOwnNotification(String notificationId) {
        SurveyNotification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Bildirim", "id", notificationId));

        if (securityService.isCurrentUserAdmin()) {
            return notification;
        }

        String ownCompanyId = securityService.getCurrentUserCompanyId();
        if (ownCompanyId == null || !ownCompanyId.equals(notification.getCompanyId())) {
            log.warn("Sirket disi bildirim erisimi engellendi: bildirim={}, kullanicinin sirketi={}",
                    notificationId, ownCompanyId);
            throw new AccessDeniedException("Bu bildirime erişim yetkiniz yok");
        }

        return notification;
    }

    public List<SurveyNotification> getNotificationsBySentiment(String companyId, String sentiment) {
        return notificationRepository.findByCompanyIdAndSentimentOrderByCreatedAtDesc(companyId, sentiment);
    }

    /**
     * Şirketin zil ikonuna düşen sistem bildirimi (anket uyarısı, askı, süper
     * admin mesajı). Bunlar şimdiye kadar yalnızca e-posta ve sayfa içinde
     * görünüyordu; e-posta gitmediğinde şirket olan bitenden habersiz kalıyordu.
     * Bildirim yazılamazsa asıl işlem (uyarı/askı) iptal olmamalı.
     */
    public void notifyCompany(String companyId, String title, String message, String actionUrl) {
        if (companyId == null) {
            return;
        }
        try {
            SurveyNotification notification =
                    SurveyNotification.createSystemNotification(companyId, title, message);
            notification.setActionUrl(actionUrl);
            notificationRepository.save(notification);
        } catch (Exception e) {
            log.error("Panel bildirimi yazılamadı ({}): {}", companyId, e.getMessage());
        }
    }

    /** Şirkete katılma isteği sahibin zil bildirimine düşer; çalışan boşuna beklemesin. */
    public void notifyJoinRequest(String companyId, User user) {
        notifyCompany(companyId, "Şirkete katılma isteği: " + user.getFullName(),
                user.getFullName() + " (" + user.getEmail() + ") şirketinize katılmak istiyor; onayınızı bekliyor.",
                "/admin/employees");
    }

    // 📝 Yeni bildirim oluştur
    public SurveyNotification createNotification(SurveyNotification notification) {
        notification.setCreatedAt(LocalDateTime.now());
        return notificationRepository.save(notification);
    }

    /**
     * Bir anket yanıtının bildirimi. Yanıt başına tek kayıt tutulur: bildirim
     * yanıt kaydedilirken oluşur (puanlardan gelen duyguyla), duygu analizi
     * sonucu Kafka'dan döndüğünde aynı kayıt güncellenir. Önceden bildirim
     * yalnızca Kafka sonucunda ve yalnızca yorum yazılmışsa oluşuyordu; bu
     * yüzden yorum yazmayan müşterinin anketi şirkete hiç düşmüyordu.
     */
    public SurveyNotification saveResponseNotification(SurveyResponse surveyResponse) {
        SurveyNotification notification = notificationRepository
                .findBySurveyResponseId(surveyResponse.getId())
                .orElseGet(() -> {
                    SurveyNotification fresh = new SurveyNotification();
                    fresh.setSurveyResponseId(surveyResponse.getId());
                    fresh.setCreatedAt(LocalDateTime.now());
                    return fresh;
                });

        boolean hasComment = surveyResponse.getComment() != null
                && !surveyResponse.getComment().isBlank();

        notification.setCompanyId(surveyResponse.getCompanyId());
        notification.setSurveyTemplateId(surveyResponse.getSurveyTemplateId());
        notification.setTitle(hasComment ? "Yeni Müşteri Yorumu" : "Yeni Anket Yanıtı");
        notification.setMessage(generateNotificationMessage(surveyResponse.getSentiment(), hasComment));
        notification.setType("comment");
        notification.setSentiment(surveyResponse.getSentiment());
        notification.setSentimentScore(surveyResponse.getSentimentScore());
        notification.setCustomerName("Müşteri");
        notification.setComment(surveyResponse.getComment());

        return notificationRepository.save(notification);
    }

    /** Anket kişisel bilgi sormaz; bildirimde de ad yerine "müşteri" geçer. */
    private String generateNotificationMessage(String sentiment, boolean hasComment) {
        String neyi = hasComment ? "yorum" : "puanlama";
        if ("positive".equalsIgnoreCase(sentiment)) {
            return "✅ Bir müşteriden olumlu " + neyi + " geldi.";
        } else if ("negative".equalsIgnoreCase(sentiment)) {
            return "⚠️ Bir müşteriden olumsuz " + neyi + " geldi.";
        } else {
            return "💬 Bir müşteriden yeni " + neyi + " geldi.";
        }
    }
}