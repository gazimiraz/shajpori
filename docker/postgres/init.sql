-- Shaj Ecom Database Initialization
-- Creates additional databases for testing

CREATE DATABASE shaj_ecom_test;
GRANT ALL PRIVILEGES ON DATABASE shaj_ecom_test TO postgres;

-- Enable extensions
\c shaj_ecom;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

\c shaj_ecom_test;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
