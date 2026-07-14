/*
# Add extended employee profile fields

## Summary
Adds additional employee fields to the `profiles` table to support the full
"Add New Employee" form: gender, date of birth, marital status, nationality,
home address, emergency contact name/phone, bank account info, employment type,
and employment status.

## Changes
### Modified table: `profiles`
New columns:
- `gender` (text) — male, female, other
- `date_of_birth` (date)
- `marital_status` (text) — single, married, divorced, widowed
- `nationality` (text)
- `home_address` (text)
- `emergency_contact_name` (text)
- `emergency_contact_phone` (text)
- `bank_name` (text)
- `bank_account_number` (text)
- `employment_type` (text) — full_time, part_time, contract, intern
- `employment_status` (text) — active, on_leave, terminated, probation
- `avatar_url` already exists

## Security
No policy changes — existing RLS policies on `profiles` already cover these columns.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gender text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS date_of_birth date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS marital_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nationality text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS home_address text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_account_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS employment_type text DEFAULT 'full_time',
  ADD COLUMN IF NOT EXISTS employment_status text DEFAULT 'active';
