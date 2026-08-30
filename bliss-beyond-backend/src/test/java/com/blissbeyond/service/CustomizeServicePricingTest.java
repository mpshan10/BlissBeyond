package com.blissbeyond.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CustomizeServicePricingTest {
    private final CustomizeServicePricing pricing = new CustomizeServicePricing();
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void calculatesDecorationFromOptionIdsAndIgnoresSubmittedTotal() throws Exception {
        var payload = mapper.readTree("""
            {"estimatedTotal":1,"selections":{"theme":{"id":"luxury","price":1},"elements":[{"id":"stage-decoration","price":1}],"addOns":[]}}
            """);

        assertEquals(new BigDecimal("600000"), pricing.calculate("decoration", payload).total());
    }

    @Test
    void calculatesPhotographyFromAllSelectedGroups() throws Exception {
        var payload = mapper.readTree("""
            {"estimatedTotal":999999999,"selections":{"photography":[{"id":"event-photography"}],"videography":[{"id":"highlight-video"}],"additional":[{"id":"photo-album"}]}}
            """);

        assertEquals(new BigDecimal("790000"), pricing.calculate("photography", payload).total());
    }

    @Test
    void validatesEntertainmentRequiredPrimarySelectionAndDuplicates() throws Exception {
        var missing = mapper.readTree("{\"selections\":{\"performers\":[],\"addOns\":[]}}");
        assertThrows(IllegalArgumentException.class, () -> pricing.calculate("entertainment", missing));

        var duplicate = mapper.readTree("""
            {"selections":{"performers":[{"id":"dj"},{"id":"dj"}],"addOns":[]}}
            """);
        assertThrows(IllegalArgumentException.class, () -> pricing.calculate("entertainment", duplicate));
    }

    @Test
    void validatesLightingCakeAndFloralSelections() throws Exception {
        var lighting = mapper.readTree("""
            {"estimatedTotal":1,"selections":{"package":{"id":"premium-av","price":1},"addOns":[{"id":"led-screen","price":1}]}}
            """);
        assertEquals(new BigDecimal("1600000"), pricing.calculate("lighting-av", lighting).total());

        var cake = mapper.readTree("""
            {"selectedCake":{"id":"classic-floral","price":1},"options":["Classic Floral Wedding Cake","Chocolate","Fondant Finish"]}
            """);
        assertEquals(new BigDecimal("725000"), pricing.calculate("cake", cake).total());

        var floral = mapper.readTree("""
            {"selections":{"checkedOptions":[{"id":"flowerArch","price":1}],"flowerTypes":["Roses"],"floralPalette":"Romantic Blush"}}
            """);
        assertEquals(new BigDecimal("450000"), pricing.calculate("florals", floral).total());
    }

    @Test
    void rejectsUnknownOption() throws Exception {
        var payload = mapper.readTree("""
            {"selections":{"photography":[{"id":"premium-package-hacked"}],"videography":[],"additional":[]}}
            """);

        assertThrows(IllegalArgumentException.class, () -> pricing.calculate("photography", payload));
    }
}
