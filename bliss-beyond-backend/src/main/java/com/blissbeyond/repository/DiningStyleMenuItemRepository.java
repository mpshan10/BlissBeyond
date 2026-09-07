package com.blissbeyond.repository;

import com.blissbeyond.entity.DiningStyleMenuCategory;
import com.blissbeyond.entity.DiningStyleMenuItem;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DiningStyleMenuItemRepository extends JpaRepository<DiningStyleMenuItem, Long> {
    List<DiningStyleMenuItem> findByCategoryAndAvailableTrue(DiningStyleMenuCategory category, Sort sort);
    List<DiningStyleMenuItem> findByCategory(DiningStyleMenuCategory category, Sort sort);
}
