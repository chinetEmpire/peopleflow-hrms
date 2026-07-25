-- Add human-readable location name fields for check-in and check-out
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS check_in_location text,
  ADD COLUMN IF NOT EXISTS check_out_location text;
