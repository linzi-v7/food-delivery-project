import type { PrismaClient } from "../generated/client.js";
import { getLogger } from "../utils/logger.js";

const SEED_RESTAURANTS = [
  {
    name: "Bella Napoli",
    address: "123 Main St, Downtown",
    cuisine: "Italian",
    menu: [
      { name: "Margherita Pizza", description: "San Marzano tomatoes, fresh mozzarella, basil", price: 12.99 },
      { name: "Pepperoni Pizza", description: "Classic pepperoni with mozzarella and tomato sauce", price: 14.99 },
      { name: "Spaghetti Carbonara", description: "Creamy egg-based sauce with pancetta and pecorino", price: 16.5 },
      { name: "Lasagna Bolognese", description: "Layers of pasta with rich meat sauce and béchamel", price: 18.0 },
      { name: "Fettuccine Alfredo", description: "Ribbon pasta in creamy parmesan sauce", price: 15.5 },
      { name: "Caprese Salad", description: "Fresh tomatoes, mozzarella, basil with balsamic glaze", price: 10.99 },
      { name: "Tiramisu", description: "Classic coffee-soaked Italian dessert with mascarpone", price: 8.99 },
      { name: "Bruschetta", description: "Toasted bread with diced tomatoes, garlic, and olive oil", price: 7.99 },
      { name: "Risotto ai Funghi", description: "Creamy arborio rice with wild mushrooms", price: 17.5 },
      { name: "Panna Cotta", description: "Silky Italian cream dessert with berry compote", price: 9.5 },
    ],
  },
  {
    name: "Tokyo Ramen House",
    address: "456 Oak Ave, Midtown",
    cuisine: "Japanese",
    menu: [
      { name: "Tonkotsu Ramen", description: "Rich pork bone broth with chashu, soft egg, and nori", price: 15.99 },
      { name: "Miso Ramen", description: "Fermented soybean broth with corn, butter, and bean sprouts", price: 14.99 },
      { name: "Shoyu Ramen", description: "Soy sauce-based clear broth with sliced pork and bamboo shoots", price: 14.5 },
      { name: "Gyoza (6 pcs)", description: "Pan-fried pork and vegetable dumplings with dipping sauce", price: 8.99 },
      { name: "Chicken Katsu Curry", description: "Crispy breaded chicken cutlet with Japanese curry rice", price: 16.99 },
      { name: "Edamame", description: "Steamed soy beans with sea salt", price: 5.99 },
      { name: "Takoyaki (6 pcs)", description: "Octopus balls with mayo, takoyaki sauce, and bonito flakes", price: 9.5 },
      { name: "Matcha Ice Cream", description: "Creamy green tea ice cream with red bean paste", price: 6.99 },
      { name: "Salmon Sashimi (8 pcs)", description: "Fresh Atlantic salmon slices with wasabi and soy", price: 18.99 },
      { name: "Tempura Udon", description: "Thick wheat noodles in dashi broth with crispy shrimp tempura", price: 15.99 },
      { name: "Karaage Chicken", description: "Japanese-style fried chicken with spicy mayo", price: 11.99 },
      { name: "Okonomiyaki", description: "Savory Japanese pancake with cabbage, pork, and special sauce", price: 13.99 },
    ],
  },
  {
    name: "El Pueblo Taqueria",
    address: "789 Pine Rd, Uptown",
    cuisine: "Mexican",
    menu: [
      { name: "Street Tacos (3 pcs)", description: "Corn tortillas with carne asada, al pastor, or pollo", price: 9.99 },
      { name: "Burrito Supreme", description: "Large flour tortilla with rice, beans, meat, guac, and crema", price: 13.99 },
      { name: "Quesadilla", description: "Grilled flour tortilla with melted cheese and choice of filling", price: 10.5 },
      { name: "Nachos Grande", description: "Tortilla chips loaded with cheese, beans, jalapeños, and sour cream", price: 12.99 },
      { name: "Guacamole & Chips", description: "Freshly made guacamole with crispy tortilla chips", price: 8.5 },
      { name: "Enchiladas Verdes", description: "Corn tortillas in green tomatillo sauce with crema", price: 14.99 },
      { name: "Churros (5 pcs)", description: "Crispy cinnamon-sugar fried dough with chocolate dipping sauce", price: 7.5 },
      { name: "Horchata (Large)", description: "Refreshing cinnamon rice milk drink", price: 4.99 },
      { name: "Tamales (2 pcs)", description: "Steamed corn masa with pork filling in corn husks", price: 11.5 },
      { name: "Taco Salad Bowl", description: "Crispy tortilla bowl with lettuce, beans, meat, pico, and avocado", price: 13.5 },
    ],
  },
  {
    name: "Golden Dragon",
    address: "321 Elm St, Chinatown",
    cuisine: "Chinese",
    menu: [
      {
        name: "Kung Pao Chicken",
        description: "Spicy stir-fried chicken with peanuts, vegetables, and chili peppers",
        price: 15.99,
      },
      { name: "Sweet and Sour Pork", description: "Crispy battered pork in tangy sweet and sour sauce", price: 14.5 },
      { name: "Mapo Tofu", description: "Soft tofu in spicy Sichuan peppercorn and minced pork sauce", price: 13.99 },
      { name: "Beef Chow Fun", description: "Wide rice noodles wok-fried with tender beef and bean sprouts", price: 16.5 },
      { name: "Spring Rolls (4 pcs)", description: "Crispy vegetable spring rolls with sweet chili dipping sauce", price: 7.99 },
      { name: "Wonton Soup", description: "Pork and shrimp wontons in clear broth with bok choy", price: 9.99 },
      { name: "Peking Duck (Half)", description: "Crispy roasted duck with pancakes, hoisin, and scallions", price: 28.99 },
      { name: "Fried Rice (Egg)", description: "Wok-fried jasmine rice with egg, peas, carrots", price: 11.99 },
      { name: "Sesame Balls (6 pcs)", description: "Crispy glutinous rice balls filled with red bean paste", price: 6.99 },
      { name: "Steamed Dumplings (8 pcs)", description: "Juicy pork and chive dumplings with black vinegar dip", price: 12.5 },
      { name: "Hot and Sour Soup", description: "Spicy and tangy soup with tofu, mushrooms, and bamboo shoots", price: 8.5 },
      { name: "General Tso's Chicken", description: "Crispy chicken in sweet and spicy glaze with broccoli", price: 16.99 },
    ],
  },
  {
    name: "The Burger Joint",
    address: "654 Maple Dr, Suburbs",
    cuisine: "American",
    menu: [
      {
        name: "Classic Cheeseburger",
        description: "Angus beef patty with cheddar, lettuce, tomato, special sauce",
        price: 11.99,
      },
      {
        name: "Bacon BBQ Burger",
        description: "Beef patty with smoked bacon, BBQ sauce, onion rings, jack cheese",
        price: 14.99,
      },
      {
        name: "Double Smash Burger",
        description: "Two smashed patties with American cheese, pickles, grilled onions",
        price: 15.99,
      },
      { name: "Veggie Burger", description: "House-made black bean and quinoa patty with avocado and sprouts", price: 12.5 },
      { name: "Loaded Fries", description: "Crispy fries topped with cheese sauce, bacon bits, green onions", price: 9.99 },
      {
        name: "Buffalo Wings (10 pcs)",
        description: "Crispy chicken wings tossed in spicy buffalo sauce with ranch",
        price: 14.99,
      },
      { name: "Onion Rings", description: "Thick-cut beer-battered onion rings with chipotle mayo", price: 7.99 },
      { name: "Milkshake (16oz)", description: "Thick hand-spun shake — vanilla, chocolate, or strawberry", price: 6.99 },
      {
        name: "Chicken Tenders (5 pcs)",
        description: "Crispy buttermilk fried chicken tenders with honey mustard",
        price: 12.99,
      },
      { name: "Caesar Salad", description: "Romaine with parmesan, croutons, and classic Caesar dressing", price: 10.5 },
      {
        name: "Philly Cheesesteak",
        description: "Thinly sliced steak with melted provolone and grilled onions on a hoagie",
        price: 16.5,
      },
    ],
  },
  {
    name: "Taj Mahal Palace",
    address: "987 Spice Rd, Currytown",
    cuisine: "Indian",
    menu: [
      { name: "Butter Chicken", description: "Tender chicken in creamy tomato and butter sauce with fenugreek", price: 16.99 },
      { name: "Chicken Tikka Masala", description: "Marinated chicken chunks in spiced yogurt-tomato gravy", price: 17.5 },
      {
        name: "Lamb Biryani",
        description: "Fragrant basmati rice layered with spiced lamb and caramelized onions",
        price: 18.99,
      },
      { name: "Palak Paneer", description: "Fresh cottage cheese cubes in creamy spinach sauce", price: 14.99 },
      { name: "Garlic Naan (2 pcs)", description: "Soft leavened flatbread brushed with garlic butter", price: 4.99 },
      { name: "Samosas (4 pcs)", description: "Crispy pastry filled with spiced potatoes and peas, mint chutney", price: 7.99 },
      { name: "Dal Makhani", description: "Slow-cooked black lentils in rich buttery gravy", price: 13.5 },
      { name: "Chicken Tikka (6 pcs)", description: "Char-grilled marinated chicken pieces with mint chutney", price: 15.99 },
      { name: "Mango Lassi", description: "Creamy yogurt drink blended with sweet mango pulp", price: 5.99 },
      { name: "Gulab Jamun (3 pcs)", description: "Deep-fried milk dumplings soaked in rose-scented syrup", price: 6.99 },
      { name: "Vegetable Korma", description: "Mixed vegetables in mild cashew and coconut cream sauce", price: 14.5 },
    ],
  },
  {
    name: "Sakura Sushi Bar",
    address: "111 Blossom Ln, Little Tokyo",
    cuisine: "Japanese",
    menu: [
      { name: "California Roll (8 pcs)", description: "Crab, avocado, cucumber inside-out roll with sesame", price: 12.99 },
      { name: "Dragon Roll (8 pcs)", description: "Shrimp tempura, avocado, eel sauce, tobiko", price: 16.99 },
      { name: "Salmon Nigiri (2 pcs)", description: "Fresh Atlantic salmon over hand-pressed seasoned rice", price: 7.99 },
      { name: "Tuna Sashimi (6 pcs)", description: "Thick-cut bluefin tuna with wasabi and soy", price: 19.99 },
      { name: "Spicy Tuna Roll (8 pcs)", description: "Chopped tuna with spicy mayo, cucumber, scallions", price: 14.5 },
      { name: "Edamame", description: "Steamed soy beans with sea salt", price: 5.5 },
      { name: "Miso Soup", description: "Traditional soybean paste soup with tofu, wakame, scallions", price: 4.5 },
      { name: "Rainbow Roll (8 pcs)", description: "California roll topped with assorted sashimi and avocado", price: 18.99 },
      { name: "Shrimp Tempura (5 pcs)", description: "Lightly battered crispy shrimp with tentsuyu dipping sauce", price: 13.99 },
      { name: "Green Tea Mochi (4 pcs)", description: "Soft rice cakes filled with matcha ice cream", price: 6.99 },
    ],
  },
  {
    name: "Le Petit Café",
    address: "222 Rue de Pain, Uptown",
    cuisine: "French",
    menu: [
      { name: "Croissant", description: "Buttery, flaky Viennoiserie pastry baked fresh daily", price: 4.5 },
      { name: "Croque Monsieur", description: "Classic French ham and Gruyère grilled sandwich with béchamel", price: 12.99 },
      { name: "French Onion Soup", description: "Caramelized onion soup with Gruyère crouton, baked golden", price: 10.99 },
      { name: "Quiche Lorraine", description: "Savory tart with bacon, Gruyère, and egg custard in buttery crust", price: 13.5 },
      { name: "Crème Brûlée", description: "Rich vanilla custard with caramelized sugar crust", price: 8.99 },
      { name: "Steak Frites", description: "Pan-seared ribeye with herbed butter and crispy pommes frites", price: 24.99 },
      { name: "Nicoise Salad", description: "Seared tuna, green beans, olives, egg, potatoes, Dijon vinaigrette", price: 17.99 },
      { name: "Chocolate Éclair", description: "Choux pastry filled with chocolate cream, topped with ganache", price: 7.5 },
      { name: "Macarons (6 pcs)", description: "Assorted almond meringue cookies — vanilla, raspberry, pistachio", price: 9.99 },
      { name: "Café au Lait", description: "French press coffee with steamed milk", price: 5.5 },
    ],
  },
];

export const runSeed = async (prisma: PrismaClient): Promise<void> => {
  const logger = getLogger();

  const count = await prisma.restaurant.count();
  if (count > 1) {
    logger.info({ count }, "Restaurants already exist, skipping seed");
    return;
  }

  logger.info("Seeding restaurants and menus...");

  for (const r of SEED_RESTAURANTS) {
    await prisma.restaurant.create({
      data: {
        name: r.name,
        address: r.address,
        cuisine: r.cuisine,
        menuItems: {
          create: r.menu.map((item) => ({
            name: item.name,
            description: item.description,
            price: item.price,
            available: true,
          })),
        },
      },
    });
  }

  const totalItems = SEED_RESTAURANTS.reduce((s, r) => s + r.menu.length, 0);
  logger.info({ restaurants: SEED_RESTAURANTS.length, menuItems: totalItems }, "Seed complete");
};
