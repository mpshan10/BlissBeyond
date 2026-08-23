package com.blissbeyond.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "package_service_items", uniqueConstraints = {
    @UniqueConstraint(name = "uk_package_service_item_order", columnNames = {"package_id", "display_order"}),
    @UniqueConstraint(name = "uk_package_service_item_service", columnNames = {"package_id", "service_id"})
})
public class PackageServiceItem extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "package_id", nullable = false) private Package eventPackage;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "service_id", nullable = false) private ServiceEntity service;
    @Column(name = "display_order", nullable = false) private Integer displayOrder;
    @Column(name = "inclusion_json", nullable = false, length = 4000) private String inclusionJson;
    public Package getEventPackage(){return eventPackage;} public void setEventPackage(Package v){eventPackage=v;}
    public ServiceEntity getService(){return service;} public void setService(ServiceEntity v){service=v;}
    public Integer getDisplayOrder(){return displayOrder;} public void setDisplayOrder(Integer v){displayOrder=v;}
    public String getInclusionJson(){return inclusionJson;} public void setInclusionJson(String v){inclusionJson=v;}
}


