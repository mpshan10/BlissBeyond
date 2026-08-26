package com.blissbeyond.service;

import com.blissbeyond.dto.consultation.PlannerOption;

import java.util.List;

public final class PlannerCatalog {
    private static final List<PlannerOption> PLANNERS = List.of(
        new PlannerOption("Shoon Lae Aung", "Wedding & Engagement"),
        new PlannerOption("Hsu Wai Phyo", "Corporate & Formal Events"),
        new PlannerOption("Myintzu Khaing", "Birthday & Social Events"),
        new PlannerOption("Jue Hnin Pwint Tun", "General Event Planning")
    );

    private PlannerCatalog() {
    }

    public static List<PlannerOption> all() {
        return PLANNERS;
    }

    public static boolean isAllowed(String name) {
        return name != null && PLANNERS.stream().anyMatch(planner -> planner.name().equals(name));
    }
}
