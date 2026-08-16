package com.survey.ai.entity;

import com.survey.ai.enums.CompanyType;

/** Hizmet sektörü şirketleri. */
public class ServiceCompany extends Company {

    @Override
    public ReadySurveyTemplate defaultSurveyTemplate() {
        return template("Hizmet Sektörü Memnuniyet Anketi",
                "Hizmet sektörü şirketleri için hazır kalıp",
                CompanyType.SERVICE.name(),
                rating("Aldığınız hizmetin genel kalitesini nasıl değerlendirirsiniz?"),
                rating("Personelimizin ilgi ve nezaketinden memnun musunuz?"),
                rating("İşlem/randevu sürenizden memnun kaldınız mı?"),
                choice("Randevunuzu nasıl oluşturdunuz?",
                        "Telefonla", "Web sitesinden", "Yerinde", "Sosyal medya / mesaj"),
                text("Hizmetimizi geliştirmemiz için önerileriniz"));
    }
}
