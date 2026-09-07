package com.blissbeyond.service;

import com.blissbeyond.dto.addon.CateringAddonIncludedItemResponse;
import com.blissbeyond.dto.admin.AdminCateringAddonIncludedItemRequest;
import com.blissbeyond.entity.AddOn;
import com.blissbeyond.entity.CateringAddonIncludedItem;
import com.blissbeyond.exception.DuplicateResourceException;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.AddOnRepository;
import com.blissbeyond.repository.CateringAddonIncludedItemRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CateringAddonIncludedItemService {
    private static final Sort ITEM_ORDER = Sort.by("displayOrder", "id");

    private final AddOnRepository addOnRepository;
    private final CateringAddonIncludedItemRepository itemRepository;

    public CateringAddonIncludedItemService(AddOnRepository addOnRepository, CateringAddonIncludedItemRepository itemRepository) {
        this.addOnRepository = addOnRepository;
        this.itemRepository = itemRepository;
    }

    @Transactional(readOnly = true)
    public List<CateringAddonIncludedItemResponse> customer(Long addonId) {
        AddOn addon = requireAddon(addonId);
        return itemRepository.findByAddonAndAvailableTrue(addon, ITEM_ORDER).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<CateringAddonIncludedItemResponse> admin(Long addonId) {
        AddOn addon = requireAddon(addonId);
        return itemRepository.findByAddon(addon, ITEM_ORDER).stream().map(this::toResponse).toList();
    }

    @Transactional
    public CateringAddonIncludedItemResponse create(Long addonId, AdminCateringAddonIncludedItemRequest request) {
        AddOn addon = requireAddon(addonId);
        String name = request.name().trim();
        rejectDuplicate(addon, name, null);
        CateringAddonIncludedItem item = new CateringAddonIncludedItem();
        item.setAddon(addon);
        apply(item, request);
        return toResponse(itemRepository.save(item));
    }

    @Transactional
    public CateringAddonIncludedItemResponse update(Long itemId, AdminCateringAddonIncludedItemRequest request) {
        CateringAddonIncludedItem item = itemRepository.findById(itemId)
            .orElseThrow(() -> new ResourceNotFoundException("Catering add-on included item not found."));
        String name = request.name().trim();
        rejectDuplicate(item.getAddon(), name, itemId);
        apply(item, request);
        return toResponse(itemRepository.save(item));
    }

    private AddOn requireAddon(Long addonId) {
        return addOnRepository.findById(addonId)
            .orElseThrow(() -> new ResourceNotFoundException("Catering add-on not found."));
    }

    private void rejectDuplicate(AddOn addon, String name, Long currentId) {
        itemRepository.findByAddonAndName(addon, name).ifPresent(existing -> {
            if (currentId == null || !existing.getId().equals(currentId)) {
                throw new DuplicateResourceException("An included item with this name already exists for the add-on.");
            }
        });
    }

    private void apply(CateringAddonIncludedItem item, AdminCateringAddonIncludedItemRequest request) {
        item.setName(request.name().trim());
        item.setDisplayOrder(request.displayOrder() == null ? 0 : request.displayOrder());
        item.setAvailable(request.available() == null || request.available());
    }

    private CateringAddonIncludedItemResponse toResponse(CateringAddonIncludedItem item) {
        return new CateringAddonIncludedItemResponse(item.getId(), item.getName(), item.getDisplayOrder(), item.isAvailable());
    }
}
