-- ==============================================================================
-- ATMIYA DOSA HUB - COMPLETE PRODUCTION SUPABASE POSTGRESQL SCHEMA & SEED SCRIPT
-- Powered by OptiMap Solution
-- ==============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. RESTAURANTS
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    currency TEXT DEFAULT 'INR',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RESTAURANT TABLES
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    capacity INT DEFAULT 4,
    zone TEXT DEFAULT 'Main Hall',
    status TEXT DEFAULT 'VACANT' CHECK (status IN ('VACANT', 'OCCUPIED', 'RESERVED', 'CLEANING')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, table_number)
);

-- 3. TABLE SESSIONS
CREATE TABLE IF NOT EXISTS public.table_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
    session_code TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'ABANDONED')),
    customer_name TEXT DEFAULT 'Walk-in Guest',
    customer_phone TEXT,
    total_amount NUMERIC(10,2) DEFAULT 0.00,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- 4. MENU CATEGORIES
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    gujarati_name TEXT,
    icon TEXT DEFAULT 'Utensils',
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MENU ITEMS
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    gujarati_name TEXT,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    is_jain_available BOOLEAN DEFAULT TRUE,
    prep_time_mins INT DEFAULT 10,
    image_url TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.table_sessions(id) ON DELETE SET NULL,
    table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
    table_number TEXT NOT NULL,
    order_number TEXT NOT NULL,
    customer_name TEXT DEFAULT 'Walk-in Guest',
    customer_phone TEXT,
    status TEXT DEFAULT 'PLACED' CHECK (status IN ('PLACED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED')),
    subtotal NUMERIC(10,2) DEFAULT 0.00,
    tax_amount NUMERIC(10,2) DEFAULT 0.00,
    discount_amount NUMERIC(10,2) DEFAULT 0.00,
    total_amount NUMERIC(10,2) DEFAULT 0.00,
    payment_method TEXT DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'UPI_COUNTER', 'ONLINE_RAZORPAY', 'CARD')),
    payment_status TEXT DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID', 'REFUNDED')),
    special_notes TEXT,
    placed_at TIMESTAMPTZ DEFAULT NOW(),
    served_at TIMESTAMPTZ
);

-- 7. ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    cooking_note TEXT,
    status TEXT DEFAULT 'PLACED' CHECK (status IN ('PLACED', 'PREPARING', 'READY', 'SERVED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CUSTOMERS (CRM)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    total_orders INT DEFAULT 1,
    total_spent NUMERIC(10,2) DEFAULT 0.00,
    loyalty_points INT DEFAULT 100,
    last_table TEXT,
    last_order_id TEXT,
    last_visited_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, phone)
);

-- 9. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    employee_role TEXT NOT NULL,
    action_type TEXT NOT NULL,
    details TEXT,
    table_number TEXT,
    order_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ENABLE RLS (ROW LEVEL SECURITY)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Anonymous public read & insert policies for QR Ordering & POS
CREATE POLICY "Public Read Restaurants" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "Public Read Tables" ON public.restaurant_tables FOR SELECT USING (true);
CREATE POLICY "Public Update Tables" ON public.restaurant_tables FOR UPDATE USING (true);
CREATE POLICY "Public Manage Sessions" ON public.table_sessions FOR ALL USING (true);
CREATE POLICY "Public Read Categories" ON public.menu_categories FOR SELECT USING (true);
CREATE POLICY "Public Read Menu Items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Public Manage Orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Public Manage Order Items" ON public.order_items FOR ALL USING (true);
CREATE POLICY "Public Manage Customers" ON public.customers FOR ALL USING (true);
CREATE POLICY "Public Manage Audit Logs" ON public.audit_logs FOR ALL USING (true);

-- Realtime publication setup
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.table_sessions;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ==============================================================================
-- SEED DATA INSERTION
-- ==============================================================================

-- Insert Restaurant
INSERT INTO public.restaurants (id, name, address, phone)
VALUES ('11111111-1111-1111-1111-111111111111', 'Atmiya Dosa Hub', 'Petlad, Anand, Gujarat', '+91 63530 59221')
ON CONFLICT (id) DO NOTHING;

-- Insert Tables (T-01 to T-16)
DO $$
DECLARE
    i INT;
    tbl_num TEXT;
    tbl_id UUID;
BEGIN
    FOR i IN 1..16 LOOP
        tbl_num := 'T-' || LPAD(i::text, 2, '0');
        tbl_id := uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'table_' || tbl_num);
        INSERT INTO public.restaurant_tables (id, restaurant_id, table_number, capacity, zone, status)
        VALUES (
            tbl_id,
            '11111111-1111-1111-1111-111111111111',
            tbl_num,
            CASE WHEN i <= 10 THEN 4 WHEN i <= 14 THEN 6 ELSE 8 END,
            CASE WHEN i <= 6 THEN 'Main Hall' WHEN i <= 10 THEN 'AC Section' WHEN i <= 13 THEN 'Patio Garden' ELSE 'Family Section' END,
            'VACANT'
        )
        ON CONFLICT (restaurant_id, table_number) DO NOTHING;
    END LOOP;
END $$;

INSERT INTO public.menu_categories (id, restaurant_id, name, gujarati_name, icon, display_order, is_active) VALUES ('8d3ecc05-72ce-5b64-8dfe-2009569f87df', '11111111-1111-1111-1111-111111111111', 'Plain Paper Dosa', 'પ્લેન પેપર ઢોસા', 'Layers', 1, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.menu_categories (id, restaurant_id, name, gujarati_name, icon, display_order, is_active) VALUES ('571d51dd-7575-5532-b558-a2416f03b459', '11111111-1111-1111-1111-111111111111', 'Masala Dosa', 'મસાલા ઢોસા', 'Utensils', 2, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.menu_categories (id, restaurant_id, name, gujarati_name, icon, display_order, is_active) VALUES ('e735763a-4223-5987-a6c0-7c84647a8f66', '11111111-1111-1111-1111-111111111111', 'Chinese Rice', 'ચાઈનીઝ રાઈસ', 'ShoppingBag', 3, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.menu_categories (id, restaurant_id, name, gujarati_name, icon, display_order, is_active) VALUES ('f467189b-8684-5255-a4d6-fccc6cdacdad', '11111111-1111-1111-1111-111111111111', 'Starter', 'સ્ટાર્ટર', 'Flame', 4, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.menu_categories (id, restaurant_id, name, gujarati_name, icon, display_order, is_active) VALUES ('6424c8f8-3b64-585d-a92f-144078036690', '11111111-1111-1111-1111-111111111111', 'Mysore Dosa', 'માયસોર ઢોસા', 'Flame', 5, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.menu_categories (id, restaurant_id, name, gujarati_name, icon, display_order, is_active) VALUES ('d8101c10-608f-5411-bd47-401103c3d7c0', '11111111-1111-1111-1111-111111111111', 'Fancy Dosa', 'ફેન્સી ઢોસા', 'Sparkles', 6, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.menu_categories (id, restaurant_id, name, gujarati_name, icon, display_order, is_active) VALUES ('23946c55-6bab-50c7-a77b-5e4faa3156b5', '11111111-1111-1111-1111-111111111111', 'Maggi', 'મેગી', 'Flame', 7, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.menu_categories (id, restaurant_id, name, gujarati_name, icon, display_order, is_active) VALUES ('eaabffe3-aeda-5738-9581-937efaa64bd2', '11111111-1111-1111-1111-111111111111', 'Noodles', 'નુડલ્સ', 'Utensils', 8, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.menu_categories (id, restaurant_id, name, gujarati_name, icon, display_order, is_active) VALUES ('1da70ae4-22d9-57c2-b999-6c3206c8030a', '11111111-1111-1111-1111-111111111111', 'Soup', 'સુપ', 'Coffee', 9, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.menu_categories (id, restaurant_id, name, gujarati_name, icon, display_order, is_active) VALUES ('cce31c48-c455-56bd-9613-93ff8470b8f2', '11111111-1111-1111-1111-111111111111', 'Papad', 'પાપડ અને ફ્રેન્ચ ફ્રાઈસ', 'Sparkles', 10, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.menu_categories (id, restaurant_id, name, gujarati_name, icon, display_order, is_active) VALUES ('721f253c-11d0-50ac-8d4e-ac3969bf2a80', '11111111-1111-1111-1111-111111111111', 'Special Item', 'સ્પેશિયલ આઈટમ', 'Award', 11, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.menu_categories (id, restaurant_id, name, gujarati_name, icon, display_order, is_active) VALUES ('02756470-b931-5406-af21-f462aa99de8f', '11111111-1111-1111-1111-111111111111', 'Pav Bhaji', 'પાંઉભાજી', 'UtensilsCrossed', 12, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.menu_categories (id, restaurant_id, name, gujarati_name, icon, display_order, is_active) VALUES ('a55834d2-f940-5f84-b942-d93beebd4ba9', '11111111-1111-1111-1111-111111111111', 'Pulav', 'પુલાવ', 'Soup', 13, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.menu_categories (id, restaurant_id, name, gujarati_name, icon, display_order, is_active) VALUES ('c1821e13-9586-5b97-a00e-90d2f529c40a', '11111111-1111-1111-1111-111111111111', 'Uttapam', 'ઉત્તપમ', 'Layers', 14, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.menu_categories (id, restaurant_id, name, gujarati_name, icon, display_order, is_active) VALUES ('7e3de61d-c5d7-59d6-9810-f865894155e3', '11111111-1111-1111-1111-111111111111', 'Idali', 'ઇડલી', 'Circle', 15, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.menu_categories (id, restaurant_id, name, gujarati_name, icon, display_order, is_active) VALUES ('0df8a35e-8dd8-5ee9-a3e8-11a8f41e9793', '11111111-1111-1111-1111-111111111111', 'Vada & Dhokala', 'વડા અને ઢોકળા', 'Sun', 16, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.menu_categories (id, restaurant_id, name, gujarati_name, icon, display_order, is_active) VALUES ('9ef914d1-4c3d-5aca-bc29-5a997e3bc381', '11111111-1111-1111-1111-111111111111', 'Unlimited - Masala Dosa', 'અનલિમિટેડ મસાલા ઢોસા', 'HeartHandshake', 17, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.menu_categories (id, restaurant_id, name, gujarati_name, icon, display_order, is_active) VALUES ('345be19a-229b-5fb3-be14-0c1e5140506b', '11111111-1111-1111-1111-111111111111', 'Unlimited - Chinese', 'અનલિમિટેડ ચાઈનીઝ', 'HeartHandshake', 18, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.menu_categories (id, restaurant_id, name, gujarati_name, icon, display_order, is_active) VALUES ('3a1e5a2a-8c96-5ce1-aa9f-204424aea1c1', '11111111-1111-1111-1111-111111111111', 'Combo', 'કોમ્બો ઓફર્સ', 'Tag', 19, true) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_items (id, restaurant_id, category_id, name, gujarati_name, description, price, is_available, is_jain_available, prep_time_mins, image_url, tags)
VALUES
('04fcc775-d145-5e1c-94fd-33699f244b25', '11111111-1111-1111-1111-111111111111', '8d3ecc05-72ce-5b64-8dfe-2009569f87df', 'Plain Paper', 'Plain Paper', 'Fresh authentic pure-veg Plain Paper made to order with traditional Atmiya Hub spices.', 60.0, true, true, 10, NULL, ARRAY['Authentic', 'Plain Paper Dosa']::text[]),
('4675c49b-ef7e-53df-8fb3-24489d085c86', '11111111-1111-1111-1111-111111111111', '8d3ecc05-72ce-5b64-8dfe-2009569f87df', 'Baby Paper', 'Baby Paper', 'Fresh authentic pure-veg Baby Paper made to order with traditional Atmiya Hub spices.', 60.0, true, true, 10, NULL, ARRAY['Authentic', 'Plain Paper Dosa']::text[]),
('d774e5d5-f3d4-53e3-abe4-9385f85144cf', '11111111-1111-1111-1111-111111111111', '8d3ecc05-72ce-5b64-8dfe-2009569f87df', 'Naylon Paper', 'Naylon Paper', 'Fresh authentic pure-veg Naylon Paper made to order with traditional Atmiya Hub spices.', 60.0, true, true, 10, NULL, ARRAY['Authentic', 'Plain Paper Dosa']::text[]),
('c72ae8ed-bf94-5a9a-8ae2-8af64ace6d6c', '11111111-1111-1111-1111-111111111111', '8d3ecc05-72ce-5b64-8dfe-2009569f87df', 'Onion Paper', 'Onion Paper', 'Fresh authentic pure-veg Onion Paper made to order with traditional Atmiya Hub spices.', 60.0, true, true, 10, NULL, ARRAY['Authentic', 'Plain Paper Dosa']::text[]),
('18b26f95-a645-5bfb-ac08-edb7e617a0d2', '11111111-1111-1111-1111-111111111111', '8d3ecc05-72ce-5b64-8dfe-2009569f87df', 'Garlic Paper', 'Garlic Paper', 'Fresh authentic pure-veg Garlic Paper made to order with traditional Atmiya Hub spices.', 80.0, true, true, 10, NULL, ARRAY['Authentic', 'Plain Paper Dosa']::text[]),
('ade4a387-9736-5734-8fcd-b8d96b9ecd28', '11111111-1111-1111-1111-111111111111', '8d3ecc05-72ce-5b64-8dfe-2009569f87df', 'Panner Paper', 'Panner Paper', 'Fresh authentic pure-veg Panner Paper made to order with traditional Atmiya Hub spices.', 90.0, true, true, 10, NULL, ARRAY['Authentic', 'Plain Paper Dosa']::text[]),
('27b37f52-84ce-5f6e-9fec-ee4719469c6e', '11111111-1111-1111-1111-111111111111', '8d3ecc05-72ce-5b64-8dfe-2009569f87df', 'Chocolate Paper', 'Chocolate Paper', 'Fresh authentic pure-veg Chocolate Paper made to order with traditional Atmiya Hub spices.', 70.0, true, true, 10, NULL, ARRAY['Authentic', 'Plain Paper Dosa']::text[]),
('c4c53715-578d-5d8a-bd35-e24990b0c59a', '11111111-1111-1111-1111-111111111111', '8d3ecc05-72ce-5b64-8dfe-2009569f87df', 'Panner Sezwan Paper', 'Panner Sezwan Paper', 'Fresh authentic pure-veg Panner Sezwan Paper made to order with traditional Atmiya Hub spices.', 100.0, true, true, 10, NULL, ARRAY['Authentic', 'Plain Paper Dosa']::text[]),
('0bc86f32-2968-577a-8fcb-03581111edc6', '11111111-1111-1111-1111-111111111111', '8d3ecc05-72ce-5b64-8dfe-2009569f87df', 'Cheese Paper', 'Cheese Paper', 'Fresh authentic pure-veg Cheese Paper made to order with traditional Atmiya Hub spices.', 90.0, true, true, 10, NULL, ARRAY['Authentic', 'Plain Paper Dosa']::text[]),
('2df8e3e7-0550-5420-bc15-dcecadd44cbe', '11111111-1111-1111-1111-111111111111', '8d3ecc05-72ce-5b64-8dfe-2009569f87df', 'Cheese Garlic Paper', 'Cheese Garlic Paper', 'Fresh authentic pure-veg Cheese Garlic Paper made to order with traditional Atmiya Hub spices.', 100.0, true, true, 10, NULL, ARRAY['Authentic', 'Plain Paper Dosa']::text[]),
('b07205f2-a056-57ff-b0e2-a990db21c949', '11111111-1111-1111-1111-111111111111', '8d3ecc05-72ce-5b64-8dfe-2009569f87df', 'Panner Cheese Paper', 'Panner Cheese Paper', 'Fresh authentic pure-veg Panner Cheese Paper made to order with traditional Atmiya Hub spices.', 120.0, true, true, 10, NULL, ARRAY['Authentic', 'Plain Paper Dosa']::text[]),
('96788720-afd3-5a9f-8822-ce04fccec781', '11111111-1111-1111-1111-111111111111', '8d3ecc05-72ce-5b64-8dfe-2009569f87df', 'Salad Paper', 'Salad Paper', 'Fresh authentic pure-veg Salad Paper made to order with traditional Atmiya Hub spices.', 90.0, true, true, 10, NULL, ARRAY['Authentic', 'Plain Paper Dosa']::text[]),
('68f783d8-205b-5f63-9417-36d2ac215b07', '11111111-1111-1111-1111-111111111111', '8d3ecc05-72ce-5b64-8dfe-2009569f87df', 'Crunchy Paper', 'Crunchy Paper', 'Fresh authentic pure-veg Crunchy Paper made to order with traditional Atmiya Hub spices.', 60.0, true, true, 10, NULL, ARRAY['Authentic', 'Plain Paper Dosa']::text[]),
('41566249-86b0-53d8-9f3f-3e9793788490', '11111111-1111-1111-1111-111111111111', '8d3ecc05-72ce-5b64-8dfe-2009569f87df', 'Panner Khakra', 'Panner Khakra', 'Fresh authentic pure-veg Panner Khakra made to order with traditional Atmiya Hub spices.', 100.0, true, true, 10, NULL, ARRAY['Authentic', 'Plain Paper Dosa']::text[]),
('36c6f151-ae87-5586-9415-13b47b34d32c', '11111111-1111-1111-1111-111111111111', '8d3ecc05-72ce-5b64-8dfe-2009569f87df', 'Plain Khakra', 'Plain Khakra', 'Fresh authentic pure-veg Plain Khakra made to order with traditional Atmiya Hub spices.', 70.0, true, true, 10, NULL, ARRAY['Authentic', 'Plain Paper Dosa']::text[]),
('71e6c3e8-d9d4-57cd-89e1-7c10fb58aa4b', '11111111-1111-1111-1111-111111111111', '8d3ecc05-72ce-5b64-8dfe-2009569f87df', 'Peri Peri Khakra', 'Peri Peri Khakra', 'Fresh authentic pure-veg Peri Peri Khakra made to order with traditional Atmiya Hub spices.', 80.0, true, true, 10, NULL, ARRAY['Authentic', 'Plain Paper Dosa']::text[]),
('68cfc99d-7c9b-56d7-8bda-1a81be52ab78', '11111111-1111-1111-1111-111111111111', '8d3ecc05-72ce-5b64-8dfe-2009569f87df', 'Garlic Khakra', 'Garlic Khakra', 'Fresh authentic pure-veg Garlic Khakra made to order with traditional Atmiya Hub spices.', 90.0, true, true, 10, NULL, ARRAY['Authentic', 'Plain Paper Dosa']::text[]),
('5170a2bd-d085-5ebe-afe9-9b1074de58dc', '11111111-1111-1111-1111-111111111111', '8d3ecc05-72ce-5b64-8dfe-2009569f87df', 'Cheese Khakra', 'Cheese Khakra', 'Fresh authentic pure-veg Cheese Khakra made to order with traditional Atmiya Hub spices.', 100.0, true, true, 10, NULL, ARRAY['Authentic', 'Plain Paper Dosa']::text[]),
('4a3141a6-7281-5fd4-8545-cc3f11086007', '11111111-1111-1111-1111-111111111111', '8d3ecc05-72ce-5b64-8dfe-2009569f87df', 'Jera Mari Khakra', 'Jera Mari Khakra', 'Fresh authentic pure-veg Jera Mari Khakra made to order with traditional Atmiya Hub spices.', 90.0, true, true, 10, NULL, ARRAY['Authentic', 'Plain Paper Dosa']::text[]),
('33dbadc0-d1a2-5c73-80b2-42232bc04637', '11111111-1111-1111-1111-111111111111', '571d51dd-7575-5532-b558-a2416f03b459', 'Masala Dosa', 'Masala Dosa', 'Fresh authentic pure-veg Masala Dosa made to order with traditional Atmiya Hub spices.', 110.0, true, true, 10, NULL, ARRAY['Authentic', 'Masala Dosa']::text[]),
('c49c20f3-fd31-5b7e-8071-b5f88437e948', '11111111-1111-1111-1111-111111111111', '571d51dd-7575-5532-b558-a2416f03b459', 'Onion Masala', 'Onion Masala', 'Fresh authentic pure-veg Onion Masala made to order with traditional Atmiya Hub spices.', 120.0, true, true, 10, NULL, ARRAY['Authentic', 'Masala Dosa']::text[]),
('af5cc6e9-e339-5b23-9029-3cc5b6fd5c2f', '11111111-1111-1111-1111-111111111111', '571d51dd-7575-5532-b558-a2416f03b459', 'Garlic Masala', 'Garlic Masala', 'Fresh authentic pure-veg Garlic Masala made to order with traditional Atmiya Hub spices.', 130.0, true, true, 10, NULL, ARRAY['Authentic', 'Masala Dosa']::text[]),
('32117859-8ec2-5c2e-90dd-1d58404fda4d', '11111111-1111-1111-1111-111111111111', '571d51dd-7575-5532-b558-a2416f03b459', 'Sezwan Masala', 'Sezwan Masala', 'Fresh authentic pure-veg Sezwan Masala made to order with traditional Atmiya Hub spices.', 130.0, true, true, 10, NULL, ARRAY['Authentic', 'Masala Dosa']::text[]),
('878c2ce2-5568-549e-93b3-37b7cd08fe70', '11111111-1111-1111-1111-111111111111', '571d51dd-7575-5532-b558-a2416f03b459', 'Panner Masala', 'Panner Masala', 'Fresh authentic pure-veg Panner Masala made to order with traditional Atmiya Hub spices.', 140.0, true, true, 10, NULL, ARRAY['Authentic', 'Masala Dosa']::text[]),
('f729c271-8932-5f79-9166-a76307e43a78', '11111111-1111-1111-1111-111111111111', '571d51dd-7575-5532-b558-a2416f03b459', 'Cheese Masala', 'Cheese Masala', 'Fresh authentic pure-veg Cheese Masala made to order with traditional Atmiya Hub spices.', 160.0, true, true, 10, NULL, ARRAY['Authentic', 'Masala Dosa']::text[]),
('cc7bf13e-ee68-5e10-975f-49d7c5aae76e', '11111111-1111-1111-1111-111111111111', '571d51dd-7575-5532-b558-a2416f03b459', 'Panner Sezwan Masala', 'Panner Sezwan Masala', 'Fresh authentic pure-veg Panner Sezwan Masala made to order with traditional Atmiya Hub spices.', 170.0, true, true, 10, NULL, ARRAY['Authentic', 'Masala Dosa']::text[]),
('1f6f1d72-a504-5e9b-ae7a-22701c72cf30', '11111111-1111-1111-1111-111111111111', '571d51dd-7575-5532-b558-a2416f03b459', 'Palak Sezwan Masala', 'Palak Sezwan Masala', 'Fresh authentic pure-veg Palak Sezwan Masala made to order with traditional Atmiya Hub spices.', 130.0, true, true, 10, NULL, ARRAY['Authentic', 'Masala Dosa']::text[]),
('69b839f7-4054-551c-9f04-730aa40f949f', '11111111-1111-1111-1111-111111111111', '571d51dd-7575-5532-b558-a2416f03b459', 'Panner Cheese Masala', 'Panner Cheese Masala', 'Fresh authentic pure-veg Panner Cheese Masala made to order with traditional Atmiya Hub spices.', 130.0, true, true, 10, NULL, ARRAY['Authentic', 'Masala Dosa']::text[]),
('61dcedba-5321-5eac-a5b3-f4d353e050c8', '11111111-1111-1111-1111-111111111111', '571d51dd-7575-5532-b558-a2416f03b459', 'Cheese Palak Masala', 'Cheese Palak Masala', 'Fresh authentic pure-veg Cheese Palak Masala made to order with traditional Atmiya Hub spices.', 170.0, true, true, 10, NULL, ARRAY['Authentic', 'Masala Dosa']::text[]),
('5ec6e584-90bc-59a7-a9c5-3a4bfa83d6a3', '11111111-1111-1111-1111-111111111111', '571d51dd-7575-5532-b558-a2416f03b459', 'Palak Panner Masala', 'Palak Panner Masala', 'Fresh authentic pure-veg Palak Panner Masala made to order with traditional Atmiya Hub spices.', 170.0, true, true, 10, NULL, ARRAY['Authentic', 'Masala Dosa']::text[]),
('6515735c-66da-5b04-a6ae-294428354cb6', '11111111-1111-1111-1111-111111111111', '571d51dd-7575-5532-b558-a2416f03b459', 'Cheese Palak Masala', 'Cheese Palak Masala', 'Duplicate menu entry; verify price/name', 180.0, true, true, 10, NULL, ARRAY['Authentic', 'Masala Dosa']::text[]),
('c89fcdfd-5aaf-5a1d-97ce-6fb0c2c8efbb', '11111111-1111-1111-1111-111111111111', '571d51dd-7575-5532-b558-a2416f03b459', 'Mix Masala', 'Mix Masala', 'Fresh authentic pure-veg Mix Masala made to order with traditional Atmiya Hub spices.', 190.0, true, true, 10, NULL, ARRAY['Authentic', 'Masala Dosa']::text[]),
('eb6490e8-d21c-5fe3-9530-876fc8ae3671', '11111111-1111-1111-1111-111111111111', '571d51dd-7575-5532-b558-a2416f03b459', 'Hayderabad Masala', 'Hayderabad Masala', 'Fresh authentic pure-veg Hayderabad Masala made to order with traditional Atmiya Hub spices.', 180.0, true, true, 10, NULL, ARRAY['Authentic', 'Masala Dosa']::text[]),
('2c9997e1-11a1-5d58-9997-0171670959c3', '11111111-1111-1111-1111-111111111111', '571d51dd-7575-5532-b558-a2416f03b459', 'Sp. Atmiya Masala', 'Sp. Atmiya Masala', 'Fresh authentic pure-veg Sp. Atmiya Masala made to order with traditional Atmiya Hub spices.', 220.0, true, true, 10, NULL, ARRAY['Authentic', 'Masala Dosa']::text[]),
('a03b0d62-2d67-5e33-9cb3-1ae56675c7fe', '11111111-1111-1111-1111-111111111111', '571d51dd-7575-5532-b558-a2416f03b459', 'Cheese Sezwan Masala', 'Cheese Sezwan Masala', 'Fresh authentic pure-veg Cheese Sezwan Masala made to order with traditional Atmiya Hub spices.', 210.0, true, true, 10, NULL, ARRAY['Authentic', 'Masala Dosa']::text[]),
('debffe04-a1c7-5e15-ad41-98bfad34b0a0', '11111111-1111-1111-1111-111111111111', 'e735763a-4223-5987-a6c0-7c84647a8f66', 'Veg. Fry Rice', 'Veg. Fry Rice', 'Fresh authentic pure-veg Veg. Fry Rice made to order with traditional Atmiya Hub spices.', 90.0, true, true, 8, NULL, ARRAY['Authentic', 'Chinese Rice']::text[]),
('38ca71ea-7830-52ef-9e99-7d7e14c1af0e', '11111111-1111-1111-1111-111111111111', 'e735763a-4223-5987-a6c0-7c84647a8f66', 'Mushroom Fry Rice', 'Mushroom Fry Rice', 'Fresh authentic pure-veg Mushroom Fry Rice made to order with traditional Atmiya Hub spices.', 100.0, true, true, 8, NULL, ARRAY['Authentic', 'Chinese Rice']::text[]),
('2f556a57-feca-511e-b0cb-887979d5e46e', '11111111-1111-1111-1111-111111111111', 'e735763a-4223-5987-a6c0-7c84647a8f66', 'Panner Fry Rice', 'Panner Fry Rice', 'Fresh authentic pure-veg Panner Fry Rice made to order with traditional Atmiya Hub spices.', 110.0, true, true, 8, NULL, ARRAY['Authentic', 'Chinese Rice']::text[]),
('23c653dc-9af3-5df7-93e9-1f94bd18cee0', '11111111-1111-1111-1111-111111111111', 'e735763a-4223-5987-a6c0-7c84647a8f66', 'Veg. Triple Fry Rice', 'Veg. Triple Fry Rice', 'Fresh authentic pure-veg Veg. Triple Fry Rice made to order with traditional Atmiya Hub spices.', 130.0, true, true, 8, NULL, ARRAY['Authentic', 'Chinese Rice']::text[]),
('ff4b62f0-1ae6-5206-8064-39d3706d064d', '11111111-1111-1111-1111-111111111111', 'e735763a-4223-5987-a6c0-7c84647a8f66', 'Veg. Sezwan Rice', 'Veg. Sezwan Rice', 'Fresh authentic pure-veg Veg. Sezwan Rice made to order with traditional Atmiya Hub spices.', 100.0, true, true, 8, NULL, ARRAY['Authentic', 'Chinese Rice']::text[]),
('ff76a97e-fca6-50f8-94c0-9212ee92f334', '11111111-1111-1111-1111-111111111111', 'e735763a-4223-5987-a6c0-7c84647a8f66', 'Manchurian Rice', 'Manchurian Rice', 'Fresh authentic pure-veg Manchurian Rice made to order with traditional Atmiya Hub spices.', 120.0, true, true, 8, NULL, ARRAY['Authentic', 'Chinese Rice']::text[]),
('d96f0ee2-17c3-586c-82a8-bb6b178f135e', '11111111-1111-1111-1111-111111111111', 'e735763a-4223-5987-a6c0-7c84647a8f66', 'Sezwan Manchurian Rice', 'Sezwan Manchurian Rice', 'Fresh authentic pure-veg Sezwan Manchurian Rice made to order with traditional Atmiya Hub spices.', 130.0, true, true, 8, NULL, ARRAY['Authentic', 'Chinese Rice']::text[]),
('3a3b655b-2923-5850-9995-3640a861cbc7', '11111111-1111-1111-1111-111111111111', 'e735763a-4223-5987-a6c0-7c84647a8f66', 'Veg. Garlic Rice', 'Veg. Garlic Rice', 'Fresh authentic pure-veg Veg. Garlic Rice made to order with traditional Atmiya Hub spices.', 100.0, true, true, 8, NULL, ARRAY['Authentic', 'Chinese Rice']::text[]),
('66a3ca24-65f5-5c88-adf6-3c47a24c4a8b', '11111111-1111-1111-1111-111111111111', 'e735763a-4223-5987-a6c0-7c84647a8f66', 'Veg. Singapuri Rice', 'Veg. Singapuri Rice', 'Fresh authentic pure-veg Veg. Singapuri Rice made to order with traditional Atmiya Hub spices.', 140.0, true, true, 8, NULL, ARRAY['Authentic', 'Chinese Rice']::text[]),
('0c17dc0b-4054-501a-b703-f96c991b7507', '11111111-1111-1111-1111-111111111111', 'e735763a-4223-5987-a6c0-7c84647a8f66', 'Jeera Rice', 'Jeera Rice', 'Fresh authentic pure-veg Jeera Rice made to order with traditional Atmiya Hub spices.', 70.0, true, true, 8, NULL, ARRAY['Authentic', 'Chinese Rice']::text[]),
('a158ea77-0ab1-5ef6-b044-9de16fa50e8f', '11111111-1111-1111-1111-111111111111', 'e735763a-4223-5987-a6c0-7c84647a8f66', 'Kaju Panner Rice', 'Kaju Panner Rice', 'Fresh authentic pure-veg Kaju Panner Rice made to order with traditional Atmiya Hub spices.', 100.0, true, true, 8, NULL, ARRAY['Authentic', 'Chinese Rice']::text[]),
('76926536-faa1-569f-89fb-97322cfa7e03', '11111111-1111-1111-1111-111111111111', 'e735763a-4223-5987-a6c0-7c84647a8f66', 'Panner Manchurian Rice', 'Panner Manchurian Rice', 'Fresh authentic pure-veg Panner Manchurian Rice made to order with traditional Atmiya Hub spices.', 120.0, true, true, 8, NULL, ARRAY['Authentic', 'Chinese Rice']::text[]),
('bf660e90-8133-5274-9923-2ab5f6539c59', '11111111-1111-1111-1111-111111111111', 'e735763a-4223-5987-a6c0-7c84647a8f66', 'Panner Manchurian Sezwan Rice', 'Panner Manchurian Sezwan Rice', 'Fresh authentic pure-veg Panner Manchurian Sezwan Rice made to order with traditional Atmiya Hub spices.', 130.0, true, true, 8, NULL, ARRAY['Authentic', 'Chinese Rice']::text[]),
('97ba3ae5-eb8a-5f4d-adc0-baac51531ccd', '11111111-1111-1111-1111-111111111111', 'e735763a-4223-5987-a6c0-7c84647a8f66', 'Veg. Chilly Rice', 'Veg. Chilly Rice', 'Fresh authentic pure-veg Veg. Chilly Rice made to order with traditional Atmiya Hub spices.', 140.0, true, true, 8, NULL, ARRAY['Authentic', 'Chinese Rice']::text[]),
('78be8494-fb03-58d4-86d9-fcdfbcdf8f4e', '11111111-1111-1111-1111-111111111111', 'e735763a-4223-5987-a6c0-7c84647a8f66', 'Mushroom Sezwan Fry Rice', 'Mushroom Sezwan Fry Rice', 'Fresh authentic pure-veg Mushroom Sezwan Fry Rice made to order with traditional Atmiya Hub spices.', 130.0, true, true, 8, NULL, ARRAY['Authentic', 'Chinese Rice']::text[]),
('554b34dc-905e-549b-84e2-956bbce130dd', '11111111-1111-1111-1111-111111111111', 'e735763a-4223-5987-a6c0-7c84647a8f66', 'Veg. Sezwan Fry Rice', 'Veg. Sezwan Fry Rice', 'Fresh authentic pure-veg Veg. Sezwan Fry Rice made to order with traditional Atmiya Hub spices.', 110.0, true, true, 8, NULL, ARRAY['Authentic', 'Chinese Rice']::text[]),
('8c0e20ec-6989-5be5-bd33-d186a2c4ae6b', '11111111-1111-1111-1111-111111111111', 'e735763a-4223-5987-a6c0-7c84647a8f66', 'Sp. Atmiya Fry Rice', 'Sp. Atmiya Fry Rice', 'Fresh authentic pure-veg Sp. Atmiya Fry Rice made to order with traditional Atmiya Hub spices.', 150.0, true, true, 8, NULL, ARRAY['Authentic', 'Chinese Rice']::text[]),
('34ad4c3c-2236-5469-94b9-1ef8c66b9b88', '11111111-1111-1111-1111-111111111111', 'f467189b-8684-5255-a4d6-fccc6cdacdad', 'Manchurian Dry', 'Manchurian Dry', 'Fresh authentic pure-veg Manchurian Dry made to order with traditional Atmiya Hub spices.', 120.0, true, true, 8, NULL, ARRAY['Authentic', 'Starter']::text[]),
('584b32ac-c1f8-53ee-9c6a-447ae8fe6d54', '11111111-1111-1111-1111-111111111111', 'f467189b-8684-5255-a4d6-fccc6cdacdad', 'Manchurian Gravy', 'Manchurian Gravy', 'Fresh authentic pure-veg Manchurian Gravy made to order with traditional Atmiya Hub spices.', 130.0, true, true, 8, NULL, ARRAY['Authentic', 'Starter']::text[]),
('40a5632b-e7f1-534c-aac7-088ac8112dbf', '11111111-1111-1111-1111-111111111111', 'f467189b-8684-5255-a4d6-fccc6cdacdad', 'Panner Manchurian Dry', 'Panner Manchurian Dry', 'Fresh authentic pure-veg Panner Manchurian Dry made to order with traditional Atmiya Hub spices.', 150.0, true, true, 8, NULL, ARRAY['Authentic', 'Starter']::text[]),
('3c745b09-9101-5c8b-850d-ddec3eb9bff3', '11111111-1111-1111-1111-111111111111', 'f467189b-8684-5255-a4d6-fccc6cdacdad', 'Sezwan Manchurian Dry', 'Sezwan Manchurian Dry', 'Fresh authentic pure-veg Sezwan Manchurian Dry made to order with traditional Atmiya Hub spices.', 160.0, true, true, 8, NULL, ARRAY['Authentic', 'Starter']::text[]),
('f3aa7634-0301-5a8f-adb3-e18fcf870f89', '11111111-1111-1111-1111-111111111111', 'f467189b-8684-5255-a4d6-fccc6cdacdad', 'Panner Chilly Dry', 'Panner Chilly Dry', 'Fresh authentic pure-veg Panner Chilly Dry made to order with traditional Atmiya Hub spices.', 170.0, true, true, 8, NULL, ARRAY['Authentic', 'Starter']::text[]),
('2bd63d65-9bde-50f1-ac9e-ca13172764da', '11111111-1111-1111-1111-111111111111', 'f467189b-8684-5255-a4d6-fccc6cdacdad', 'Panner Chilly Gravy', 'Panner Chilly Gravy', 'Fresh authentic pure-veg Panner Chilly Gravy made to order with traditional Atmiya Hub spices.', 180.0, true, true, 8, NULL, ARRAY['Authentic', 'Starter']::text[]),
('91d8c281-eae4-5858-a989-ab4eded5bfea', '11111111-1111-1111-1111-111111111111', 'f467189b-8684-5255-a4d6-fccc6cdacdad', 'Chilly Potato', 'Chilly Potato', 'Fresh authentic pure-veg Chilly Potato made to order with traditional Atmiya Hub spices.', 150.0, true, true, 8, NULL, ARRAY['Authentic', 'Starter']::text[]),
('39517200-97b0-5842-9fdf-da9e4050857d', '11111111-1111-1111-1111-111111111111', 'f467189b-8684-5255-a4d6-fccc6cdacdad', 'Panner 65', 'Panner 65', 'Fresh authentic pure-veg Panner 65 made to order with traditional Atmiya Hub spices.', 160.0, true, true, 8, NULL, ARRAY['Authentic', 'Starter']::text[]),
('d23c3829-fe9d-5b41-adbf-0a9fd50107ae', '11111111-1111-1111-1111-111111111111', 'f467189b-8684-5255-a4d6-fccc6cdacdad', 'Mushroom Chilly Dry', 'Mushroom Chilly Dry', 'Fresh authentic pure-veg Mushroom Chilly Dry made to order with traditional Atmiya Hub spices.', 170.0, true, true, 8, NULL, ARRAY['Authentic', 'Starter']::text[]),
('8975c995-ef38-5897-a0fe-978faa93c46a', '11111111-1111-1111-1111-111111111111', 'f467189b-8684-5255-a4d6-fccc6cdacdad', 'Mushroom Chilly Gravy', 'Mushroom Chilly Gravy', 'Fresh authentic pure-veg Mushroom Chilly Gravy made to order with traditional Atmiya Hub spices.', 180.0, true, true, 8, NULL, ARRAY['Authentic', 'Starter']::text[]),
('c2a8cef8-4e73-5754-a51e-e255332754b5', '11111111-1111-1111-1111-111111111111', 'f467189b-8684-5255-a4d6-fccc6cdacdad', 'Chinese Bhel', 'Chinese Bhel', 'Fresh authentic pure-veg Chinese Bhel made to order with traditional Atmiya Hub spices.', 100.0, true, true, 8, NULL, ARRAY['Authentic', 'Starter']::text[]),
('ab1f7815-6a54-52e8-a54d-b3e29a768e3f', '11111111-1111-1111-1111-111111111111', 'f467189b-8684-5255-a4d6-fccc6cdacdad', 'Bombay Bhel', 'Bombay Bhel', 'Fresh authentic pure-veg Bombay Bhel made to order with traditional Atmiya Hub spices.', 110.0, true, true, 8, NULL, ARRAY['Authentic', 'Starter']::text[]),
('01d6e78b-7398-5dd5-b0c1-bcb29165382b', '11111111-1111-1111-1111-111111111111', 'f467189b-8684-5255-a4d6-fccc6cdacdad', 'Panner Bhel', 'Panner Bhel', 'Fresh authentic pure-veg Panner Bhel made to order with traditional Atmiya Hub spices.', 150.0, true, true, 8, NULL, ARRAY['Authentic', 'Starter']::text[]),
('27d17405-e1a5-5270-bc1a-db19300e57ca', '11111111-1111-1111-1111-111111111111', '6424c8f8-3b64-585d-a92f-144078036690', 'Mysore Masala', 'Mysore Masala', 'Fresh authentic pure-veg Mysore Masala made to order with traditional Atmiya Hub spices.', 130.0, true, true, 10, NULL, ARRAY['Authentic', 'Mysore Dosa']::text[]),
('b6205b3e-c63b-5f7c-84f6-0857b056eaad', '11111111-1111-1111-1111-111111111111', '6424c8f8-3b64-585d-a92f-144078036690', 'Garlic Mysore', 'Garlic Mysore', 'Fresh authentic pure-veg Garlic Mysore made to order with traditional Atmiya Hub spices.', 140.0, true, true, 10, NULL, ARRAY['Authentic', 'Mysore Dosa']::text[]),
('b33d85a0-54d5-5d8d-8562-cae3195387cc', '11111111-1111-1111-1111-111111111111', '6424c8f8-3b64-585d-a92f-144078036690', 'Panner Mysore', 'Panner Mysore', 'Fresh authentic pure-veg Panner Mysore made to order with traditional Atmiya Hub spices.', 150.0, true, true, 10, NULL, ARRAY['Authentic', 'Mysore Dosa']::text[]),
('4a4a4424-f51b-5aa1-aeb9-e373fd7f6886', '11111111-1111-1111-1111-111111111111', '6424c8f8-3b64-585d-a92f-144078036690', 'Cheese Mysore', 'Cheese Mysore', 'Fresh authentic pure-veg Cheese Mysore made to order with traditional Atmiya Hub spices.', 160.0, true, true, 10, NULL, ARRAY['Authentic', 'Mysore Dosa']::text[]),
('3c2e4c82-2db6-5d19-8d62-d5f6bc83585d', '11111111-1111-1111-1111-111111111111', '6424c8f8-3b64-585d-a92f-144078036690', 'Sweet Corn Mysore', 'Sweet Corn Mysore', 'Fresh authentic pure-veg Sweet Corn Mysore made to order with traditional Atmiya Hub spices.', 170.0, true, true, 10, NULL, ARRAY['Authentic', 'Mysore Dosa']::text[]),
('1cc81806-c37c-53f8-ba93-c054c0d6080a', '11111111-1111-1111-1111-111111111111', '6424c8f8-3b64-585d-a92f-144078036690', 'Palak Panner Mysore', 'Palak Panner Mysore', 'Fresh authentic pure-veg Palak Panner Mysore made to order with traditional Atmiya Hub spices.', 180.0, true, true, 10, NULL, ARRAY['Authentic', 'Mysore Dosa']::text[]),
('eaa1bddf-b900-54c3-978b-290bd964595a', '11111111-1111-1111-1111-111111111111', '6424c8f8-3b64-585d-a92f-144078036690', 'Panner Sweet Corn Mysore', 'Panner Sweet Corn Mysore', 'Fresh authentic pure-veg Panner Sweet Corn Mysore made to order with traditional Atmiya Hub spices.', 200.0, true, true, 10, NULL, ARRAY['Authentic', 'Mysore Dosa']::text[]),
('990ff768-960a-5bda-9156-98e57a74dcc2', '11111111-1111-1111-1111-111111111111', '6424c8f8-3b64-585d-a92f-144078036690', 'Panner Tukada Mysore', 'Panner Tukada Mysore', 'Fresh authentic pure-veg Panner Tukada Mysore made to order with traditional Atmiya Hub spices.', 200.0, true, true, 10, NULL, ARRAY['Authentic', 'Mysore Dosa']::text[]),
('28333f26-2c5d-5178-9134-1263bfd436c8', '11111111-1111-1111-1111-111111111111', '6424c8f8-3b64-585d-a92f-144078036690', 'Panner Cheese Mysore', 'Panner Cheese Mysore', 'Fresh authentic pure-veg Panner Cheese Mysore made to order with traditional Atmiya Hub spices.', 220.0, true, true, 10, NULL, ARRAY['Authentic', 'Mysore Dosa']::text[]),
('be773831-fa8f-5adb-9df9-758fe05ee6b7', '11111111-1111-1111-1111-111111111111', '6424c8f8-3b64-585d-a92f-144078036690', 'Panner Sweet Corn Mysore', 'Panner Sweet Corn Mysore', 'Duplicate menu entry with different price; verify', 210.0, true, true, 10, NULL, ARRAY['Authentic', 'Mysore Dosa']::text[]),
('8dd156bb-9c7b-5354-a5ab-9eb855b8be98', '11111111-1111-1111-1111-111111111111', '6424c8f8-3b64-585d-a92f-144078036690', 'Cheese Bhurji Mysore', 'Cheese Bhurji Mysore', 'Fresh authentic pure-veg Cheese Bhurji Mysore made to order with traditional Atmiya Hub spices.', 230.0, true, true, 10, NULL, ARRAY['Authentic', 'Mysore Dosa']::text[]),
('ef660d84-edb2-5139-8d29-c7df9a053e30', '11111111-1111-1111-1111-111111111111', '6424c8f8-3b64-585d-a92f-144078036690', 'S.P. Atmiya Mysore', 'S.P. Atmiya Mysore', 'Fresh authentic pure-veg S.P. Atmiya Mysore made to order with traditional Atmiya Hub spices.', 210.0, true, true, 10, NULL, ARRAY['Authentic', 'Mysore Dosa']::text[]),
('394e858f-c2fa-53a1-a399-3adb51a1ee4c', '11111111-1111-1111-1111-111111111111', '6424c8f8-3b64-585d-a92f-144078036690', 'Open Cheese Mysore', 'Open Cheese Mysore', 'Fresh authentic pure-veg Open Cheese Mysore made to order with traditional Atmiya Hub spices.', 200.0, true, true, 10, NULL, ARRAY['Authentic', 'Mysore Dosa']::text[]),
('abba004d-10e8-5713-8b29-97c645594386', '11111111-1111-1111-1111-111111111111', '6424c8f8-3b64-585d-a92f-144078036690', 'Kaju Mysore Bhurji', 'Kaju Mysore Bhurji', 'Fresh authentic pure-veg Kaju Mysore Bhurji made to order with traditional Atmiya Hub spices.', 200.0, true, true, 10, NULL, ARRAY['Authentic', 'Mysore Dosa']::text[]),
('1ccf35c8-5983-5b7b-89dd-6a735555211b', '11111111-1111-1111-1111-111111111111', 'd8101c10-608f-5411-bd47-401103c3d7c0', 'Sweet Corn Dosa', 'Sweet Corn Dosa', 'Fresh authentic pure-veg Sweet Corn Dosa made to order with traditional Atmiya Hub spices.', 250.0, true, true, 10, NULL, ARRAY['Authentic', 'Fancy Dosa']::text[]),
('31036d45-6671-5d24-9af5-4211d6762019', '11111111-1111-1111-1111-111111111111', 'd8101c10-608f-5411-bd47-401103c3d7c0', 'Chinese', 'Chinese', 'Fresh authentic pure-veg Chinese made to order with traditional Atmiya Hub spices.', 200.0, true, true, 10, NULL, ARRAY['Authentic', 'Fancy Dosa']::text[]),
('d68c744b-3542-558e-92a6-e545246e767a', '11111111-1111-1111-1111-111111111111', 'd8101c10-608f-5411-bd47-401103c3d7c0', 'Panner Frankie', 'Panner Frankie', 'Fresh authentic pure-veg Panner Frankie made to order with traditional Atmiya Hub spices.', 220.0, true, true, 10, NULL, ARRAY['Authentic', 'Fancy Dosa']::text[]),
('7f1923c4-9a50-5ff1-bf9b-6f825889b92d', '11111111-1111-1111-1111-111111111111', 'd8101c10-608f-5411-bd47-401103c3d7c0', 'Panner Sweet Corn', 'Panner Sweet Corn', 'Fresh authentic pure-veg Panner Sweet Corn made to order with traditional Atmiya Hub spices.', 230.0, true, true, 10, NULL, ARRAY['Authentic', 'Fancy Dosa']::text[]),
('76958267-32a9-5bda-9dc5-61730a3efc5f', '11111111-1111-1111-1111-111111111111', 'd8101c10-608f-5411-bd47-401103c3d7c0', 'Spring Roll', 'Spring Roll', 'Fresh authentic pure-veg Spring Roll made to order with traditional Atmiya Hub spices.', 250.0, true, true, 10, NULL, ARRAY['Authentic', 'Fancy Dosa']::text[]),
('eab90eb6-11cd-566e-a719-5397a4bf3126', '11111111-1111-1111-1111-111111111111', 'd8101c10-608f-5411-bd47-401103c3d7c0', 'Italian', 'Italian', 'Fresh authentic pure-veg Italian made to order with traditional Atmiya Hub spices.', 300.0, true, true, 10, NULL, ARRAY['Authentic', 'Fancy Dosa']::text[]),
('b17687f1-3d9d-589b-a812-89bfc169cf6f', '11111111-1111-1111-1111-111111111111', 'd8101c10-608f-5411-bd47-401103c3d7c0', 'Dilkush', 'Dilkush', 'Fresh authentic pure-veg Dilkush made to order with traditional Atmiya Hub spices.', 220.0, true, true, 10, NULL, ARRAY['Authentic', 'Fancy Dosa']::text[]),
('48b63661-e0e3-5e64-8038-2bd9767185a5', '11111111-1111-1111-1111-111111111111', 'd8101c10-608f-5411-bd47-401103c3d7c0', 'Cheese Frankie', 'Cheese Frankie', 'Fresh authentic pure-veg Cheese Frankie made to order with traditional Atmiya Hub spices.', 240.0, true, true, 10, NULL, ARRAY['Authentic', 'Fancy Dosa']::text[]),
('24217c7f-524d-5246-b66d-68cba73abbbd', '11111111-1111-1111-1111-111111111111', 'd8101c10-608f-5411-bd47-401103c3d7c0', 'Panner Chilly', 'Panner Chilly', 'Fresh authentic pure-veg Panner Chilly made to order with traditional Atmiya Hub spices.', 250.0, true, true, 10, NULL, ARRAY['Authentic', 'Fancy Dosa']::text[]),
('36be4bd0-7733-5aeb-a39b-09f0dfbbaf16', '11111111-1111-1111-1111-111111111111', 'd8101c10-608f-5411-bd47-401103c3d7c0', 'Cheese Chilly', 'Cheese Chilly', 'Fresh authentic pure-veg Cheese Chilly made to order with traditional Atmiya Hub spices.', 260.0, true, true, 10, NULL, ARRAY['Authentic', 'Fancy Dosa']::text[]),
('71beb678-7dea-5c8e-ba5d-4b6331279506', '11111111-1111-1111-1111-111111111111', 'd8101c10-608f-5411-bd47-401103c3d7c0', 'Jeeni Roll', 'Jeeni Roll', 'Fresh authentic pure-veg Jeeni Roll made to order with traditional Atmiya Hub spices.', 200.0, true, true, 10, NULL, ARRAY['Authentic', 'Fancy Dosa']::text[]),
('7110f321-d59f-510b-8122-9a120037c0cd', '11111111-1111-1111-1111-111111111111', 'd8101c10-608f-5411-bd47-401103c3d7c0', 'Raja Rani', 'Raja Rani', 'Fresh authentic pure-veg Raja Rani made to order with traditional Atmiya Hub spices.', 220.0, true, true, 10, NULL, ARRAY['Authentic', 'Fancy Dosa']::text[]),
('697b37ca-db2f-5e34-a478-7b3585f751ff', '11111111-1111-1111-1111-111111111111', 'd8101c10-608f-5411-bd47-401103c3d7c0', 'Panner Cheese Frankie', 'Panner Cheese Frankie', 'Fresh authentic pure-veg Panner Cheese Frankie made to order with traditional Atmiya Hub spices.', 200.0, true, true, 10, NULL, ARRAY['Authentic', 'Fancy Dosa']::text[]),
('4bba9977-52e7-51f0-a0b5-85fc8dd61453', '11111111-1111-1111-1111-111111111111', 'd8101c10-608f-5411-bd47-401103c3d7c0', 'Pizza', 'Pizza', 'Fresh authentic pure-veg Pizza made to order with traditional Atmiya Hub spices.', 200.0, true, true, 10, NULL, ARRAY['Authentic', 'Fancy Dosa']::text[]),
('6298999c-b30f-5483-9f00-ed864fd7fd24', '11111111-1111-1111-1111-111111111111', 'd8101c10-608f-5411-bd47-401103c3d7c0', 'Gotala', 'Gotala', 'Fresh authentic pure-veg Gotala made to order with traditional Atmiya Hub spices.', 220.0, true, true, 10, NULL, ARRAY['Authentic', 'Fancy Dosa']::text[]),
('80f7ac96-f4c9-5531-a1fb-5054f6ac26d1', '11111111-1111-1111-1111-111111111111', 'd8101c10-608f-5411-bd47-401103c3d7c0', 'Green Gotala', 'Green Gotala', 'Fresh authentic pure-veg Green Gotala made to order with traditional Atmiya Hub spices.', 250.0, true, true, 10, NULL, ARRAY['Authentic', 'Fancy Dosa']::text[]),
('515842f8-7544-5fb3-9808-f8255167c386', '11111111-1111-1111-1111-111111111111', 'd8101c10-608f-5411-bd47-401103c3d7c0', 'Cheese Maggi', 'Cheese Maggi', 'Fresh authentic pure-veg Cheese Maggi made to order with traditional Atmiya Hub spices.', 220.0, true, true, 10, NULL, ARRAY['Authentic', 'Fancy Dosa']::text[]),
('2057e169-b12c-5f2b-a472-62feb2dd15b6', '11111111-1111-1111-1111-111111111111', 'd8101c10-608f-5411-bd47-401103c3d7c0', 'Surti Mysore Bhaji', 'Surti Mysore Bhaji', 'Handwritten corrected price appears 150', 150.0, true, true, 10, NULL, ARRAY['Authentic', 'Fancy Dosa']::text[]),
('82db25f3-ff28-5cb6-9173-2a57f6031d28', '11111111-1111-1111-1111-111111111111', '23946c55-6bab-50c7-a77b-5e4faa3156b5', 'Plain Maggi', 'Plain Maggi', 'Menu text looks like ''Plan Maggi''', 50.0, true, true, 8, NULL, ARRAY['Authentic', 'Maggi']::text[]),
('e6c00208-4318-52a9-8d1d-0b1b49ce50f2', '11111111-1111-1111-1111-111111111111', '23946c55-6bab-50c7-a77b-5e4faa3156b5', 'Vegetable Maggi', 'Vegetable Maggi', 'Fresh authentic pure-veg Vegetable Maggi made to order with traditional Atmiya Hub spices.', 60.0, true, true, 8, NULL, ARRAY['Authentic', 'Maggi']::text[]),
('394271ee-e88a-543c-a22f-2ce45a4c57ea', '11111111-1111-1111-1111-111111111111', '23946c55-6bab-50c7-a77b-5e4faa3156b5', 'Cheese Maggi', 'Cheese Maggi', 'Fresh authentic pure-veg Cheese Maggi made to order with traditional Atmiya Hub spices.', 80.0, true, true, 8, NULL, ARRAY['Authentic', 'Maggi']::text[]),
('a95152d6-bc3a-5774-afa1-1ddeecfd8ac4', '11111111-1111-1111-1111-111111111111', '23946c55-6bab-50c7-a77b-5e4faa3156b5', 'Butter Maggi', 'Butter Maggi', 'Fresh authentic pure-veg Butter Maggi made to order with traditional Atmiya Hub spices.', 80.0, true, true, 8, NULL, ARRAY['Authentic', 'Maggi']::text[]),
('04f6a0b9-0964-5a0c-aacd-5182aeeb3b29', '11111111-1111-1111-1111-111111111111', '23946c55-6bab-50c7-a77b-5e4faa3156b5', 'Panner Maggi', 'Panner Maggi', 'Fresh authentic pure-veg Panner Maggi made to order with traditional Atmiya Hub spices.', 90.0, true, true, 8, NULL, ARRAY['Authentic', 'Maggi']::text[]),
('d0681f1f-cf33-5047-919f-34825fae71ba', '11111111-1111-1111-1111-111111111111', '23946c55-6bab-50c7-a77b-5e4faa3156b5', 'Cheese Panner Maggi', 'Cheese Panner Maggi', 'Fresh authentic pure-veg Cheese Panner Maggi made to order with traditional Atmiya Hub spices.', 110.0, true, true, 8, NULL, ARRAY['Authentic', 'Maggi']::text[]),
('cd3d48a1-c409-5f14-a554-ae75b8083f90', '11111111-1111-1111-1111-111111111111', '23946c55-6bab-50c7-a77b-5e4faa3156b5', 'Mattar Maggi', 'Mattar Maggi', 'Fresh authentic pure-veg Mattar Maggi made to order with traditional Atmiya Hub spices.', 80.0, true, true, 8, NULL, ARRAY['Authentic', 'Maggi']::text[]),
('bce110ad-cfba-5cb0-bc55-414cb0e3c5ce', '11111111-1111-1111-1111-111111111111', '23946c55-6bab-50c7-a77b-5e4faa3156b5', 'Chilly Garlic Maggi', 'Chilly Garlic Maggi', 'Fresh authentic pure-veg Chilly Garlic Maggi made to order with traditional Atmiya Hub spices.', 100.0, true, true, 8, NULL, ARRAY['Authentic', 'Maggi']::text[]),
('e231bff5-ca7d-5ca8-b0ad-7fd066d1edf1', '11111111-1111-1111-1111-111111111111', '23946c55-6bab-50c7-a77b-5e4faa3156b5', 'Sp. Atmiya Maggi', 'Sp. Atmiya Maggi', 'Fresh authentic pure-veg Sp. Atmiya Maggi made to order with traditional Atmiya Hub spices.', 130.0, true, true, 8, NULL, ARRAY['Authentic', 'Maggi']::text[]),
('3f1a69b0-b5ee-5c37-a643-f47746f18770', '11111111-1111-1111-1111-111111111111', 'eaabffe3-aeda-5738-9581-937efaa64bd2', 'Hakka Noodles', 'Hakka Noodles', 'Fresh authentic pure-veg Hakka Noodles made to order with traditional Atmiya Hub spices.', 120.0, true, true, 8, NULL, ARRAY['Authentic', 'Noodles']::text[]),
('d746d9d4-e829-5acf-bebb-34339a87c079', '11111111-1111-1111-1111-111111111111', 'eaabffe3-aeda-5738-9581-937efaa64bd2', 'Veg. Sezwan Noodles', 'Veg. Sezwan Noodles', 'Fresh authentic pure-veg Veg. Sezwan Noodles made to order with traditional Atmiya Hub spices.', 130.0, true, true, 8, NULL, ARRAY['Authentic', 'Noodles']::text[]),
('b761f4fe-31bb-5f9f-a235-c82953e28abe', '11111111-1111-1111-1111-111111111111', 'eaabffe3-aeda-5738-9581-937efaa64bd2', 'Veg. Chilly Garlic Noodles', 'Veg. Chilly Garlic Noodles', 'Fresh authentic pure-veg Veg. Chilly Garlic Noodles made to order with traditional Atmiya Hub spices.', 130.0, true, true, 8, NULL, ARRAY['Authentic', 'Noodles']::text[]),
('c68a7621-bc64-519e-a808-1ff210a9e30b', '11111111-1111-1111-1111-111111111111', 'eaabffe3-aeda-5738-9581-937efaa64bd2', 'Manchurian Noodles', 'Manchurian Noodles', 'Fresh authentic pure-veg Manchurian Noodles made to order with traditional Atmiya Hub spices.', 140.0, true, true, 8, NULL, ARRAY['Authentic', 'Noodles']::text[]),
('95cefac6-b4dc-5670-9b7f-d2c525327232', '11111111-1111-1111-1111-111111111111', 'eaabffe3-aeda-5738-9581-937efaa64bd2', 'Panner Sezwan Noodles', 'Panner Sezwan Noodles', 'Fresh authentic pure-veg Panner Sezwan Noodles made to order with traditional Atmiya Hub spices.', 140.0, true, true, 8, NULL, ARRAY['Authentic', 'Noodles']::text[]),
('232f2222-c040-552b-a2c1-1e4914fa5c9e', '11111111-1111-1111-1111-111111111111', 'eaabffe3-aeda-5738-9581-937efaa64bd2', 'Singapuri Noodles', 'Singapuri Noodles', 'Fresh authentic pure-veg Singapuri Noodles made to order with traditional Atmiya Hub spices.', 150.0, true, true, 8, NULL, ARRAY['Authentic', 'Noodles']::text[]),
('dfd13946-58f6-5ffd-acb7-1a0e207ea2fc', '11111111-1111-1111-1111-111111111111', 'eaabffe3-aeda-5738-9581-937efaa64bd2', 'Panner Noodles', 'Panner Noodles', 'Fresh authentic pure-veg Panner Noodles made to order with traditional Atmiya Hub spices.', 160.0, true, true, 8, NULL, ARRAY['Authentic', 'Noodles']::text[]),
('24dcc823-49be-58e2-b41d-a1d9bc7992d7', '11111111-1111-1111-1111-111111111111', 'eaabffe3-aeda-5738-9581-937efaa64bd2', 'Sezwan Noodles', 'Sezwan Noodles', 'Fresh authentic pure-veg Sezwan Noodles made to order with traditional Atmiya Hub spices.', 170.0, true, true, 8, NULL, ARRAY['Authentic', 'Noodles']::text[]),
('136b7a4b-de7a-5574-8a66-a8214a81736d', '11111111-1111-1111-1111-111111111111', 'eaabffe3-aeda-5738-9581-937efaa64bd2', 'Sezwan Mushroom Noodles', 'Sezwan Mushroom Noodles', 'Fresh authentic pure-veg Sezwan Mushroom Noodles made to order with traditional Atmiya Hub spices.', 150.0, true, true, 8, NULL, ARRAY['Authentic', 'Noodles']::text[]),
('c1d4517e-a8b4-5a70-a224-6019614c969e', '11111111-1111-1111-1111-111111111111', 'eaabffe3-aeda-5738-9581-937efaa64bd2', 'Mushroom Noodles', 'Mushroom Noodles', 'Fresh authentic pure-veg Mushroom Noodles made to order with traditional Atmiya Hub spices.', 130.0, true, true, 8, NULL, ARRAY['Authentic', 'Noodles']::text[]),
('4d1be99d-9226-582a-833e-3f8b125cee29', '11111111-1111-1111-1111-111111111111', '1da70ae4-22d9-57c2-b999-6c3206c8030a', 'Manchaw Soup', 'Manchaw Soup', 'Fresh authentic pure-veg Manchaw Soup made to order with traditional Atmiya Hub spices.', 70.0, true, true, 5, NULL, ARRAY['Authentic', 'Soup']::text[]),
('d65476b7-c4f0-58fe-8b7a-eb83ed7becbe', '11111111-1111-1111-1111-111111111111', '1da70ae4-22d9-57c2-b999-6c3206c8030a', 'Manchuriyan Soup', 'Manchuriyan Soup', 'Fresh authentic pure-veg Manchuriyan Soup made to order with traditional Atmiya Hub spices.', 90.0, true, true, 5, NULL, ARRAY['Authentic', 'Soup']::text[]),
('ef7acb1d-ec74-581a-88a7-5449c9c9194a', '11111111-1111-1111-1111-111111111111', '1da70ae4-22d9-57c2-b999-6c3206c8030a', 'Tomanto Soup', 'Tomanto Soup', 'Fresh authentic pure-veg Tomanto Soup made to order with traditional Atmiya Hub spices.', 70.0, true, true, 5, NULL, ARRAY['Authentic', 'Soup']::text[]),
('4a292238-f0db-5ad1-9aa0-24d0439d4d38', '11111111-1111-1111-1111-111111111111', '1da70ae4-22d9-57c2-b999-6c3206c8030a', 'Hot & Sour Soup', 'Hot & Sour Soup', 'Fresh authentic pure-veg Hot & Sour Soup made to order with traditional Atmiya Hub spices.', 90.0, true, true, 5, NULL, ARRAY['Authentic', 'Soup']::text[]),
('58cab970-8aca-5460-9dd9-dcf3f1ed4475', '11111111-1111-1111-1111-111111111111', '1da70ae4-22d9-57c2-b999-6c3206c8030a', 'Vegetable Soup', 'Vegetable Soup', 'Fresh authentic pure-veg Vegetable Soup made to order with traditional Atmiya Hub spices.', 80.0, true, true, 5, NULL, ARRAY['Authentic', 'Soup']::text[]),
('aaa13051-d934-5add-9bb2-f09c41798285', '11111111-1111-1111-1111-111111111111', '1da70ae4-22d9-57c2-b999-6c3206c8030a', 'Sp. Atmiya Soup', 'Sp. Atmiya Soup', 'Fresh authentic pure-veg Sp. Atmiya Soup made to order with traditional Atmiya Hub spices.', 100.0, true, true, 5, NULL, ARRAY['Authentic', 'Soup']::text[]),
('6e0e3e52-30e0-51b8-bcca-be77688873e1', '11111111-1111-1111-1111-111111111111', 'cce31c48-c455-56bd-9613-93ff8470b8f2', 'Rosted Papad', 'Rosted Papad', 'Fresh authentic pure-veg Rosted Papad made to order with traditional Atmiya Hub spices.', 20.0, true, true, 5, NULL, ARRAY['Authentic', 'Papad']::text[]),
('2144e4ec-4a8f-5840-a28f-c1de470cdec8', '11111111-1111-1111-1111-111111111111', 'cce31c48-c455-56bd-9613-93ff8470b8f2', 'Fry Papad', 'Fry Papad', 'Fresh authentic pure-veg Fry Papad made to order with traditional Atmiya Hub spices.', 30.0, true, true, 5, NULL, ARRAY['Authentic', 'Papad']::text[]),
('81cdd832-4e38-52b4-b55c-cb8b87d49503', '11111111-1111-1111-1111-111111111111', 'cce31c48-c455-56bd-9613-93ff8470b8f2', 'Masala Papad', 'Masala Papad', 'Fresh authentic pure-veg Masala Papad made to order with traditional Atmiya Hub spices.', 50.0, true, true, 5, NULL, ARRAY['Authentic', 'Papad']::text[]),
('2db6543c-d5c4-5c8e-8cd7-3f18b5ffc466', '11111111-1111-1111-1111-111111111111', 'cce31c48-c455-56bd-9613-93ff8470b8f2', 'Cheese Masala Papad', 'Cheese Masala Papad', 'Fresh authentic pure-veg Cheese Masala Papad made to order with traditional Atmiya Hub spices.', 60.0, true, true, 5, NULL, ARRAY['Authentic', 'Papad']::text[]),
('c7074090-9a81-5794-b588-2c8410e198f0', '11111111-1111-1111-1111-111111111111', 'cce31c48-c455-56bd-9613-93ff8470b8f2', 'Cheese Panner Masala Papad', 'Cheese Panner Masala Papad', 'Fresh authentic pure-veg Cheese Panner Masala Papad made to order with traditional Atmiya Hub spices.', 80.0, true, true, 5, NULL, ARRAY['Authentic', 'Papad']::text[]),
('3b109944-e754-509d-9852-1648a03f61e6', '11111111-1111-1111-1111-111111111111', 'cce31c48-c455-56bd-9613-93ff8470b8f2', 'Franch Fries', 'Franch Fries', 'Fresh authentic pure-veg Franch Fries made to order with traditional Atmiya Hub spices.', 70.0, true, true, 5, NULL, ARRAY['Authentic', 'Papad']::text[]),
('ce9e2a37-0bbb-5a3d-b833-515bde92dd3d', '11111111-1111-1111-1111-111111111111', 'cce31c48-c455-56bd-9613-93ff8470b8f2', 'Peri Peri Franch Fries', 'Peri Peri Franch Fries', 'Fresh authentic pure-veg Peri Peri Franch Fries made to order with traditional Atmiya Hub spices.', 80.0, true, true, 5, NULL, ARRAY['Authentic', 'Papad']::text[]),
('51d6d910-f437-5a04-ba0e-c5dca053e8d0', '11111111-1111-1111-1111-111111111111', '721f253c-11d0-50ac-8d4e-ac3969bf2a80', 'Pasta Dosa', 'Pasta Dosa', 'Fresh authentic pure-veg Pasta Dosa made to order with traditional Atmiya Hub spices.', 200.0, true, true, 8, NULL, ARRAY['Authentic', 'Special Item']::text[]),
('5a575e3b-0b5c-50c3-82d6-2c8363f33443', '11111111-1111-1111-1111-111111111111', '721f253c-11d0-50ac-8d4e-ac3969bf2a80', 'Dilbhar Dosa', 'Dilbhar Dosa', 'Fresh authentic pure-veg Dilbhar Dosa made to order with traditional Atmiya Hub spices.', 240.0, true, true, 8, NULL, ARRAY['Authentic', 'Special Item']::text[]),
('e0fbed95-a3d6-5b6c-9482-2c0b4a492577', '11111111-1111-1111-1111-111111111111', '721f253c-11d0-50ac-8d4e-ac3969bf2a80', 'Mataka Dosa', 'Mataka Dosa', 'Fresh authentic pure-veg Mataka Dosa made to order with traditional Atmiya Hub spices.', 300.0, true, true, 8, NULL, ARRAY['Authentic', 'Special Item']::text[]),
('3e4a5b49-172f-59de-859f-3bc6f89302a6', '11111111-1111-1111-1111-111111111111', '721f253c-11d0-50ac-8d4e-ac3969bf2a80', 'Bahubali Dosa', 'Bahubali Dosa', 'Fresh authentic pure-veg Bahubali Dosa made to order with traditional Atmiya Hub spices.', 350.0, true, true, 8, NULL, ARRAY['Authentic', 'Special Item']::text[]),
('2b4594a3-c3b1-5eaf-bb97-9cdd1c2cd45f', '11111111-1111-1111-1111-111111111111', '721f253c-11d0-50ac-8d4e-ac3969bf2a80', 'Burji Kalifa Dosa', 'Burji Kalifa Dosa', 'Fresh authentic pure-veg Burji Kalifa Dosa made to order with traditional Atmiya Hub spices.', 350.0, true, true, 8, NULL, ARRAY['Authentic', 'Special Item']::text[]),
('bd80c42e-fb86-5503-8ea4-eecedc1a5c3e', '11111111-1111-1111-1111-111111111111', '721f253c-11d0-50ac-8d4e-ac3969bf2a80', 'Atmiya Sp. Fancy', 'Atmiya Sp. Fancy', 'Fresh authentic pure-veg Atmiya Sp. Fancy made to order with traditional Atmiya Hub spices.', 360.0, true, true, 8, NULL, ARRAY['Authentic', 'Special Item']::text[]),
('edcdf221-30f4-5ea8-bb49-9f8d1efa3f4d', '11111111-1111-1111-1111-111111111111', '721f253c-11d0-50ac-8d4e-ac3969bf2a80', 'Maharaja Dosa', 'Maharaja Dosa', 'Fresh authentic pure-veg Maharaja Dosa made to order with traditional Atmiya Hub spices.', 290.0, true, true, 8, NULL, ARRAY['Authentic', 'Special Item']::text[]),
('75234faf-f88f-5c44-ab93-1b732d2d674e', '11111111-1111-1111-1111-111111111111', '721f253c-11d0-50ac-8d4e-ac3969bf2a80', 'Double Cheese Pizza', 'Double Cheese Pizza', 'Fresh authentic pure-veg Double Cheese Pizza made to order with traditional Atmiya Hub spices.', 220.0, true, true, 8, NULL, ARRAY['Authentic', 'Special Item']::text[]),
('3b2052c3-ce24-5db6-aaef-d7a7c4f3a7f7', '11111111-1111-1111-1111-111111111111', '02756470-b931-5406-af21-f462aa99de8f', 'Pavu Bhaji', 'Pavu Bhaji', 'Fresh authentic pure-veg Pavu Bhaji made to order with traditional Atmiya Hub spices.', 70.0, true, true, 8, NULL, ARRAY['Authentic', 'Pav Bhaji']::text[]),
('107d7842-4d60-527d-bddd-573fce6fb534', '11111111-1111-1111-1111-111111111111', '02756470-b931-5406-af21-f462aa99de8f', 'Lashaniya Pavu Bhaji', 'Lashaniya Pavu Bhaji', 'Fresh authentic pure-veg Lashaniya Pavu Bhaji made to order with traditional Atmiya Hub spices.', 80.0, true, true, 8, NULL, ARRAY['Authentic', 'Pav Bhaji']::text[]),
('6ee472c7-c431-5a0b-8e7e-2c02ccf90652', '11111111-1111-1111-1111-111111111111', '02756470-b931-5406-af21-f462aa99de8f', 'Butter Pavu Bhaji', 'Butter Pavu Bhaji', 'Fresh authentic pure-veg Butter Pavu Bhaji made to order with traditional Atmiya Hub spices.', 80.0, true, true, 8, NULL, ARRAY['Authentic', 'Pav Bhaji']::text[]),
('41bd81ae-4347-5210-a855-3fdba5ccf922', '11111111-1111-1111-1111-111111111111', '02756470-b931-5406-af21-f462aa99de8f', 'Panner Pavu Bhaji', 'Panner Pavu Bhaji', 'Fresh authentic pure-veg Panner Pavu Bhaji made to order with traditional Atmiya Hub spices.', 130.0, true, true, 8, NULL, ARRAY['Authentic', 'Pav Bhaji']::text[]),
('d1ce2c27-f2a8-587b-835a-74d7436520fe', '11111111-1111-1111-1111-111111111111', '02756470-b931-5406-af21-f462aa99de8f', 'Cheese Pavu Bhaji', 'Cheese Pavu Bhaji', 'Fresh authentic pure-veg Cheese Pavu Bhaji made to order with traditional Atmiya Hub spices.', 140.0, true, true, 8, NULL, ARRAY['Authentic', 'Pav Bhaji']::text[]),
('4488e85c-c14b-580d-bed2-9c8463230401', '11111111-1111-1111-1111-111111111111', '02756470-b931-5406-af21-f462aa99de8f', 'Panner Cheese Pavu Bhaji', 'Panner Cheese Pavu Bhaji', 'Fresh authentic pure-veg Panner Cheese Pavu Bhaji made to order with traditional Atmiya Hub spices.', 150.0, true, true, 8, NULL, ARRAY['Authentic', 'Pav Bhaji']::text[]),
('9487c8ec-b791-5ef9-9af1-f17fc2f5a00e', '11111111-1111-1111-1111-111111111111', '02756470-b931-5406-af21-f462aa99de8f', 'Green Pavu Bhaji', 'Green Pavu Bhaji', 'Fresh authentic pure-veg Green Pavu Bhaji made to order with traditional Atmiya Hub spices.', 90.0, true, true, 8, NULL, ARRAY['Authentic', 'Pav Bhaji']::text[]),
('77734c98-6b46-51bc-9d49-c931beb0a0fd', '11111111-1111-1111-1111-111111111111', '02756470-b931-5406-af21-f462aa99de8f', 'Jain Pavu Bhaji', 'Jain Pavu Bhaji', 'Fresh authentic pure-veg Jain Pavu Bhaji made to order with traditional Atmiya Hub spices.', 100.0, true, true, 8, NULL, ARRAY['Authentic', 'Pav Bhaji']::text[]),
('a66f5d90-95d4-5e3e-8e8c-e35c6c823a98', '11111111-1111-1111-1111-111111111111', '02756470-b931-5406-af21-f462aa99de8f', 'Swami Narayan Pavu Bhaji', 'Swami Narayan Pavu Bhaji', 'Fresh authentic pure-veg Swami Narayan Pavu Bhaji made to order with traditional Atmiya Hub spices.', 90.0, true, true, 8, NULL, ARRAY['Authentic', 'Pav Bhaji']::text[]),
('6f9de756-cd27-57ff-b91d-56f5b958dfbb', '11111111-1111-1111-1111-111111111111', '02756470-b931-5406-af21-f462aa99de8f', 'Sp. Atmiya Pavu Bhaji', 'Sp. Atmiya Pavu Bhaji', 'Fresh authentic pure-veg Sp. Atmiya Pavu Bhaji made to order with traditional Atmiya Hub spices.', 160.0, true, true, 8, NULL, ARRAY['Authentic', 'Pav Bhaji']::text[]),
('ca4309cf-8cc6-547d-8f94-714b1e8a9ca4', '11111111-1111-1111-1111-111111111111', 'a55834d2-f940-5f84-b942-d93beebd4ba9', 'Regular Pulav', 'Regular Pulav', 'Fresh authentic pure-veg Regular Pulav made to order with traditional Atmiya Hub spices.', 70.0, true, true, 8, NULL, ARRAY['Authentic', 'Pulav']::text[]),
('a33a724f-36f0-564e-890f-fb38ccfe6b72', '11111111-1111-1111-1111-111111111111', 'a55834d2-f940-5f84-b942-d93beebd4ba9', 'Panner Pulav', 'Panner Pulav', 'Fresh authentic pure-veg Panner Pulav made to order with traditional Atmiya Hub spices.', 90.0, true, true, 8, NULL, ARRAY['Authentic', 'Pulav']::text[]),
('73f03b77-8226-58d3-92a4-10f236e06c39', '11111111-1111-1111-1111-111111111111', 'a55834d2-f940-5f84-b942-d93beebd4ba9', 'Cheese Pulav', 'Cheese Pulav', 'Fresh authentic pure-veg Cheese Pulav made to order with traditional Atmiya Hub spices.', 110.0, true, true, 8, NULL, ARRAY['Authentic', 'Pulav']::text[]),
('5c256d1f-24b1-5b96-9546-61197589b849', '11111111-1111-1111-1111-111111111111', 'a55834d2-f940-5f84-b942-d93beebd4ba9', 'Cheese Panner Pulav', 'Cheese Panner Pulav', 'Fresh authentic pure-veg Cheese Panner Pulav made to order with traditional Atmiya Hub spices.', 120.0, true, true, 8, NULL, ARRAY['Authentic', 'Pulav']::text[]),
('ce183c73-bfcb-5534-bbc2-5ade6a841356', '11111111-1111-1111-1111-111111111111', 'a55834d2-f940-5f84-b942-d93beebd4ba9', 'Butter Pulav', 'Butter Pulav', 'Fresh authentic pure-veg Butter Pulav made to order with traditional Atmiya Hub spices.', 90.0, true, true, 8, NULL, ARRAY['Authentic', 'Pulav']::text[]),
('b46ecd4d-2376-5d0c-a9dc-71dc00369191', '11111111-1111-1111-1111-111111111111', 'a55834d2-f940-5f84-b942-d93beebd4ba9', 'Kashmiri Pulav', 'Kashmiri Pulav', 'Fresh authentic pure-veg Kashmiri Pulav made to order with traditional Atmiya Hub spices.', 120.0, true, true, 8, NULL, ARRAY['Authentic', 'Pulav']::text[]),
('91ee4e27-1fa3-5c23-9b4b-3c9bbeea3fc7', '11111111-1111-1111-1111-111111111111', 'a55834d2-f940-5f84-b942-d93beebd4ba9', 'Hyderabadi Pulav', 'Hyderabadi Pulav', 'Fresh authentic pure-veg Hyderabadi Pulav made to order with traditional Atmiya Hub spices.', 110.0, true, true, 8, NULL, ARRAY['Authentic', 'Pulav']::text[]),
('8d4c5c9e-2109-51dd-ae8e-973146ea4c94', '11111111-1111-1111-1111-111111111111', 'a55834d2-f940-5f84-b942-d93beebd4ba9', 'Palak Pulav', 'Palak Pulav', 'Fresh authentic pure-veg Palak Pulav made to order with traditional Atmiya Hub spices.', 120.0, true, true, 8, NULL, ARRAY['Authentic', 'Pulav']::text[]),
('03497ba4-a438-578f-a539-ebf06fb4e0b7', '11111111-1111-1111-1111-111111111111', 'a55834d2-f940-5f84-b942-d93beebd4ba9', 'Matar Pulav', 'Matar Pulav', 'Fresh authentic pure-veg Matar Pulav made to order with traditional Atmiya Hub spices.', 80.0, true, true, 8, NULL, ARRAY['Authentic', 'Pulav']::text[]),
('4b4abbe5-ecef-5027-b140-cbe125adbe2c', '11111111-1111-1111-1111-111111111111', 'a55834d2-f940-5f84-b942-d93beebd4ba9', 'Palak Kaju Pulav', 'Palak Kaju Pulav', 'Fresh authentic pure-veg Palak Kaju Pulav made to order with traditional Atmiya Hub spices.', 130.0, true, true, 8, NULL, ARRAY['Authentic', 'Pulav']::text[]),
('db5bf348-05c5-5228-8773-cee87f6af917', '11111111-1111-1111-1111-111111111111', 'a55834d2-f940-5f84-b942-d93beebd4ba9', 'Sp. Atmiya Pulav', 'Sp. Atmiya Pulav', 'Fresh authentic pure-veg Sp. Atmiya Pulav made to order with traditional Atmiya Hub spices.', 150.0, true, true, 8, NULL, ARRAY['Authentic', 'Pulav']::text[]),
('cdb94ca0-75f5-5957-b1c9-8b58423e58e6', '11111111-1111-1111-1111-111111111111', 'c1821e13-9586-5b97-a00e-90d2f529c40a', 'Mix Uttapam', 'Mix Uttapam', 'Fresh authentic pure-veg Mix Uttapam made to order with traditional Atmiya Hub spices.', 150.0, true, true, 8, NULL, ARRAY['Authentic', 'Uttapam']::text[]),
('1b5c3b41-fcf1-50d1-9596-480f0c41f3df', '11111111-1111-1111-1111-111111111111', 'c1821e13-9586-5b97-a00e-90d2f529c40a', 'Masala Uttapam', 'Masala Uttapam', 'Fresh authentic pure-veg Masala Uttapam made to order with traditional Atmiya Hub spices.', 150.0, true, true, 8, NULL, ARRAY['Authentic', 'Uttapam']::text[]),
('906d7f55-e53d-5415-94f8-6dac914eadf7', '11111111-1111-1111-1111-111111111111', 'c1821e13-9586-5b97-a00e-90d2f529c40a', 'Cheese Uttapam', 'Cheese Uttapam', 'Fresh authentic pure-veg Cheese Uttapam made to order with traditional Atmiya Hub spices.', 200.0, true, true, 8, NULL, ARRAY['Authentic', 'Uttapam']::text[]),
('e3656c99-f627-5426-8b7e-67686d3666f4', '11111111-1111-1111-1111-111111111111', 'c1821e13-9586-5b97-a00e-90d2f529c40a', 'Cheese Panner Uttapam', 'Cheese Panner Uttapam', 'Fresh authentic pure-veg Cheese Panner Uttapam made to order with traditional Atmiya Hub spices.', 220.0, true, true, 8, NULL, ARRAY['Authentic', 'Uttapam']::text[]),
('9aef6a74-d4d5-5748-b2dd-a379ce466618', '11111111-1111-1111-1111-111111111111', 'c1821e13-9586-5b97-a00e-90d2f529c40a', 'Onion Uttapam', 'Onion Uttapam', 'Fresh authentic pure-veg Onion Uttapam made to order with traditional Atmiya Hub spices.', 160.0, true, true, 8, NULL, ARRAY['Authentic', 'Uttapam']::text[]),
('bfe3c130-c8d7-5422-9b4e-3607ecf2125c', '11111111-1111-1111-1111-111111111111', 'c1821e13-9586-5b97-a00e-90d2f529c40a', 'Sp. Atmiya Uttapam', 'Sp. Atmiya Uttapam', 'Fresh authentic pure-veg Sp. Atmiya Uttapam made to order with traditional Atmiya Hub spices.', 250.0, true, true, 8, NULL, ARRAY['Authentic', 'Uttapam']::text[]),
('834d307b-870a-5658-a7ca-4f2261a015a0', '11111111-1111-1111-1111-111111111111', '7e3de61d-c5d7-59d6-9810-f865894155e3', 'Plain Idali', 'Plain Idali', 'Fresh authentic pure-veg Plain Idali made to order with traditional Atmiya Hub spices.', 40.0, true, true, 8, NULL, ARRAY['Authentic', 'Idali']::text[]),
('37c6f768-5ceb-5e13-ad44-ce725208ebad', '11111111-1111-1111-1111-111111111111', '7e3de61d-c5d7-59d6-9810-f865894155e3', 'Masala Idali', 'Masala Idali', 'Fresh authentic pure-veg Masala Idali made to order with traditional Atmiya Hub spices.', 60.0, true, true, 8, NULL, ARRAY['Authentic', 'Idali']::text[]),
('fd5f68fc-7b67-5e5d-997d-6a57e264871f', '11111111-1111-1111-1111-111111111111', '7e3de61d-c5d7-59d6-9810-f865894155e3', 'Fry Idali', 'Fry Idali', 'Fresh authentic pure-veg Fry Idali made to order with traditional Atmiya Hub spices.', 80.0, true, true, 8, NULL, ARRAY['Authentic', 'Idali']::text[]),
('6d0295db-c9e5-53f2-bca1-8c6c150f4444', '11111111-1111-1111-1111-111111111111', '7e3de61d-c5d7-59d6-9810-f865894155e3', 'Thati Idali', 'Thati Idali', 'Fresh authentic pure-veg Thati Idali made to order with traditional Atmiya Hub spices.', 70.0, true, true, 8, NULL, ARRAY['Authentic', 'Idali']::text[]),
('92fb066a-fe8b-50d9-860c-d6c73f1d62a8', '11111111-1111-1111-1111-111111111111', '7e3de61d-c5d7-59d6-9810-f865894155e3', 'Thati Idali Ghee Puti', 'Thati Idali Ghee Puti', 'Fresh authentic pure-veg Thati Idali Ghee Puti made to order with traditional Atmiya Hub spices.', 100.0, true, true, 8, NULL, ARRAY['Authentic', 'Idali']::text[]),
('b4e584e0-5a39-5a6f-a59b-96137f0ded33', '11111111-1111-1111-1111-111111111111', '0df8a35e-8dd8-5ee9-a3e8-11a8f41e9793', 'Mendu Vada', 'Mendu Vada', 'Fresh authentic pure-veg Mendu Vada made to order with traditional Atmiya Hub spices.', 40.0, true, true, 8, NULL, ARRAY['Authentic', 'Vada & Dhokala']::text[]),
('1cc73903-774a-5066-8ce5-508c2a279260', '11111111-1111-1111-1111-111111111111', '0df8a35e-8dd8-5ee9-a3e8-11a8f41e9793', 'Dahi Vada', 'Dahi Vada', 'Fresh authentic pure-veg Dahi Vada made to order with traditional Atmiya Hub spices.', 40.0, true, true, 8, NULL, ARRAY['Authentic', 'Vada & Dhokala']::text[]),
('578122d5-69cc-5273-bfb8-b694a63eca17', '11111111-1111-1111-1111-111111111111', '0df8a35e-8dd8-5ee9-a3e8-11a8f41e9793', 'Blue Dahi Vada', 'Blue Dahi Vada', 'Fresh authentic pure-veg Blue Dahi Vada made to order with traditional Atmiya Hub spices.', 50.0, true, true, 8, NULL, ARRAY['Authentic', 'Vada & Dhokala']::text[]),
('4b748882-9f93-5005-812c-306c3560da75', '11111111-1111-1111-1111-111111111111', '0df8a35e-8dd8-5ee9-a3e8-11a8f41e9793', 'Dhokala', 'Dhokala', 'Fresh authentic pure-veg Dhokala made to order with traditional Atmiya Hub spices.', 40.0, true, true, 8, NULL, ARRAY['Authentic', 'Vada & Dhokala']::text[]),
('d5dc820f-f9c1-5efc-a080-336b0b47a4a6', '11111111-1111-1111-1111-111111111111', '0df8a35e-8dd8-5ee9-a3e8-11a8f41e9793', 'Fry Dhokala', 'Fry Dhokala', 'Fresh authentic pure-veg Fry Dhokala made to order with traditional Atmiya Hub spices.', 60.0, true, true, 8, NULL, ARRAY['Authentic', 'Vada & Dhokala']::text[]),
('666d45a5-0e08-5d9c-8b24-4d6a25f17b91', '11111111-1111-1111-1111-111111111111', '9ef914d1-4c3d-5aca-bc29-5a997e3bc381', 'Unlimited Masala Dosa', 'Unlimited Masala Dosa', 'Per person; child price 100. Includes masala dosa, peri peri masala dosa, jeera mari masala, onion masala, garlic masala (Gujarati text; verify exact inclusion list).', 130.0, true, true, 10, NULL, ARRAY['Authentic', 'Unlimited - Masala Dosa']::text[]),
('97cb70bb-60d1-5dbc-893d-9a7943936016', '11111111-1111-1111-1111-111111111111', '345be19a-229b-5fb3-be14-0c1e5140506b', 'Unlimited Chinese', 'Unlimited Chinese', 'Per person; child price 110. Includes noodles, Manchurian fry, Manchurian rice, Chinese bhel, Manchaw soup / hot & sour soup (verify exact inclusion list).', 160.0, true, true, 8, NULL, ARRAY['Authentic', 'Unlimited - Chinese']::text[]),
('41c8bef4-37e0-5f71-8366-3c4056612b23', '11111111-1111-1111-1111-111111111111', '3a1e5a2a-8c96-5ce1-aa9f-204424aea1c1', 'Pav Bhaji + Pulav + Cold Drinks', 'Pav Bhaji + Pulav + Cold Drinks', 'Per person; child price 80.', 100.0, true, true, 8, NULL, ARRAY['Authentic', 'Combo']::text[])
ON CONFLICT (id) DO NOTHING;