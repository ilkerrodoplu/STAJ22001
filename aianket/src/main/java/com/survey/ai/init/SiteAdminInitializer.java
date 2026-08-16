package com.survey.ai.init;

import com.survey.ai.entity.User;
import com.survey.ai.enums.UserRole;
import com.survey.ai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * İlk site adminini oluşturur. Şirkete bağlı değildir, tüm şirketlerin verisine erişir.
 * <p>
 * E-posta ve şifre yalnızca ortam değişkeninden gelir (SITE_ADMIN_EMAIL /
 * SITE_ADMIN_PASSWORD, bkz. .env). Varsayılan şifre BİLEREK yoktur: kodda duran
 * bir varsayılan, depoyu gören herkese süper admin hesabı vermek demekti.
 * Değişkenler verilmezse hesap açılmaz, uygulama çalışmaya devam eder.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SiteAdminInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.site-admin.email:}")
    private String email;

    @Value("${app.site-admin.password:}")
    private String password;

    @Override
    public void run(String... args) {
        if (email.isBlank() || password.isBlank()) {
            log.warn("Site admini oluşturulmadı: SITE_ADMIN_EMAIL ve SITE_ADMIN_PASSWORD tanımlı değil.");
            return;
        }

        if (userRepository.existsByEmail(email)) {
            return;
        }

        User admin = new User();
        admin.setName("Admin");
        admin.setLastName("Anketör");
        admin.setEmail(email);
        admin.setPassword(passwordEncoder.encode(password));
        admin.setStatus("ACTIVE");
        admin.setRoles(new HashSet<>(Set.of(UserRole.ADMIN.name())));
        admin.setCreatedAt(LocalDateTime.now());
        admin.setUpdatedAt(LocalDateTime.now());

        userRepository.save(admin);
        log.info("Site admini oluşturuldu: {}", email);
    }
}
