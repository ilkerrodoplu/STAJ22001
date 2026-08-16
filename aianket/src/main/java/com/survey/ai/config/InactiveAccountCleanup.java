package com.survey.ai.config;

import com.survey.ai.entity.User;
import com.survey.ai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Kapatılan hesaplar önce pasife alınır. Kullanıcı 1 yıl içinde hesabını geri
 * almazsa bu görev hesabı siler. Her gece 00:00'da çalışır.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class InactiveAccountCleanup {

    /** Kapatılan hesabın geri alınabileceği süre. */
    public static final int RETENTION_YEARS = 1;

    private final UserRepository userRepository;

    @Scheduled(cron = "0 0 0 * * *", zone = "Europe/Istanbul")
    public void deleteAbandonedAccounts() {
        List<User> expired = userRepository.findByStatusAndDeactivatedAtBefore(
                "INACTIVE", LocalDateTime.now().minusYears(RETENTION_YEARS));

        if (expired.isEmpty()) {
            return;
        }

        userRepository.deleteAll(expired);
        log.info("1 yıldır geri alınmayan {} hesap silindi", expired.size());
    }
}
