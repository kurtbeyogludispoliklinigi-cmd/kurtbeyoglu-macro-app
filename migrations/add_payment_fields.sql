-- Add payment tracking columns to treatments table if they don't exist

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'treatments' AND column_name = 'payment_status') THEN
        ALTER TABLE treatments ADD COLUMN payment_status text DEFAULT 'pending'; -- pending, paid, partial
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'treatments' AND column_name = 'payment_amount') THEN
        ALTER TABLE treatments ADD COLUMN payment_amount numeric DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'treatments' AND column_name = 'payment_note') THEN
        ALTER TABLE treatments ADD COLUMN payment_note text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'treatments' AND column_name = 'payment_date') THEN
        ALTER TABLE treatments ADD COLUMN payment_date timestamp with time zone;
    END IF;
END $$;
