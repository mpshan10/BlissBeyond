package com.blissbeyond.config;

import com.blissbeyond.entity.*;
import com.blissbeyond.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Objects;

@Configuration
public class DataSeeder {

    @Bean
    @Order(1)
    CommandLineRunner seedRolesAndCatalog(
        RoleRepository roleRepository,
        VenueRepository venueRepository,
        UserRepository userRepository,
        EventRepository eventRepository,
        BookingRepository bookingRepository,
        ServiceRepository serviceRepository,
        FoodCategoryRepository foodCategoryRepository,
        CuisineRepository cuisineRepository,
        FoodRepository foodRepository,
        AddOnRepository addOnRepository,
        DiningStyleRepository diningStyleRepository,
        PasswordEncoder passwordEncoder
    ) {
        return args -> {

            if (roleRepository.count() == 0) {
                roleRepository.saveAll(List.of(
                    new Role(RoleName.ROLE_CUSTOMER),
                    new Role(RoleName.ROLE_ADMIN),
                    new Role(RoleName.ROLE_STAFF)
                ));
            }

            /*
             * IMPORTANT:
             * Venues must be created before PackageCatalogSeeder runs.
             *
             * DataSeeder = @Order(1)
             * PackageCatalogSeeder = @Order(100)
             */
            seedVenues(venueRepository);

            Role adminRole = roleRepository.findAll().stream()
                .filter(role -> role.getName() == RoleName.ROLE_ADMIN)
                .findFirst()
                .orElse(null);

            if (!userRepository.existsByEmail("admin@bliss.test")) {
                User admin = new User();
                admin.setFirstName("Bliss");
                admin.setLastName("Admin");
                admin.setEmail("admin@bliss.test");
                admin.setPhone("+95 9 000 0000");
                admin.setPasswordHash(
                    passwordEncoder.encode("blissadmin")
                );

                if (adminRole != null) {
                    admin.addRole(adminRole);
                }

                userRepository.save(admin);
            }

            if (bookingRepository.count() == 0) {

                Role customerRole = roleRepository.findAll().stream()
                    .filter(role -> role.getName() == RoleName.ROLE_CUSTOMER)
                    .findFirst()
                    .orElse(null);

                User customer = userRepository.findAll().stream()
                    .filter(user ->
                        user.getRoles().stream().anyMatch(
                            role -> role.getName() == RoleName.ROLE_CUSTOMER
                        )
                    )
                    .findFirst()
                    .orElseGet(() -> {

                        User user = new User();
                        user.setFirstName("Amara");
                        user.setLastName("Perera");
                        user.setEmail("amara.perera@example.com");
                        user.setPhone("+95 9 123 4567");
                        user.setPasswordHash(
                            passwordEncoder.encode("Password123!")
                        );

                        if (customerRole != null) {
                            user.addRole(customerRole);
                        }

                        return userRepository.save(user);
                    });

                Venue royalBallroom = venueRepository.findAll().stream()
                    .filter(venue ->
                        "Hotel Yangon – Royal Ballroom"
                            .equalsIgnoreCase(venue.getName())
                    )
                    .findFirst()
                    .orElse(null);

                if (royalBallroom != null) {

                    Event event = new Event();
                    event.setCustomer(customer);
                    event.setEventType("Wedding");
                    event.setEventDate(LocalDate.of(2026, 12, 24));
                    event.setGuestCount(300);
                    event.setStatus(EventStatus.BOOKED);
                    event.setVenue(royalBallroom);

                    event = eventRepository.save(event);

                    Booking booking = new Booking();
                    booking.setCustomer(customer);
                    booking.setEvent(event);
                    booking.setVenueId(royalBallroom.getId());
                    booking.setEventDate(LocalDate.of(2026, 12, 24));
                    booking.setStartTime(LocalTime.of(18, 0));
                    booking.setEndTime(LocalTime.of(21, 0));
                    booking.setStatus(BookingStatus.CONFIRMED);
                    booking.setCreatedAt(LocalDateTime.now());

                    bookingRepository.save(booking);
                }
            }

            /*
             * Services must exist before PackageCatalogSeeder
             * because packages reference service IDs.
             */
            seedServices(serviceRepository);

            Cuisine asian =
                ensureCuisine(cuisineRepository, "Asian");

            Cuisine western =
                ensureCuisine(cuisineRepository, "Western");

            Cuisine traditional =
                ensureCuisine(cuisineRepository, "Traditional");

            Cuisine international =
                ensureCuisine(cuisineRepository, "International");

            FoodCategory appetizers =
                ensureCategory(foodCategoryRepository, "Appetizers");

            FoodCategory mains =
                ensureCategory(foodCategoryRepository, "Main Course");

            FoodCategory sides =
                ensureCategory(foodCategoryRepository, "Side Dishes");

            FoodCategory desserts =
                ensureCategory(foodCategoryRepository, "Desserts");

            FoodCategory drinks =
                ensureCategory(foodCategoryRepository, "Drinks");

            List<Food> foodCatalog = List.of(

                food(
                    "Spring Rolls",
                    "Crisp vegetable rolls served with a sweet dipping sauce.",
                    asian,
                    appetizers,
                    "2.50",
                    true,
                    true,
                    true,
                    false,
                    true
                ),

                food(
                    "Samosa",
                    "Golden pastry pockets with spiced potato filling.",
                    asian,
                    appetizers,
                    "2.20",
                    true,
                    true,
                    true,
                    false,
                    true
                ),

                food(
                    "Chicken Satay",
                    "Grilled chicken skewers with peanut sauce.",
                    asian,
                    appetizers,
                    "3.10",
                    false,
                    false,
                    true,
                    true,
                    false
                ),

                food(
                    "Caesar Salad",
                    "Crisp romaine with parmesan and croutons.",
                    western,
                    appetizers,
                    "2.80",
                    false,
                    false,
                    true,
                    false,
                    true
                ),

                food(
                    "Fresh Garden Salad",
                    "Seasonal greens with citrus dressing.",
                    western,
                    appetizers,
                    "2.60",
                    true,
                    true,
                    true,
                    true,
                    true
                ),

                food(
                    "Chicken Biryani",
                    "Fragrant basmati rice with spiced chicken and herbs.",
                    asian,
                    mains,
                    "8.00",
                    false,
                    false,
                    true,
                    true,
                    true
                ),

                food(
                    "Butter Chicken",
                    "Creamy tomato-based chicken curry with aromatic spices.",
                    asian,
                    mains,
                    "7.00",
                    false,
                    false,
                    true,
                    true,
                    true
                ),

                food(
                    "Fried Rice",
                    "Wok-fried rice with vegetables and savory seasoning.",
                    asian,
                    mains,
                    "5.00",
                    true,
                    true,
                    true,
                    false,
                    true
                ),

                food(
                    "Beef Steak",
                    "Chargrilled steak with rich jus and vegetables.",
                    western,
                    mains,
                    "9.00",
                    false,
                    false,
                    false,
                    true,
                    true
                ),

                food(
                    "Vegetable Curry",
                    "Comforting local vegetable curry with fragrant spices.",
                    traditional,
                    mains,
                    "4.50",
                    true,
                    true,
                    true,
                    true,
                    true
                ),

                food(
                    "Seafood Curry",
                    "A rich seafood curry finished with coconut cream.",
                    international,
                    mains,
                    "9.50",
                    false,
                    false,
                    true,
                    true,
                    true
                ),

                food(
                    "Naan",
                    "Soft oven-baked flatbread served warm.",
                    asian,
                    sides,
                    "1.40",
                    true,
                    true,
                    true,
                    false,
                    true
                ),

                food(
                    "Mashed Potatoes",
                    "Creamy mashed potatoes with herbs.",
                    western,
                    sides,
                    "1.80",
                    true,
                    false,
                    true,
                    true,
                    true
                ),

                food(
                    "Seasonal Salad",
                    "Seasonal vegetables with a light vinaigrette.",
                    international,
                    sides,
                    "1.60",
                    true,
                    true,
                    true,
                    true,
                    true
                ),

                food(
                    "Chocolate Cake",
                    "Rich chocolate sponge with silky ganache.",
                    western,
                    desserts,
                    "3.20",
                    true,
                    false,
                    true,
                    false,
                    false
                ),

                food(
                    "Cheesecake",
                    "Smooth cheesecake with a biscuit base.",
                    western,
                    desserts,
                    "3.80",
                    true,
                    false,
                    true,
                    false,
                    true
                ),

                food(
                    "Fruit Platter",
                    "Fresh seasonal fruit arranged beautifully.",
                    international,
                    desserts,
                    "2.90",
                    true,
                    true,
                    true,
                    true,
                    true
                ),

                food(
                    "Soft Drinks",
                    "Assorted soft drinks served chilled.",
                    international,
                    drinks,
                    "2.00",
                    true,
                    true,
                    true,
                    true,
                    true
                ),

                food(
                    "Fresh Juice",
                    "Fresh fruit juices prepared on the day.",
                    international,
                    drinks,
                    "2.40",
                    true,
                    true,
                    true,
                    true,
                    true
                ),

                food(
                    "Coffee",
                    "Freshly brewed coffee service.",
                    international,
                    drinks,
                    "1.80",
                    true,
                    true,
                    true,
                    true,
                    true
                ),

                food(
                    "Tea",
                    "Selection of premium tea service.",
                    international,
                    drinks,
                    "1.40",
                    true,
                    true,
                    true,
                    true,
                    true
                ),

                food(
                    "Mocktails",
                    "Signature alcohol-free drinks.",
                    international,
                    drinks,
                    "3.20",
                    true,
                    true,
                    true,
                    true,
                    true
                ),

                food(
                    "Pasta",
                    "Fresh pasta with a rich tomato or cream sauce.",
                    western,
                    mains,
                    "6.00",
                    true,
                    false,
                    true,
                    false,
                    true
                ),

                food(
                    "Traditional Desserts",
                    "Local sweets and milk-based desserts.",
                    traditional,
                    desserts,
                    "4.00",
                    true,
                    false,
                    true,
                    false,
                    true
                ),

                food(
                    "Coffee & Tea",
                    "Freshly brewed coffee and tea service.",
                    international,
                    drinks,
                    "2.00",
                    true,
                    true,
                    true,
                    true,
                    true
                )
            );

            if (foodRepository.count() == 0) {

                foodRepository.saveAll(foodCatalog);

            } else {

                List<Food> existingFoods =
                    foodRepository.findAll();

                for (Food food : foodCatalog) {
                    upsertFood(
                        foodRepository,
                        existingFoods,
                        food
                    );
                }
            }

            seedAddOns(addOnRepository);
            seedDiningStyles(diningStyleRepository);
        };
    }

    // =========================================================
    // DINING STYLES
    // =========================================================

    private void seedDiningStyles(
        DiningStyleRepository repository
    ) {

        List<DiningStyle> activeCatalog = List.of(

            diningStyle(
                "buffet",
                "Buffet",
                "Relaxed dining with a wide selection and quick service.",
                "25000.00"
            ),

            diningStyle(
                "plated",
                "Plated Dinner",
                "Elegant table service with a refined multi-course experience.",
                "40000.00"
            ),

            diningStyle(
                "cocktail",
                "Cocktail / Finger Food",
                "Light bites and roaming trays for a social reception.",
                "22000.00"
            ),

            diningStyle(
                "family",
                "Family Style",
                "Shared platters served to each table for a warm atmosphere.",
                "32000.00"
            ),

            diningStyle(
                "live",
                "Live Cooking Stations",
                "Interactive chef stations with fresh preparation and theatre.",
                "48000.00"
            ),

            diningStyle(
                "set",
                "Set Menu",
                "Structured menu with a polished, coordinated dining flow.",
                "36000.00"
            ),

            diningStyle(
                "high-tea",
                "High Tea / Afternoon Reception",
                "Elegant tea service with light bites, pastries and sweets.",
                "18000.00"
            ),

            diningStyle(
                "traditional",
                "Traditional Food",
                "Traditional Myanmar dishes served in an event-friendly dining style.",
                "30000.00"
            )
        );

        for (DiningStyle replacement : activeCatalog) {

            if (repository
                .findByKey(replacement.getKey())
                .isEmpty()) {

                repository.save(replacement);
            }
        }
    }

    private DiningStyle diningStyle(
        String key,
        String name,
        String description,
        String pricePerGuest
    ) {

        DiningStyle style = new DiningStyle();

        style.setKey(key);
        style.setName(name);
        style.setDescription(description);

        style.setPricePerGuest(
            new BigDecimal(pricePerGuest)
        );

        style.setAvailable(true);

        return style;
    }

    // =========================================================
    // ADD ONS
    // =========================================================

    private void seedAddOns(
        AddOnRepository repository
    ) {

        List<AddOn> activeCatalog = List.of(

            addon(
                "Soft Drinks Package",
                "10000.00",
                "A basic drinks package for all guests."
            ),

            addon(
                "Fresh Juice Package",
                "14000.00",
                "Fresh juice selection for a brighter reception."
            ),

            addon(
                "Mocktail Package",
                "18000.00",
                "Signature mocktails and presentation bar."
            ),

            addon(
                "Premium Beverage Package",
                "22000.00",
                "Upgraded beverages and service styling."
            ),

            addon(
                "Coffee & Tea Package",
                "8000.00",
                "Hot beverage station for all guests."
            ),

            addon(
                "Dessert Station",
                "8000.00",
                "A staffed dessert table with sweets and garnish."
            ),

            addon(
                "Premium Dessert Bar",
                "12000.00",
                "An elevated dessert installation for the event."
            ),

            addon(
                "Chocolate Fountain",
                "9000.00",
                "Classic chocolate fountain station."
            ),

            addon(
                "Mini Pastries",
                "7000.00",
                "Assorted miniature pastries for receptions and tea service."
            ),

            addon(
                "Macaron Station",
                "10000.00",
                "Elegant macaron display and service."
            ),

            addon(
                "Ice Cream Station",
                "9000.00",
                "Live ice cream service with toppings."
            ),

            addon(
                "Live Chef Station",
                "18000.00",
                "Chef-led live cooking experience."
            ),

            addon(
                "Sushi Station",
                "20000.00",
                "Fresh sushi prepared at the event."
            ),

            addon(
                "Carving Station",
                "17000.00",
                "Premium carving station with service chef."
            ),

            addon(
                "Cheese Board",
                "12000.00",
                "A curated cheese board for grazing."
            ),

            addon(
                "Seafood Station",
                "24000.00",
                "Live seafood service and presentation."
            ),

            addon(
                "Late-Night Snack Station",
                "13000.00",
                "A casual late-night food station."
            ),

            addon(
                "Mohinga Station",
                "12000.00",
                "Fresh Mohinga served with classic toppings."
            ),

            addon(
                "Shan Noodle Station",
                "13000.00",
                "Shan noodles with savoury toppings and garnishes."
            ),

            addon(
                "Traditional Snack Station",
                "10000.00",
                "Popular traditional snacks for receptions and events."
            ),

            addon(
                "Traditional Dessert Station",
                "11000.00",
                "Traditional sweets and refreshing dessert favourites."
            )
        );

        if (repository.count() == 0) {
            repository.saveAll(activeCatalog);
        }
    }

    // =========================================================
    // VENUES
    // =========================================================

    private void seedVenues(
        VenueRepository venueRepository
    ) {

        if (venueRepository.count() == 0) {

            List<Venue> venueCatalog =
                buildVenueCatalog();

            applyVenuePrices(venueCatalog);

            venueRepository.saveAll(
                venueCatalog
            );
        }

        List<Venue> existingVenues =
            venueRepository.findAll();

        /*
         * These extra venues are required by
         * PackageCatalogSeeder.
         */
        for (Venue venue : buildPackageVenueCatalog()) {

            boolean exists =
                existingVenues.stream()
                    .anyMatch(existing ->
                        normalizeVenueName(
                            existing.getName()
                        ).equals(
                            normalizeVenueName(
                                venue.getName()
                            )
                        )
                    );

            if (!exists) {

                Venue saved =
                    venueRepository.save(venue);

                existingVenues.add(saved);
            }
        }
    }

    private List<Venue> buildPackageVenueCatalog() {

        return List.of(

            packageVenue(
                "Lotte Hotel Yangon – Crystal Ballroom",
                "Indoor Space",
                "No. 82, Sin Phyu Shin Avenue, Pyay Road, Hlaing Township, Yangon",
                "Crystal Ballroom at Lotte Hotel Yangon for formal celebrations, graduations and corporate events.",
                480,
                "4500000.00",
                "/prototype/assets/img/venue-1.jpg"
            ),

            packageVenue(
                "Inya Lake Hotel – Sunset Terrace",
                "Outdoor Space",
                "No. 37, Kaba Aye Pagoda Road, Mayangone Township, Yangon",
                "Sunset Terrace at Inya Lake Hotel for outdoor engagements and relaxed lakeside celebrations.",
                100,
                "3000000.00",
                "/prototype/assets/img/venue-2.jpg"
            ),

            packageVenue(
                "Rose Garden Hotel – Khatta Room",
                "Indoor Space",
                "No. 171, Upper Pansodan Road, Mingalar Taung Nyunt Township, Yangon",
                "Khatta Room at Rose Garden Hotel for intimate engagements and private functions.",
                50,
                "1500000.00",
                "/prototype/assets/img/venue-1.jpg"
            ),

            packageVenue(
                "Meliá Yangon – Inya Ballroom",
                "Indoor Space",
                "No. 192, Kaba Aye Pagoda Road, Bahan Township, Yangon",
                "Inya Ballroom at Meliá Yangon for boardroom events, receptions and formal gatherings.",
                150,
                "2500000.00",
                "/prototype/assets/img/venue-2.jpg"
            ),

            packageVenue(
                "Meliá Yangon – Grand Ballroom",
                "Indoor Space",
                "No. 192, Kaba Aye Pagoda Road, Bahan Township, Yangon",
                "Grand Ballroom at Meliá Yangon for milestone celebrations and large formal events.",
                350,
                "4000000.00",
                "/prototype/assets/img/venue-2.jpg"
            ),

            packageVenue(
                "Summit Parkview Hotel – Grand Ballroom",
                "Indoor Space",
                "No. 350, Ahlone Road, Dagon Township, Yangon",
                "Grand Ballroom at Summit Parkview Hotel for corporate summits, celebrations and formal receptions.",
                200,
                "2500000.00",
                "/prototype/assets/img/venue-1.jpg"
            ),

            packageVenue(
                "Yangon Thanlwin Hotel – Thanlwin Ballroom",
                "Indoor Space",
                "Shed D, Theingyi Market, Shwedagon Pagoda Road, Latha Township, Yangon 11131",
                "Thanlwin Ballroom at Yangon Thanlwin Hotel for business forums and formal events.",
                250,
                "2500000.00",
                "/prototype/assets/img/venue-2.jpg"
            ),

            packageVenue(
                "Mandalay Hotel – Small Hall",
                "Indoor Space",
                "No. 562, 78th Street, between 37th & 38th Street, Maha Aung Myay Township, Mandalay",
                "Small Hall at Mandalay Hotel for engagements and intimate family celebrations.",
                150,
                "1200000.00",
                "/prototype/assets/img/venue-3.jpg"
            ),

            packageVenue(
                "Mandalay Hotel – Ballroom",
                "Indoor Space",
                "No. 562, 78th Street, between 37th & 38th Street, Maha Aung Myay Township, Mandalay",
                "Ballroom at Mandalay Hotel for anniversary dinners and formal celebrations.",
                null,
                "2000000.00",
                "/prototype/assets/img/venue-3.jpg"
            ),

            packageVenue(
                "Mingalar Mandalay Hotel – Grand Ballroom",
                "Indoor Space",
                "73rd Street, between Tha Zin & Ngu Shwe Wah Streets, Chanmyathazi Township, Mandalay",
                "Grand Ballroom at Mingalar Mandalay Hotel for graduations, corporate events and large celebrations.",
                500,
                "3000000.00",
                "/prototype/assets/img/venue-1.jpg"
            ),

            packageVenue(
                "Y Mandalay Hotel – Grand Ballroom",
                "Indoor Space",
                "No. MA-64, Corner of 53rd & 37(B) Street, Ye Mon Taung Quarter, Maha Aung Myay Township, Mandalay",
                "Grand Ballroom at Y Mandalay Hotel for graduations, business events and formal gatherings.",
                200,
                "2000000.00",
                "/prototype/assets/img/venue-1.jpg"
            )
        );
    }

    private Venue packageVenue(
        String name,
        String type,
        String location,
        String description,
        Integer capacity,
        String price,
        String image
    ) {

        Venue venue =
            venue(
                name,
                type,
                location,
                description,
                image
            );

        venue.setCapacity(capacity);

        venue.setPrice(
            new BigDecimal(price)
        );

        return venue;
    }

    private String normalizeVenueName(
        String value
    ) {

        return value
            .trim()
            .toLowerCase()
            .replace('\u2013', '-')
            .replace('\u2014', '-')
            .replaceAll("\\s*-\\s*", " - ")
            .replaceAll("\\s+", " ");
    }

    private List<Venue> buildVenueCatalog() {

        return List.of(

            venue(
                "Hotel Yangon – Royal Ballroom",
                "Indoor Space",
                "No. 91/93, Corner of Pyay Road & Kaba Aye Pagoda Road, 8 Mile Junction, Mayangone Township, Yangon",
                "Event ballroom; exact current public details should be confirmed with the venue.",
                "/prototype/assets/img/venue-1.jpg"
            ),

            venue(
                "Inya Lake Hotel – Mingalar Hall",
                "Indoor + Outdoor",
                "No. 37, Kaba Aye Pagoda Road, Mayangone Township, Yangon",
                "Mingalar Hall ballroom at Inya Lake Hotel; suitable for weddings and functions.",
                "/prototype/assets/img/venue-2.jpg"
            ),

            venue(
                "Novotel Yangon Max – Pathein Ballroom",
                "Indoor Space",
                "No. 459, Pyay Road, Kamayut Township, Yangon",
                "Pathein Ballroom is 277 m² with banquet capacity up to 180 guests.",
                "/prototype/assets/img/venue-3.jpg"
            ),

            venue(
                "Rose Garden Hotel – Swe Daw Banquet Hall",
                "Indoor + Outdoor",
                "No. 171, Upper Pansodan Road, Mingalar Taung Nyunt Township, Yangon",
                "The hotel lists the event space as Swe Daw & Kattha Room; suitable for private events and weddings.",
                "/prototype/assets/img/venue-1.jpg"
            ),

            venue(
                "Hotel Sidney Myanmar – Sidney Wedding Hall",
                "Indoor Space",
                "No. 8L, Mindhama Road, between Parami Road & Kyaik Waing Pagoda Road, Mayangone Township, Yangon",
                "Indoor venue suitable for weddings, celebrations and formal events.",
                "/prototype/assets/img/venue-2.jpg"
            ),

            venue(
                "Excel Hotel – Wedding Function Hall",
                "Indoor Space",
                "Excel Treasure Hotel, No. 520, Kaba Aye Pagoda Road, Shwe Gone Dine, Bahan Township, Yangon",
                "Indoor venue suitable for weddings, celebrations and formal events.",
                "/prototype/assets/img/venue-3.jpg"
            ),

            venue(
                "Perfect Hotel – Function Hall",
                "Indoor Space",
                "Theikpan Road, between 59th & 60th Street, Maha Aung Myay Township, Mandalay",
                "Indoor venue suitable for weddings, celebrations and formal events.",
                "/prototype/assets/img/venue-1.jpg"
            ),

            venue(
                "Wilson Hotel – Wedding Hall",
                "Indoor Space",
                "No. 31(E), 78th Street (Yangon–Mandalay Main Road), Maha Aung Myay Township, Mandalay",
                "Indoor venue suitable for weddings, celebrations and formal events.",
                "/prototype/assets/img/venue-2.jpg"
            ),

            venue(
                "Mandalay Hotel – Wedding Hall",
                "Indoor Space",
                "No. 562, 78th Street, between 37th & 38th Street, Maha Aung Myay Township, Mandalay",
                "Indoor venue suitable for weddings, celebrations and formal events.",
                "/prototype/assets/img/venue-3.jpg"
            ),

            venue(
                "Lotte Hotel Yangon – Sapphire Ballroom",
                "Indoor Space",
                "No. 82, Sin Phyu Shin Avenue, Pyay Road, Hlaing Township, Yangon",
                "Sapphire Ballroom is 831.2 m² with stated capacity of 350–800 guests.",
                "/prototype/assets/img/venue-1.jpg"
            ),

            venue(
                "Sky Star Hotel – Sky Pool",
                "Poolside",
                "No. 51/B/1, East Horse Race Course Road, Tamwe Township, Yangon",
                "Poolside setting for receptions, parties and relaxed celebrations.",
                "/prototype/assets/img/venue-2.jpg"
            ),

            venue(
                "Perfect Hotel – Mandalay",
                "Indoor Space",
                "Theikpan Road, between 59th & 60th Street, Maha Aung Myay Township, Mandalay",
                "Indoor venue suitable for weddings, celebrations and formal events.",
                "/prototype/assets/img/venue-3.jpg"
            ),

            venue(
                "Mingalar Mandalay Hotel",
                "Indoor + Outdoor",
                "73rd Street, between Tha Zin & Ngu Shwe Wah Streets, Chanmyathazi Township, Mandalay",
                "Flexible indoor and outdoor spaces for a variety of events.",
                "/prototype/assets/img/venue-1.jpg"
            ),

            venue(
                "Mandalay Hill Resort",
                "Indoor + Outdoor",
                "No. 416-B, 10th Street, at the Foot of Mandalay Hill, Aungmyaythazan Township, Mandalay",
                "Flexible indoor and outdoor spaces for a variety of events.",
                "/prototype/assets/img/venue-2.jpg"
            ),

            venue(
                "Chatrium Hotel Royal Lake Yangon",
                "Indoor + Outdoor",
                "No. 40, Natmauk Road, Tamwe Township, Yangon 11211",
                "Hotel event venue with indoor ballroom and outdoor pool-garden settings.",
                "/prototype/assets/img/venue-3.jpg"
            ),

            venue(
                "Ceremon Grand",
                "Indoor + Outdoor",
                "Corner of 53rd Street & 32nd Street, Chan Aye Thar San Township, Mandalay",
                "Flexible indoor and outdoor spaces for a variety of events.",
                "/prototype/assets/img/venue-1.jpg"
            ),

            venue(
                "Yangon Thanlwin Hotel",
                "Indoor Space",
                "Shed D, Theingyi Market, Shwedagon Pagoda Road, Latha Township, Yangon 11131",
                "Indoor venue suitable for weddings, celebrations and formal events.",
                "/prototype/assets/img/venue-2.jpg"
            ),

            venue(
                "Hotel Parami",
                "Outdoor Space",
                "No. 2, Parami Road, Mayangone Township, Yangon 11221",
                "Outdoor venue suitable for open-air celebrations and special occasions.",
                "/prototype/assets/img/venue-3.jpg"
            ),

            venue(
                "Sedona Hotel Yangon",
                "Indoor Space",
                "No. 1, Kaba Aye Pagoda Road, Yankin Township, Yangon",
                "Indoor venue suitable for weddings, celebrations and formal events.",
                "/prototype/assets/img/venue-1.jpg"
            ),

            venue(
                "PARKROYAL Yangon",
                "Indoor Space",
                "No. 33, Alan Pya Phaya Road, Dagon Township, Yangon",
                "Hotel event venue with ballroom and function spaces for celebrations and corporate events.",
                "/prototype/assets/img/venue-2.jpg"
            ),

            venue(
                "Golden Hill Tower Hotel",
                "Indoor Space",
                "No. 24–26, Kaba Aye Pagoda Road, Bahan Township, Yangon",
                "Indoor venue suitable for weddings, celebrations and formal events.",
                "/prototype/assets/img/venue-3.jpg"
            ),

            venue(
                "Y Mandalay Hotel",
                "Indoor Space",
                "No. MA-64, Corner of 53rd & 37(B) Street, Ye Mon Taung Quarter, Maha Aung Myay Township, Mandalay",
                "Indoor venue suitable for weddings, celebrations and formal events.",
                "/prototype/assets/img/venue-1.jpg"
            ),

            venue(
                "Unique Mandalay Brewery",
                "Indoor + Outdoor",
                "Exact current address could not be reliably verified",
                "Flexible indoor and outdoor spaces for a variety of events.",
                "/prototype/assets/img/venue-2.jpg"
            ),

            venue(
                "The Palace by Golden Duck",
                "Indoor Space",
                "Corner of 35th Street & 52nd Street, Chan Aye Thar Zan Township, Mandalay",
                "Indoor venue suitable for weddings, celebrations and formal events.",
                "/prototype/assets/img/venue-3.jpg"
            ),

            venue(
                "Orchid Grand Ballroom",
                "Indoor Space",
                "Rupar Mandalar Resort, No. A-15, Corner of 53rd & 30th Street, Chan Aye Thar Zan Township, Mandalay",
                "Indoor venue suitable for weddings, celebrations and formal events.",
                "/prototype/assets/img/venue-1.jpg"
            ),

            venue(
                "The Brunch Society",
                "Indoor + Outdoor",
                "No. 33B, Pyidaungzu Yeiktha Street, Dagon Township, Yangon",
                "Flexible indoor and outdoor spaces for a variety of events.",
                "/prototype/assets/img/venue-2.jpg"
            ),

            venue(
                "White Swan",
                "Indoor + Outdoor",
                "No. 5, U Tun Nyein Street, Ward 10, Mayangone Township, Yangon",
                "Flexible indoor and outdoor spaces for a variety of events.",
                "/prototype/assets/img/venue-3.jpg"
            ),

            venue(
                "Zephyr",
                "Outdoor Space",
                "No. 28, Inya Road, Sein Lan So Pyay Garden, Kamayut Township, Yangon",
                "Outdoor venue suitable for open-air celebrations and special occasions.",
                "/prototype/assets/img/venue-1.jpg"
            ),

            venue(
                "Jasmine Palace Hotel",
                "Indoor Space",
                "No. 341, Pyay Road, Sanchaung Township, Yangon",
                "Indoor venue suitable for weddings, celebrations and formal events.",
                "/prototype/assets/img/venue-2.jpg"
            ),

            venue(
                "Western Park Royal",
                "Indoor + Outdoor",
                "Kaba Aye Pagoda Road, Kandawgyi Nature Park, Bo Cho Ward (1), Bahan Township, Yangon",
                "Flexible indoor and outdoor spaces for a variety of events.",
                "/prototype/assets/img/venue-3.jpg"
            ),

            venue(
                "Summit Parkview Hotel",
                "Indoor Space",
                "No. 350, Ahlone Road, Dagon Township, Yangon",
                "Indoor venue suitable for weddings, celebrations and formal events.",
                "/prototype/assets/img/venue-1.jpg"
            ),

            venue(
                "Meliá Yangon",
                "Indoor Space",
                "No. 192, Kaba Aye Pagoda Road, Bahan Township, Yangon",
                "Indoor venue suitable for weddings, celebrations and formal events.",
                "/prototype/assets/img/venue-2.jpg"
            ),

            venue(
                "Wyndham Grand Yangon",
                "Indoor + Outdoor",
                "No. 11, Corner of Kan Yeik Thar Road & U Aung Myat Road, Mingalar Taung Nyunt Township, Yangon",
                "Flexible indoor and outdoor spaces for a variety of events.",
                "/prototype/assets/img/venue-3.jpg"
            )
        );
    }

    private void applyVenuePrices(
        List<Venue> venueCatalog
    ) {

        List<String> pricesInCatalogOrder =
            List.of(
                "2500000",
                "4000000",
                "4500000",
                "3000000",
                "2000000",
                "1800000",
                "1500000",
                "1800000",
                "2500000",
                "6500000",
                "3000000",
                "1500000",
                "4500000",
                "5000000",
                "5500000",
                "3500000",
                "3000000",
                "2500000",
                "6000000",
                "5500000",
                "2500000",
                "2000000",
                "2500000",
                "3000000",
                "3500000",
                "2000000",
                "2500000",
                "3000000",
                "4000000",
                "3500000",
                "4000000",
                "7000000",
                "7000000"
            );

        for (
            int index = 0;
            index < venueCatalog.size()
                && index < pricesInCatalogOrder.size();
            index++
        ) {

            venueCatalog
                .get(index)
                .setPrice(
                    new BigDecimal(
                        pricesInCatalogOrder.get(index)
                    )
                );
        }
    }

    private Venue venue(
        String name,
        String type,
        String location,
        String description,
        String image
    ) {

        Venue venue = new Venue();

        venue.setName(name);
        venue.setType(type);
        venue.setLocation(location);
        venue.setDescription(description);
        venue.setImage(image);
        venue.setAvailable(true);

        return venue;
    }

    // =========================================================
    // SERVICES
    // =========================================================

    private void seedServices(
        ServiceRepository serviceRepository
    ) {

        if (serviceRepository.count() == 0) {

            serviceRepository.saveAll(
                buildServiceCatalog()
            );
        }
    }

    private List<ServiceEntity> buildServiceCatalog() {

        return List.of(

            service(
                "Catering",
                "Create your perfect dining experience with custom menus, dining styles and service add-ons.",
                "35000.00"
            ),

            service(
                "Decoration & Styling",
                "Create the atmosphere with themes, florals, stage styling and elegant venue design.",
                "900000.00"
            ),

            service(
                "Photography & Videography",
                "Capture your event with cinematic video, portraits, candid moments and digital delivery.",
                "650000.00"
            ),

            service(
                "Entertainment",
                "Choose DJs, live bands, MCs and performances to shape the mood of the night.",
                "500000.00"
            ),

            service(
                "Lighting & AV",
                "Choose sound systems, lighting, screens and stage equipment for your event.",
                "300000.00"
            ),

            service(
                "Cake & Desserts",
                "Design a cake and dessert experience to match the tone of your event.",
                "160000.00"
            ),

            service(
                "Floral Design",
                "Bring the venue to life with bouquets, arches, centerpieces and floral styling.",
                "150000.00"
            )
        );
    }

    private ServiceEntity service(
        String name,
        String description,
        String basePrice
    ) {

        ServiceEntity service =
            new ServiceEntity();

        service.setName(name);
        service.setDescription(description);

        service.setBasePrice(
            new BigDecimal(basePrice)
        );

        service.setCustomizable(true);
        service.setAvailable(true);

        return service;
    }

    // =========================================================
    // CUISINES
    // =========================================================

    private Cuisine ensureCuisine(
        CuisineRepository repository,
        String name
    ) {

        return repository
            .findAll()
            .stream()
            .filter(cuisine ->
                name.equalsIgnoreCase(
                    cuisine.getName()
                )
            )
            .findFirst()
            .orElseGet(() -> {

                Cuisine cuisine =
                    new Cuisine();

                cuisine.setName(name);

                return repository.save(
                    cuisine
                );
            });
    }

    // =========================================================
    // FOOD CATEGORIES
    // =========================================================

    private FoodCategory ensureCategory(
        FoodCategoryRepository repository,
        String name
    ) {

        return repository
            .findAll()
            .stream()
            .filter(category ->
                name.equalsIgnoreCase(
                    category.getName()
                )
            )
            .findFirst()
            .orElseGet(() -> {

                FoodCategory category =
                    new FoodCategory();

                category.setName(name);

                return repository.save(
                    category
                );
            });
    }

    // =========================================================
    // FOOD
    // =========================================================

    private Food food(
        String name,
        String description,
        Cuisine cuisine,
        FoodCategory category,
        String price,
        boolean vegetarian,
        boolean vegan,
        boolean halal,
        boolean glutenFree,
        boolean nutFree
    ) {

        Food food = new Food();

        food.setName(name);
        food.setDescription(description);
        food.setCuisine(cuisine);
        food.setCategory(category);

        food.setPricePerGuest(
            new BigDecimal(price)
        );

        food.setImage(
            "/prototype/assets/img/catering.jpg"
        );

        food.setVegetarian(vegetarian);
        food.setVegan(vegan);
        food.setHalal(halal);
        food.setGlutenFree(glutenFree);
        food.setNutFree(nutFree);
        food.setAvailable(true);

        return food;
    }

    private void upsertFood(
        FoodRepository repository,
        List<Food> existingFoods,
        Food replacement
    ) {

        Food existing =
            findFoodByName(
                existingFoods,
                replacement.getName()
            );

        if (existing == null) {

            Food saved = repository.save(
                replacement
            );

            existingFoods.add(saved);

            return;
        }

        if (foodMatches(existing, replacement)) {
            return;
        }

        existing.setDescription(
            replacement.getDescription()
        );

        existing.setCuisine(
            replacement.getCuisine()
        );

        existing.setCategory(
            replacement.getCategory()
        );

        existing.setPricePerGuest(
            replacement.getPricePerGuest()
        );

        existing.setImage(
            replacement.getImage()
        );

        existing.setVegetarian(
            replacement.isVegetarian()
        );

        existing.setVegan(
            replacement.isVegan()
        );

        existing.setHalal(
            replacement.isHalal()
        );

        existing.setGlutenFree(
            replacement.isGlutenFree()
        );

        existing.setNutFree(
            replacement.isNutFree()
        );

        existing.setAvailable(
            replacement.isAvailable()
        );

        repository.save(existing);
    }

    private boolean foodMatches(
        Food existing,
        Food replacement
    ) {

        return Objects.equals(
                existing.getDescription(),
                replacement.getDescription()
            )
            && Objects.equals(
                existing.getCuisine().getId(),
                replacement.getCuisine().getId()
            )
            && Objects.equals(
                existing.getCategory().getId(),
                replacement.getCategory().getId()
            )
            && existing.getPricePerGuest().compareTo(
                replacement.getPricePerGuest()
            ) == 0
            && Objects.equals(
                existing.getImage(),
                replacement.getImage()
            )
            && existing.isVegetarian() == replacement.isVegetarian()
            && existing.isVegan() == replacement.isVegan()
            && existing.isHalal() == replacement.isHalal()
            && existing.isGlutenFree() == replacement.isGlutenFree()
            && existing.isNutFree() == replacement.isNutFree()
            && existing.isAvailable() == replacement.isAvailable();
    }

    private Food findFoodByName(
        List<Food> foods,
        String name
    ) {

        return foods
            .stream()
            .filter(food ->
                name.equalsIgnoreCase(
                    food.getName()
                )
            )
            .findFirst()
            .orElse(null);
    }

    // =========================================================
    // ADD ON FACTORY
    // =========================================================

    private AddOn addon(
        String name,
        String price,
        String description
    ) {

        AddOn addOn = new AddOn();

        addOn.setName(name);

        addOn.setBillingType(
            AddOnBillingType.PER_GUEST
        );

        addOn.setPrice(
            new BigDecimal(price)
        );

        addOn.setDescription(description);
        addOn.setAvailable(true);

        return addOn;
    }
}
