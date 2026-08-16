package com.survey.ai.repository;

import com.survey.ai.entity.SiteSetting;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SiteSettingRepository extends MongoRepository<SiteSetting, String> {

    Optional<SiteSetting> findByAdminInviteCode(String adminInviteCode);
}
