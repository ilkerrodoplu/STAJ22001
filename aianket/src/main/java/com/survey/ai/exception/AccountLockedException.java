package com.survey.ai.exception;

import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Çok fazla hatalı şifre denemesinden sonra hesabın geçici olarak kilitlenmesi.
 * <p>
 * İki durumda fırlatılır: kilidi TETİKLEYEN denemede (kullanıcı kilitlendiğini
 * o anda görsün diye) ve zaten kilitli hesaba DOĞRU şifre geldiğinde. Kilitli
 * hesaba yanlış şifreyle gelen istek ise sıradan bir hatalı giriş gibi
 * yanıtlanır: aksi halde "bu hesap kilitli" cevabı, bir e-postanın sistemde
 * kayıtlı olduğunu dışarıya söyleyen sınırsız sorgulanabilir bir sinyal olurdu.
 */
@Getter
public class AccountLockedException extends RuntimeException {

    private final LocalDateTime lockedUntil;

    /** true ise kilit kendiliğinden açılmaz; yalnızca şifre sıfırlanınca kalkar. */
    private final boolean untilPasswordReset;

    /** Süreli kilit. */
    public AccountLockedException(LocalDateTime lockedUntil) {
        super("Çok fazla hatalı giriş denemesi yapıldı. Hesabınız geçici olarak kilitlendi.");
        this.lockedUntil = lockedUntil;
        this.untilPasswordReset = false;
    }

    /** Israrlı denemeden sonraki kalıcı kilit; çıkış yolu yalnızca şifre sıfırlamadır. */
    public static AccountLockedException untilPasswordReset() {
        return new AccountLockedException();
    }

    private AccountLockedException() {
        super("Hesabınız çok sayıda hatalı giriş denemesi nedeniyle güvenlik amacıyla kilitlendi. "
                + "E-posta adresinize gönderilen bağlantıyla şifrenizi sıfırlayarak açabilirsiniz.");
        this.lockedUntil = null;
        this.untilPasswordReset = true;
    }
}
