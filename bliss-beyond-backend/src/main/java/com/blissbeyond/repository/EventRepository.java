package com.blissbeyond.repository;

import com.blissbeyond.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findByCustomerId(Long customerId);
}
