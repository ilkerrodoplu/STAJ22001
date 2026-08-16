package com.survey.ai.security;


import com.survey.ai.entity.User;
import com.survey.ai.repository.UserRepository;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtTokenProvider {

    private final CustomUserDetailsService userDetailsService;
    private final UserRepository userRepository;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-minutes}")
    private int jwtExpirationInMinutes;

    @Value("${app.jwt.refresh-expiration-days}")
    private int refreshExpirationInDays;

    // JWT token oluşturma
    public String generateToken(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        Date now = new Date();
        // Çarpım long üzerinden: int aritmetiği ~35800 dakikadan sonra taşıp
        // geçmiş bir tarih üretiyordu, yani token doğduğu anda ölü oluyordu.
        Date expiryDate = new Date(now.getTime() + TimeUnit.MINUTES.toMillis(jwtExpirationInMinutes));

        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));

        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        return Jwts.builder()
                .setSubject(userDetails.getUsername()) // getUsername metodu email'i döndürür
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .claim("id", userDetails.getId())
                .claim("name", userDetails.getName())
                .claim("roles", roles)
                .signWith(key, SignatureAlgorithm.HS512)
                .compact();
    }

    // Refresh token oluşturma
    public String generateRefreshToken(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        Date now = new Date();
        // Bkz. generateToken: int çarpımı 25 günden sonra taşıyordu.
        Date expiryDate = new Date(now.getTime() + TimeUnit.DAYS.toMillis(refreshExpirationInDays));

        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));

        return Jwts.builder()
                .setSubject(userDetails.getUsername())
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .claim("id", userDetails.getId())
                .claim("tokenType", "refresh")
                .signWith(key, SignatureAlgorithm.HS512)
                .compact();
    }

    // JWT token'dan Authentication nesnesi oluşturma
    public Authentication getAuthentication(String token) {
        Claims claims = parseToken(token);

        Collection<? extends GrantedAuthority> authorities =
                ((List<String>) claims.get("roles")).stream()
                        .map(SimpleGrantedAuthority::new)
                        .collect(Collectors.toList());

        UserDetails userDetails = userDetailsService.loadUserByUsername(claims.getSubject());

        return new UsernamePasswordAuthenticationToken(userDetails, "", authorities);
    }

    /**
     * Token gerçekten refresh token mı. Erişim token'ında bu claim yoktur;
     * kontrol edilmezse eldeki erişim token'ıyla süresiz yenileme yapılabilir.
     */
    public boolean isRefreshToken(String token) {
        try {
            return "refresh".equals(parseToken(token).get("tokenType"));
        } catch (Exception e) {
            return false;
        }
    }

    // JWT token'dan kullanıcı e-postası çıkarma
    public String getEmailFromJWT(String token) {
        Claims claims = parseToken(token);
        return claims.getSubject();
    }

    // JWT token'dan kullanıcı ID'sini çıkarma
    public String getUserIdFromJWT(String token) {
        Claims claims = parseToken(token);
        return (String) claims.get("id");
    }

    // JWT token'dan yetkileri (rolleri) çıkarma
    @SuppressWarnings("unchecked")
    public Collection<? extends GrantedAuthority> getAuthorities(String token) {
        Claims claims = parseToken(token);
        List<String> roles = (List<String>) claims.get("roles");

        if (roles == null) {
            // Eğer roller yoksa (örneğin refresh token'da), kullanıcıyı veritabanından alıp rolleri çıkar
            String userId = (String) claims.get("id");
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

            return user.getRoles().stream()
                    .map(SimpleGrantedAuthority::new)
                    .collect(Collectors.toList());
        }

        return roles.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
    }

    // Token parse etme
    private Claims parseToken(String token) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));

        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    // JWT token doğrulama
    public boolean validateToken(String token) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (SignatureException ex) {
            System.err.println("Invalid JWT signature");
        } catch (MalformedJwtException ex) {
            System.err.println("Invalid JWT token");
        } catch (ExpiredJwtException ex) {
            System.err.println("Expired JWT token");
        } catch (UnsupportedJwtException ex) {
            System.err.println("Unsupported JWT token");
        } catch (IllegalArgumentException ex) {
            System.err.println("JWT claims string is empty");
        }
        return false;
    }


    // ✅ Company ID çıkarma metodu ekle
    public String getCompanyIdFromJWT(String token) {
        try {
            Claims claims = parseToken(token);
            // User ID'den company ID'yi al
            String userId = (String) claims.get("id");
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
            return user.getCompanyId();
        } catch (Exception e) {
            log.error("Error extracting company ID from token: {}", e.getMessage());
            return null;
        }
    }

    // ✅ Bearer prefix kaldırma metodu ekle
    public String extractToken(String bearerToken) {
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return bearerToken;
    }

    // ✅ User name çıkarma metodu ekle
    public String getUserNameFromJWT(String token) {
        try {
            Claims claims = parseToken(token);
            return (String) claims.get("name");
        } catch (Exception e) {
            log.error("Error extracting user name from token: {}", e.getMessage());
            return null;
        }
    }

    // ✅ Token expire check metodu ekle
    public boolean isTokenExpired(String token) {
        try {
            Claims claims = parseToken(token);
            return claims.getExpiration().before(new Date());
        } catch (Exception e) {
            return true; // Hata durumunda expired say
        }
    }


}
