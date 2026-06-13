-- Kingston Jiu Jitsu trial enquiry Google Ads conversion label.
-- Fires gtag conversion send_to AW-846017609/i0ZxCIWfqb4cEMnotJMD after successful enquiry.

UPDATE public.clubs
SET google_ads_conversion_label = 'i0ZxCIWfqb4cEMnotJMD'
WHERE slug = 'kingston-jiu-jitsu'
  AND google_tag_id = 'AW-846017609';
