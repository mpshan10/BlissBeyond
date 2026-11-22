-- Convert the imported MySQL enum types to the string columns used by JPA.
BEGIN;
ALTER TABLE public.addons ALTER COLUMN billing_type TYPE varchar(20) USING billing_type::text;
ALTER TABLE public.bookings ALTER COLUMN booking_type TYPE varchar(20) USING booking_type::text,
                            ALTER COLUMN status TYPE varchar(30) USING status::text;
ALTER TABLE public.consultations ALTER COLUMN status TYPE varchar(30) USING status::text;
ALTER TABLE public.events ALTER COLUMN status TYPE varchar(40) USING status::text;
ALTER TABLE public.package_booking_snapshots ALTER COLUMN category TYPE varchar(30) USING category::text;
ALTER TABLE public.packages ALTER COLUMN category TYPE varchar(30) USING category::text;
ALTER TABLE public.payments ALTER COLUMN payment_type TYPE varchar(20) USING payment_type::text,
                            ALTER COLUMN payment_status TYPE varchar(30) USING payment_status::text;
ALTER TABLE public.quotations ALTER COLUMN status TYPE varchar(40) USING status::text;
ALTER TABLE public.roles ALTER COLUMN name TYPE varchar(40) USING name::text;
COMMIT;
