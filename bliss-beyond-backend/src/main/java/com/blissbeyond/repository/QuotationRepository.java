package com.blissbeyond.repository;

import com.blissbeyond.entity.Quotation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuotationRepository extends JpaRepository<Quotation, Long> {
    List<Quotation> findAllByOrderByIdDesc();
    Optional<Quotation> findByEventId(Long eventId);
    List<Quotation> findByEventCustomerId(Long customerId);
}
