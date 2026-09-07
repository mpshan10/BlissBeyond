package com.blissbeyond.service;

import com.blissbeyond.dto.admin.AdminDiningStyleMenuCategoryRequest;
import com.blissbeyond.dto.admin.AdminDiningStyleMenuItemRequest;
import com.blissbeyond.dto.diningstyle.DiningStyleMenuCategoryResponse;
import com.blissbeyond.dto.diningstyle.DiningStyleMenuItemResponse;
import com.blissbeyond.dto.diningstyle.DiningStyleMenuResponse;
import com.blissbeyond.entity.DiningStyle;
import com.blissbeyond.entity.DiningStyleMenuCategory;
import com.blissbeyond.entity.DiningStyleMenuItem;
import com.blissbeyond.exception.DuplicateResourceException;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.DiningStyleMenuCategoryRepository;
import com.blissbeyond.repository.DiningStyleMenuItemRepository;
import com.blissbeyond.repository.DiningStyleRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DiningStyleMenuService {
    private static final Sort CATEGORY_ORDER = Sort.by("displayOrder", "id");
    private static final Sort ITEM_ORDER = Sort.by("displayOrder", "id");

    private final DiningStyleRepository diningStyleRepository;
    private final DiningStyleMenuCategoryRepository categoryRepository;
    private final DiningStyleMenuItemRepository itemRepository;

    public DiningStyleMenuService(
        DiningStyleRepository diningStyleRepository,
        DiningStyleMenuCategoryRepository categoryRepository,
        DiningStyleMenuItemRepository itemRepository
    ) {
        this.diningStyleRepository = diningStyleRepository;
        this.categoryRepository = categoryRepository;
        this.itemRepository = itemRepository;
    }

    @Transactional(readOnly = true)
    public DiningStyleMenuResponse customer(Long styleId) {
        DiningStyle style = requireStyle(styleId);
        List<DiningStyleMenuCategoryResponse> categories = categoryRepository
            .findByDiningStyleAndAvailableTrue(style, CATEGORY_ORDER).stream()
            .map(category -> toCategory(category, true))
            .filter(category -> !category.items().isEmpty())
            .toList();
        return new DiningStyleMenuResponse(style.getId(), categories);
    }

    @Transactional(readOnly = true)
    public DiningStyleMenuResponse admin(Long styleId) {
        DiningStyle style = requireStyle(styleId);
        return new DiningStyleMenuResponse(
            style.getId(),
            categoryRepository.findByDiningStyle(style, CATEGORY_ORDER).stream()
                .map(category -> toCategory(category, false))
                .toList()
        );
    }

    @Transactional
    public DiningStyleMenuCategoryResponse createCategory(Long styleId, AdminDiningStyleMenuCategoryRequest request) {
        DiningStyle style = requireStyle(styleId);
        String name = request.name().trim();
        rejectDuplicateCategory(style, name, null);
        DiningStyleMenuCategory category = new DiningStyleMenuCategory();
        category.setDiningStyle(style);
        apply(category, request);
        return toCategory(categoryRepository.save(category), false);
    }

    @Transactional
    public DiningStyleMenuCategoryResponse updateCategory(Long categoryId, AdminDiningStyleMenuCategoryRequest request) {
        DiningStyleMenuCategory category = requireCategory(categoryId);
        String name = request.name().trim();
        rejectDuplicateCategory(category.getDiningStyle(), name, categoryId);
        apply(category, request);
        return toCategory(categoryRepository.save(category), false);
    }

    @Transactional
    public DiningStyleMenuItemResponse createItem(Long categoryId, AdminDiningStyleMenuItemRequest request) {
        DiningStyleMenuCategory category = requireCategory(categoryId);
        DiningStyleMenuItem item = new DiningStyleMenuItem();
        item.setCategory(category);
        apply(item, request);
        return toItem(itemRepository.save(item));
    }

    @Transactional
    public DiningStyleMenuItemResponse updateItem(Long itemId, AdminDiningStyleMenuItemRequest request) {
        DiningStyleMenuItem item = requireItem(itemId);
        apply(item, request);
        return toItem(itemRepository.save(item));
    }

    private DiningStyle requireStyle(Long id) {
        return diningStyleRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Dining style not found."));
    }

    private DiningStyleMenuCategory requireCategory(Long id) {
        return categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Dining style menu category not found."));
    }

    private DiningStyleMenuItem requireItem(Long id) {
        return itemRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Dining style menu item not found."));
    }

    private void rejectDuplicateCategory(DiningStyle style, String name, Long currentId) {
        categoryRepository.findByDiningStyleAndName(style, name).ifPresent(existing -> {
            if (currentId == null || !existing.getId().equals(currentId)) {
                throw new DuplicateResourceException("A category with this name already exists for the dining style.");
            }
        });
    }

    private void apply(DiningStyleMenuCategory category, AdminDiningStyleMenuCategoryRequest request) {
        category.setName(request.name().trim());
        category.setDisplayOrder(request.displayOrder());
        category.setAvailable(request.available());
    }

    private void apply(DiningStyleMenuItem item, AdminDiningStyleMenuItemRequest request) {
        item.setName(request.name().trim());
        item.setDisplayOrder(request.displayOrder());
        item.setAvailable(request.available());
    }

    private DiningStyleMenuCategoryResponse toCategory(DiningStyleMenuCategory category, boolean availableOnly) {
        List<DiningStyleMenuItemResponse> items = (availableOnly
            ? itemRepository.findByCategoryAndAvailableTrue(category, ITEM_ORDER)
            : itemRepository.findByCategory(category, ITEM_ORDER)).stream().map(this::toItem).toList();
        return new DiningStyleMenuCategoryResponse(
            category.getId(), category.getName(), category.getDisplayOrder(), category.isAvailable(), items
        );
    }

    private DiningStyleMenuItemResponse toItem(DiningStyleMenuItem item) {
        return new DiningStyleMenuItemResponse(item.getId(), item.getName(), item.getDisplayOrder(), item.isAvailable());
    }
}
