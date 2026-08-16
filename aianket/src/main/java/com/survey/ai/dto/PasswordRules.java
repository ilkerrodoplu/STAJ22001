package com.survey.ai.dto;

/**
 * Tek şifre kuralı: kayıt, şifre değiştirme ve şifre sıfırlama aynı ölçüyü kullanır.
 *
 * Önceden üç ayrı kural vardı; sıfırlama ucu ayrıca {@code @#$%^&+=!} kümesinden
 * özel karakter istiyordu. Sonuç: kullanıcı kayıt olurken kabul edilen şifresini
 * sıfırlarken giremiyor, hata mesajı da yalnızca "özel karakter" dediği için
 * neden reddedildiğini anlamıyordu. Nokta, yıldız, alt çizgi gibi karakterler
 * sessizce geçersizdi.
 *
 * Kural kayıt akışındakiyle hizalandı: uzunluk + küçük/büyük harf + rakam.
 * Özel karakter serbest ama zorunlu değil; zaten hesabın şifresi kayıt anında da
 * şifre değiştirme ekranından da özel karaktersiz belirlenebiliyordu, yalnızca
 * sıfırlama ucunda zorunlu olması güvenlik değil tutarsızlık üretiyordu.
 */
public final class PasswordRules {

    public static final int MIN_LENGTH = 8;
    public static final int MAX_LENGTH = 100;

    public static final String PATTERN = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$";

    public static final String MESSAGE =
            "Şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir";

    public static final String LENGTH_MESSAGE = "Şifre en az 8 karakter olmalıdır";

    private PasswordRules() {
    }
}
