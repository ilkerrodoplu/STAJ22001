// Backend'deki UserRole enum'u ile birebir.
export const ROLE_LABELS = {
    ADMIN: 'Site Admini',
    COMPANY_OWNER: 'Şirket Sahibi',
    SURVEY_EDITOR: 'Anket Editörü',
    SURVEY_SHARER: 'Anketi Paylaşan',
    COMPANY_STAFF: 'Şirket Çalışanı'
};

/** Şirket sahibinin çalışanlarına atayabildiği roller (backend ASSIGNABLE_STAFF_ROLES). */
export const STAFF_ROLES = [
    { value: 'SURVEY_EDITOR', label: ROLE_LABELS.SURVEY_EDITOR, description: 'Anket oluşturur ve düzenler; onayınız gerekmez, yaptığı iş size bildirilir.' },
    { value: 'SURVEY_SHARER', label: ROLE_LABELS.SURVEY_SHARER, description: 'Yayındaki anketleri QR ve link ile paylaşır.' },
    { value: 'COMPANY_STAFF', label: ROLE_LABELS.COMPANY_STAFF, description: 'Yalnızca görüntüleme yetkisi.' }
];

export const roleLabel = (roles = []) => {
    const match = (roles || []).find(role => ROLE_LABELS[role]);
    return match ? ROLE_LABELS[match] : 'Şirket Çalışanı';
};

const has = (roles, role) => (roles || []).includes(role);

// Bu yardımcılar backend'deki SecurityService ile birebir aynı kuralları uygular:
// süper admin denetler, şirket içeriğine dokunmaz.

/** Site admini (süper admin): tüm sistemi denetler, hiçbir şirkete bağlı değildir. */
export const isSiteAdmin = (roles = []) => has(roles, 'ADMIN');

/** Şirket sahibi: şirket bilgisi, çalışan yönetimi ve anket onayı yetkisi. */
export const isCompanyOwner = (roles = []) => has(roles, 'COMPANY_OWNER');

/** Anket oluşturma/düzenleme: yalnızca sahip ve anket editörü (süper admin hariç). */
export const canEditSurveys = (roles = []) => isCompanyOwner(roles) || has(roles, 'SURVEY_EDITOR');

/** QR/link paylaşımı: sahip, editör ve paylaşan rolü. */
export const canShareSurveys = (roles = []) => canEditSurveys(roles) || has(roles, 'SURVEY_SHARER');

/** Şirkete bağlı herhangi bir kullanıcı; süper admin bu sayfaların dışındadır. */
export const isCompanyUser = (roles = []) =>
    canShareSurveys(roles) || has(roles, 'COMPANY_STAFF');

/**
 * Müşteri verisi (panel, raporlar, yorumlar, bildirimler) yalnızca şirket
 * sahibinde ve görüntüleme yetkili çalışanda. Anketi hazırlayan ve paylaşan
 * kendi işini yapar; müşteri yorumlarını görmesi gerekmez.
 */
export const canViewResults = (roles = []) =>
    isCompanyOwner(roles) || has(roles, 'COMPANY_STAFF');

/** Site yönetimiyle yazışma şirket adına yapılır; sahibin işidir. */
export const canMessageSiteAdmin = (roles = []) => isCompanyOwner(roles);

/**
 * Katılımı şirket sahibinin onayını bekleyen çalışan. Rolü henüz işlemez;
 * yalnızca profil ve ayarlar sayfalarını görür (backend de aynı kuralı uygular).
 */
export const isPendingMember = (user) => user?.membershipStatus === 'PENDING';

/** Şirketi olmayan kullanıcı (çıkarılan/reddedilen): kayıt kodu ekranına gider. */
export const needsCompany = (user) =>
    Boolean(user) && !isSiteAdmin(user.roles) && !user.companyId;

/** Onay bekleyen çalışanın girebildiği tek sayfalar. */
export const PENDING_MEMBER_PATHS = ['/admin/profile', '/admin/settings'];

/**
 * Rolün açılış sayfası. Herkesin panele düşmesi, yetkisi olmayanı "erişiminiz
 * yok" ekranına çarptırıyordu; herkes kendi işinin başladığı sayfaya gider.
 */
export const homePath = (roles = []) => {
    if (isSiteAdmin(roles)) return '/admin/super/dashboard';
    if (canViewResults(roles)) return '/admin/dashboard';
    if (canShareSurveys(roles)) return '/admin/survey-templates';
    return '/admin/profile';
};
