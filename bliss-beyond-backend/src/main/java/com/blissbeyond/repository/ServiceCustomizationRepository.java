package com.blissbeyond.repository;

import com.blissbeyond.entity.ServiceCustomization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface ServiceCustomizationRepository extends JpaRepository<ServiceCustomization, Long> {
    List<ServiceCustomization> findByEventServiceId(Long eventServiceId);
    List<ServiceCustomization> findByEventServiceIdIn(Collection<Long> eventServiceIds);
    void deleteByEventServiceIdIn(Collection<Long> eventServiceIds);
}
