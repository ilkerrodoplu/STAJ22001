package com.survey.ai.init;

import com.survey.ai.entity.Company;
import com.survey.ai.entity.EcommerceRetailCompany;
import com.survey.ai.entity.ReadySurveyTemplate;
import com.survey.ai.entity.RestaurantCafeCompany;
import com.survey.ai.entity.ServiceCompany;
import com.survey.ai.entity.TechnologyCompany;
import com.survey.ai.repository.ReadySurveyTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Her şirket entity'sinin kendi {@code defaultSurveyTemplate()} kalıbını
 * ready_survey_templates koleksiyonuna yazar. Kalıplar tek koleksiyonda tutulur,
 * ayrım {@code category} alanı ile yapılır (CompanyType adı ya da "GENEL").
 * Aynı isimde kayıt varsa tekrar eklenmez, bu yüzden her açılışta güvenle çalışır.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class ReadySurveyTemplateInitializer {

    private final ReadySurveyTemplateRepository repository;

    @Bean
    public CommandLineRunner initReadySurveyTemplates() {
        return args -> {
            // Temel Company = CompanyType.OTHER, genel kalıbı sağlar.
            List<Company> types = List.of(
                    new Company(),
                    new TechnologyCompany(),
                    new EcommerceRetailCompany(),
                    new ServiceCompany(),
                    new RestaurantCafeCompany());

            for (Company type : types) {
                ReadySurveyTemplate template = type.defaultSurveyTemplate();

                // Aynı isimli kayıt varsa üzerine yazılır: kalıp içeriği kodda değişince
                // (yeni soru tipi, yeni kategori) veritabanındaki eski sürüm takılı kalmasın.
                ReadySurveyTemplate existing = repository.findByName(template.getName()).orElse(null);
                if (existing != null) {
                    existing.setDescription(template.getDescription());
                    existing.setCategory(template.getCategory());
                    existing.setQuestions(template.getQuestions());
                    existing.setActive(true);
                    existing.setUpdatedAt(LocalDateTime.now());
                    repository.save(existing);
                    log.info("Hazır anket kalıbı güncellendi: {} ({})",
                            existing.getName(), existing.getCategory());
                    continue;
                }

                template.setCreatedAt(LocalDateTime.now());
                template.setUpdatedAt(LocalDateTime.now());
                repository.save(template);
                log.info("Hazır anket kalıbı oluşturuldu: {} ({})",
                        template.getName(), template.getCategory());
            }
        };
    }
}
