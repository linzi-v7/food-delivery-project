-- =============================================================================
-- Seed: restaurant-service-db
-- Inserts 1 restaurant with 2 menu items for integration testing.
-- Idempotent — safe to run multiple times.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
    v_restaurant_id TEXT;
BEGIN
    -- Check if the test restaurant already exists
    IF NOT EXISTS (SELECT 1 FROM restaurants WHERE name = 'Test Bistro') THEN

        -- Insert restaurant
        v_restaurant_id := gen_random_uuid()::text;
        INSERT INTO restaurants (id, name, address, cuisine, available, created_at, updated_at)
        VALUES (
            v_restaurant_id,
            'Test Bistro',
            '123 Test Street, Testville',
            'Italian',
            true,
            NOW(),
            NOW()
        );

        -- Insert 2 menu items linked to the restaurant
        INSERT INTO menu_items (id, name, description, price, available, restaurant_id, created_at, updated_at)
        VALUES
            (
                gen_random_uuid()::text,
                'Margherita Pizza',
                'Classic tomato and mozzarella on a thin crust',
                12.99,
                true,
                v_restaurant_id,
                NOW(),
                NOW()
            ),
            (
                gen_random_uuid()::text,
                'Pasta Carbonara',
                'Creamy egg and bacon pasta with parmesan',
                14.50,
                true,
                v_restaurant_id,
                NOW(),
                NOW()
            );

        RAISE NOTICE 'Seeded 1 restaurant (Test Bistro) + 2 menu items.';

    ELSE
        RAISE NOTICE 'Test restaurant already exists — skipping.';
    END IF;
END $$;
