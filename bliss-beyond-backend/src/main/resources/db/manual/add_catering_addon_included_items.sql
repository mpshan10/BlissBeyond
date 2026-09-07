CREATE TABLE IF NOT EXISTS catering_addon_included_items (
  id BIGINT NOT NULL AUTO_INCREMENT,
  addon_id BIGINT NOT NULL,
  name VARCHAR(160) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  CONSTRAINT fk_catering_addon_included_items_addon FOREIGN KEY (addon_id) REFERENCES addons(id),
  CONSTRAINT uq_catering_addon_included_items_addon_name UNIQUE (addon_id, name)
);
INSERT INTO catering_addon_included_items (addon_id, name, display_order, available)
SELECT a.id, v.name, v.display_order, v.available
FROM addons a
JOIN (
  SELECT 'Soft Drinks Package' AS addon_name, 'Cola' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Soft Drinks Package' AS addon_name, 'Lemon-lime soft drink' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Soft Drinks Package' AS addon_name, 'Orange soft drink' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Soft Drinks Package' AS addon_name, 'Soda water' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Soft Drinks Package' AS addon_name, 'Ice service' AS name, 4 AS display_order, TRUE AS available UNION ALL
  SELECT 'Fresh Juice Package' AS addon_name, 'Orange juice' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Fresh Juice Package' AS addon_name, 'Watermelon juice' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Fresh Juice Package' AS addon_name, 'Lime juice' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Fresh Juice Package' AS addon_name, 'Pineapple juice' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Fresh Juice Package' AS addon_name, 'Seasonal fruit juice' AS name, 4 AS display_order, TRUE AS available UNION ALL
  SELECT 'Mocktail Package' AS addon_name, 'Virgin mojito' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Mocktail Package' AS addon_name, 'Fruit punch' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Mocktail Package' AS addon_name, 'Blue lagoon mocktail' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Mocktail Package' AS addon_name, 'Lime soda' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Mocktail Package' AS addon_name, 'Seasonal signature mocktail' AS name, 4 AS display_order, TRUE AS available UNION ALL
  SELECT 'Premium Beverage Package' AS addon_name, 'Premium soft drinks' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Premium Beverage Package' AS addon_name, 'Fresh juices' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Premium Beverage Package' AS addon_name, 'Mocktails' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Premium Beverage Package' AS addon_name, 'Coffee & tea' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Premium Beverage Package' AS addon_name, 'Mineral water' AS name, 4 AS display_order, TRUE AS available UNION ALL
  SELECT 'Coffee & Tea Package' AS addon_name, 'Fresh coffee' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Coffee & Tea Package' AS addon_name, 'English tea' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Coffee & Tea Package' AS addon_name, 'Green tea' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Coffee & Tea Package' AS addon_name, 'Milk tea' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Coffee & Tea Package' AS addon_name, 'Hot chocolate' AS name, 4 AS display_order, TRUE AS available UNION ALL
  SELECT 'Dessert Station' AS addon_name, 'Chocolate cake' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Dessert Station' AS addon_name, 'Cheesecake' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Dessert Station' AS addon_name, 'Chocolate mousse' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Dessert Station' AS addon_name, 'Caramel pudding' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Dessert Station' AS addon_name, 'Fresh fruit' AS name, 4 AS display_order, TRUE AS available UNION ALL
  SELECT 'Premium Dessert Bar' AS addon_name, 'Mini cheesecakes' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Premium Dessert Bar' AS addon_name, 'Chocolate mousse cups' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Premium Dessert Bar' AS addon_name, 'Brownies' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Premium Dessert Bar' AS addon_name, 'Fruit tarts' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Premium Dessert Bar' AS addon_name, 'Macarons' AS name, 4 AS display_order, TRUE AS available UNION ALL
  SELECT 'Chocolate Fountain' AS addon_name, 'Milk chocolate fountain' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Chocolate Fountain' AS addon_name, 'Fresh strawberries' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Chocolate Fountain' AS addon_name, 'Banana' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Chocolate Fountain' AS addon_name, 'Marshmallows' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Chocolate Fountain' AS addon_name, 'Cake cubes' AS name, 4 AS display_order, TRUE AS available UNION ALL
  SELECT 'Mini Pastries' AS addon_name, 'Mini croissants' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Mini Pastries' AS addon_name, 'Fruit Danish' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Mini Pastries' AS addon_name, 'Chocolate pastries' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Mini Pastries' AS addon_name, 'Mini muffins' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Mini Pastries' AS addon_name, 'Cream puffs' AS name, 4 AS display_order, TRUE AS available UNION ALL
  SELECT 'Macaron Station' AS addon_name, 'Chocolate macarons' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Macaron Station' AS addon_name, 'Vanilla macarons' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Macaron Station' AS addon_name, 'Strawberry macarons' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Macaron Station' AS addon_name, 'Pistachio macarons' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Macaron Station' AS addon_name, 'Seasonal flavour macarons' AS name, 4 AS display_order, TRUE AS available UNION ALL
  SELECT 'Ice Cream Station' AS addon_name, 'Vanilla ice cream' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Ice Cream Station' AS addon_name, 'Chocolate ice cream' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Ice Cream Station' AS addon_name, 'Strawberry ice cream' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Ice Cream Station' AS addon_name, 'Chocolate sauce' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Ice Cream Station' AS addon_name, 'Fruit toppings' AS name, 4 AS display_order, TRUE AS available UNION ALL
  SELECT 'Live Chef Station' AS addon_name, 'Fresh cooking service' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Live Chef Station' AS addon_name, 'Chicken selections' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Live Chef Station' AS addon_name, 'Seafood selections' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Live Chef Station' AS addon_name, 'Vegetable selections' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Live Chef Station' AS addon_name, 'Sauces and garnishes' AS name, 4 AS display_order, TRUE AS available UNION ALL
  SELECT 'Sushi Station' AS addon_name, 'California rolls' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Sushi Station' AS addon_name, 'Vegetable rolls' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Sushi Station' AS addon_name, 'Salmon rolls' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Sushi Station' AS addon_name, 'Tuna rolls' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Sushi Station' AS addon_name, 'Soy sauce, wasabi & ginger' AS name, 4 AS display_order, TRUE AS available UNION ALL
  SELECT 'Carving Station' AS addon_name, 'Roast chicken' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Carving Station' AS addon_name, 'Roast beef' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Carving Station' AS addon_name, 'Gravy' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Carving Station' AS addon_name, 'Roasted vegetables' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Carving Station' AS addon_name, 'Potato sides' AS name, 4 AS display_order, TRUE AS available UNION ALL
  SELECT 'Cheese Board' AS addon_name, 'Assorted cheese' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Cheese Board' AS addon_name, 'Crackers' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Cheese Board' AS addon_name, 'Fresh fruit' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Cheese Board' AS addon_name, 'Dried fruit' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Cheese Board' AS addon_name, 'Bread' AS name, 4 AS display_order, TRUE AS available UNION ALL
  SELECT 'Seafood Station' AS addon_name, 'Grilled prawns' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Seafood Station' AS addon_name, 'Fish fillet' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Seafood Station' AS addon_name, 'Calamari' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Seafood Station' AS addon_name, 'Seafood salad' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Seafood Station' AS addon_name, 'Lemon butter sauce' AS name, 4 AS display_order, TRUE AS available UNION ALL
  SELECT 'Late-Night Snack Station' AS addon_name, 'Mini burgers' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Late-Night Snack Station' AS addon_name, 'French fries' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Late-Night Snack Station' AS addon_name, 'Fried chicken bites' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Late-Night Snack Station' AS addon_name, 'Mini sandwiches' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Late-Night Snack Station' AS addon_name, 'Fried noodles' AS name, 4 AS display_order, TRUE AS available UNION ALL
  SELECT 'Mohinga Station' AS addon_name, 'Mohinga noodles' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Mohinga Station' AS addon_name, 'Fish broth' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Mohinga Station' AS addon_name, 'Boiled egg' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Mohinga Station' AS addon_name, 'Fritters' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Mohinga Station' AS addon_name, 'Fresh herbs & condiments' AS name, 4 AS display_order, TRUE AS available UNION ALL
  SELECT 'Shan Noodle Station' AS addon_name, 'Shan noodles' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Shan Noodle Station' AS addon_name, 'Chicken or pork topping' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Shan Noodle Station' AS addon_name, 'Tomato sauce' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Shan Noodle Station' AS addon_name, 'Pickled vegetables' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Shan Noodle Station' AS addon_name, 'Fresh herbs' AS name, 4 AS display_order, TRUE AS available UNION ALL
  SELECT 'Traditional Snack Station' AS addon_name, 'A Kyaw Sone' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Traditional Snack Station' AS addon_name, 'Mont Lin Ma Yar' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Traditional Snack Station' AS addon_name, 'Fried tofu' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Traditional Snack Station' AS addon_name, 'Mini samosas' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Traditional Snack Station' AS addon_name, 'Seasonal traditional snacks' AS name, 4 AS display_order, TRUE AS available UNION ALL
  SELECT 'Traditional Dessert Station' AS addon_name, 'Shwe Yin Aye' AS name, 0 AS display_order, TRUE AS available UNION ALL
  SELECT 'Traditional Dessert Station' AS addon_name, 'Mont Lone Yay Paw' AS name, 1 AS display_order, TRUE AS available UNION ALL
  SELECT 'Traditional Dessert Station' AS addon_name, 'Bein Mont' AS name, 2 AS display_order, TRUE AS available UNION ALL
  SELECT 'Traditional Dessert Station' AS addon_name, 'Coconut jelly' AS name, 3 AS display_order, TRUE AS available UNION ALL
  SELECT 'Traditional Dessert Station' AS addon_name, 'Seasonal fruit' AS name, 4 AS display_order, TRUE AS available
) v ON v.addon_name = a.name
WHERE NOT EXISTS (
  SELECT 1
  FROM catering_addon_included_items x
  WHERE x.addon_id = a.id
    AND x.name = v.name
);
