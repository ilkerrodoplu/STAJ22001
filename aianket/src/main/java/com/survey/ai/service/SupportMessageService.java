package com.survey.ai.service;

import com.survey.ai.entity.Company;
import com.survey.ai.entity.SupportMessage;
import com.survey.ai.entity.SurveyTemplate;
import com.survey.ai.entity.User;
import com.survey.ai.enums.UserRole;
import com.survey.ai.exception.ResourceNotFoundException;
import com.survey.ai.repository.CompanyRepository;
import com.survey.ai.repository.SupportMessageRepository;
import com.survey.ai.repository.SurveyTemplateRepository;
import com.survey.ai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Şirket kullanıcıları ile süper admin arasındaki mesajlaşma.
 * Şirket tarafı yalnızca kendi konuşmasını görür, süper admin tüm konuşmaları görür.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SupportMessageService {

    private static final int PREVIEW_LENGTH = 160;

    private final SupportMessageRepository messageRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final SecurityService securityService;
    private final EmailService emailService;
    private final SurveyNotificationService notificationService;
    private final SurveyTemplateRepository surveyTemplateRepository;

    /* ---------- Şirket tarafı ---------- */

    public List<SupportMessage> companyThread() {
        String companyId = currentCompanyId();
        List<SupportMessage> thread = messageRepository.findByCompanyIdOrderByCreatedAtAsc(companyId);
        markRead(thread, true);
        return thread;
    }

    /**
     * surveyTemplateId isteğe bağlıdır: askıdan çıkarma talebinde şirket hangi
     * anketten söz ettiğini seçer. Anket şirkete ait değilse bağ kurulmaz.
     */
    public SupportMessage sendToAdmin(String body, String surveyTemplateId) {
        User sender = currentUser();
        Company company = companyRepository.findById(currentCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Şirket", "id", currentCompanyId()));

        SupportMessage message = message(company.getId(), company.getName(), false, sender, body);
        attachSurvey(message, surveyTemplateId, company.getId());
        messageRepository.save(message);

        notifyAdmins(company.getName(), body);

        log.info("Şirket süper admine mesaj gönderdi: {}", company.getName());
        return message;
    }

    /**
     * Şirketten gelen her mesaj tüm süper adminlerin gelen kutusuna düşer.
     * Tek yerden gider: hem şirketin yazdığı mesaj hem de sistem mesajı bunu
     * kullanır, böylece adres ve alıcı listesi iki yerde ayrışmaz.
     */
    private void notifyAdmins(String fromLabel, String body) {
        userRepository.findByRole(UserRole.ADMIN.name()).forEach(admin ->
                emailService.sendSupportMessageEmail(admin.getEmail(), admin.getName(),
                        fromLabel == null ? "Şirket" : fromLabel, preview(body), true));
    }

    /** Anket başka şirkete aitse ya da yoksa mesaj bağsız gider; hata verilmez. */
    private void attachSurvey(SupportMessage message, String surveyTemplateId, String companyId) {
        if (surveyTemplateId == null || surveyTemplateId.isBlank()) {
            return;
        }
        surveyTemplateRepository.findById(surveyTemplateId)
                .filter(template -> companyId.equals(template.getCompanyId()))
                .ifPresent(template -> {
                    message.setSurveyTemplateId(template.getId());
                    message.setSurveyName(template.getName());
                });
    }

    /**
     * Otomatik sistem mesajı: anket uyarısı, düzeltme bildirimi ve silme uyarısı
     * da yazışmada görünsün. Oturum gerektirmez; gece çalışan görevden de çağrılır.
     * Mesaj yazılamazsa asıl işlem (uyarı/silme) iptal olmaz.
     *
     * @param fromAdmin true: site yönetiminden şirkete, false: şirketten süper adminlere
     */
    public void systemMessage(String companyId, boolean fromAdmin, String body, SurveyTemplate template) {
        if (companyId == null) {
            return;
        }
        try {
            String companyName = companyRepository.findById(companyId)
                    .map(Company::getName).orElse(null);

            SupportMessage message = new SupportMessage();
            message.setCompanyId(companyId);
            message.setCompanyName(companyName);
            message.setFromAdmin(fromAdmin);
            message.setSenderName(fromAdmin ? "Site Yönetimi" : "Sistem");
            message.setBody(body);
            message.setCreatedAt(LocalDateTime.now());
            if (template != null) {
                message.setSurveyTemplateId(template.getId());
                message.setSurveyName(template.getName());
            }
            messageRepository.save(message);

            if (fromAdmin) {
                userRepository.findByCompanyIdAndRole(companyId, UserRole.COMPANY_OWNER.name())
                        .stream().findFirst()
                        .ifPresent(owner -> emailService.sendSupportMessageEmail(
                                owner.getEmail(), owner.getName(), "Site Yönetimi", preview(body), false));
            } else {
                notifyAdmins(companyName, body);
            }
        } catch (Exception e) {
            log.error("Sistem mesajı yazılamadı ({}): {}", companyId, e.getMessage());
        }
    }

    public long companyUnreadCount() {
        return messageRepository.countByCompanyIdAndFromAdminAndReadFalse(currentCompanyId(), true);
    }

    /* ---------- Süper admin tarafı ---------- */

    /** Konuşma listesi: şirket başına son mesaj ve okunmamış sayısı. */
    public List<Map<String, Object>> adminThreads() {
        checkAdmin();

        Map<String, List<SupportMessage>> byCompany = new LinkedHashMap<>();
        messageRepository.findAll().stream()
                .sorted(Comparator.comparing(SupportMessage::getCreatedAt,
                        Comparator.nullsFirst(Comparator.naturalOrder())))
                .forEach(message -> byCompany
                        .computeIfAbsent(message.getCompanyId(), key -> new java.util.ArrayList<>())
                        .add(message));

        return byCompany.entrySet().stream().map(entry -> {
            List<SupportMessage> thread = entry.getValue();
            SupportMessage last = thread.get(thread.size() - 1);
            Map<String, Object> summary = new LinkedHashMap<>();
            summary.put("companyId", entry.getKey());
            summary.put("companyName", last.getCompanyName());
            summary.put("lastMessage", preview(last.getBody()));
            summary.put("lastMessageAt", last.getCreatedAt());
            summary.put("lastFromAdmin", last.isFromAdmin());
            summary.put("unreadCount", thread.stream()
                    .filter(message -> !message.isFromAdmin() && !message.isRead()).count());
            return summary;
        }).sorted((a, b) -> {
            LocalDateTime first = (LocalDateTime) a.get("lastMessageAt");
            LocalDateTime second = (LocalDateTime) b.get("lastMessageAt");
            return second.compareTo(first);
        }).toList();
    }

    public List<SupportMessage> adminThread(String companyId) {
        checkAdmin();
        List<SupportMessage> thread = messageRepository.findByCompanyIdOrderByCreatedAtAsc(companyId);
        markRead(thread, false);
        return thread;
    }

    public SupportMessage replyToCompany(String companyId, String body) {
        checkAdmin();
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Şirket", "id", companyId));

        SupportMessage message = message(companyId, company.getName(), true, currentUser(), body);
        messageRepository.save(message);

        userRepository.findByCompanyIdAndRole(companyId, UserRole.COMPANY_OWNER.name()).stream().findFirst()
                .ifPresent(owner -> emailService.sendSupportMessageEmail(
                        owner.getEmail(), owner.getName(), "Site Yönetimi", preview(body), false));

        // Panelde de görünsün: e-posta gitmezse mesaj yalnızca destek sayfasında kalıyordu.
        notificationService.notifyCompany(companyId, "Site yönetiminden mesaj",
                preview(body), "/admin/messages");

        return message;
    }

    public long adminUnreadCount() {
        checkAdmin();
        return messageRepository.countByFromAdminAndReadFalse(false);
    }

    /** Süper adminin bildirim listesi için okunmamış şirket mesajları. */
    public List<SupportMessage> adminUnreadMessages() {
        checkAdmin();
        return messageRepository.findByFromAdminAndReadFalseOrderByCreatedAtDesc(false);
    }

    /* ---------- Ortak ---------- */

    private SupportMessage message(String companyId, String companyName, boolean fromAdmin,
                                   User sender, String body) {
        if (body == null || body.isBlank()) {
            throw new IllegalArgumentException("Mesaj boş olamaz");
        }

        SupportMessage message = new SupportMessage();
        message.setCompanyId(companyId);
        message.setCompanyName(companyName);
        message.setFromAdmin(fromAdmin);
        message.setSenderUserId(sender.getId());
        message.setSenderName(sender.getFullName());
        message.setSenderEmail(sender.getEmail());
        message.setBody(body.trim());
        message.setCreatedAt(LocalDateTime.now());
        return message;
    }

    /** Karşı taraftan gelen okunmamış mesajları okundu işaretler. */
    private void markRead(List<SupportMessage> thread, boolean readingAsCompany) {
        List<SupportMessage> unread = thread.stream()
                .filter(message -> message.isFromAdmin() == readingAsCompany && !message.isRead())
                .peek(message -> message.setRead(true))
                .toList();
        if (!unread.isEmpty()) {
            messageRepository.saveAll(unread);
        }
    }

    private static String preview(String body) {
        String trimmed = body == null ? "" : body.trim();
        return trimmed.length() <= PREVIEW_LENGTH ? trimmed : trimmed.substring(0, PREVIEW_LENGTH) + "...";
    }

    private void checkAdmin() {
        if (!securityService.isCurrentUserAdmin()) {
            throw new AccessDeniedException("Bu işlem için site admini yetkisi gerekir");
        }
    }

    private User currentUser() {
        return securityService.getCurrentUser()
                .orElseThrow(() -> new AccessDeniedException("Oturum bulunamadı"));
    }

    private String currentCompanyId() {
        String companyId = securityService.getCurrentUserCompanyId();
        if (companyId == null) {
            throw new AccessDeniedException("Mesajlaşma için şirket hesabıyla giriş yapmalısınız");
        }
        return companyId;
    }
}
