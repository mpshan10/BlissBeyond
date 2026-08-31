package com.blissbeyond.repository;

import com.blissbeyond.entity.Package;
import com.blissbeyond.entity.PackageCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface PackageRepository extends JpaRepository<Package, Long> {
    Optional<Package> findBySlug(String slug);
    @Query("select distinct p from Package p "
        + "left join fetch p.venue "
        + "left join fetch p.serviceItems item "
        + "left join fetch item.service "
        + "where p.slug = :slug and p.active = true")
    Optional<Package> findBySlugAndActiveTrue(String slug);

    @Query("select distinct p from Package p "
        + "left join fetch p.venue "
        + "left join fetch p.serviceItems item "
        + "left join fetch item.service "
        + "where p.active = true order by p.id asc")
    List<Package> findAllByActiveTrueOrderByIdAsc();

    @Query("select distinct p from Package p "
        + "left join fetch p.venue "
        + "left join fetch p.serviceItems item "
        + "left join fetch item.service "
        + "where p.active = true and p.category = :category order by p.id asc")
    List<Package> findAllByActiveTrueAndCategoryOrderByIdAsc(PackageCategory category);
}
