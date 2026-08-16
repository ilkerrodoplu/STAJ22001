import React from 'react';
import { Outlet } from 'react-router-dom';
import { QrCode, Sun, Moon } from 'lucide-react';
import useDarkMode from '../../hooks/useDarkMode';
import AppFooter from './AppFooter';

/**
 * Panel dışı sayfaların düzeni: anket doldurma, teşekkür, gizlilik, kullanım
 * şartları, iletişim. Panelle aynı yüzey değişkenlerini ve aynı footer'ı
 * kullanır; başlıktaki düğmeyle koyu/açık tema seçilebilir.
 *
 * Marka alanı bilerek link değildir: "/" girişe yönlendiriyor, ziyaretçi
 * sözleşme sayfasından çıkarken giriş ekranına düşüyordu.
 */
export default function PublicLayout() {
    const { isDarkMode, toggleDarkMode } = useDarkMode();

    return (
        <div className="public-layout">
            <header className="public-header">
                <div className="public-brand">
                    <QrCode size={22} />
                    <span>
                        AI-UYAS
                        <small>Anket Sistemi</small>
                    </span>
                </div>

                <div className="public-header-actions">

                    <button
                        type="button"
                        className="public-theme-btn"
                        onClick={toggleDarkMode}
                        title={isDarkMode ? 'Açık temaya geç' : 'Koyu temaya geç'}
                    >
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        <span>{isDarkMode ? 'Açık Tema' : 'Koyu Tema'}</span>
                    </button>
                </div>
            </header>

            <main className="public-main">
                <Outlet />
            </main>

            <AppFooter />
        </div>
    );
}
