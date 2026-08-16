import { useCallback, useEffect, useState } from 'react';

/**
 * Hesap kilidi durumu ve kalan süre sayacı.
 *
 * Backend, ard arda hatalı şifre denemesinden sonra hesabı geçici olarak
 * kilitler ve 423 + { code: 'ACCOUNT_LOCKED', secondsLeft } döner. Giriş ve
 * hesap geri alma ekranlarının ikisi de bu yanıtı alabildiği için sayaç tek
 * yerde duruyor.
 *
 * Kalan süre SUNUCUDAN geldiği gibi kullanılır; yanıttaki lockedUntil alanı
 * saat dilimi taşımadığı için istemcide ayrıştırılırsa farklı saat dilimindeki
 * kullanıcıda geri sayım yanlış çıkar.
 */
export function useAccountLock() {
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [reason, setReason] = useState(null);

    /**
     * Giriş/geri alma sonucunu alır; bekleme gerektiren bir durum varsa sayacı
     * başlatır. İki durum aynı ekranda gösterilir:
     * - ACCOUNT_LOCKED: hesap ard arda hatalı şifreden kilitlendi (kimlik bazlı)
     * - TOO_MANY_REQUESTS: IP başına istek sınırı aşıldı (adres bazlı)
     * Kullanıcı açısından ikisi de "bir süre bekle" demek.
     */
    const captureLock = useCallback((result) => {
        const data = result?.data;
        const code = data?.code;

        // Kalıcı kilit: geri sayacak süre yok, tek çıkış yolu şifre sıfırlama.
        if (code === 'ACCOUNT_LOCKED_UNTIL_RESET') {
            setSecondsLeft(0);
            setReason(code);
            return true;
        }

        if (code !== 'ACCOUNT_LOCKED' && code !== 'TOO_MANY_REQUESTS') {
            return false;
        }
        // secondsLeft yoksa (eski backend) dakikadan türet, o da yoksa hiç sayma.
        const seconds = data.secondsLeft ?? (data.minutesLeft ? data.minutesLeft * 60 : 0);
        setSecondsLeft(Math.max(seconds, 0));
        setReason(code);
        return true;
    }, []);

    /**
     * Kilidi ekrandan kaldırır. Kilit HESABA aittir, tarayıcıya değil: kullanıcı
     * başka bir e-posta yazdığında uyarı ve kapalı form kalkmalı, aksi halde
     * kilitlenen hesap yüzünden aynı makineden başka hesaba da girilemiyordu.
     */
    const clearLock = useCallback(() => {
        setSecondsLeft(0);
        setReason(null);
    }, []);

    useEffect(() => {
        if (secondsLeft <= 0) return undefined;
        const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [secondsLeft]);

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    const untilReset = reason === 'ACCOUNT_LOCKED_UNTIL_RESET';

    return {
        // Kalıcı kilitte sayaç sıfırdır ama form yine kapalı kalmalı.
        locked: secondsLeft > 0 || untilReset,
        secondsLeft,
        /** "14:07" biçiminde kalan süre. */
        remaining: `${minutes}:${String(seconds).padStart(2, '0')}`,
        /** Ekranda hangi metnin gösterileceğini belirler. */
        rateLimited: reason === 'TOO_MANY_REQUESTS',
        untilReset,
        captureLock,
        clearLock
    };
}
