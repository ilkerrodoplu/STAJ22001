import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Tek footer: panel ve genel sayfalar aynı metni gösterir.
 * Bağlantıların içeriği süper adminin Site Yönetimi ekranından gelir.
 */
export default function AppFooter() {
    return (
        <div className="app-footer">
            <div className="footer-content">
                <div className="footer-copyright">
                    &copy; {new Date().getFullYear()} AI-UYAS Anket Sistemi. Tüm hakları saklıdır.
                </div>
                <div className="footer-links">
                    <Link to="/privacy">Gizlilik</Link>
                    <Link to="/terms">Kullanım Şartları</Link>
                    <Link to="/contact">İletişim</Link>
                </div>
            </div>
        </div>
    );
}
