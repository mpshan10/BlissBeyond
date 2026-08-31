package com.blissbeyond.repository;

import com.blissbeyond.entity.Food;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Optional;

public interface FoodRepository extends JpaRepository<Food, Long>, JpaSpecificationExecutor<Food> {
    @Override
    @EntityGraph(attributePaths = {"cuisine", "category"})
    List<Food> findAll(Specification<Food> specification);

    @EntityGraph(attributePaths = {"cuisine", "category"})
    Optional<Food> findWithCuisineAndCategoryById(Long id);
}
