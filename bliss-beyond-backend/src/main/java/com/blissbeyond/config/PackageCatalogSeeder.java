package com.blissbeyond.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.blissbeyond.entity.Package;
import com.blissbeyond.entity.*;
import com.blissbeyond.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.*;

@Component
@Order(100)
public class PackageCatalogSeeder implements CommandLineRunner {
    private static final String CATERING = "Catering";
    private static final String DECORATION = "Decoration & Styling";
    private static final String PHOTOGRAPHY = "Photography & Videography";
    private static final String ENTERTAINMENT = "Entertainment";
    private static final String LIGHTING_AV = "Lighting & AV";
    private static final String CAKE = "Cake & Desserts";
    private static final String FLORAL = "Floral Design";

    private final PackageRepository packageRepository; private final PackageServiceItemRepository itemRepository; private final ServiceRepository serviceRepository; private final VenueRepository venueRepository; private final ObjectMapper objectMapper;
    private Map<String, Venue> venuesByName;
    private Map<String, ServiceEntity> servicesByName;
    private Map<String, Package> packagesBySlug;
    private Map<String, PackageServiceItem> itemsByPackageAndOrder;
    public PackageCatalogSeeder(PackageRepository p, PackageServiceItemRepository i, ServiceRepository s, VenueRepository v, ObjectMapper o){packageRepository=p;itemRepository=i;serviceRepository=s;venueRepository=v;objectMapper=o;}
    @Override @Transactional public void run(String... args)throws Exception{
        List<Spec> catalog=catalog();
        venuesByName=venueRepository.findAll().stream().collect(java.util.stream.Collectors.toMap(venue->normalize(venue.getName()),venue->venue,(first,duplicate)->first));
        servicesByName=serviceRepository.findAll().stream().collect(java.util.stream.Collectors.toMap(service->normalize(service.getName()),service->service,(first,duplicate)->first));
        packagesBySlug=packageRepository.findAll().stream().collect(java.util.stream.Collectors.toMap(Package::getSlug,eventPackage->eventPackage,(first,duplicate)->first));
        itemsByPackageAndOrder=itemRepository.findAll().stream().collect(java.util.stream.Collectors.toMap(item->itemKey(item.getEventPackage().getSlug(),item.getDisplayOrder()),item->item,(first,duplicate)->first));
        for(Spec s:catalog)seed(s);
    }
    private void seed(Spec s)throws Exception{
        Venue v=findVenue(s.venueName);
        if(s.maxGuests<=0||s.finalPrice.signum()<=0)throw new IllegalStateException("Invalid package values: "+s.slug);
        if(v.getCapacity()!=null&&s.maxGuests>v.getCapacity())throw new IllegalStateException("Package guest limit exceeds venue capacity: "+s.slug);
        Package p=packagesBySlug.get(s.slug);
        if (p == null) {
            p = new Package();
            p.setSlug(s.slug);
            p.setName(s.name);
            p.setCategory(s.category);
            p.setDescription(s.description);
            p.setVenue(v);
            p.setMaxGuests(s.maxGuests);
            p.setFinalPrice(s.finalPrice);
            p.setImage(null);
            p.setActive(true);
            p=packageRepository.save(p);
            packagesBySlug.put(s.slug,p);
        }
        for(ItemSpec i:s.items){
            ServiceEntity service=findService(i.serviceName);
            String itemKey=itemKey(s.slug,i.displayOrder);
            String inclusionJson=objectMapper.writeValueAsString(i.inclusions);
            PackageServiceItem item=itemsByPackageAndOrder.get(itemKey);
            if(item==null){
                item=new PackageServiceItem();
                item.setEventPackage(p);
                item.setService(service);
                item.setDisplayOrder(i.displayOrder);
                item.setInclusionJson(inclusionJson);
                item=itemRepository.save(item);
                itemsByPackageAndOrder.put(itemKey,item);
            } else if(!Objects.equals(item.getEventPackage().getId(),p.getId())
                || !Objects.equals(item.getService().getId(),service.getId())
                || !Objects.equals(item.getDisplayOrder(),i.displayOrder)
                || !Objects.equals(item.getInclusionJson(),inclusionJson)){
                item.setEventPackage(p);
                item.setService(service);
                item.setDisplayOrder(i.displayOrder);
                item.setInclusionJson(inclusionJson);
                itemRepository.save(item);
            }
        }
    }
    private Venue findVenue(String name){
        Venue venue=venuesByName.get(normalize(name));
        if(venue==null)throw new IllegalStateException("Package venue not found: "+name);
        return venue;
    }
    private ServiceEntity findService(String name){
        ServiceEntity service=servicesByName.get(normalize(name));
        if(service==null)throw new IllegalStateException("Package service not found: "+name);
        return service;
    }
    private String itemKey(String packageSlug,Integer displayOrder){return packageSlug+":"+displayOrder;}
    private String normalize(String value){
        if(value==null)return "";
        String normalized=value.trim().toLowerCase(Locale.ROOT)
            .replace('-', ' ')
            .replace('\u2013', ' ')
            .replace('\u2014', ' ')
            .replace('\uFFFD', 'a');
        return Normalizer.normalize(normalized,Normalizer.Form.NFD)
            .replaceAll("\\p{M}","")
            .replaceAll("[^a-z0-9]","");
    }
    private static ItemSpec item(String serviceName,int order,List<String> labels){return new ItemSpec(serviceName,order,labels);}
    private static Spec spec(String slug,String name,PackageCategory category,String description,String venue,int max,String price,List<ItemSpec> items){if(items.size()!=7)throw new IllegalArgumentException("Every package must have seven services: "+slug);return new Spec(slug,name,category,description,venue,max,new BigDecimal(price),items);}
    private record ItemSpec(String serviceName,int displayOrder,List<String> inclusions){}
    private record Spec(String slug,String name,PackageCategory category,String description,String venueName,int maxGuests,BigDecimal finalPrice,List<ItemSpec> items){}
    private List<Spec> catalog(){return List.of(
        spec("lotte-sapphire-engagement", "Lotte Sapphire Engagement", PackageCategory.ENGAGEMENT, "A polished hotel engagement experience with formal dining, refined styling and thoughtfully coordinated moments.", "Lotte Hotel Yangon - Sapphire Ballroom", 100, "12000000.00", List.of(
            item(CATERING, 1, List.of("Plated Dinner", "Soft Drinks Package", "Premium Dessert Bar")),
            item(DECORATION, 2, List.of("Luxury Theme", "Stage Decoration", "Backdrop", "Entrance Decoration", "Head Table", "Welcome Sign")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Candid Photography", "Highlight Video")),
            item(ENTERTAINMENT, 4, List.of("DJ", "MC / Host", "6-Hour Entertainment")),
            item(LIGHTING_AV, 5, List.of("Premium AV Package", "Ambient Lighting")),
            item(CAKE, 6, List.of("One-Tier Gold Elegance Cake", "Vanilla", "Metallic Gold Details")),
            item(FLORAL, 7, List.of("Bridal Bouquet", "Flower Arch", "Stage Flowers", "Table Centerpieces", "Roses", "Classic White & Green", "Luxury & Glamorous", "Balanced flowers & greenery"))
        )),
        spec("inya-sunset-engagement", "Inya Sunset Engagement", PackageCategory.ENGAGEMENT, "A romantic lakeside engagement experience with relaxed dining, garden styling and warm evening atmosphere.", "Inya Lake Hotel - Sunset Terrace", 100, "8500000.00", List.of(
            item(CATERING, 1, List.of("Cocktail / Finger Food", "Fresh Juice Package", "Mini Pastries")),
            item(DECORATION, 2, List.of("Garden Theme", "Backdrop", "Entrance Decoration", "Photo Area Decoration", "Fairy Lights")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Couple Session", "Highlight Video")),
            item(ENTERTAINMENT, 4, List.of("Acoustic Singer", "4-Hour Entertainment")),
            item(LIGHTING_AV, 5, List.of("Standard AV Package", "Ambient Lighting")),
            item(CAKE, 6, List.of("One-Tier Floral Celebration Cake", "Strawberry", "Fresh Flower Decoration")),
            item(FLORAL, 7, List.of("Bridal Bouquet", "Flower Arch", "Entrance Flowers", "Roses", "Hydrangeas", "Romantic Blush", "Garden & Natural", "Balanced flowers & greenery"))
        )),
        spec("novotel-family-engagement", "Novotel Family Engagement", PackageCategory.ENGAGEMENT, "A welcoming family engagement bundle with shared dining, romantic styling and polished celebration essentials.", "Novotel Yangon Max - Pathein Ballroom", 120, "11000000.00", List.of(
            item(CATERING, 1, List.of("Family Style", "Soft Drinks Package", "Dessert Station")),
            item(DECORATION, 2, List.of("Romantic Theme", "Stage Decoration", "Backdrop", "Guest Tables", "Head Table", "Welcome Sign")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Portrait Photography", "Highlight Video")),
            item(ENTERTAINMENT, 4, List.of("DJ", "MC / Host", "6-Hour Entertainment")),
            item(LIGHTING_AV, 5, List.of("Standard AV Package", "Additional Stage Lighting")),
            item(CAKE, 6, List.of("One-Tier Heart-Shaped Cake", "Red Velvet", "Fresh Flower Decoration")),
            item(FLORAL, 7, List.of("Bridal Bouquet", "Stage Flowers", "Table Centerpieces", "Roses", "Soft Pastel", "Romantic & Elegant", "Balanced flowers & greenery"))
        )),
        spec("mandalay-hotel-classic-engagement", "Mandalay Hotel Classic Engagement", PackageCategory.ENGAGEMENT, "An affordable classic Mandalay engagement with traditional dining, graceful styling and essential celebration services.", "Mandalay Hotel - Small Hall", 150, "8000000.00", List.of(
            item(CATERING, 1, List.of("High Tea / Afternoon Reception", "Coffee & Tea Package", "Mini Pastries")),
            item(DECORATION, 2, List.of("Myanmar Traditional Theme", "Stage Decoration", "Backdrop", "Welcome Sign")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Portrait Photography")),
            item(ENTERTAINMENT, 4, List.of("Myanmar Traditional Performance", "4-Hour Entertainment")),
            item(LIGHTING_AV, 5, List.of("Basic AV Package")),
            item(CAKE, 6, List.of("Traditional Myanmar Celebration Cake", "Vanilla")),
            item(FLORAL, 7, List.of("Entrance Flowers", "Stage Flowers", "Roses", "Classic White & Green", "Traditional", "Balanced flowers & greenery"))
        )),
        spec("perfect-hotel-mandalay-engagement", "Perfect Hotel Mandalay Engagement", PackageCategory.ENGAGEMENT, "A premium Mandalay engagement with traditional dining, polished styling and complete media, entertainment and floral details.", "Perfect Hotel - Mandalay", 100, "10500000.00", List.of(
            item(CATERING, 1, List.of("Traditional Food", "Soft Drinks Package", "Traditional Dessert Station")),
            item(DECORATION, 2, List.of("Myanmar Traditional Theme", "Stage Decoration", "Backdrop", "Entrance Decoration", "Head Table", "Welcome Sign")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Candid Photography", "Highlight Video")),
            item(ENTERTAINMENT, 4, List.of("Myanmar Traditional Performance", "MC / Host", "6-Hour Entertainment")),
            item(LIGHTING_AV, 5, List.of("Standard AV Package", "Additional Stage Lighting")),
            item(CAKE, 6, List.of("Traditional Myanmar Celebration Cake", "Red Velvet", "Fresh Flower Decoration")),
            item(FLORAL, 7, List.of("Bridal Bouquet", "Stage Flowers", "Table Centerpieces", "Roses", "Classic White & Green", "Traditional", "Balanced flowers & greenery"))
        )),
        spec("yangon-timeless-love", "Yangon Timeless Love", PackageCategory.WEDDING, "A classic traditional Yangon wedding with Myanmar dining, graceful styling and warm family celebration details.", "Hotel Yangon - Royal Ballroom", 100, "12000000.00", List.of(
            item(CATERING, 1, List.of("Traditional Food", "Soft Drinks Package", "Traditional Dessert Station")),
            item(DECORATION, 2, List.of("Myanmar Traditional", "Stage Decoration", "Backdrop", "Entrance Decoration", "Head Table", "Guest Tables", "Welcome Sign")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Portrait Photography", "Full Event Video")),
            item(ENTERTAINMENT, 4, List.of("Myanmar Traditional Performance", "MC / Host", "6-Hour Entertainment")),
            item(LIGHTING_AV, 5, List.of("Standard AV Package", "Additional Stage Lighting", "Extra Wireless Microphone")),
            item(CAKE, 6, List.of("Traditional Myanmar Celebration Cake", "Vanilla", "Fresh Flower Decoration")),
            item(FLORAL, 7, List.of("Bridal Bouquet", "Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Orchids", "Classic White & Green", "Traditional", "Balanced flowers & greenery"))
        )),
        spec("inya-garden-romance", "Inya Garden Romance", PackageCategory.WEDDING, "A romantic lakeside wedding with garden styling, fresh floral details and an elegant reception experience.", "Inya Lake Hotel - Mingalar Hall", 150, "14500000.00", List.of(
            item(CATERING, 1, List.of("Buffet", "Fresh Juice Package", "Premium Dessert Bar")),
            item(DECORATION, 2, List.of("Garden", "Stage Decoration", "Backdrop", "Entrance Decoration", "Aisle Decoration", "Photo Area Decoration", "Fairy Lights", "Flower Arch")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Candid Photography", "Couple Session", "Highlight Video")),
            item(ENTERTAINMENT, 4, List.of("Acoustic Singer", "Violinist", "MC / Host", "6-Hour Entertainment")),
            item(LIGHTING_AV, 5, List.of("Standard AV Package", "Ambient Lighting", "Spotlight")),
            item(CAKE, 6, List.of("Romantic Garden Cake", "Strawberry", "Fresh Flower Decoration", "Macaron Set")),
            item(FLORAL, 7, List.of("Bridal Bouquet", "Bridesmaid Bouquet", "Flower Arch", "Aisle Flowers", "Table Centerpieces", "Roses", "Peonies", "Romantic Blush", "Garden & Natural", "Balanced flowers & greenery"))
        )),
        spec("the-yangon-ever-after", "The Yangon Ever After", PackageCategory.WEDDING, "A sophisticated premium hotel wedding with polished styling, elevated dining and complete celebration services.", "Novotel Yangon Max - Pathein Ballroom", 180, "27000000.00", List.of(
            item(CATERING, 1, List.of("Plated Dinner", "Premium Beverage Package", "Premium Dessert Bar", "Live Chef Station")),
            item(DECORATION, 2, List.of("Luxury", "Stage Decoration", "Backdrop", "Entrance Decoration", "Guest Tables", "Head Table", "Ceiling Decoration", "Photo Area Decoration", "Custom Signage")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Candid Photography", "Full Event Video", "Highlight Video", "Drone Photography", "Photo Album")),
            item(ENTERTAINMENT, 4, List.of("Live Band", "MC / Host", "DJ", "8-Hour Entertainment")),
            item(LIGHTING_AV, 5, List.of("Premium AV Package", "Additional Stage Lighting", "Ambient Lighting", "Moving Lights", "LED Screen")),
            item(CAKE, 6, List.of("Crimson Rose Cake", "Red Velvet", "Metallic Gold Details", "Dessert Table")),
            item(FLORAL, 7, List.of("Bridal Bouquet", "Bridesmaid Bouquet", "Boutonniere", "Flower Arch", "Aisle Flowers", "Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Roses", "Orchids", "Classic White & Green", "Luxury & Glamorous", "Balanced flowers & greenery"))
        )),
        spec("mandalay-forever", "Mandalay Forever", PackageCategory.WEDDING, "A classic Mandalay wedding with generous family dining, traditional performance and elegant floral styling.", "Wilson Hotel - Wedding Hall", 200, "16500000.00", List.of(
            item(CATERING, 1, List.of("Traditional Food", "Soft Drinks Package", "Shan Noodle Station")),
            item(DECORATION, 2, List.of("Myanmar Traditional", "Stage Decoration", "Backdrop", "Entrance Decoration", "Head Table", "Welcome Sign")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Portrait Photography", "Highlight Video")),
            item(ENTERTAINMENT, 4, List.of("Myanmar Traditional Performance", "MC / Host", "6-Hour Entertainment")),
            item(LIGHTING_AV, 5, List.of("Standard AV Package", "Additional Stage Lighting")),
            item(CAKE, 6, List.of("Traditional Myanmar Celebration Cake", "Vanilla", "Fresh Flower Decoration")),
            item(FLORAL, 7, List.of("Bridal Bouquet", "Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Roses", "Classic White & Green", "Traditional", "Balanced flowers & greenery"))
        )),
        spec("mandalay-golden-promise", "Mandalay Golden Promise", PackageCategory.WEDDING, "A premium Mandalay wedding combining upgraded dining, grand styling and complete media, entertainment and floral details.", "Mandalay Hotel - Wedding Hall", 150, "23000000.00", List.of(
            item(CATERING, 1, List.of("Family Style", "Premium Beverage Package", "Premium Dessert Bar", "Carving Station")),
            item(DECORATION, 2, List.of("Luxury", "Stage Decoration", "Backdrop", "Entrance Decoration", "Guest Tables", "Head Table", "Ceiling Decoration", "Photo Area Decoration", "Floral Centrepieces", "Custom Signage")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Candid Photography", "Full Event Video", "Cinematic Film", "Pre-Event Shoot", "Photo Album")),
            item(ENTERTAINMENT, 4, List.of("Live Band", "Myanmar Traditional Performance", "MC / Host", "8-Hour Entertainment")),
            item(LIGHTING_AV, 5, List.of("Premium AV Package", "Additional Stage Lighting", "Ambient Lighting", "Moving Lights", "LED Screen")),
            item(CAKE, 6, List.of("Crimson Rose Cake", "Red Velvet", "Fresh Flower Decoration", "Metallic Gold Details", "Dessert Table")),
            item(FLORAL, 7, List.of("Bridal Bouquet", "Bridesmaid Bouquet", "Boutonniere", "Flower Arch", "Aisle Flowers", "Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Roses", "Orchids", "Classic White & Green", "Luxury & Glamorous", "Balanced flowers & greenery"))
        )),
        spec("rose-garden-elegance", "Rose Garden Elegance", PackageCategory.WEDDING, "A polished Yangon wedding experience for couples who want timeless flowers, refined dining and a beautifully coordinated hotel setting.", "Rose Garden Hotel - Swe Daw Banquet Hall", 200, "19500000.00", List.of(
            item(CATERING, 1, List.of("Plated Dinner", "Soft Drinks Package", "Premium Dessert Bar")),
            item(DECORATION, 2, List.of("Romantic", "Stage Decoration", "Backdrop", "Entrance Decoration", "Head Table", "Guest Tables", "Photo Area Decoration", "Welcome Sign")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Candid Photography", "Couple Session", "Highlight Video", "Photo Album")),
            item(ENTERTAINMENT, 4, List.of("Violinist", "MC / Host", "DJ", "6-Hour Entertainment")),
            item(LIGHTING_AV, 5, List.of("Standard AV Package", "Ambient Lighting", "Additional Stage Lighting")),
            item(CAKE, 6, List.of("Classic Floral Wedding Cake", "Vanilla", "Fresh Flower Decoration", "Dessert Table")),
            item(FLORAL, 7, List.of("Bridal Bouquet", "Bridesmaid Bouquet", "Flower Arch", "Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Roses", "Hydrangeas", "Romantic Blush", "Romantic & Elegant", "Balanced flowers & greenery"))
        )),
        spec("the-eternal-vows", "The Eternal Vows", PackageCategory.WEDDING, "A formal Yangon wedding package centered on traditional warmth, classic florals and a well-paced celebration for family and friends.", "Hotel Sidney Myanmar - Sidney Wedding Hall", 100, "12000000.00", List.of(
            item(CATERING, 1, List.of("Traditional Food", "Soft Drinks Package", "Traditional Dessert Station")),
            item(DECORATION, 2, List.of("Myanmar Traditional", "Stage Decoration", "Backdrop", "Entrance Decoration", "Head Table", "Guest Tables", "Welcome Sign")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Portrait Photography", "Candid Photography", "Full Event Video", "Highlight Video")),
            item(ENTERTAINMENT, 4, List.of("Myanmar Traditional Performance", "MC / Host", "6-Hour Entertainment")),
            item(LIGHTING_AV, 5, List.of("Standard AV Package", "Additional Stage Lighting", "Extra Wireless Microphone")),
            item(CAKE, 6, List.of("Traditional Myanmar Celebration Cake", "Vanilla", "Fresh Flower Decoration")),
            item(FLORAL, 7, List.of("Bridal Bouquet", "Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Roses", "Orchids", "Classic White & Green", "Traditional", "Balanced flowers & greenery"))
        )),
        spec("thanlyin-garden-romance", "Thanlyin Garden Romance", PackageCategory.WEDDING, "A relaxed Yangon garden-inspired wedding with fresh details, gentle lighting and an inviting atmosphere for loved ones.", "Excel Hotel - Wedding Function Hall", 150, "12500000.00", List.of(
            item(CATERING, 1, List.of("Cocktail / Finger Food", "Fresh Juice Package", "Mini Pastries")),
            item(DECORATION, 2, List.of("Garden", "Backdrop", "Entrance Decoration", "Photo Area Decoration", "Fairy Lights", "Welcome Sign")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Candid Photography", "Couple Session", "Highlight Video")),
            item(ENTERTAINMENT, 4, List.of("Acoustic Singer", "Violinist", "MC / Host", "6-Hour Entertainment")),
            item(LIGHTING_AV, 5, List.of("Standard AV Package", "Ambient Lighting")),
            item(CAKE, 6, List.of("Romantic Garden Cake", "Strawberry", "Fresh Flower Decoration")),
            item(FLORAL, 7, List.of("Bridal Bouquet", "Flower Arch", "Aisle Flowers", "Entrance Flowers", "Table Centerpieces", "Roses", "Hydrangeas", "Romantic Blush", "Garden & Natural", "Balanced flowers & greenery"))
        )),
        spec("mandalay-grace", "Mandalay Grace", PackageCategory.WEDDING, "A graceful, elegant Mandalay wedding for families who want romantic styling, formal details and a warm celebration.", "Perfect Hotel - Function Hall", 100, "12500000.00", List.of(
            item(CATERING, 1, List.of("Family Style", "Soft Drinks Package", "Dessert Station")),
            item(DECORATION, 2, List.of("Romantic", "Stage Decoration", "Backdrop", "Entrance Decoration", "Guest Tables", "Head Table", "Photo Area Decoration", "Welcome Sign", "Fairy Lights")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Candid Photography", "Couple Session", "Highlight Video", "Photo Album")),
            item(ENTERTAINMENT, 4, List.of("Acoustic Singer", "MC / Host", "Myanmar Traditional Performance", "6-Hour Entertainment")),
            item(LIGHTING_AV, 5, List.of("Standard AV Package", "Ambient Lighting", "Additional Stage Lighting")),
            item(CAKE, 6, List.of("Classic Floral Wedding Cake", "Vanilla", "Fresh Flower Decoration", "Macaron Set")),
            item(FLORAL, 7, List.of("Bridal Bouquet", "Flower Arch", "Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Roses", "Orchids", "Classic White & Green", "Romantic & Elegant", "Balanced flowers & greenery"))
        )),
        spec("riverside-forever", "Riverside Forever", PackageCategory.ANNIVERSARY, "A premium romantic anniversary by the royal lake with refined dining, soft florals and intimate entertainment.", "Chatrium Hotel Royal Lake Yangon", 70, "11000000.00", List.of(
            item(CATERING, 1, List.of("Plated Dinner", "Fresh Juice Package", "Premium Dessert Bar")),
            item(DECORATION, 2, List.of("Romantic", "Stage Decoration", "Backdrop", "Entrance Decoration", "Head Table", "Photo Area Decoration", "Fairy Lights", "Welcome Sign")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Candid Photography", "Couple Session", "Highlight Video", "Photo Album")),
            item(ENTERTAINMENT, 4, List.of("Acoustic Singer", "Violinist", "MC / Host", "6 hours")),
            item(LIGHTING_AV, 5, List.of("Standard AV Package", "Ambient Lighting", "Spotlight")),
            item(CAKE, 6, List.of("Romantic Garden Cake", "Strawberry", "Fresh Flower Decoration", "Macaron Set")),
            item(FLORAL, 7, List.of("Flower Arch", "Entrance Flowers", "Table Centerpieces", "Roses", "Hydrangeas", "Romantic Blush", "Romantic & Elegant", "Balanced flowers & greenery"))
        )),
        spec("lakeview-love-celebration", "Lakeview Love Celebration", PackageCategory.ANNIVERSARY, "An elegant relaxed anniversary with lakeside-inspired styling, fresh flowers and a welcoming family atmosphere.", "Sedona Hotel Yangon", 120, "10500000.00", List.of(
            item(CATERING, 1, List.of("Buffet", "Soft Drinks Package", "Dessert Station")),
            item(DECORATION, 2, List.of("Garden", "Backdrop", "Entrance Decoration", "Guest Tables", "Photo Area Decoration", "Fairy Lights")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Portrait Photography", "Couple Session", "Highlight Video")),
            item(ENTERTAINMENT, 4, List.of("Acoustic Singer", "DJ", "4 hours")),
            item(LIGHTING_AV, 5, List.of("Standard AV Package", "Ambient Lighting")),
            item(CAKE, 6, List.of("Classic Floral Wedding Cake", "Vanilla", "Fresh Flower Decoration")),
            item(FLORAL, 7, List.of("Entrance Flowers", "Stage Flowers", "Table Centerpieces", "Roses", "Hydrangeas", "Soft Pastel", "Garden & Natural", "Balanced flowers & greenery"))
        )),
        spec("golden-jubilee-dinner", "Golden Jubilee Dinner", PackageCategory.ANNIVERSARY, "A formal milestone anniversary dinner with premium dining, elegant production and polished floral details.", "Hotel Parami", 100, "15500000.00", List.of(
            item(CATERING, 1, List.of("Set Menu", "Premium Beverage Package", "Premium Dessert Bar")),
            item(DECORATION, 2, List.of("Luxury", "Stage Decoration", "Backdrop", "Entrance Decoration", "Guest Tables", "Head Table", "Custom Signage", "Candles")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Portrait Photography", "Full Event Video", "Highlight Video", "Photo Album")),
            item(ENTERTAINMENT, 4, List.of("Live Band", "MC / Host", "Violinist", "6 hours")),
            item(LIGHTING_AV, 5, List.of("Premium AV Package", "Ambient Lighting", "Spotlight", "Additional Stage Lighting")),
            item(CAKE, 6, List.of("Royal Gold Pearl Cake", "Red Velvet", "Metallic Gold Details", "Dessert Table")),
            item(FLORAL, 7, List.of("Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Floral Photo Backdrop", "Roses", "Orchids", "Classic White & Green", "Luxury & Glamorous", "Balanced flowers & greenery"))
        )),
        spec("mingalar-family-anniversary", "Mingalar Family Anniversary", PackageCategory.ANNIVERSARY, "A warm Mandalay family celebration with traditional dining, graceful styling and familiar entertainment.", "Mingalar Mandalay Hotel", 60, "8500000.00", List.of(
            item(CATERING, 1, List.of("Family Style", "Soft Drinks Package", "Traditional Dessert Station")),
            item(DECORATION, 2, List.of("Myanmar Traditional", "Stage Decoration", "Backdrop", "Guest Tables", "Head Table", "Welcome Sign")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Portrait Photography", "Highlight Video")),
            item(ENTERTAINMENT, 4, List.of("Myanmar Traditional Performance", "MC / Host", "4 hours")),
            item(LIGHTING_AV, 5, List.of("Standard AV Package", "Additional Stage Lighting")),
            item(CAKE, 6, List.of("Traditional Myanmar Celebration Cake", "Vanilla", "Fresh Flower Decoration")),
            item(FLORAL, 7, List.of("Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Roses", "Classic White & Green", "Traditional", "Balanced flowers & greenery"))
        )),
        spec("royal-mandalay-memorial", "Royal Mandalay Memorial", PackageCategory.ANNIVERSARY, "A premium Mandalay anniversary with elevated dining, grand styling and complete media, entertainment and floral details.", "Mandalay Hill Resort", 100, "19000000.00", List.of(
            item(CATERING, 1, List.of("Plated Dinner", "Premium Beverage Package", "Premium Dessert Bar", "Carving Station")),
            item(DECORATION, 2, List.of("Luxury", "Stage Decoration", "Backdrop", "Entrance Decoration", "Guest Tables", "Head Table", "Ceiling Decoration", "Photo Area Decoration", "Custom Signage")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Candid Photography", "Full Event Video", "Cinematic Film", "Photo Album")),
            item(ENTERTAINMENT, 4, List.of("Live Band", "MC / Host", "Myanmar Traditional Performance", "8 hours")),
            item(LIGHTING_AV, 5, List.of("Premium AV Package", "Additional Stage Lighting", "Ambient Lighting", "Moving Lights")),
            item(CAKE, 6, List.of("Crimson Rose Cake", "Red Velvet", "Metallic Gold Details", "Dessert Table")),
            item(FLORAL, 7, List.of("Flower Arch", "Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Floral Photo Backdrop", "Roses", "Orchids", "Classic White & Green", "Luxury & Glamorous", "Balanced flowers & greenery"))
        )),
        spec("business-excellence", "Business Excellence", PackageCategory.CORPORATE, "A professional Novotel conference package for presentations, networking and polished guest hospitality.", "Novotel Yangon Max - Pathein Ballroom", 120, "10500000.00", List.of(
            item(CATERING, 1, List.of("Buffet", "Coffee & Tea Package", "Mini Pastries")),
            item(DECORATION, 2, List.of("Luxury", "Stage Decoration", "Backdrop", "Entrance Decoration", "Guest Tables", "Welcome Sign", "Custom Signage")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Candid Photography", "Full Event Video")),
            item(ENTERTAINMENT, 4, List.of("MC / Host", "4 hours")),
            item(LIGHTING_AV, 5, List.of("Standard AV Package", "Extra Wireless Microphone", "Projector & Screen", "Additional Stage Lighting", "Spotlight")),
            item(CAKE, 6, List.of("Royal Gold Pearl Cake", "Vanilla", "Metallic Gold Details", "Dessert Table")),
            item(FLORAL, 7, List.of("Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Orchids", "Classic White & Green", "Balanced flowers & greenery"))
        )),
        spec("leadership-excellence", "Leadership Excellence", PackageCategory.CORPORATE, "A premium executive conference experience with formal dining, strong AV production and refined corporate presentation.", "Meli\u00e1 Yangon - Grand Ballroom", 350, "33500000.00", List.of(
            item(CATERING, 1, List.of("Plated Dinner", "Premium Beverage Package", "Premium Dessert Bar")),
            item(DECORATION, 2, List.of("Luxury", "Stage Decoration", "Backdrop", "Entrance Decoration", "Guest Tables", "Head Table", "Photo Area Decoration", "Custom Signage")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Candid Photography", "Full Event Video", "Highlight Video")),
            item(ENTERTAINMENT, 4, List.of("MC / Host", "Violinist", "6 hours")),
            item(LIGHTING_AV, 5, List.of("Premium AV Package", "Additional Stage Lighting", "Ambient Lighting", "Spotlight", "LED Screen", "Extra Wireless Microphone")),
            item(CAKE, 6, List.of("Crimson Rose Cake", "Red Velvet", "Metallic Gold Details", "Dessert Table")),
            item(FLORAL, 7, List.of("Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Orchids", "Classic White & Green", "Balanced flowers & greenery"))
        )),
        spec("mandalay-business-forum", "Mandalay Business Forum", PackageCategory.CORPORATE, "An accessible Mandalay business forum package with practical presentation support, networking hospitality and professional event services.", "Y Mandalay Hotel - Grand Ballroom", 200, "13000000.00", List.of(
            item(CATERING, 1, List.of("Buffet", "Coffee & Tea Package", "Mini Pastries")),
            item(DECORATION, 2, List.of("Luxury", "Stage Decoration", "Backdrop", "Entrance Decoration", "Guest Tables", "Welcome Sign")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Portrait Photography", "Highlight Video")),
            item(ENTERTAINMENT, 4, List.of("MC / Host", "4 hours")),
            item(LIGHTING_AV, 5, List.of("Standard AV Package", "Extra Wireless Microphone", "Projector & Screen", "Additional Stage Lighting")),
            item(CAKE, 6, List.of("Classic Floral Wedding Cake", "Vanilla", "Fresh Flower Decoration")),
            item(FLORAL, 7, List.of("Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Classic White & Green", "Balanced flowers & greenery"))
        )),
        spec("vision-corporate-summit", "Vision Corporate Summit", PackageCategory.CORPORATE, "A premium summit package built for large presentations, executive hospitality and polished Mandalay event production.", "Mingalar Mandalay Hotel - Grand Ballroom", 300, "30000000.00", List.of(
            item(CATERING, 1, List.of("Plated Dinner", "Premium Beverage Package", "Premium Dessert Bar")),
            item(DECORATION, 2, List.of("Luxury", "Stage Decoration", "Backdrop", "Entrance Decoration", "Guest Tables", "Head Table", "Photo Area Decoration", "Custom Signage")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Candid Photography", "Full Event Video", "Highlight Video")),
            item(ENTERTAINMENT, 4, List.of("MC / Host", "Violinist", "8 hours")),
            item(LIGHTING_AV, 5, List.of("Premium AV Package", "LED Screen", "Additional Stage Lighting", "Spotlight", "Extra Wireless Microphone", "Moving Lights")),
            item(CAKE, 6, List.of("Crimson Rose Cake", "Red Velvet", "Metallic Gold Details", "Dessert Table")),
            item(FLORAL, 7, List.of("Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Orchids", "Classic White & Green", "Balanced flowers & greenery"))
        )),
        spec("sweet-beginnings", "Sweet Beginnings", PackageCategory.BIRTHDAY, "An intimate, charming birthday with light refreshments, a beautiful cake and relaxed celebration details.", "The Brunch Society", 30, "5000000.00", List.of(
            item(CATERING, 1, List.of("Cocktail / Finger Food", "Fresh Juice Package", "Mini Pastries")),
            item(DECORATION, 2, List.of("Romantic", "Backdrop", "Photo Area Decoration", "Guest Tables", "Welcome Sign", "Fairy Lights")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Candid Photography", "Portrait Photography")),
            item(ENTERTAINMENT, 4, List.of("Acoustic Singer", "MC / Host", "4 hours")),
            item(LIGHTING_AV, 5, List.of("Basic AV Package", "Ambient Lighting")),
            item(CAKE, 6, List.of("One-Tier Gold Elegance Cake", "Strawberry", "Fresh Flower Decoration")),
            item(FLORAL, 7, List.of("Table Centerpieces", "Entrance Flowers", "Soft Pastel", "Garden & Natural", "Balanced flowers & greenery"))
        )),
        spec("yangon-garden-birthday", "Yangon Garden Birthday", PackageCategory.BIRTHDAY, "A fresh outdoor birthday with garden styling, colorful florals and lively entertainment for family and friends.", "Zephyr", 60, "8500000.00", List.of(
            item(CATERING, 1, List.of("Buffet", "Fresh Juice Package", "Dessert Station")),
            item(DECORATION, 2, List.of("Garden", "Backdrop", "Entrance Decoration", "Photo Area Decoration", "Fairy Lights", "Welcome Sign")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Candid Photography", "Portrait Photography", "Highlight Video")),
            item(ENTERTAINMENT, 4, List.of("Acoustic Singer", "DJ", "MC / Host", "4 hours")),
            item(LIGHTING_AV, 5, List.of("Standard AV Package", "Ambient Lighting")),
            item(CAKE, 6, List.of("Romantic Garden Cake", "Strawberry", "Fresh Flower Decoration", "Macaron Set")),
            item(FLORAL, 7, List.of("Entrance Flowers", "Table Centerpieces", "Floral Photo Backdrop", "Roses", "Hydrangeas", "Soft Pastel", "Garden & Natural", "Balanced flowers & greenery"))
        )),
        spec("royal-milestone", "Royal Milestone", PackageCategory.BIRTHDAY, "A premium milestone birthday with formal dining, luxury production and complete media, entertainment and floral details.", "Meli\u00e1 Yangon - Grand Ballroom", 300, "31500000.00", List.of(
            item(CATERING, 1, List.of("Plated Dinner", "Premium Beverage Package", "Premium Dessert Bar")),
            item(DECORATION, 2, List.of("Luxury", "Stage Decoration", "Backdrop", "Entrance Decoration", "Guest Tables", "Head Table", "Photo Area Decoration", "Ceiling Decoration", "Custom Signage")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Candid Photography", "Portrait Photography", "Full Event Video", "Highlight Video", "Photo Album")),
            item(ENTERTAINMENT, 4, List.of("Live Band", "MC / Host", "DJ", "6 hours")),
            item(LIGHTING_AV, 5, List.of("Premium AV Package", "Additional Stage Lighting", "Ambient Lighting", "Moving Lights", "LED Screen")),
            item(CAKE, 6, List.of("Royal Gold Pearl Cake", "Red Velvet", "Metallic Gold Details", "Dessert Table")),
            item(FLORAL, 7, List.of("Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Floral Photo Backdrop", "Roses", "Orchids", "Luxury & Glamorous", "Balanced flowers & greenery"))
        )),
        spec("elegant-birthday", "Elegant Birthday", PackageCategory.BIRTHDAY, "A stylish Mandalay dining celebration with refined decoration, elegant cake details and intimate entertainment.", "Unique Mandalay Brewery", 50, "6000000.00", List.of(
            item(CATERING, 1, List.of("Family Style", "Soft Drinks Package", "Dessert Station")),
            item(DECORATION, 2, List.of("Backdrop", "Guest Tables", "Photo Area Decoration", "Welcome Sign", "Fairy Lights")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Candid Photography", "Portrait Photography")),
            item(ENTERTAINMENT, 4, List.of("Acoustic Singer", "MC / Host", "4 hours")),
            item(LIGHTING_AV, 5, List.of("Basic AV Package", "Ambient Lighting")),
            item(CAKE, 6, List.of("One-Tier Gold Elegance Cake", "Vanilla", "Metallic Gold Details")),
            item(FLORAL, 7, List.of("Table Centerpieces", "Entrance Flowers", "Roses", "Soft Pastel", "Romantic & Elegant", "Balanced flowers & greenery"))
        )),
        spec("birthday-celebration-plus", "Birthday Celebration Plus", PackageCategory.BIRTHDAY, "A lively family birthday with generous dining, colorful styling, entertainment and memorable photography.", "The Palace by Golden Duck", 100, "10500000.00", List.of(
            item(CATERING, 1, List.of("Buffet", "Soft Drinks Package", "Dessert Station")),
            item(DECORATION, 2, List.of("Romantic", "Stage Decoration", "Backdrop", "Entrance Decoration", "Guest Tables", "Photo Area Decoration", "Welcome Sign")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Candid Photography", "Portrait Photography", "Highlight Video")),
            item(ENTERTAINMENT, 4, List.of("MC / Host", "DJ", "Acoustic Singer", "6 hours")),
            item(LIGHTING_AV, 5, List.of("Standard AV Package", "Ambient Lighting", "Additional Stage Lighting")),
            item(CAKE, 6, List.of("One-Tier Floral Celebration Cake", "Strawberry", "Fresh Flower Decoration", "Dessert Table")),
            item(FLORAL, 7, List.of("Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Roses", "Bold Celebration", "Balanced flowers & greenery"))
        )),
        spec("grand-birthday-experience", "Grand Birthday Experience", PackageCategory.BIRTHDAY, "A large premium Mandalay birthday with elevated dining, grand production and complete celebration services.", "Orchid Grand Ballroom", 200, "28000000.00", List.of(
            item(CATERING, 1, List.of("Plated Dinner", "Premium Beverage Package", "Premium Dessert Bar", "Live Chef Station")),
            item(DECORATION, 2, List.of("Luxury", "Stage Decoration", "Backdrop", "Entrance Decoration", "Guest Tables", "Head Table", "Ceiling Decoration", "Photo Area Decoration", "Custom Signage")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Candid Photography", "Portrait Photography", "Full Event Video", "Highlight Video", "Photo Album")),
            item(ENTERTAINMENT, 4, List.of("Live Band", "MC / Host", "DJ", "8 hours")),
            item(LIGHTING_AV, 5, List.of("Premium AV Package", "Additional Stage Lighting", "Ambient Lighting", "Moving Lights", "LED Screen")),
            item(CAKE, 6, List.of("Royal Gold Pearl Cake", "Red Velvet", "Metallic Gold Details", "Dessert Table")),
            item(FLORAL, 7, List.of("Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Floral Photo Backdrop", "Roses", "Orchids", "Luxury & Glamorous", "Balanced flowers & greenery"))
        )),
        spec("academic-dreams", "Academic Dreams", PackageCategory.GRADUATION, "An intimate Yangon graduation celebration with light refreshments, thoughtful photography, and a warm, polished finish.", "White Swan", 50, "5500000.00", List.of(
            item(CATERING, 1, List.of("High Tea / Afternoon Reception", "Fresh Juice Package", "Mini Pastries")),
            item(DECORATION, 2, List.of("Romantic", "Backdrop", "Photo Area Decoration", "Guest Tables", "Welcome Sign", "Fairy Lights")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Portrait Photography", "Candid Photography")),
            item(ENTERTAINMENT, 4, List.of("MC / Host", "Acoustic Singer", "4 hours")),
            item(LIGHTING_AV, 5, List.of("Basic AV Package", "Ambient Lighting")),
            item(CAKE, 6, List.of("One-Tier Floral Celebration Cake", "Vanilla", "Fresh Flower Decoration")),
            item(FLORAL, 7, List.of("Table Centerpieces", "Entrance Flowers", "Soft Pastel", "Garden & Natural", "Balanced flowers & greenery"))
        )),
        spec("future-leaders", "Future Leaders", PackageCategory.GRADUATION, "A modern Yangon graduation party with buffet dining, fresh styling, lively entertainment, and complete photo coverage.", "Jasmine Palace Hotel", 100, "10000000.00", List.of(
            item(CATERING, 1, List.of("Buffet", "Soft Drinks Package", "Dessert Station")),
            item(DECORATION, 2, List.of("Romantic", "Stage Decoration", "Backdrop", "Entrance Decoration", "Guest Tables", "Photo Area Decoration", "Welcome Sign")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Portrait Photography", "Candid Photography", "Highlight Video")),
            item(ENTERTAINMENT, 4, List.of("MC / Host", "DJ", "6 hours")),
            item(LIGHTING_AV, 5, List.of("Standard AV Package", "Ambient Lighting", "Additional Stage Lighting")),
            item(CAKE, 6, List.of("One-Tier Floral Celebration Cake", "Strawberry", "Fresh Flower Decoration", "Macaron Set")),
            item(FLORAL, 7, List.of("Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Roses", "Soft Pastel", "Balanced flowers & greenery"))
        )),
        spec("yangon-graduate-gala", "Yangon Graduate Gala", PackageCategory.GRADUATION, "A premium Yangon graduation gala with formal dining, grand production, complete media coverage, and elevated floral details.", "Lotte Hotel Yangon - Crystal Ballroom", 350, "41500000.00", List.of(
            item(CATERING, 1, List.of("Plated Dinner", "Premium Beverage Package", "Premium Dessert Bar", "Live Chef Station")),
            item(DECORATION, 2, List.of("Luxury", "Stage Decoration", "Backdrop", "Entrance Decoration", "Guest Tables", "Head Table", "Photo Area Decoration", "Ceiling Decoration", "Custom Signage")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Portrait Photography", "Candid Photography", "Full Event Video", "Highlight Video", "Photo Album")),
            item(ENTERTAINMENT, 4, List.of("Live Band", "MC / Host", "DJ", "8 hours")),
            item(LIGHTING_AV, 5, List.of("Premium AV Package", "Additional Stage Lighting", "Ambient Lighting", "Moving Lights", "LED Screen")),
            item(CAKE, 6, List.of("Royal Gold Pearl Cake", "Red Velvet", "Metallic Gold Details", "Dessert Table")),
            item(FLORAL, 7, List.of("Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Floral Photo Backdrop", "Roses", "Orchids", "Luxury & Glamorous", "Balanced flowers & greenery"))
        )),
        spec("graduation-celebration", "Graduation Celebration", PackageCategory.GRADUATION, "A warm Mandalay graduation with generous dining, joyful styling, and memorable photography for family and friends.", "Y Mandalay Hotel - Grand Ballroom", 200, "16000000.00", List.of(
            item(CATERING, 1, List.of("Family Style", "Soft Drinks Package", "Dessert Station")),
            item(DECORATION, 2, List.of("Romantic", "Stage Decoration", "Backdrop", "Entrance Decoration", "Guest Tables", "Photo Area Decoration", "Welcome Sign")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Portrait Photography", "Candid Photography", "Highlight Video")),
            item(ENTERTAINMENT, 4, List.of("MC / Host", "Acoustic Singer", "6 hours")),
            item(LIGHTING_AV, 5, List.of("Standard AV Package", "Additional Stage Lighting", "Ambient Lighting")),
            item(CAKE, 6, List.of("Classic Floral Wedding Cake", "Vanilla", "Fresh Flower Decoration")),
            item(FLORAL, 7, List.of("Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Roses", "Classic White & Green", "Balanced flowers & greenery"))
        )),
        spec("graduation-grand-ceremony", "Graduation Grand Ceremony", PackageCategory.GRADUATION, "A formal Mandalay ceremony with strong stage presentation, professional photography, and presentation-focused AV.", "Ceremon Grand", 300, "25000000.00", List.of(
            item(CATERING, 1, List.of("Buffet", "Premium Beverage Package", "Premium Dessert Bar")),
            item(DECORATION, 2, List.of("Luxury", "Stage Decoration", "Backdrop", "Entrance Decoration", "Guest Tables", "Head Table", "Photo Area Decoration", "Custom Signage")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Portrait Photography", "Candid Photography", "Full Event Video", "Highlight Video", "Photo Album")),
            item(ENTERTAINMENT, 4, List.of("MC / Host", "6 hours")),
            item(LIGHTING_AV, 5, List.of("Premium AV Package", "LED Screen", "Additional Stage Lighting", "Spotlight", "Extra Wireless Microphone")),
            item(CAKE, 6, List.of("Royal Gold Pearl Cake", "Red Velvet", "Metallic Gold Details", "Dessert Table")),
            item(FLORAL, 7, List.of("Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Orchids", "Classic White & Green", "Balanced flowers & greenery"))
        )),
        spec("graduation-excellence", "Graduation Excellence", PackageCategory.GRADUATION, "A premium Mandalay graduation gala with elevated dining, grand production, complete media, and full celebration services.", "Mingalar Mandalay Hotel - Grand Ballroom", 500, "55500000.00", List.of(
            item(CATERING, 1, List.of("Plated Dinner", "Premium Beverage Package", "Premium Dessert Bar", "Live Chef Station")),
            item(DECORATION, 2, List.of("Luxury", "Stage Decoration", "Backdrop", "Entrance Decoration", "Guest Tables", "Head Table", "Ceiling Decoration", "Photo Area Decoration", "Custom Signage")),
            item(PHOTOGRAPHY, 3, List.of("Event Photography", "Portrait Photography", "Candid Photography", "Full Event Video", "Highlight Video", "Photo Album")),
            item(ENTERTAINMENT, 4, List.of("Live Band", "MC / Host", "DJ", "8 hours")),
            item(LIGHTING_AV, 5, List.of("Premium AV Package", "LED Screen", "Additional Stage Lighting", "Ambient Lighting", "Moving Lights", "Spotlight")),
            item(CAKE, 6, List.of("Royal Gold Pearl Cake", "Red Velvet", "Metallic Gold Details", "Dessert Table")),
            item(FLORAL, 7, List.of("Stage Flowers", "Entrance Flowers", "Table Centerpieces", "Floral Photo Backdrop", "Roses", "Orchids", "Luxury & Glamorous", "Balanced flowers & greenery"))
        ))
    );}
}
