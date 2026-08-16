package com.survey.ai.config;

import com.survey.ai.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Uygulama başlangıcında çalışan sınıf.
 * Gerekli başlangıç verilerini ve yapılandırmalarını yükler.
 */
@Component
@RequiredArgsConstructor
public class AppStartupRunner implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(AppStartupRunner.class);

    private final RoleService roleService;

    @Override
    public void run(String... args) {
        logger.info("Uygulama başlangıç işlemleri çalıştırılıyor...");

        // Varsayılan rolleri yükle
        initializeDefaultRoles();

        logger.info("Uygulama başlangıç işlemleri tamamlandı.");
    }

    /**
     * Varsayılan rolleri yükler
     */
    private void initializeDefaultRoles() {
        logger.info("Varsayılan roller kontrol ediliyor...");
        roleService.initializeDefaultRoles();
        logger.info("Varsayılan roller hazır.");
    }
}

