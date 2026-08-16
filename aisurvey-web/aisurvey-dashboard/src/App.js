
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Müşteri Sayfaları
import SurveyPage from './pages/customer/SurveyPage';
import ThankYouPage from './pages/customer/ThankYouPage';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailed from './pages/PaymentFailed';
import SiteContentPage from './pages/SiteContentPage';

// Yönetici Sayfaları
import Login from './pages/admin/Login';
import ForgotPassword from './pages/admin/ForgotPassword';
import ResetPassword from './pages/admin/ResetPassword';
import AccountClosed from './pages/admin/AccountClosed';
import AdminDashboard from './pages/admin/AdminDashboard';
import CompanyList from './pages/admin/CompanyList';
import CompanyDetail from './pages/admin/CompanyDetail';
import SurveyTemplateList from './pages/admin/SurveyTemplateList';
import SurveyTemplateForm from './pages/admin/SurveyTemplateForm';
import ReportDashboard from './pages/admin/ReportDashboard';
import SurveyQRCodeGenerator from './pages/admin/SurveyQRCodeGenerator';
import SurveyReports from './components/SurveyReports';
import CommentsPage from './pages/admin/CommentsPage';
import NotificationsPage from './pages/admin/NotificationsPage';
import Profile from './pages/admin/Profile';
import Settings from './pages/admin/Settings';
import Employees from './pages/admin/Employees';
import JoinCompany from './pages/admin/JoinCompany';
import MyCompany from './pages/admin/MyCompany';
import Messages from './pages/admin/Messages';

// Süper Admin Sayfaları
import SuperAdminDashboard from './pages/admin/super/SuperAdminDashboard';
import SuperAdminUsers from './pages/admin/super/SuperAdminUsers';
import SuperAdminSurveys from './pages/admin/super/SuperAdminSurveys';
import SuperAdminCompanies from './pages/admin/super/SuperAdminCompanies';
import SuperAdminLogs from './pages/admin/super/SuperAdminLogs';
import SuperAdminAudit from './pages/admin/super/SuperAdminAudit';
import SuperAdminMessages from './pages/admin/super/SuperAdminMessages';
import SuperAdminNotifications from './pages/admin/super/SuperAdminNotifications';
import SuperAdminTeam from './pages/admin/super/SuperAdminTeam';
import SuperAdminSite from './pages/admin/super/SuperAdminSite';

// Layouts
import AdminLayout from './components/layouts/AdminLayout';
import PublicLayout from './components/layouts/PublicLayout';
import Register from './pages/admin/Register';

// Auth Guard
import PrivateRoute from './components/auth/PrivateRoute';
import RoleRoute from './components/auth/RoleRoute';
import {
    isSiteAdmin, isCompanyOwner, isCompanyUser, canEditSurveys, canShareSurveys,
    canViewResults, canMessageSiteAdmin, homePath
} from './utils/roles';

/** Şirket tarafının ortak sayfaları: süper admin hariç herkes. */
const notSiteAdmin = (roles) => !isSiteAdmin(roles);

function App() {
    return (
        <AuthProvider>
            {/* toast çağrıları hiçbir yerde render edilmiyordu; tek kap burada. */}
            <ToastContainer position="top-right" autoClose={4000} />
            <Router>
                <Routes>
                    {/* Müşteri Sayfaları - Public */}
                    <Route element={<PublicLayout />}>
                        <Route path="/survey/:encodedData" element={<SurveyPage />} />
                        <Route path="/thank-you/:encodedData" element={<ThankYouPage />} />
                        <Route path="/survey/join/:id" element={<SurveyTemplateForm />} />
                        <Route path="/payment/success" element={<PaymentSuccess/>}/>
                        <Route path="/payment/failed" element={<PaymentFailed/>}/>
                        {/* Footer bağlantıları; içerik süper adminin Site Yönetimi ekranından gelir. */}
                        <Route path="/privacy" element={<SiteContentPage section="privacyPolicy" />} />
                        <Route path="/terms" element={<SiteContentPage section="termsOfService" />} />
                        <Route path="/contact" element={<SiteContentPage section="contactInfo" />} />
                    </Route>

                    {/* Admin Giriş */}
                    <Route path="/admin/login" element={<Login />} />
                    <Route path="/admin/account-closed" element={<AccountClosed />} />
                    <Route path="/auth/register" element={<Register />} />
                    <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                    {/* E-postadaki bağlantı: /auth/reset-password?token=... */}
                    <Route path="/auth/reset-password" element={<ResetPassword />} />

                    {/* Admin Sayfaları - Private + NotificationProvider */}
                    <Route element={<PrivateRoute />}>
                        {/* Şirketsiz kullanıcının tek sayfası: menüsüz, tam ekran. */}
                        <Route path="/admin/join-company" element={<JoinCompany />} />
                        <Route element={
                            <NotificationProvider>
                                <AdminLayout />
                            </NotificationProvider>
                        }>
                            {/* Şirket tarafının ortak sayfaları. Süper adminin kendi
                                karşılıkları /admin/super/* altında; buraya düşerse
                                uyarı görmeden oraya yönlenir. Adresler ortak kaldığı
                                sürece süper admin farkında olmadan kendi "yetkisiz
                                erişim" listesini dolduruyordu. */}
                            {/* Panel müşteri verisi gösterir (ortalamalar, son yorumlar);
                                bu yüzden sonuç yetkisi olana açıktır. Anket hazırlayan
                                ve paylaşan uyarı görmeden kendi açılış sayfasına gider. */}
                            <Route element={<RoleRoute allow={canViewResults} redirectTo={homePath} />}>
                                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                            </Route>
                            <Route element={<RoleRoute allow={notSiteAdmin} redirectTo="/admin/super/profile" />}>
                                <Route path="/admin/profile" element={<Profile />} />
                            </Route>
                            <Route element={<RoleRoute allow={notSiteAdmin} redirectTo="/admin/super/settings" />}>
                                <Route path="/admin/settings" element={<Settings />} />
                            </Route>

                            {/* Anket listesi - şirketin kendi anketleri, müşteri verisi yok */}
                            <Route element={<RoleRoute allow={isCompanyUser} />}>
                                <Route path="/admin/survey-templates" element={<SurveyTemplateList />} />
                            </Route>

                            {/* Müşteri verisi - sahip ve görüntüleme yetkili çalışan.
                                Anket hazırlayan/paylaşan yorum ve yanıt görmez. */}
                            <Route element={<RoleRoute allow={canViewResults} />}>
                                <Route path="/admin/responses" element={<SurveyReports />} />
                                <Route path="/admin/reports" element={<ReportDashboard />} />
                                <Route path="/admin/notifications" element={<NotificationsPage />} />
                                <Route path="/admin/comments" element={<CommentsPage />} />
                            </Route>

                            {/* Site yönetimiyle yazışma şirket adınadır - yalnızca sahip */}
                            <Route element={<RoleRoute allow={canMessageSiteAdmin} />}>
                                <Route path="/admin/messages" element={<Messages />} />
                            </Route>

                            {/* Anket içeriği - sahip ve anket editörü */}
                            <Route element={<RoleRoute allow={canEditSurveys} />}>
                                <Route path="/admin/survey-templates/new" element={<SurveyTemplateForm />} />
                                <Route path="/admin/survey-templates/edit/:id" element={<SurveyTemplateForm />} />
                            </Route>

                            {/* QR/link paylaşımı - sahip, editör, paylaşan */}
                            <Route element={<RoleRoute allow={canShareSurveys} />}>
                                <Route path="/admin/qr-codes" element={<SurveyQRCodeGenerator />} />
                                <Route path="/admin/qr-generator" element={<SurveyQRCodeGenerator />} />
                            </Route>

                            {/* Şirket yönetimi - yalnızca şirket sahibi */}
                            <Route element={<RoleRoute allow={isCompanyOwner} />}>
                                <Route path="/admin/employees" element={<Employees />} />
                                <Route path="/admin/my-company" element={<MyCompany />} />
                                <Route path="/admin/company" element={<CompanyList />} />
                                <Route path="/admin/company/:id" element={<CompanyDetail />} />
                            </Route>

                            {/* Süper admin paneli - backend de ADMIN rolüne kilitlidir.
                                Panel, profil ve ayarlar dahil süper adminin gördüğü
                                her sayfa bu ön ek altındadır; şirket tarafıyla ortak
                                adres kalmadı.

                                deny="back": şirket kullanıcısı bu adreslerden birine
                                geldiğinde uyarı ekranı görmez, kaldığı sayfadan devam
                                eder - site yönetimi bölümünün varlığını duyurmanın
                                anlamı yok. Deneme süper adminin kaydına yine düşer. */}
                            <Route element={<RoleRoute allow={isSiteAdmin} deny="back" />}>
                                <Route path="/admin/super/dashboard" element={<SuperAdminDashboard />} />
                                <Route path="/admin/super/profile" element={<Profile />} />
                                <Route path="/admin/super/settings" element={<Settings />} />
                                <Route path="/admin/super/users" element={<SuperAdminUsers />} />
                                <Route path="/admin/super/surveys" element={<SuperAdminSurveys />} />
                                <Route path="/admin/super/companies" element={<SuperAdminCompanies />} />
                                <Route path="/admin/super/audit" element={<SuperAdminAudit />} />
                                <Route path="/admin/super/logs" element={<SuperAdminLogs />} />
                                <Route path="/admin/super/messages" element={<SuperAdminMessages />} />
                                <Route path="/admin/super/notifications" element={<SuperAdminNotifications />} />
                                <Route path="/admin/super/team" element={<SuperAdminTeam />} />
                                <Route path="/admin/super/site" element={<SuperAdminSite />} />
                            </Route>

                            {/* Üyelik planları artık Ayarlar > Abonelik sekmesinde;
                                eski link/bookmark'lar oraya yönlensin. */}
                            <Route path="/admin/plans" element={<Navigate to="/admin/settings" replace />} />
                        </Route>
                    </Route>

                    {/* Yönlendirmeler */}
                    <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="/" element={<Navigate to="/admin/login" replace />} />
                    {/* 404 fallback */}
                    <Route path="*" element={<Login/>}/>
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
