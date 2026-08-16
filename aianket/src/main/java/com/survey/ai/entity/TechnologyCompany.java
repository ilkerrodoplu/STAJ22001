package com.survey.ai.entity;

import com.survey.ai.enums.CompanyType;

/** Teknoloji/Yazılım şirketleri. */
public class TechnologyCompany extends Company {

    @Override
    public ReadySurveyTemplate defaultSurveyTemplate() {
        return template("Teknoloji & Yazılım Memnuniyet Anketi",
                "Yazılım/teknoloji şirketleri için hazır kalıp",
                CompanyType.TECHNOLOGY.name(),
                rating("Ürünün kullanım kolaylığını nasıl değerlendirirsiniz?"),
                rating("Teknik destek ekibimizin çözüm hızından memnun musunuz?"),
                rating("Ürünün performans ve kararlılığı beklentinizi karşılıyor mu?"),
                choice("Ürünü en çok hangi amaçla kullanıyorsunuz?",
                        "Günlük iş takibi", "Raporlama ve analiz", "Ekip içi iletişim", "Entegrasyon / API"),
                text("Eklenmesini istediğiniz özellikler neler?"));
    }
}
