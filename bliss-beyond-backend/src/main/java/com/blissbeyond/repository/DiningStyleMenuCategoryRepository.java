package com.blissbeyond.repository;

import com.blissbeyond.entity.DiningStyle;
import com.blissbeyond.entity.DiningStyleMenuCategory;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DiningStyleMenuCategoryRepository extends JpaRepository<DiningStyleMenuCategory, Long> {
    List<DiningStyleMenuCategory> findByDiningStyleAndAvailableTrue(DiningStyle diningStyle, Sort sort);
    List<DiningStyleMenuCategory> findByDiningStyle(DiningStyle diningStyle, Sort sort);
    Optional<DiningStyleMenuCategory> findByDiningStyleAndName(DiningStyle diningStyle, String name);
}
