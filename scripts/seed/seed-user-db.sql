-- =============================================================================
-- Seed: user-service-db
-- Inserts 1 test customer for integration testing.
-- Idempotent — safe to run multiple times.
-- =============================================================================

-- Enable required extensions (pgcrypto for bcrypt password hashing)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'test@example.com') THEN
        INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'Test Customer',
            'test@example.com',
            crypt('password123', gen_salt('bf', 10)),
            'CUSTOMER',
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Seeded 1 test user: test@example.com / password123';
    ELSE
        RAISE NOTICE 'Test user already exists — skipping.';
    END IF;
END $$;
