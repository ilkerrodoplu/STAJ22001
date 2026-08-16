package com.survey.ai.entity;

import com.survey.ai.enums.CompanyType;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Şirket türü -> entity eşleşmesi ve her entity'nin 5 soruluk hazır kalıbı.
 */
class CompanyTest {

    @Test
    void herTur_kendiEntitysiniDoner_digerVeBilinmeyenTemelSinifiKullanir() {
        assertThat(Company.newInstance(CompanyType.TECHNOLOGY)).isInstanceOf(TechnologyCompany.class);
        assertThat(Company.newInstance(CompanyType.ECOMMERCE_RETAIL)).isInstanceOf(EcommerceRetailCompany.class);
        assertThat(Company.newInstance(CompanyType.SERVICE)).isInstanceOf(ServiceCompany.class);
        assertThat(Company.newInstance(CompanyType.RESTAURANT_CAFE)).isInstanceOf(RestaurantCafeCompany.class);

        assertThat(Company.newInstance(CompanyType.OTHER)).isExactlyInstanceOf(Company.class);
        assertThat(Company.newInstance(null)).isExactlyInstanceOf(Company.class);
    }

    @Test
    void herTurunKalibi_besSoruVeHerSoruTurundenEnAzBirTaneIcerir() {
        Arrays.stream(CompanyType.values()).forEach(type -> {
            var questions = Company.newInstance(type).defaultSurveyTemplate().getQuestions();

            assertThat(questions).as("%s soru sayısı", type).hasSizeLessThanOrEqualTo(5).hasSize(5);
            assertThat(questions).extracting("type")
                    .as("%s soru türleri", type)
                    .contains("RATING", "MULTIPLE_CHOICE", "TEXT");
            assertThat(questions).extracting("displayOrder").containsExactly(0, 1, 2, 3, 4);

            // Çoktan seçmeli sorunun şıkları kalıpla birlikte gelmeli.
            assertThat(questions).filteredOn(q -> "MULTIPLE_CHOICE".equals(q.getType()))
                    .allSatisfy(q -> assertThat(q.getOptions()).hasSizeGreaterThanOrEqualTo(2));
        });
    }

    @Test
    void kalipKategorileri_turBasinaTekilVeDigerIcinGenel() {
        assertThat(Company.newInstance(CompanyType.OTHER).defaultSurveyTemplate().getCategory())
                .isEqualTo(CompanyType.GENERIC_CATEGORY);

        // Her tür kendi kategorisini kullanmalı, kopyala-yapıştır kalıntısı olmamalı.
        assertThat(Arrays.stream(CompanyType.values())
                .filter(t -> t != CompanyType.OTHER)
                .map(t -> Company.newInstance(t).defaultSurveyTemplate().getCategory()))
                .containsExactlyInAnyOrder("TECHNOLOGY", "ECOMMERCE_RETAIL", "SERVICE", "RESTAURANT_CAFE");
    }

    @Test
    void masalar_sadeceRestoranKafeEntitysindeVar() {
        RestaurantCafeCompany cafe = (RestaurantCafeCompany) Company.newInstance(CompanyType.RESTAURANT_CAFE);
        assertThat(cafe.getTables()).isEmpty();

        assertThat(Arrays.stream(Company.class.getDeclaredFields()).map(java.lang.reflect.Field::getName))
                .doesNotContain("tables");
    }
}
