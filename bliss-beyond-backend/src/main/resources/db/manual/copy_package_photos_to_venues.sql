-- Run once on the migrated BlissBeyond PostgreSQL database.
-- Shared venues use the photo from the first-listed package in the catalog.
DO $$
DECLARE
    matched_venues integer;
BEGIN
    WITH source_photos(slug, card_photo) AS (
        VALUES
            ('rose-garden-elegance', 'wedding4.jpg'),
            ('yangon-timeless-love', 'wedding1.jpg'),
            ('inya-garden-romance', 'wedding2.jpg'),
            ('the-yangon-ever-after', 'wedding3.jpg'),
            ('the-eternal-vows', 'wedding5.jpg'),
            ('thanlyin-garden-romance', 'wedding6.jpg'),
            ('mandalay-grace', 'wedding7.jpg'),
            ('mandalay-forever', 'wedding8.jpg'),
            ('mandalay-golden-promise', 'wedding9.jpg'),
            ('lotte-sapphire-engagement', 'engagement1.jpg'),
            ('perfect-hotel-mandalay-engagement', 'engagement7.jpg'),
            ('mingalar-family-anniversary', 'anni1.jpg'),
            ('royal-mandalay-memorial', 'anni2.jpg'),
            ('riverside-forever', 'anni4.jpg'),
            ('graduation-grand-ceremony', 'grad9.jpg'),
            ('golden-jubilee-dinner', 'anni6.jpg'),
            ('lakeview-love-celebration', 'anni7.jpg'),
            ('elegant-birthday', 'birthday8.jpg'),
            ('birthday-celebration-plus', 'birthday9.jpg'),
            ('grand-birthday-experience', 'birthday10.jpg'),
            ('sweet-beginnings', 'birthday1.jpg'),
            ('academic-dreams', 'grad1.jpg'),
            ('yangon-garden-birthday', 'birthday3.jpg'),
            ('future-leaders', 'grad3.jpg'),
            ('yangon-graduate-gala', 'grad7.jpg'),
            ('inya-sunset-engagement', 'engagement2.jpg'),
            ('leadership-excellence', 'corp7.jpg'),
            ('vision-corporate-summit', 'corp9.jpg'),
            ('mandalay-business-forum', 'corp8.jpg')
    )
    UPDATE public.venues AS venue
    SET image = COALESCE(NULLIF(btrim(package.image), ''), '/prototype/assets/img/' || source.card_photo)
    FROM source_photos AS source
    JOIN public.packages AS package ON package.slug = source.slug
    WHERE venue.id = package.venue_id;

    GET DIAGNOSTICS matched_venues = ROW_COUNT;
    IF matched_venues <> 29 THEN
        RAISE EXCEPTION 'Expected 29 distinct linked venues, found %', matched_venues;
    END IF;
END $$;
