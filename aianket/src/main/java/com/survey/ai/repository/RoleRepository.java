package com.survey.ai.repository;


import com.survey.ai.entity.Role;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Role varlığı için MongoDB repository arayüzü.
 * Rol ile ilgili veritabanı işlemlerini gerçekleştirir.
 */
@Repository
public interface RoleRepository extends MongoRepository<Role, String> {

    /**
     * Belirtilen isimle rol arar
     *
     * @param name Rol adı (örn. "ADMIN", "MANAGER", "STAFF")
     * @return İsteğe bağlı rol nesnesi
     */
    Optional<Role> findByName(String name);

    /**
     * Yetki seviyesinden daha büyük veya eşit yetkiye sahip rolleri döndürür
     *
     * @param authorityLevel Minimum yetki seviyesi
     * @return Belirtilen yetki seviyesinden daha yüksek veya eşit yetkiye sahip roller
     */
    List<Role> findByAuthorityLevelGreaterThanEqual(Integer authorityLevel);

    /**
     * Belirtilen isimle rolün var olup olmadığını kontrol eder
     *
     * @param name Rol adı
     * @return Rol varsa true, yoksa false
     */
    boolean existsByName(String name);
}
