package com.blissbeyond.repository;

import com.blissbeyond.entity.PackageBookingSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PackageBookingSnapshotRepository extends JpaRepository<PackageBookingSnapshot, Long> {
    Optional<PackageBookingSnapshot> findByBookingId(Long bookingId);
}
