package com.blissbeyond.repository;

import com.blissbeyond.entity.Role;
import com.blissbeyond.entity.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(RoleName name);
}
