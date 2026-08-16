package com.survey.ai.enums;

/**
 * Sistemdeki üç rol. User.roles içinde enum adı (String) olarak saklanır,
 * roles koleksiyonundaki Role kayıtları da buradan üretilir.
 */
public enum UserRole {

    /** Site admini - tüm şirketlere ve sistem ayarlarına erişir. */
    ADMIN(100, "Site yöneticisi - tüm sisteme erişim", new String[] {
            "CREATE_USER", "READ_USER", "UPDATE_USER", "DELETE_USER",
            "CREATE_COMPANY", "READ_COMPANY", "UPDATE_COMPANY", "DELETE_COMPANY",
            "CREATE_TEMPLATE", "READ_TEMPLATE", "UPDATE_TEMPLATE", "DELETE_TEMPLATE",
            "READ_RESPONSE", "DELETE_RESPONSE",
            "CREATE_REPORT", "READ_REPORT"
    }),

    /** Şirket sahibi - kayıt olan kullanıcı bu rolü alır, sadece kendi şirketini yönetir. */
    COMPANY_OWNER(50, "Şirket sahibi - kendi şirketine tam erişim", new String[] {
            "CREATE_USER", "READ_USER", "UPDATE_USER", "DELETE_USER",
            "READ_COMPANY", "UPDATE_COMPANY",
            "CREATE_TEMPLATE", "READ_TEMPLATE", "UPDATE_TEMPLATE", "DELETE_TEMPLATE",
            "READ_RESPONSE", "DELETE_RESPONSE",
            "CREATE_REPORT", "READ_REPORT"
    }),

    /** Anket editörü - anket oluşturur/düzenler; onay gerekmez, sahibe bildirim gider. */
    SURVEY_EDITOR(30, "Anket editörü - anketleri hazırlar, yaptığı işler sahibe bildirilir", new String[] {
            "READ_COMPANY",
            "CREATE_TEMPLATE", "READ_TEMPLATE", "UPDATE_TEMPLATE"
    }),

    /** Anketi paylaşan - yayındaki anketleri QR/link ile paylaşır, içeriğe dokunamaz. */
    SURVEY_SHARER(20, "Anketi paylaşan - QR ve link paylaşımı", new String[] {
            "READ_COMPANY",
            "READ_TEMPLATE",
            "SHARE_TEMPLATE"
    }),

    /** Şirket çalışanı - şirket sahibinin eklediği kullanıcı, okuma ağırlıklı. */
    COMPANY_STAFF(10, "Şirket çalışanı - sınırlı erişim", new String[] {
            "READ_COMPANY",
            "READ_TEMPLATE",
            "READ_RESPONSE",
            "READ_REPORT"
    });

    /** Şirket sahibinin çalışanlarına atayabileceği roller. */
    public static final java.util.Set<UserRole> ASSIGNABLE_STAFF_ROLES =
            java.util.Set.of(COMPANY_STAFF, SURVEY_EDITOR, SURVEY_SHARER);

    private final int authorityLevel;
    private final String description;
    private final String[] permissions;

    UserRole(int authorityLevel, String description, String[] permissions) {
        this.authorityLevel = authorityLevel;
        this.description = description;
        this.permissions = permissions;
    }

    public int getAuthorityLevel() {
        return authorityLevel;
    }

    public String getDescription() {
        return description;
    }

    public String[] getPermissions() {
        return permissions.clone();
    }
}
