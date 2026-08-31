package com.blissbeyond.service;

import com.blissbeyond.dto.food.FoodResponse;
import com.blissbeyond.entity.Food;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.FoodRepository;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import java.util.List;

@Service
public class FoodService {
    private final FoodRepository foodRepository;

    public FoodService(FoodRepository foodRepository) {
        this.foodRepository = foodRepository;
    }

    @Transactional(readOnly = true)
    public List<FoodResponse> listFoods(String cuisine, String category, String dietary, String search, Boolean available) {
        Specification<Food> spec = Specification.where(null);

        if (cuisine != null && !cuisine.isBlank()) {
            spec = spec.and((root, query, cb) -> {
                Join<?, ?> cuisineJoin = root.join("cuisine", JoinType.LEFT);
                return cb.equal(cb.lower(cuisineJoin.get("name")), cuisine.toLowerCase());
            });
        }
        if (category != null && !category.isBlank()) {
            spec = spec.and((root, query, cb) -> {
                Join<?, ?> categoryJoin = root.join("category", JoinType.LEFT);
                return cb.equal(cb.lower(categoryJoin.get("name")), category.toLowerCase());
            });
        }
        if (search != null && !search.isBlank()) {
            String like = "%" + search.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("name")), like),
                cb.like(cb.lower(root.get("description")), like)
            ));
        }
        if (available != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("available"), available));
        }
        if (dietary != null && !dietary.isBlank()) {
            String normalized = dietary.toLowerCase().replace("-", "");
            spec = spec.and((root, query, cb) -> switch (normalized) {
                case "vegetarian" -> cb.isTrue(root.get("vegetarian"));
                case "vegan" -> cb.isTrue(root.get("vegan"));
                case "halal" -> cb.isTrue(root.get("halal"));
                case "glutenfree" -> cb.isTrue(root.get("glutenFree"));
                case "nutfree" -> cb.isTrue(root.get("nutFree"));
                default -> cb.conjunction();
            });
        }

        return foodRepository.findAll(spec).stream().map(food -> new FoodResponse(
            food.getId(),
            food.getName(),
            food.getDescription(),
            food.getCuisine() != null ? food.getCuisine().getName() : null,
            food.getCategory() != null ? food.getCategory().getName() : null,
            food.getPricePerGuest(),
            food.getImage(),
            food.isVegetarian(),
            food.isVegan(),
            food.isHalal(),
            food.isGlutenFree(),
            food.isNutFree(),
            food.isAvailable()
        )).toList();
    }

    @Transactional(readOnly = true)
    public FoodResponse getFood(Long id) {
        Food food = foodRepository.findWithCuisineAndCategoryById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Food not found"));
        return new FoodResponse(
            food.getId(),
            food.getName(),
            food.getDescription(),
            food.getCuisine() != null ? food.getCuisine().getName() : null,
            food.getCategory() != null ? food.getCategory().getName() : null,
            food.getPricePerGuest(),
            food.getImage(),
            food.isVegetarian(),
            food.isVegan(),
            food.isHalal(),
            food.isGlutenFree(),
            food.isNutFree(),
            food.isAvailable()
        );
    }
}
