package com.blissbeyond.repository;

import com.blissbeyond.entity.ServiceCatalogOption;
import com.blissbeyond.entity.ServiceEntity;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ServiceCatalogOptionRepository extends JpaRepository<ServiceCatalogOption, Long> {
    List<ServiceCatalogOption> findByService(ServiceEntity service, Sort sort);
    List<ServiceCatalogOption> findByServiceAndAvailableTrue(ServiceEntity service, Sort sort);
    Optional<ServiceCatalogOption> findByServiceAndOptionKey(ServiceEntity service, String optionKey);
    boolean existsByServiceAndOptionKey(ServiceEntity service, String optionKey);
}
