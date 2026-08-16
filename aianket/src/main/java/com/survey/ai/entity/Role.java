package com.survey.ai.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Kullanıcı rollerini temsil eden varlık sınıfı.
 * MongoDB'de 'roles' koleksiyonunda saklanır.
 */
@Document(collection = "roles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Role {

    @Id
    private String id;

    @Indexed(unique = true)
    private String name; // UserRole enum adları: ADMIN, COMPANY_OWNER, COMPANY_STAFF

    private String description;

    // Yetki seviyesi - daha yüksek sayı daha fazla yetkiyi temsil eder
    // ADMIN = 100, COMPANY_OWNER = 50, COMPANY_STAFF = 10
    private Integer authorityLevel;

    // Rol için özel izinler listesi (opsiyonel)
    // Örneğin: CREATE_USER, DELETE_RESTAURANT gibi
    private String[] permissions;
}
