package com.blissbeyond.repository;

import com.blissbeyond.entity.PackageServiceItem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PackageServiceItemRepository extends JpaRepository<PackageServiceItem, Long> {
    List<PackageServiceItem> findByEventPackageIdOrderByDisplayOrder(Long packageId);
    Optional<PackageServiceItem> findByEventPackageIdAndDisplayOrder(Long packageId, Integer displayOrder);
}


