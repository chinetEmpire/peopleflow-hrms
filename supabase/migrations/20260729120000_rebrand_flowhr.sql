-- Rebrand default organization to flowHR
UPDATE organizations
SET name = 'flowHR',
    slug = 'flowhr',
    display_name = 'flowHR'
WHERE id = '00000000-0000-0000-0000-000000000001';