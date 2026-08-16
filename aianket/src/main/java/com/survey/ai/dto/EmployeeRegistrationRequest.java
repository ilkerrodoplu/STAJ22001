package com.survey.ai.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Çalışan kaydı: şirket bilgisi girilmez. Kayıt kodu verilirse hesap doğrudan o
 * şirkete (onay bekler durumda) bağlanır; verilmezse şirketsiz hesap açılır ve
 * kullanıcı sonradan koduyla katılır ya da kendi şirketini kurar.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeRegistrationRequest {

    @Valid
    @NotNull(message = "Kullanıcı bilgisi gereklidir")
    private UserDto user;

    /**
     * İsteğe bağlı. Uzunluk kuralı konmaz: boş string de gelebildiği için
     * @Size burada "kod girmedim" durumunu hataya çevirirdi. Kod hatalıysa
     * şirket bulunamaz ve istek zaten reddedilir.
     */
    private String inviteCode;

    /** Kod girilmediyse hesap hiçbir şirkete bağlanmaz. */
    public boolean hasInviteCode() {
        return inviteCode != null && !inviteCode.isBlank();
    }
}
