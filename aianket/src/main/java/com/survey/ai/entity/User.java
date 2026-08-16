package com.survey.ai.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Document(collection = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id;

    private String name;
    private String lastName;

    @Indexed(unique = true)
    private String email;

    @JsonIgnore // ✅ JSON'da password alanını tamamen gizle
    private String password;

    private String phone;

    private String address;

    private String status; // ACTIVE, INACTIVE, SUSPENDED

    private Set<String> roles = new HashSet<>();

    private String companyId;

    /**
     * Şirkete katılım onayı: PENDING (şirket sahibinin onayını bekliyor) ya da
     * APPROVED. Şirkete bağlı olmayan kullanıcıda (çıkarılan/reddedilen) null'dır.
     */
    private String membershipStatus;

    private String avatar;

    /** Hesap kapatma anı; 1 yıl içinde geri alınmazsa gece çalışan görev hesabı siler. */
    private LocalDateTime deactivatedAt;

    /** Sıradaki kilide kalan hatalı deneme sayacı; kilitlenince ve başarılı girişte sıfırlanır. */
    private int failedLoginAttempts;

    /**
     * Bu seride hesabın kaç kez kilitlendiği. Her kilit süreyi katlar
     * (bkz. AuthService.lockEscalationFactor); başarılı girişte sıfırlanır.
     */
    private int lockCount;

    /** Bu ana kadar giriş denemeleri reddedilir; süresi dolunca kilit kendiliğinden açılır. */
    private LocalDateTime lockedUntil;

    /**
     * Israrlı denemeden sonraki son aşama: kilit kendiliğinden AÇILMAZ, yalnızca
     * şifre sıfırlanınca kalkar. Kullanıcıya sıfırlama bağlantısı e-postayla gider.
     */
    private boolean lockedUntilPasswordReset;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // ✅ User aktif mi kontrol et
    public boolean isActive() {
        return "ACTIVE".equalsIgnoreCase(this.status);
    }

    // ✅ User admin mi kontrol et
    public boolean isAdmin() {
        return this.roles != null && (
                this.roles.contains("ADMIN") ||
                        this.roles.contains("ROLE_ADMIN") ||
                        this.roles.contains("SUPER_ADMIN")
        );
    }

    /** Şirket sahibi henüz onaylamadı: yalnızca profil ve ayarlarını görebilir. */
    public boolean isMembershipPending() {
        return "PENDING".equals(membershipStatus);
    }

    /** Çok fazla hatalı denemeden dolayı giriş kilitli mi (geçici ya da kalıcı). */
    public boolean isLoginLocked() {
        return lockedUntilPasswordReset
                || (lockedUntil != null && lockedUntil.isAfter(LocalDateTime.now()));
    }

    /** Hatalı giriş sayaçlarını ve kilidi tamamen temizler. */
    public void clearLoginLock() {
        this.failedLoginAttempts = 0;
        this.lockCount = 0;
        this.lockedUntil = null;
        this.lockedUntilPasswordReset = false;
    }

    // ✅ Belirli role sahip mi kontrol et
    public boolean hasRole(String role) {
        return this.roles != null && this.roles.contains(role);
    }

    // ✅ Role ekle
    public void addRole(String role) {
        if (this.roles == null) {
            this.roles = new HashSet<>();
        }
        this.roles.add(role);
    }

    // ✅ Role çıkar
    public void removeRole(String role) {
        if (this.roles != null) {
            this.roles.remove(role);
        }
    }

    // ✅ Full name al
    public String getFullName() {
        if (name != null && lastName != null) {
            return name + " " + lastName;
        } else if (name != null) {
            return name;
        } else if (lastName != null) {
            return lastName;
        }
        return email; // Fallback to email
    }

    // ✅ User suspended mi?
    public boolean isSuspended() {
        return "SUSPENDED".equalsIgnoreCase(this.status);
    }

    // ✅ User inactive mi?
    public boolean isInactive() {
        return "INACTIVE".equalsIgnoreCase(this.status);
    }

    // ✅ Status set etmek için helper metodlar
    public void activate() {
        this.status = "ACTIVE";
    }

    public void deactivate() {
        this.status = "INACTIVE";
    }

    public void suspend() {
        this.status = "SUSPENDED";
    }

    // ✅ Password güvenliği - JSON seriyalizasyonunda tamamen gizle
    @JsonIgnore
    public String getPassword() {
        return password;
    }

    // ✅ Gerçek şifreyi almak için özel metot (sadece backend'de kullan)
    @JsonIgnore
    public String getRealPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    // ✅ Company owner mi kontrol et
    public boolean ownsCompany(String companyId) {
        return this.companyId != null && this.companyId.equals(companyId);
    }

    // ✅ toString'de password'ü gizle
    @Override
    public String toString() {
        return "User{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", lastName='" + lastName + '\'' +
                ", email='" + email + '\'' +
                ", phone='" + phone + '\'' +
                ", status='" + status + '\'' +
                ", roles=" + roles +
                ", companyId='" + companyId + '\'' +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                '}';
    }

    // ✅ Equality check - email üzerinden
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;

        User user = (User) o;
        return email != null ? email.equals(user.email) : user.email == null;
    }

    @Override
    public int hashCode() {
        return email != null ? email.hashCode() : 0;
    }
}