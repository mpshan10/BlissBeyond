package com.blissbeyond.repository;

import com.blissbeyond.entity.MenuSelection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MenuSelectionRepository extends JpaRepository<MenuSelection, Long> {
    List<MenuSelection> findByEventId(Long eventId);
    void deleteByEventId(Long eventId);
}
