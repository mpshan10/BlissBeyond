package com.blissbeyond.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import com.blissbeyond.repository.ServiceCatalogOptionRepository;
import com.blissbeyond.repository.ServiceRepository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Fixed, server-owned pricing rules for the non-Catering Customize catalog. */
@Component
public class CustomizeServicePricing {
    private final ServiceCatalogOptionRepository catalogOptionRepository;
    private final ServiceRepository serviceRepository;

    public CustomizeServicePricing() { this.catalogOptionRepository = null; this.serviceRepository = null; }
    @Autowired
    public CustomizeServicePricing(ServiceCatalogOptionRepository catalogOptionRepository, ServiceRepository serviceRepository) {
        this.catalogOptionRepository = catalogOptionRepository; this.serviceRepository = serviceRepository;
    }
    private record Option(String id, BigDecimal price) {}
    public record Calculation(BigDecimal total) {}

    public boolean isCateringKey(String serviceKey) {
        return "catering".equals(normalizeKey(serviceKey));
    }

    private static final Map<String, Option> DECORATION = options(
        option("luxury", "350000"), option("romantic", "300000"), option("garden", "280000"),
        option("myanmar-traditional", "320000"), option("stage-decoration", "250000"),
        option("backdrop", "180000"), option("entrance-decoration", "150000"), option("guest-tables", "120000"),
        option("head-table", "130000"), option("aisle-decoration", "100000"), option("ceiling-decoration", "170000"),
        option("photo-area-decoration", "140000"), option("cake-table-decoration", "110000"),
        option("gift-table-decoration", "90000"), option("lounge-area-decoration", "125000"),
        option("candles", "60000"), option("welcome-sign", "80000"), option("photo-backdrop", "140000"),
        option("custom-signage", "100000"), option("floral-centrepieces", "160000"), option("fairy-lights", "90000"),
        option("table-number-signs", "70000"), option("chair-decorations", "85000"), option("hanging-florals", "95000"),
        option("lantern-decoration", "75000"), option("flower-arch", "120000")
    );

    private static final Map<String, Option> PHOTOGRAPHY = options(
        option("event-photography", "350000"), option("portrait-photography", "280000"),
        option("candid-photography", "250000"), option("couple-session", "220000"),
        option("full-event-video", "500000"), option("highlight-video", "320000"),
        option("same-day-edit", "280000"), option("cinematic-film", "420000"),
        option("drone-photography", "220000"), option("pre-event-shoot", "180000"),
        option("photo-album", "120000"), option("digital-gallery", "80000"),
        option("instant-photo-printing", "150000"), option("photo-booth", "200000")
    );

    private static final Map<String, Option> ENTERTAINMENT_PERFORMERS = options(
        option("dj", "350000"), option("live-band", "650000"), option("acoustic-singer", "300000"),
        option("mc-host", "250000"), option("myanmar-traditional-performance", "450000"),
        option("dance-performance", "400000"), option("violinist", "280000"),
        option("traditional-music-ensemble", "500000")
    );
    private static final Map<String, Option> ENTERTAINMENT_ADDONS = options(
        option("karaoke-setup", "180000"), option("interactive-games", "150000"),
        option("led-dance-floor", "300000"), option("special-entrance-music", "100000")
    );
    private static final Map<String, Option> ENTERTAINMENT_DURATION = options(
        option("4 hours", "0"), option("6 hours", "100000"), option("8 hours", "180000")
    );

    private static final Map<String, Option> LIGHTING = options(
        option("venue-basic", "0"), option("basic-av", "300000"), option("standard-av", "650000"),
        option("premium-av", "1200000"), option("extra-wireless-microphone", "50000"),
        option("additional-speaker-pair", "120000"), option("dj-equipment-setup", "150000"),
        option("audio-recording", "100000"), option("additional-stage-lighting", "200000"),
        option("ambient-lighting", "150000"), option("spotlight", "100000"), option("moving-lights", "180000"),
        option("projector-screen", "150000"), option("led-screen", "400000"), option("video-wall", "750000")
    );

    private static final Map<String, Option> CAKE = options(
        option("classic-floral", "600000"), option("romantic-garden", "680000"), option("gold-luxury", "800000"),
        option("minimal-elegant", "520000"), option("traditional", "750000"), option("one-tier-floral", "180000"),
        option("one-tier-heart", "160000"), option("one-tier-luxury", "220000"), option("birthday-pastel", "200000"),
        option("birthday-chocolate", "220000"), option("Vanilla", "23000"), option("Chocolate", "25000"),
        option("Red Velvet", "30000"), option("Strawberry", "30000"), option("Coffee", "40000"),
        option("Matcha", "50000"), option("Buttercream Finish", "70000"), option("Fondant Finish", "100000"),
        option("Fresh Flower Decoration", "50000"), option("Metallic Gold Details", "80000"),
        option("Cupcake Set", "120000"), option("Dessert Table", "250000"), option("Macaron Set", "150000")
    );
    private static final Map<String, String> CAKE_NAMES = Map.of(
        "classic-floral", "Classic Floral Wedding Cake", "romantic-garden", "Romantic Garden Cake",
        "gold-luxury", "Crimson Rose Cake", "minimal-elegant", "Royal Gold Pearl Cake",
        "traditional", "Traditional Myanmar Celebration Cake", "one-tier-floral", "One-Tier Floral Celebration Cake",
        "one-tier-heart", "One-Tier Heart-Shaped Cake", "one-tier-luxury", "One-Tier Gold Elegance Cake",
        "birthday-pastel", "Pastel Birthday Cake", "birthday-chocolate", "Chocolate Drip Birthday Cake"
    );

    private static final Map<String, Option> FLORAL = options(
        option("bridalBouquet", "180000"), option("bridesmaidBouquet", "120000"),
        option("flowerGirlBouquet", "80000"), option("boutonniere", "45000"), option("flowerArch", "450000"),
        option("aisleFlowers", "300000"), option("stageFlowers", "400000"), option("entranceFlowers", "250000"),
        option("tableCenterpieces", "200000"), option("photoBackdrop", "500000")
    );
    private static final Set<String> FLOWER_TYPES = Set.of("Roses", "Orchids", "Lilies", "Peonies", "Hydrangeas", "Sunflowers");
    private static final Set<String> FLORAL_PALETTES = Set.of("Romantic Blush", "Classic White & Green", "Soft Pastel", "Bold Celebration");

    public Calculation calculate(String serviceKey, JsonNode customization) {
        String key = normalizeKey(serviceKey);
        if (customization == null || !customization.isObject()) {
            throw new IllegalArgumentException("Complete customization is required for " + displayName(key) + ".");
        }
        return switch (key) {
            case "decoration" -> new Calculation(decoration(customization));
            case "photography" -> new Calculation(photography(customization));
            case "entertainment" -> new Calculation(entertainment(customization));
            case "lighting-av" -> new Calculation(lighting(customization));
            case "cake" -> new Calculation(cake(customization));
            case "florals" -> new Calculation(florals(customization));
            default -> throw new IllegalArgumentException("Unsupported Customize service.");
        };
    }

    private BigDecimal decoration(JsonNode root) {
        JsonNode selections = object(root, "selections");
        JsonNode theme = object(selections, "theme");
        String themeId = requiredId(theme, "Please select a decoration theme.");
        BigDecimal total = price(DECORATION, themeId, "Unknown decoration theme.");
        total = total.add(sumObjects(array(selections, "elements"), DECORATION, "Unknown decoration element."));
        return total.add(sumObjects(array(selections, "addOns"), DECORATION, "Unknown decoration add-on."));
    }

    private BigDecimal photography(JsonNode root) {
        JsonNode selections = object(root, "selections");
        List<JsonNode> selected = new ArrayList<>();
        selected.addAll(array(selections, "photography"));
        selected.addAll(array(selections, "videography"));
        selected.addAll(array(selections, "additional"));
        if (selected.isEmpty()) throw new IllegalArgumentException("Please select a photography or videography option.");
        return sumObjects(selected, PHOTOGRAPHY, "Unknown photography option.");
    }

    private BigDecimal entertainment(JsonNode root) {
        JsonNode selections = object(root, "selections");
        List<JsonNode> performers = array(selections, "performers");
        if (performers.isEmpty()) throw new IllegalArgumentException("Please select a primary entertainment option.");
        BigDecimal total = sumObjects(performers, ENTERTAINMENT_PERFORMERS, "Unknown entertainment option.");
        total = total.add(sumObjects(array(selections, "addOns"), ENTERTAINMENT_ADDONS, "Unknown entertainment add-on."));
        JsonNode duration = selections.get("duration");
        if (duration != null && !duration.isNull()) {
            total = total.add(price(ENTERTAINMENT_DURATION, requiredId(duration, "Invalid entertainment duration."), "Unknown entertainment duration."));
        }
        JsonNode startTime = selections.get("startTime");
        if (startTime != null && !startTime.isNull()) {
            String value = requiredId(startTime, "Invalid entertainment start time.");
            if (!value.matches("(?:[01]\\d|2[0-3]):[0-5]\\d")) throw new IllegalArgumentException("Invalid entertainment start time.");
            int hour = Integer.parseInt(value.substring(0, 2));
            total = total.add(BigDecimal.valueOf(hour >= 21 ? 100000 : hour > 18 ? 50000 : 0));
        }
        JsonNode count = selections.get("performerCount");
        if (count != null && !count.isNull()) {
            int value = integerValue(count, "Invalid performer count.");
            if (value < 1 || value > 100) throw new IllegalArgumentException("Invalid performer count.");
            total = total.add(BigDecimal.valueOf(Math.max(0, value - 1) * 100000L));
        }
        return total;
    }

    private BigDecimal lighting(JsonNode root) {
        JsonNode selections = object(root, "selections");
        JsonNode selectedPackage = object(selections, "package");
        BigDecimal total = price(LIGHTING, requiredId(selectedPackage, "Please select a Lighting & AV package."), "Unknown Lighting & AV package.");
        return total.add(sumObjects(array(selections, "addOns"), LIGHTING, "Unknown Lighting & AV add-on."));
    }

    private BigDecimal cake(JsonNode root) {
        JsonNode selectedCake = object(root, "selectedCake");
        String cakeId = requiredId(selectedCake, "Please select a cake design.");
        BigDecimal total = price(CAKE, cakeId, "Unknown cake design.");
        JsonNode options = root.get("options");
        Set<String> seen = new HashSet<>();
        if (options != null && !options.isNull()) {
            if (!options.isArray()) throw new IllegalArgumentException("Invalid cake options.");
            for (JsonNode option : options) {
                String label = option == null || option.isNull() ? "" : option.asText("").trim();
                if (label.isBlank() || label.equals(CAKE_NAMES.get(cakeId))) continue;
                if (!seen.add(label)) throw new IllegalArgumentException("Duplicate cake option.");
                total = total.add(price(CAKE, label, "Unknown cake option."));
            }
        }
        return total;
    }

    private BigDecimal florals(JsonNode root) {
        JsonNode selections = object(root, "selections");
        List<JsonNode> paid = array(selections, "checkedOptions");
        if (paid.isEmpty()) throw new IllegalArgumentException("Please select at least one floral service.");
        BigDecimal total = sumObjects(paid, FLORAL, "Unknown floral option.");
        validateStrings(arrayValues(selections, "flowerTypes"), FLOWER_TYPES, "Unknown flower type.");
        String palette = text(selections, "floralPalette");
        if (!palette.isBlank() && !FLORAL_PALETTES.contains(palette)) throw new IllegalArgumentException("Unknown floral color palette.");
        return total;
    }

    private BigDecimal sumObjects(List<JsonNode> values, Map<String, Option> catalog, String unknownMessage) {
        BigDecimal total = BigDecimal.ZERO;
        Set<String> seen = new HashSet<>();
        for (JsonNode value : values) {
            String id = requiredId(value, unknownMessage);
            if (!seen.add(id)) throw new IllegalArgumentException("Duplicate option selected: " + id);
            total = total.add(price(catalog, id, unknownMessage));
        }
        return total;
    }

    private BigDecimal price(Map<String, Option> catalog, String id, String message) {
        if (catalogOptionRepository != null && serviceRepository != null) {
            String serviceName = serviceNameFor(catalog);
            if (serviceName != null) {
                return serviceRepository.findByNameIgnoreCase(serviceName)
                    .flatMap(service -> catalogOptionRepository.findByServiceAndOptionKey(service, id))
                    .filter(option -> option.isAvailable())
                    .map(com.blissbeyond.entity.ServiceCatalogOption::getPrice)
                    .orElseThrow(() -> new IllegalArgumentException(message));
            }
        }
        Option option = catalog.get(id);
        if (option == null) throw new IllegalArgumentException(message);
        return option.price();
    }

    private String serviceNameFor(Map<String, Option> catalog) {
        if (catalog == DECORATION) return "Decoration & Styling";
        if (catalog == PHOTOGRAPHY) return "Photography & Videography";
        if (catalog == ENTERTAINMENT_PERFORMERS || catalog == ENTERTAINMENT_ADDONS || catalog == ENTERTAINMENT_DURATION) return "Entertainment";
        if (catalog == LIGHTING) return "Lighting & AV";
        if (catalog == CAKE) return "Cake & Desserts";
        if (catalog == FLORAL) return "Floral Design";
        return null;
    }

    private String requiredId(JsonNode node, String message) {
        String id = text(node, "id");
        if (id.isBlank()) id = text(node, "value");
        if (id.isBlank()) throw new IllegalArgumentException(message);
        return id;
    }

    private int integerValue(JsonNode node, String message) {
        JsonNode value = node.isObject() ? node.get("value") : node;
        if (value == null || !value.canConvertToInt()) throw new IllegalArgumentException(message);
        return value.asInt();
    }

    private JsonNode object(JsonNode parent, String field) {
        JsonNode node = parent == null ? null : parent.get(field);
        return node != null && node.isObject() ? node : null;
    }

    private List<JsonNode> array(JsonNode parent, String field) {
        JsonNode node = parent == null ? null : parent.get(field);
        if (node == null || node.isNull()) return List.of();
        if (!node.isArray()) throw new IllegalArgumentException("Invalid customization selection.");
        List<JsonNode> values = new ArrayList<>();
        node.forEach(values::add);
        return values;
    }

    private List<String> arrayValues(JsonNode parent, String field) {
        return array(parent, field).stream().map(JsonNode::asText).toList();
    }

    private void validateStrings(List<String> values, Set<String> allowed, String message) {
        Set<String> seen = new HashSet<>();
        for (String value : values) {
            if (!allowed.contains(value) || !seen.add(value)) throw new IllegalArgumentException(message);
        }
    }

    private String text(JsonNode node, String field) {
        if (node == null) return "";
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? "" : value.asText("").trim();
    }

    private String normalizeKey(String value) {
        String key = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (key) {
            case "decoration & styling", "decoration" -> "decoration";
            case "photography & videography", "photography" -> "photography";
            case "lighting & av", "lighting-av", "lighting" -> "lighting-av";
            case "cake & desserts", "cake" -> "cake";
            case "floral design", "florals", "floral" -> "florals";
            default -> key;
        };
    }

    private String displayName(String key) {
        return switch (key) {
            case "decoration" -> "Decoration & Styling";
            case "photography" -> "Photography & Videography";
            case "entertainment" -> "Entertainment";
            case "lighting-av" -> "Lighting & AV";
            case "cake" -> "Cake & Desserts";
            case "florals" -> "Floral Design";
            default -> "this service";
        };
    }

    private static Option option(String id, String price) { return new Option(id, new BigDecimal(price)); }

    private static Map<String, Option> options(Option... values) {
        Map<String, Option> result = new LinkedHashMap<>();
        for (Option value : values) result.put(value.id(), value);
        return Map.copyOf(result);
    }
}
