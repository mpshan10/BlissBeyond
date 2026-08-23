package com.blissbeyond.repository;

import com.blissbeyond.entity.User;
import com.blissbeyond.entity.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findDistinctByRolesName(RoleName name);
}
