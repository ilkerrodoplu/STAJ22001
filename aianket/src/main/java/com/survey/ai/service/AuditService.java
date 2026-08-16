package com.survey.ai.service;

import com.survey.ai.entity.AuditLog;
import com.survey.ai.entity.User;
import com.survey.ai.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/** İşlem denetim kaydını yazar ve süper admin ekranına okur. */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    /* Kullanılan işlem adları; ekranda ve aramada tutarlı kalsın diye sabit. */
    public static final String SURVEY_WARNED = "ANKET_UYARILDI";
    public static final String SURVEY_WARNING_CLEARED = "ANKET_UYARISI_KALDIRILDI";
    public static final String SURVEY_SUSPENDED = "ANKET_ASKIYA_ALINDI";
    public static final String SURVEY_DELETED = "ANKET_SILINDI";
    public static final String SURVEY_FIX_SUBMITTED = "ANKET_DUZELTMESI_GONDERILDI";
    public static final String SURVEY_REACTIVATED = "ANKET_YAYINA_ALINDI";
    public static final String SURVEY_CREATED = "ANKET_OLUSTURULDU";
    public static final String SURVEY_UPDATED = "ANKET_GUNCELLENDI";
    public static final String COMPANY_TYPE_CHANGED = "SIRKET_TURU_DEGISTI";
    public static final String COMPANY_OWNER_CHANGED = "SIRKET_SAHIBI_DEGISTI";
    public static final String COMPANY_STATUS_CHANGED = "SIRKET_DURUMU_DEGISTI";
    public static final String COMPANY_UPDATED = "SIRKET_BILGILERI_GUNCELLENDI";
    public static final String USER_STATUS_CHANGED = "KULLANICI_DURUMU_DEGISTI";
    public static final String USER_PROFILE_UPDATED = "KULLANICI_BILGILERI_GUNCELLENDI";
    public static final String ROLE_ASSIGNED = "ROL_ATANDI";
    public static final String STAFF_REMOVED = "CALISAN_CIKARILDI";
    public static final String STAFF_APPROVED = "CALISAN_ONAYLANDI";
    public static final String STAFF_REJECTED = "CALISAN_REDDEDILDI";
    public static final String STAFF_JOIN_REQUESTED = "SIRKETE_KATILMA_ISTEGI";
    public static final String COMPANY_FOUNDED = "SIRKET_KURULDU";
    public static final String SITE_CONTENT_UPDATED = "SITE_METINLERI_GUNCELLENDI";

    /** Ayrıntı alanı listeye sığmayacak kadar uzamasın. */
    private static final int MAX_DETAIL = 600;

    private final AuditLogRepository auditLogRepository;
    private final SecurityService securityService;

    /**
     * Denetim kaydı yazımı asıl işlemi bozmamalı: kayıt tutulamadı diye uyarı
     * ya da askı geri alınmaz, yalnızca loga hata düşer.
     */
    public void record(String action, String target, String detail) {
        try {
            AuditLog entry = new AuditLog();
            entry.setAction(action);
            entry.setTarget(target);
            entry.setDetail(detail == null || detail.length() <= MAX_DETAIL
                    ? detail : detail.substring(0, MAX_DETAIL) + "…");

            User actor = currentUser();
            // Zamanlanmış görevlerde (gece askıya alma) oturum yoktur.
            entry.setActorEmail(actor == null ? "sistem" : actor.getEmail());
            entry.setActorName(actor == null ? "Otomatik görev" : actor.getFullName());

            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Denetim kaydı yazılamadı ({} - {}): {}", action, target, e.getMessage());
        }
    }

    /** "telefon: eski → yeni" satırı; değer değişmediyse null döner. */
    public static String change(String label, Object before, Object after) {
        if (Objects.equals(before, after)) {
            return null;
        }
        return label + ": " + value(before) + " → " + value(after);
    }

    /** {@link #change} satırlarını birleştirir; hiç değişiklik yoksa null (kayıt yazılmaz). */
    public static String describe(String... changes) {
        String joined = Stream.of(changes).filter(Objects::nonNull).collect(Collectors.joining("; "));
        return joined.isEmpty() ? null : joined;
    }

    private static String value(Object value) {
        String text = value == null ? "" : String.valueOf(value).trim();
        return text.isEmpty() ? "(boş)" : text;
    }

    public List<AuditLog> recent(int limit) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, limit));
    }

    private User currentUser() {
        try {
            return securityService.getCurrentUser().orElse(null);
        } catch (Exception e) {
            return null;
        }
    }
}
