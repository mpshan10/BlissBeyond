package com.blissbeyond.repository;

import com.blissbeyond.entity.AddOn;
import com.blissbeyond.entity.CateringAddonIncludedItem;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CateringAddonIncludedItemRepository extends JpaRepository<CateringAddonIncludedItem, Long> {
    List<CateringAddonIncludedItem> findByAddonAndAvailableTrue(AddOn addon, Sort sort);
    List<CateringAddonIncludedItem> findByAddon(AddOn addon, Sort sort);
    Optional<CateringAddonIncludedItem> findByAddonAndName(AddOn addon, String name);
}
