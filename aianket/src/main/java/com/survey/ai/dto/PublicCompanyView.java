package com.survey.ai.dto;

import com.survey.ai.entity.Company;
import lombok.Builder;
import lombok.Data;

/**
 * QR ile gelen katılımcıya gösterilen şirket bilgisi.
 * <p>
 * Anket ve teşekkür sayfaları yalnızca şu alanları kullanıyor; uç oturumsuz
 * olduğu için fazlası dışarı çıkmamalı. Önceden {@code Company} entity'sinin
 * tamamı dönüyordu: hesabın kayıt e-postası, şirket durumu (dondurulmuş mu),
 * şirket türü ve kayıt tarihleri de QR kodunu okutan herkese açıktı.
 * <p>
 * Adres ve telefon bilinçli olarak KALIYOR: teşekkür sayfası bunları gösteriyor
 * ve zaten mekânın kapısında yazan bilgiler.
 */
@Data
@Builder
public class PublicCompanyView {

    private String id;
    private String name;
    private String logoUrl;
    private String address;
    private String phone;

    public static PublicCompanyView from(Company company) {
        return PublicCompanyView.builder()
                .id(company.getId())
                .name(company.getName())
                .logoUrl(company.getLogoUrl())
                .address(company.getAddress())
                .phone(company.getPhone())
                .build();
    }
}
