package com.survey.ai.entity;

import com.survey.ai.enums.CompanyType;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.ArrayList;
import java.util.List;

/** Restoran & Kafe şirketleri; anket verisi masa bazında toplanır. */
@Data
@EqualsAndHashCode(callSuper = true)
public class RestaurantCafeCompany extends Company {

    /** Masalar yalnızca restoran/kafelerde vardır, diğer şirket türlerinde kullanılmaz. */
    private List<TableInfo> tables = new ArrayList<>();

    @Override
    public ReadySurveyTemplate defaultSurveyTemplate() {
        return template("Restoran & Kafe Memnuniyet Anketi",
                "Restoran ve kafeler için hazır kalıp",
                CompanyType.RESTAURANT_CAFE.name(),
                rating("Yemek ve içeceklerin lezzetini nasıl değerlendirirsiniz?"),
                rating("Servis hızından memnun kaldınız mı?"),
                rating("Mekanın temizliğini nasıl buldunuz?"),
                choice("Bizi hangi öğün için tercih ettiniz?",
                        "Kahvaltı", "Öğle yemeği", "Akşam yemeği", "Sadece içecek / tatlı"),
                text("Bize iletmek istedikleriniz"));
    }
}
