package com.survey.ai.service;

import com.survey.ai.entity.SecurityEvent;
import com.survey.ai.entity.User;
import com.survey.ai.repository.SecurityEventRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Yetkisiz erişim denemelerini kaydeder: kim (oturumsuzsa IP), hangi sayfadan,
 * hangi uca. Kayıt hem veritabanına (süper admin paneli) hem log dosyasına düşer.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SecurityEventService {

    private final SecurityEventRepository securityEventRepository;
    private final SecurityService securityService;

    public void record(HttpServletRequest request, String type, String reason) {
        record(request, type, reason, null);
    }

    /**
     * pathOverride: denemenin asıl hedefi istekten okunamadığında verilir. Panelin
     * rol kontrolüne takılan sayfalarda istek uca hiç gitmez; kayıtta uç adresi
     * yerine denenen panel sayfası görünmelidir.
     */
    public void record(HttpServletRequest request, String type, String reason, String pathOverride) {
        try {
            SecurityEvent event = new SecurityEvent();
            event.setType(type);
            event.setReason(reason);
            event.setIp(clientIp(request));
            event.setMethod(request.getMethod());
            event.setPath(pathOverride == null || pathOverride.isBlank()
                    ? request.getRequestURI()
                    : pathOverride);
            event.setPage(request.getHeader("Referer"));
            event.setUserAgent(request.getHeader("User-Agent"));
            event.setCreatedAt(LocalDateTime.now());

            Optional<User> user = currentUser();
            user.ifPresent(value -> {
                event.setUserId(value.getId());
                event.setUserEmail(value.getEmail());
                event.setUserName(value.getFullName());
                event.setRoles(value.getRoles());
                event.setCompanyId(value.getCompanyId());
            });

            securityEventRepository.save(event);

            log.warn("YETKISIZ ERISIM | kim={} | ip={} | {} {} | sayfa={} | sebep={}",
                    event.actorLabel(), event.getIp(), event.getMethod(), event.getPath(),
                    event.getPage() == null ? "-" : event.getPage(), reason);

        } catch (Exception e) {
            // Denetim kaydı başarısız olsa da asıl yanıt bozulmamalı.
            log.error("Yetkisiz erişim kaydı yazılamadı: {}", e.getMessage());
        }
    }

    /**
     * İstek nesnesi elde olmayan yerlerden (servis katmanı) kayıt açar.
     * IP ve tarayıcı bilgisi varsa yine istekten okunur; yoksa kayıt yalnızca
     * sebep bilgisiyle yazılır - denetim izi hiç tutulmamasından iyidir.
     * <p>
     * Not: hatalı giriş sırasında oturum açılmış kullanıcı yoktur, bu yüzden
     * kayıtta kimlik alanları boş kalır ve kim olduğu {@code reason} içinde durur.
     */
    public void recordWithoutRequest(String type, String reason) {
        HttpServletRequest request = currentRequest();
        if (request != null) {
            record(request, type, reason);
            return;
        }

        try {
            SecurityEvent event = new SecurityEvent();
            event.setType(type);
            event.setReason(reason);
            event.setCreatedAt(LocalDateTime.now());
            securityEventRepository.save(event);
            log.warn("GUVENLIK OLAYI | tip={} | sebep={}", type, reason);
        } catch (Exception e) {
            log.error("Güvenlik kaydı yazılamadı: {}", e.getMessage());
        }
    }

    /** Servis katmanından çağrıldığında istek her zaman bulunmayabilir. */
    private HttpServletRequest currentRequest() {
        try {
            ServletRequestAttributes attributes =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            return attributes == null ? null : attributes.getRequest();
        } catch (Exception e) {
            return null;
        }
    }

    public List<SecurityEvent> recent(int limit) {
        return securityEventRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, limit));
    }

    public List<SecurityEvent> unread(int limit) {
        return securityEventRepository.findByReadFalseOrderByCreatedAtDesc(PageRequest.of(0, limit));
    }

    public long unreadCount() {
        return securityEventRepository.countByReadFalse();
    }

    /**
     * Okunmamış kayıtların tamamını işaretler. Önceden ilk 500 kaydı alıyordu;
     * biriken kayıt 500'ü aşınca "tümünü okundu işaretle" sayacı sıfırlayamıyor,
     * zil rozeti hiç sönmüyordu.
     */
    public void markAllRead() {
        List<SecurityEvent> unread = securityEventRepository.findByReadFalse();
        unread.forEach(event -> event.setRead(true));
        securityEventRepository.saveAll(unread);
    }

    /** Proxy arkasında gerçek istemci IP'si ilk X-Forwarded-For değeridir. */
    public static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        return realIp != null && !realIp.isBlank() ? realIp : request.getRemoteAddr();
    }

    /** Kimlik doğrulanmamış isteklerde kullanıcı bulunmaz; hata fırlatmaz. */
    private Optional<User> currentUser() {
        try {
            return securityService.getCurrentUser();
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
