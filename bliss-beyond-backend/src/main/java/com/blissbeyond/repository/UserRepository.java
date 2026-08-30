package com.blissbeyond.repository;

import com.blissbeyond.entity.User;
import com.blissbeyond.entity.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findDistinctByRolesName(RoleName name);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update User u set u.securityVersion = u.securityVersion + 1 where u.id = :id")
    int incrementSecurityVersion(@Param("id") Long id);
}
