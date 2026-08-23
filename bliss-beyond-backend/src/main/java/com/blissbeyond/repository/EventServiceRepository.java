package com.blissbeyond.repository;

import com.blissbeyond.entity.EventService;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface EventServiceRepository extends JpaRepository<EventService, Long> {
    List<EventService> findByEventId(Long eventId);
    void deleteByEventId(Long eventId);
    void deleteByIdIn(Collection<Long> ids);
}
