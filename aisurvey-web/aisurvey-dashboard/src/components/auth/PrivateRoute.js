
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isPendingMember, needsCompany, PENDING_MEMBER_PATHS } from '../../utils/roles';

const JOIN_PATH = '/admin/join-company';

const PrivateRoute = () => {
    const { currentUser, userProfile, loading, isAuthenticated } = useAuth();
    const location = useLocation();

    // Debug için logla
    console.log('PrivateRoute: Kontrol ediliyor', {
        path: location.pathname,
        authenticated: isAuthenticated,
        currentUser: !!currentUser,
        loading,
        token: !!localStorage.getItem('token')
    });

    // Eğer kimlik doğrulama durumu yükleniyor ise, bir yükleme göstergesi göster
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <p className="ml-3 text-blue-600">Kimlik doğrulanıyor...</p>
            </div>
        );
    }

    // Eğer kullanıcı giriş yapmadıysa, login sayfasına yönlendir
    if (!isAuthenticated) {
        console.log('PrivateRoute: Kimlik doğrulanmadı, login sayfasına yönlendiriliyor');
        // Burada denetim kaydı YAZILMAZ. Oturumsuz panel adresi denemesi bir
        // güvenlik olayı değil: backend'e istek gitmez, veri açılmaz, router
        // login'e yönlendirir. Kayıt yazıldığında ise oturumu biten (çıkış
        // yapan ya da token'ı düşen) kullanıcının o an açık olan sayfası
        // "kayıtsız ziyaretçi erişmeye çalıştı" diye listeye düşüyordu.
        // Gerçek sinyal RoleRoute'ta: oturumu olan birinin yetkisi olmayan
        // sayfayı denemesi.
        // Mevcut konumu state'de sakla, böylece login sonrası geri dönülebilir
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    // Şirketi olmayan kullanıcı (çıkarılan/reddedilen çalışan): panel yerine
    // kayıt kodu ekranı. Hesabı duruyor, yalnızca bağlı olduğu şirket yok.
    const user = currentUser || userProfile;
    if (needsCompany(user) && location.pathname !== JOIN_PATH) {
        return <Navigate to={JOIN_PATH} replace />;
    }

    // Katılımı onay bekleyen çalışan yalnızca profilini ve ayarlarını görür;
    // backend de aynı kuralı uygular (bkz. CustomUserDetails).
    if (isPendingMember(user) && !PENDING_MEMBER_PATHS.includes(location.pathname)) {
        return <Navigate to={PENDING_MEMBER_PATHS[0]} replace />;
    }

    // Kullanıcı giriş yaptıysa, istenen route'a erişime izin ver
    console.log('PrivateRoute: Kimlik doğrulandı, erişim izni verildi');
    return <Outlet />;
};

export default PrivateRoute;
