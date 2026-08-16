package com.survey.ai.security;

import com.survey.ai.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.stream.Collectors;

public class CustomUserDetails implements UserDetails {

    @Getter
    private final String id;
    private final String email;
    private final String password;
    private final Collection<? extends GrantedAuthority> authorities;
    private final boolean enabled;
    @Getter
    private final String name;

    public CustomUserDetails(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.password = user.getRealPassword(); // Şifrenin gerçek değerini alıyoruz
        // Şirket sahibinin onayını bekleyen çalışanın rolü henüz işlemez: yetkisiz
        // sayılır, böylece role bağlı tüm uçlar (anket, rapor, şirket) kapalı kalır;
        // yalnızca profil ve ayarlar gibi oturum yeten uçlara erişir.
        this.authorities = user.isMembershipPending()
                ? java.util.List.of()
                : user.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority(role))
                .collect(Collectors.toList());
        this.enabled = "ACTIVE".equals(user.getStatus());
        this.name = user.getName();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email; // Kullanıcı adı olarak email kullanıyoruz
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}

