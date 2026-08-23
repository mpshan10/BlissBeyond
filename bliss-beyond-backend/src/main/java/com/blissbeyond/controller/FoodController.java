package com.blissbeyond.controller;

import com.blissbeyond.dto.food.FoodResponse;
import com.blissbeyond.service.FoodService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/food")
public class FoodController {
    private final FoodService foodService;

    public FoodController(FoodService foodService) {
        this.foodService = foodService;
    }

    @GetMapping
    public List<FoodResponse> list(
        @RequestParam(required = false) String cuisine,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String dietary,
        @RequestParam(required = false, name = "q") String search,
        @RequestParam(required = false) Boolean available
    ) {
        return foodService.listFoods(cuisine, category, dietary, search, available);
    }

    @GetMapping("/{id}")
    public FoodResponse get(@PathVariable Long id) {
        return foodService.getFood(id);
    }

    @GetMapping("/search")
    public List<FoodResponse> search(
        @RequestParam(required = false) String cuisine,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String dietary,
        @RequestParam(required = false) String q,
        @RequestParam(required = false) Boolean available
    ) {
        return foodService.listFoods(cuisine, category, dietary, q, available);
    }
}
