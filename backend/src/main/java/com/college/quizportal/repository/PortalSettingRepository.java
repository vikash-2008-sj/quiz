package com.college.quizportal.repository;

import com.college.quizportal.model.PortalSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PortalSettingRepository extends JpaRepository<PortalSetting, Long> {
    Optional<PortalSetting> findTopByOrderByIdAsc();
}
