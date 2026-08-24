package com.blissbeyond.repository;

import com.blissbeyond.entity.Package;
import com.blissbeyond.entity.PackageCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PackageRepository extends JpaRepository<Package, Long> {
    Optional<Package> findBySlug(String slug);
    Optional<Package> findBySlugAndActiveTrue(String slug);
    List<Package> findAllByActiveTrueOrderByIdAsc();
    List<Package> findAllByActiveTrueAndCategoryOrderByIdAsc(PackageCategory category);
}

