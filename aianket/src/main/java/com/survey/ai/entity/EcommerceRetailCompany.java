package com.survey.ai.entity;

import com.survey.ai.enums.CompanyType;

/** E-Ticaret & Perakende şirketleri. */
public class EcommerceRetailCompany extends Company {

    @Override
    public ReadySurveyTemplate defaultSurveyTemplate() {
        return template("E-Ticaret & Perakende Memnuniyet Anketi",
                "E-ticaret ve perakende şirketleri için hazır kalıp",
                CompanyType.ECOMMERCE_RETAIL.name(),
                rating("Sipariş verme sürecinin kolaylığını nasıl değerlendirirsiniz?"),
                rating("Teslimat hızından memnun kaldınız mı?"),
                rating("Ürünün paketlenmesi ve durumu beklentinizi karşıladı mı?"),
                choice("Siparişinizi hangi kanaldan verdiniz?",
                        "Web sitesi", "Mobil uygulama", "Telefon", "Mağaza"),
                text("Alışveriş deneyiminizle ilgili eklemek istedikleriniz"));
    }
}
