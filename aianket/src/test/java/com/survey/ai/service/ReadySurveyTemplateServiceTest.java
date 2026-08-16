package com.survey.ai.service;

import com.survey.ai.entity.Company;
import com.survey.ai.enums.CompanyType;
import com.survey.ai.repository.CompanyRepository;
import com.survey.ai.repository.ReadySurveyTemplateRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Şirket türünden hazır kalıp kategorilerinin türetilmesi - tek kritik dallanma.
 */
class ReadySurveyTemplateServiceTest {

    private final ReadySurveyTemplateRepository templateRepository = mock(ReadySurveyTemplateRepository.class);
    private final CompanyRepository companyRepository = mock(CompanyRepository.class);
    private final ReadySurveyTemplateService service =
            new ReadySurveyTemplateService(templateRepository, companyRepository);

    private Collection<String> categoriesFor(CompanyType type) {
        Company company = new Company();
        company.setId("c1");
        company.setCompanyType(type);
        when(companyRepository.findById("c1")).thenReturn(Optional.of(company));
        when(templateRepository.findByCategoryInAndActiveTrue(any())).thenReturn(List.of());

        service.getTemplatesForCompany("c1");

        ArgumentCaptor<Collection<String>> captor = ArgumentCaptor.forClass(Collection.class);
        verify(templateRepository).findByCategoryInAndActiveTrue(captor.capture());
        reset(templateRepository, companyRepository);
        return captor.getValue();
    }

    @Test
    void bilinenTur_kendiKalibiVeGenelKalibiGorur() {
        assertThat(categoriesFor(CompanyType.RESTAURANT_CAFE))
                .containsExactlyInAnyOrder("RESTAURANT_CAFE", "GENEL");
    }

    @Test
    void digerSecildiginde_sadeceGenelKalipGorunur() {
        assertThat(categoriesFor(CompanyType.OTHER)).containsExactly("GENEL");
    }

    @Test
    void turuOlmayanEskiKayit_sadeceGenelKalipGorur() {
        assertThat(categoriesFor(null)).containsExactly("GENEL");
    }

    @Test
    void bulunamayanSirket_sadeceGenelKalipGorur() {
        when(companyRepository.findById("yok")).thenReturn(Optional.empty());
        when(templateRepository.findByCategoryInAndActiveTrue(any())).thenReturn(List.of());

        service.getTemplatesForCompany("yok");

        verify(templateRepository).findByCategoryInAndActiveTrue(List.of("GENEL"));
    }
}
