package com.blissbeyond.repository;

import com.blissbeyond.entity.DiningStyle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DiningStyleRepository extends JpaRepository<DiningStyle, Long> {
    Optional<DiningStyle> findByKey(String key);
    List<DiningStyle> findByAvailableTrueOrderByIdAsc();
}
