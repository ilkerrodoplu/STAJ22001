package com.survey.ai.service;
 

import com.survey.ai.exception.ResourceNotFoundException;
import com.survey.ai.entity.SurveyQuestion;
import com.survey.ai.entity.SurveyTemplate;
import com.survey.ai.repository.SurveyTemplateRepository;
import com.survey.ai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SurveyTemplateService {

    private final SurveyTemplateRepository surveyTemplateRepository;
    private final UserRepository userRepository;
    private final SecurityService securityService;
    private final SupportMessageService supportMessageService;
    private final AuditService auditService;
    private final SurveyNotificationService notificationService;

    /**
     * Editörün anket işleri onay istemez ama şirket sahibinin haberi olmalı:
     * yapılan iş zil bildirimine düşer. Sahip kendi işini kendine bildirmez.
     */
    private void notifyOwner(SurveyTemplate template, String title, String message) {
        if (securityService.isCurrentUserCompanyOwner()) {
            return;
        }
        notificationService.notifyCompany(template.getCompanyId(), title, message, "/admin/survey-templates");
    }

    /**
     * Restorana ait tüm aktif anket şablonlarını getirir
     */
    public List<SurveyTemplate> getActiveTemplatesByCompanyId(String companyId) {
        checkCompanyAccess(companyId);
        return surveyTemplateRepository.findByCompanyIdAndActive(companyId, true);
    }

    /**
     * ID'ye göre anket şablonu getirir
     */
    public SurveyTemplate getSurveyTemplateById(String id) {
        return surveyTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Anket", "id", id));
    }

    /**
     * Yeni anket şablonu kaydeder. Anket editörünün oluşturduğu şablon onay
     * beklemez, doğrudan kaydedilir; şirket sahibine bildirim gider.
     */
    public SurveyTemplate saveSurveyTemplate(SurveyTemplate surveyTemplate) {
        checkEditPermission();

        // Şablon her zaman oturumdaki kullanıcının şirketine yazılır; gövdeden gelen
        // companyId dikkate alınmaz, aksi halde başka şirket adına şablon açılabiliyordu.
        surveyTemplate.setCompanyId(currentCompanyId());

        assignQuestionIds(surveyTemplate.getQuestions());

        surveyTemplate.setCreatedBy(securityService.getCurrentUserId());
        surveyTemplate.setCreatedAt(LocalDateTime.now());
        surveyTemplate.setUpdatedAt(LocalDateTime.now());
        SurveyTemplate saved = surveyTemplateRepository.save(surveyTemplate);

        auditService.record(AuditService.SURVEY_CREATED, saved.getName(),
                (saved.getQuestions() == null ? 0 : saved.getQuestions().size()) + " soruyla oluşturuldu");

        notifyOwner(saved, "Yeni anket oluşturuldu: " + saved.getName(),
                "Anket editörü \"" + saved.getName() + "\" anketini oluşturdu.");
        return saved;
    }

    /** Anket şablonunu günceller; editörün değişikliği doğrudan yayına yansır. */
    public SurveyTemplate updateSurveyTemplate(String id, SurveyTemplate templateDetails) {
        SurveyTemplate template = getSurveyTemplateById(id);
        checkCompanyAccess(template.getCompanyId());
        checkEditPermission();

        assignQuestionIds(templateDetails.getQuestions());

        // Süper admin işlem kayıtlarında görünsün diye ne değiştiği çıkarılır.
        String changes = describeChanges(template, templateDetails);

        boolean warned = template.getWarnedAt() != null;

        // Bilgileri güncelle
        template.setName(templateDetails.getName());
        template.setDescription(templateDetails.getDescription());
        template.setQuestions(templateDetails.getQuestions());
        // Uyarılan ya da askıya alınan anketi yayına yalnızca süper admin alır.
        template.setActive(template.isSuspendedByAdmin() || warned ? false : templateDetails.getActive());
        if (warned) {
            template.setStatus("INACTIVE");
        }
        template.setUpdatedAt(LocalDateTime.now());

        SurveyTemplate saved = surveyTemplateRepository.save(template);

        if (changes != null) {
            auditService.record(AuditService.SURVEY_UPDATED, saved.getName(), changes);
            notifyOwner(saved, "Ankette değişiklik yapıldı: " + saved.getName(),
                    "Anket editörü \"" + saved.getName() + "\" anketini düzenledi: " + changes);
        }

        // Uyarılan anket düzeltildi: süper adminler kontrol edip onaylasın.
        if (warned) {
            supportMessageService.systemMessage(saved.getCompanyId(), false,
                    "\"" + saved.getName() + "\" anketinde düzenleme yapıldı. "
                            + "Kontrol edin ve onaylayın.", saved);
            auditService.record(AuditService.SURVEY_FIX_SUBMITTED, saved.getName(), null);
        }
        return saved;
    }

    /**
     * Anket şablonunu kalıcı olarak siler. Toplanan yanıtlar ve raporlar durur:
     * süper adminin sildiği anketlerde de kural budur, geçmiş veri silinmez.
     * Yayından geçici olarak kaldırmak için anket "Pasif" duruma alınır.
     */
    public void deleteSurveyTemplate(String id) {
        SurveyTemplate template = getSurveyTemplateById(id);
        checkCompanyAccess(template.getCompanyId());
        checkOwnerPermission();
        surveyTemplateRepository.delete(template);
        auditService.record(AuditService.SURVEY_DELETED, template.getName(), "şirket sahibi sildi");
    }

    /**
     * İşlem kaydına yazılacak değişiklik özeti: ad/açıklama ve soru farkları.
     * Hiçbir şey değişmediyse null döner, boş kayıt yazılmaz.
     */
    private static String describeChanges(SurveyTemplate before, SurveyTemplate after) {
        return AuditService.describe(
                AuditService.change("anket adı", before.getName(), after.getName()),
                AuditService.change("açıklama", before.getDescription(), after.getDescription()),
                questionDiff(before.getQuestions(), after.getQuestions()));
    }

    /** Eklenen, silinen ve metni/tipi/şıkları değişen sorular. */
    private static String questionDiff(List<SurveyQuestion> before, List<SurveyQuestion> after) {
        Map<String, SurveyQuestion> old = byId(before);
        Map<String, SurveyQuestion> current = byId(after);

        List<String> changes = new ArrayList<>();
        current.forEach((id, question) -> {
            SurveyQuestion previous = old.get(id);
            if (previous == null) {
                changes.add("soru eklendi: \"" + question.getText() + "\"");
                return;
            }
            // Aynı düzenlemede hem metin hem şık değişebilir; her biri ayrı satır olsun.
            if (!Objects.equals(previous.getText(), question.getText())) {
                changes.add("soru değişti: \"" + previous.getText() + "\" → \"" + question.getText() + "\"");
            }
            if (!Objects.equals(previous.getType(), question.getType())) {
                // Ok işareti parantez içinde kalmasın; ekran "eski → yeni" olarak ayrıştırıyor.
                changes.add("soru tipi değişti (\"" + question.getText() + "\"): "
                        + previous.getType() + " → " + question.getType());
            }
            if (!Objects.equals(previous.getOptions(), question.getOptions())) {
                changes.add("şıklar değişti: \"" + question.getText() + "\" ("
                        + optionDiff(previous.getOptions(), question.getOptions()) + ")");
            }
            if (!Objects.equals(previous.getRequired(), question.getRequired())) {
                changes.add("zorunluluk değişti: \"" + question.getText() + "\"");
            }
        });
        old.forEach((id, question) -> {
            if (!current.containsKey(id)) {
                changes.add("soru silindi: \"" + question.getText() + "\"");
            }
        });

        return changes.isEmpty() ? null : String.join("; ", changes);
    }

    /** Hangi şık eklendi/silindi; ikisi de yoksa yalnızca sıra değişmiştir. */
    private static String optionDiff(List<String> before, List<String> after) {
        List<String> old = before == null ? List.of() : before;
        List<String> current = after == null ? List.of() : after;

        List<String> added = new ArrayList<>(current);
        added.removeAll(old);
        List<String> removed = new ArrayList<>(old);
        removed.removeAll(current);

        List<String> parts = new ArrayList<>();
        if (!added.isEmpty()) {
            parts.add("eklenen: \"" + String.join("\", \"", added) + "\"");
        }
        if (!removed.isEmpty()) {
            parts.add("silinen: \"" + String.join("\", \"", removed) + "\"");
        }
        return parts.isEmpty() ? "sıra değişti" : String.join(", ", parts);
    }

    private static Map<String, SurveyQuestion> byId(List<SurveyQuestion> questions) {
        if (questions == null) {
            return Map.of();
        }
        Map<String, SurveyQuestion> byId = new LinkedHashMap<>();
        questions.stream().filter(question -> question.getId() != null)
                .forEach(question -> byId.put(question.getId(), question));
        return byId;
    }

    private void assignQuestionIds(List<SurveyQuestion> questions) {
        if (questions == null) {
            return;
        }
        questions.forEach(question -> {
            if (question.getId() == null || question.getId().isEmpty()) {
                question.setId(UUID.randomUUID().toString());
            }
        });
    }

    /**
     * Anket içeriğine yalnızca şirket sahibi ve anket editörü dokunabilir.
     * Süper admin anket oluşturamaz/düzenleyemez; yalnızca uyarır ve askıya alır.
     */
    private void checkEditPermission() {
        if (securityService.isCurrentUserAdmin()) {
            throw new AccessDeniedException(
                    "Süper admin anket oluşturamaz veya düzenleyemez; anket sahibine uyarı gönderin");
        }
        if (!securityService.canCurrentUserEditSurveys()) {
            throw new AccessDeniedException("Anket oluşturma/düzenleme yetkiniz yok");
        }
    }

    /** Onay ve yayından kaldırma yalnızca şirket sahibinde. */
    private void checkOwnerPermission() {
        if (!securityService.isCurrentUserCompanyOwner()) {
            throw new AccessDeniedException("Bu işlem için şirket sahibi yetkisi gerekir");
        }
    }

    public    List<SurveyTemplate> getActiveTemplates() {
        // Site admini hepsini görür, şirket kullanıcısı yalnızca kendi şablonlarını.
        if (securityService.isCurrentUserAdmin()) {
            return withCreatorNames(surveyTemplateRepository.findByActive(true));
        }
        // Şirketin bütün anketleri listelenir: pasife alınan anket de görünür,
        // aksi halde sahibi kendi yayından kaldırdığı anketi bir daha bulamıyor
        // ve geri yayına alamıyordu. Silinen anket zaten veritabanında yok.
        return withCreatorNames(surveyTemplateRepository.findByCompanyId(currentCompanyId()));
    }

    /**
     * Listede anketi kimin hazırladığı id olarak değil isimle görünsün. Çalışan
     * şirketten çıkarıldığında createdBy şirket sahibine geçtiği için isim de
     * kendiliğinden sahibe döner.
     */
    private List<SurveyTemplate> withCreatorNames(List<SurveyTemplate> templates) {
        Set<String> creatorIds = templates.stream()
                .map(SurveyTemplate::getCreatedBy)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (creatorIds.isEmpty()) {
            return templates;
        }

        Map<String, String> names = new HashMap<>();
        userRepository.findAllById(creatorIds)
                .forEach(user -> names.put(user.getId(), user.getFullName()));
        templates.forEach(template -> template.setCreatedByName(names.get(template.getCreatedBy())));
        return templates;
    }

    /** Oturumdaki kullanıcının şirketi; şirkete bağlı olmayan kullanıcı şablon yönetemez. */
    private String currentCompanyId() {
        String companyId = securityService.getCurrentUserCompanyId();
        if (companyId == null) {
            throw new AccessDeniedException("Şablon işlemleri için şirket hesabıyla giriş yapmalısınız");
        }
        return companyId;
    }

    /** Site admini hariç herkes yalnızca kendi şirketinin şablonlarına erişebilir. */
    private void checkCompanyAccess(String companyId) {
        if (securityService.isCurrentUserAdmin()) {
            return;
        }
        if (!currentCompanyId().equals(companyId)) {
            throw new AccessDeniedException("Bu şablon başka bir şirkete ait");
        }
    }
}
