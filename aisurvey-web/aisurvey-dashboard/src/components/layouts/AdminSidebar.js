
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    X,
    Home,
    Building2,
    FileText,
    MessageSquare,
    BellRing,
    QrCode,
    User,
    Users,
    Settings,
    LogOut,
    Sun,
    Moon,
    MessageCircle,
    ShieldAlert,
    ShieldCheck,
    ScrollText,
    ClipboardList,
    Globe
} from 'lucide-react';
import { isSiteAdmin, isCompanyOwner, canShareSurveys, canViewResults, isPendingMember } from '../../utils/roles';

const AdminSidebar = ({
                          isSidebarOpen,
                          closeSidebar,
                          userProfile,
                          unreadCount,
                          isDarkMode,
                          toggleDarkMode,
                          handleLogout
                      }) => {
    const navigate = useNavigate();

    // Menü rollere göre kurulur: paylaşan rolü QR görür, sahip çalışanlarını yönetir,
    // site admini süper admin bölümünü görür.
    const roles = userProfile?.roles || [];
    // Katılımı onay bekleyen çalışanın rolü henüz işlemez: menüde yalnızca
    // profil ve ayarlar kalır, rota ve backend de aynı kuralı uygular.
    const pending = isPendingMember(userProfile);
    const siteAdmin = isSiteAdmin(roles);
    const owner = isCompanyOwner(roles);
    const sharer = canShareSurveys(roles);
    // Menü rota kurallarıyla aynı olmalı; olmayan yetkinin linki görünürse
    // kullanıcı her tıklamada "erişiminiz yok" ekranına çarpıyor.
    const results = canViewResults(roles);

    // Süper admin şirket işlerini görmez: anket şablonu, rapor, yorum, QR menüde yok.
    // Gördüğü her sayfa /admin/super/* altındadır; şirket adresleriyle ortak link kalmaz.
    const navigationItems = pending ? [] : siteAdmin ? [
        {
            path: '/admin/super/dashboard',
            icon: Home,
            label: 'Panel',
            exact: true
        }
    ] : [
        ...(results ? [{
            path: '/admin/dashboard',
            icon: Home,
            label: 'Dashboard',
            exact: true
        }] : []),
        {
            path: '/admin/survey-templates',
            icon: FileText,
            label: 'Anketlerim',
            exact: false
        },
        ...(results ? [{
            path: '/admin/responses',
            icon: MessageSquare,
            label: 'Anket Raporları',
            exact: false
        }, {
            path: '/admin/comments',
            icon: MessageCircle,
            label: 'Yorumlar',
            exact: true
        }] : []),
        ...(sharer ? [{
            path: '/admin/qr-generator',
            icon: QrCode,
            label: 'QR Oluşturucu',
            exact: true
        }] : []),
        ...(results ? [{
            path: '/admin/notifications',
            icon: BellRing,
            label: 'Bildirimler',
            exact: true,
            badge: unreadCount
        }] : []),
        ...(owner ? [{
            path: '/admin/messages',
            icon: MessageCircle,
            label: 'Site Yönetimi',
            exact: true
        }] : []),
        ...(owner ? [{
            path: '/admin/employees',
            icon: Users,
            label: 'Çalışanlarım',
            exact: true
        }, {
            path: '/admin/my-company',
            icon: Building2,
            label: 'Şirketim',
            exact: true
        }] : [])
    ];

    // Süper admin bölümü - yalnızca site admini görür (backend de ADMIN'e kilitli).
    const adminOnlyItems = siteAdmin && !pending ? [
        {
            path: '/admin/super/users',
            icon: Users,
            label: 'Kayıtlı Kullanıcılar',
            exact: true
        },
        {
            path: '/admin/super/surveys',
            icon: ShieldAlert,
            label: 'Tüm Anketler',
            exact: true
        },
        {
            path: '/admin/super/companies',
            icon: Building2,
            label: 'Şirket Yönetimi',
            exact: true
        },
        {
            path: '/admin/super/messages',
            icon: MessageCircle,
            label: 'Şirket Mesajları',
            exact: true
        },
        {
            path: '/admin/super/notifications',
            icon: BellRing,
            label: 'Bildirimler',
            exact: true
        },
        {
            path: '/admin/super/audit',
            icon: ClipboardList,
            label: 'İşlem Kayıtları',
            exact: true
        },
        {
            path: '/admin/super/logs',
            icon: ScrollText,
            label: 'Site Logları',
            exact: true
        },
        {
            path: '/admin/super/team',
            icon: ShieldCheck,
            label: 'Süper Admin Ekibi',
            exact: true
        },
        {
            path: '/admin/super/site',
            icon: Globe,
            label: 'Site Yönetimi',
            exact: true
        }
    ] : [];

    // Üyelik planları artık Ayarlar > Abonelik sekmesinde.
    const settingsItems = [
        {
            path: siteAdmin ? '/admin/super/profile' : '/admin/profile',
            icon: User,
            label: 'Profil',
            exact: true
        },
        {
            path: siteAdmin ? '/admin/super/settings' : '/admin/settings',
            icon: Settings,
            label: 'Ayarlar',
            exact: true
        }
    ];

    const isActive = (path, exact) => {
        const currentPath = window.location.pathname;
        return exact ? currentPath === path : currentPath.includes(path);
    };

    const handleNavigation = (path) => {
        navigate(path);
        closeSidebar();
    };

    return (
        <>
            {/* Sidebar Overlay - Mobile */}
            {isSidebarOpen && window.innerWidth < 768 && (
                <div className="sidebar-overlay" onClick={closeSidebar}></div>
            )}

            {/* Sidebar */}
            <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo">
                         <QrCode size={24} />
                        <span>AI ANKET ANALIZ</span>
                    </div>
                    <button className="close-sidebar-btn" onClick={closeSidebar}>
                        <X size={24} />
                    </button>
                </div>

                <div className="sidebar-nav">
                    <ul className="nav-menu">
                        {/* Ana navigasyon öğeleri */}
                        {navigationItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <li key={item.path} className="nav-item">
                                    <a
                                        href={item.path}
                                        className={isActive(item.path, item.exact) ? 'active' : ''}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleNavigation(item.path);
                                        }}
                                    >
                                        <Icon size={20} />
                                        <span>{item.label}</span>
                                        {item.badge && item.badge > 0 && (
                                            <span className="nav-badge">{item.badge}</span>
                                        )}
                                    </a>
                                </li>
                            );
                        })}

                        {/* Süper admin öğeleri (liste zaten role göre kurulur) */}
                        {adminOnlyItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <li key={item.path} className="nav-item">
                                    <a
                                        href={item.path}
                                        className={isActive(item.path, item.exact) ? 'active' : ''}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleNavigation(item.path);
                                        }}
                                    >
                                        <Icon size={20} />
                                        <span>{item.label}</span>
                                    </a>
                                </li>
                            );
                        })}

                        {/* Ayarlar */}
                        {settingsItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <li key={item.path} className="nav-item">
                                    <a
                                        href={item.path}
                                        className={isActive(item.path, item.exact) ? 'active' : ''}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleNavigation(item.path);
                                        }}
                                    >
                                        <Icon size={20} />
                                        <span>{item.label}</span>
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="sidebar-footer">
                    <button className="theme-toggle-btn" onClick={toggleDarkMode}>
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        <span>{isDarkMode ? 'Açık Tema' : 'Koyu Tema'}</span>
                    </button>

                    <button className="logout-btn" onClick={handleLogout}>
                        <LogOut size={20} />
                        <span>Çıkış Yap</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default AdminSidebar;
