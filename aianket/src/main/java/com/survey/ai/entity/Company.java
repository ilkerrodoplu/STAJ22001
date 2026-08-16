package com.survey.ai.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.survey.ai.enums.CompanyType;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Tüm şirket türleri için temel entity. Alt sınıflar aynı "company"
 * koleksiyonunda tutulur, Mongo türleri _class alanı ile ayırır.
 * CompanyType.OTHER seçildiğinde doğrudan bu sınıf (temel kalıp) kullanılır.
 */
@Document(collection = "company")
@Data
@NoArgsConstructor
public class Company {

    @Id
    private String id;

    @Indexed(unique = true)
    private String name;

    private String description;

    private String address;

    private String phone;

    private String email;

    private String website;

    private String logoUrl;

    private String coverImageUrl;

    private String status; // ACTIVE, INACTIVE

    /**
     * Çalışan kayıt kodu. Yalnızca şirket sahibine, ona ait uçtan gösterilir;
     * şirket listeleri herkese açık olduğu için JSON'da hiç yer almaz.
     */
    @JsonIgnore
    @Indexed(unique = true, sparse = true)
    private String inviteCode;

    /** Kayıt kodunun üretilme anı; kod kısa ömürlüdür (bkz. InviteCode.TTL_SECONDS). */
    @JsonIgnore
    private LocalDateTime inviteCodeUpdatedAt;

    /** Geçerli kodla açılan hesap sayısı; bkz. InviteCode.MAX_USES. Kod yenilenince sıfırlanır. */
    @JsonIgnore
    private int inviteCodeUses;

    @Indexed
    private CompanyType companyType;

    /** companyType == OTHER olduğunda kullanıcının yazdığı serbest metin. */
    private String companyTypeOther;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    /** Süper adminin dondurduğu şirket: kullanıcıları giriş yapamaz, anketleri yanıt almaz. */
    public static final String SUSPENDED = "SUSPENDED";

    public boolean isSuspended() {
        return SUSPENDED.equalsIgnoreCase(status);
    }

    /** Okunması/yazılması kolay, karıştırılabilir harf içermeyen 8 karakterlik çalışan kayıt kodu. */
    public static String newInviteCode() {
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // I, O, 0, 1 yok
        java.util.Random random = new java.security.SecureRandom();
        StringBuilder code = new StringBuilder(8);
        for (int i = 0; i < 8; i++) {
            code.append(alphabet.charAt(random.nextInt(alphabet.length())));
        }
        return code.toString();
    }

    /** Şirket türüne uygun entity örneği; OTHER ve tür belirtilmemiş kayıtlar temel sınıfı kullanır. */
    public static Company newInstance(CompanyType type) {
        Company company = switch (type == null ? CompanyType.OTHER : type) {
            case TECHNOLOGY -> new TechnologyCompany();
            case ECOMMERCE_RETAIL -> new EcommerceRetailCompany();
            case SERVICE -> new ServiceCompany();
            case RESTAURANT_CAFE -> new RestaurantCafeCompany();
            case OTHER -> new Company();
        };
        company.setCompanyType(type);
        return company;
    }

    /**
     * Şirket türüne ait hazır anket kalıbı. Alt sınıflar kendi sorularıyla ezer,
     * temel sınıf (OTHER) genel kalıbı döner.
     */
    public ReadySurveyTemplate defaultSurveyTemplate() {
        return template("Genel Müşteri Memnuniyet Anketi",
                "Her sektöre uyan temel memnuniyet kalıbı",
                CompanyType.GENERIC_CATEGORY,
                rating("Genel memnuniyetinizi nasıl değerlendirirsiniz?"),
                rating("Personelimizin ilgi ve yaklaşımından memnun musunuz?"),
                rating("Sunduğumuz ürün/hizmet kalitesini nasıl buluyorsunuz?"),
                choice("Bizi nereden duydunuz?",
                        "Arkadaş tavsiyesi", "İnternet / sosyal medya", "Reklam", "Tesadüfen"),
                text("Görüş ve önerileriniz"));
    }

    /**
     * Kalıp en fazla 5 soru içerir ve her soru türünden (RATING, MULTIPLE_CHOICE, TEXT)
     * en az bir soru bulunur; sıra numaraları burada verilir.
     */
    protected ReadySurveyTemplate template(String name, String description, String category,
                                           ReadySurveyTemplate.ReadyQuestionTemplate... questions) {
        if (questions.length > 5) {
            throw new IllegalArgumentException("Hazır kalıp en fazla 5 soru içerebilir: " + name);
        }

        List<ReadySurveyTemplate.ReadyQuestionTemplate> ordered = new ArrayList<>();
        for (ReadySurveyTemplate.ReadyQuestionTemplate question : questions) {
            question.setDisplayOrder(ordered.size());
            ordered.add(question);
        }

        ReadySurveyTemplate readySurveyTemplate = new ReadySurveyTemplate();
        readySurveyTemplate.setName(name);
        readySurveyTemplate.setDescription(description);
        readySurveyTemplate.setCategory(category);
        readySurveyTemplate.setActive(true);
        readySurveyTemplate.setQuestions(ordered);
        return readySurveyTemplate;
    }

    /** 1-5 yıldız sorusu. */
    protected static ReadySurveyTemplate.ReadyQuestionTemplate rating(String text) {
        return new ReadySurveyTemplate.ReadyQuestionTemplate(text, true, "RATING", null);
    }

    /** Çoktan seçmeli soru. */
    protected static ReadySurveyTemplate.ReadyQuestionTemplate choice(String text, String... options) {
        return new ReadySurveyTemplate.ReadyQuestionTemplate(
                text, true, "MULTIPLE_CHOICE", null, List.of(options));
    }

    /** Serbest metin sorusu; zorunlu değildir. */
    protected static ReadySurveyTemplate.ReadyQuestionTemplate text(String text) {
        return new ReadySurveyTemplate.ReadyQuestionTemplate(text, false, "TEXT", null);
    }
}
