import { useEffect, useState } from 'react';

/**
 * Koyu tema tek yerden yönetilir: sınıf <html>'e, tercih localStorage'a yazılır.
 * Hem panel hem genel sayfa düzeni aynı hook'u kullanır, böylece iki taraf
 * arasında gezinirken tema korunur.
 *
 * Düzen kaldırılırken sınıf da silinir: MUI tabanlı giriş/kayıt ekranları
 * koyu temayı desteklemiyor, sınıf <html>'de kalırsa yarı koyu görünüyorlar.
 */
export default function useDarkMode() {
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

    useEffect(() => {
        document.documentElement.classList.toggle('dark-mode', isDarkMode);
        return () => document.documentElement.classList.remove('dark-mode');
    }, [isDarkMode]);

    const toggleDarkMode = () => {
        setIsDarkMode(prev => {
            localStorage.setItem('theme', prev ? 'light' : 'dark');
            return !prev;
        });
    };

    return { isDarkMode, toggleDarkMode };
}
