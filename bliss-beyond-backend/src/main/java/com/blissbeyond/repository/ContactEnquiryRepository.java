package com.blissbeyond.repository;

import com.blissbeyond.entity.ContactEnquiry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContactEnquiryRepository extends JpaRepository<ContactEnquiry, Long> {
    List<ContactEnquiry> findAllByOrderByCreatedAtDesc();
}
