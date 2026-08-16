import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { roleLabel, isSiteAdmin, homePath } from '../../utils/roles';
import reportAccessDenied from '../../utils/reportAccessDenied';

const LAST_PAGE_KEY = 'sonAcilanPanelSayfasi';

/** Kullanıcının en son görebildiği sayfa; yoksa rolünün açılış sayfası. */
const lastAllowedPage = (roles) => {
    try {
        return sessionStorage.getItem(LAST_PAGE_KEY) || homePath(roles);
    } catch {
        return homePath(roles);
    }
};

/**
 * Rol kontrolü. PrivateRoute yalnızca "giriş yapılmış mı" diye bakar; sayfanın
 * hangi role açık olduğu buradan geçer. Backend zaten 403 döner, bu katman
 * kullanıcının yetkisi olmayan ekranı hiç görmemesi içindir.
 *
 * Kullanım: <Route element={<RoleRoute allow={isSiteAdmin} deny="back" />}> ... </Route>
 *
 * redirectTo verilirse yetkisi olmayan kullanıcı uyarı görmez, kendi rolündeki
 * karşılığına yönlenir. Süper adminin şirket sayfasına düşmesi bir ihlal değil,
 * adres eşleşmesidir; uyarı ekranı göstermek ve denetim kaydı yazmak yanlış olur.
 * Hedef role göre değişiyorsa fonksiyon da verilebilir: redirectTo={homePath}.
 *
 * deny:
 *   'screen' (varsayılan) - "Bu sayfaya erişiminiz yok" ekranı. Şirket içi
 *      sayfalarda doğru olan budur: kullanıcı neden giremediğini öğrenir ve
 *      şirket sahibinden yetki isteyebilir.
 *   'back' - ekran gösterilmez, kullanıcı en son kaldığı sayfadan devam eder.
 *      Süper admin sayfaları için: şirket kullanıcısına o bölümün varlığını
 *      duyurmanın anlamı yok. Deneme yine kayda geçer.
 */
export default function RoleRoute({ allow, redirectTo, deny = 'screen', children }) {
    const { user, userProfile, isAuthenticated, loading } = useAuth();
    const location = useLocation();

    const roles = user?.roles || userProfile?.roles || [];
    const allowed = !loading && isAuthenticated && allow(roles);

    // Girilebilen her sayfa hatırlanır; yetkisiz denemeden sonra buraya dönülür.
    useEffect(() => {
        if (!allowed) {
            return;
        }
        try {
            sessionStorage.setItem(LAST_PAGE_KEY, location.pathname + location.search);
        } catch {
            // Depolama kapalıysa açılış sayfasına dönülür; akış bozulmaz.
        }
    }, [allowed, location.pathname, location.search]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    if (!allowed) {
        const target = typeof redirectTo === 'function' ? redirectTo(roles) : redirectTo;
        if (target && target !== location.pathname) {
            return <Navigate to={target} replace />;
        }
        return deny === 'back'
            ? <DeniedQuietly roles={roles} page={location.pathname} />
            : <AccessDenied roles={roles} page={location.pathname} />;
    }

    return children || <Outlet />;
}

/**
 * Sayfa burada kapatıldığı için backend'e hiçbir istek gitmiyor; deneme de
 * loglara düşmüyordu. Süper adminin görebilmesi için bildiriyoruz.
 *
 * Süper admin sistemdeki en yetkili roldür; onun bir şirket sayfasına düşmesi
 * güvenlik olayı değil, panelde kalmış bir yönlendirmedir. Kaydedilirse süper
 * admin kendi denetim listesini kendisi doldurur.
 */
const useReportDenial = (page, roles) => {
    useEffect(() => {
        if (isSiteAdmin(roles)) {
            return;
        }
        reportAccessDenied(page, roleLabel(roles));
    }, [page, roles]);
};

/** Kayıt tutulur, ekran gösterilmez: kullanıcı kaldığı yerden devam eder. */
function DeniedQuietly({ roles, page }) {
    useReportDenial(page, roles);
    return <Navigate to={lastAllowedPage(roles)} replace />;
}

function AccessDenied({ roles, page }) {
    useReportDenial(page, roles);

    return (
        <div className="mx-auto max-w-lg p-6">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
                <ShieldAlert size={40} strokeWidth={1.5} className="mx-auto text-amber-600" />
                <h1 className="mt-3 text-lg font-semibold text-gray-900">Bu sayfaya erişiminiz yok</h1>
                <p className="mt-2 text-sm text-gray-700">
                    Hesabınızın rolü <strong>{roleLabel(roles)}</strong>. Bu bölüm farklı bir yetki
                    gerektiriyor; erişim için şirket sahibinizle görüşün.
                </p>
                <a
                    href={homePath(roles)}
                    className="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
                >
                    Panele dön
                </a>
            </div>
        </div>
    );
}
