package com.college.quizportal.repository;

import com.college.quizportal.model.Role;
import com.college.quizportal.model.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(RoleName name);
}
