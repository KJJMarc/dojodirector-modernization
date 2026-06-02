-- Annual Student of the Year awards per club (Kingston Jiu Jitsu Adults).

BEGIN;

CREATE TABLE IF NOT EXISTS public.student_of_the_year_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  year integer NOT NULL,
  student_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_of_the_year_awards_year_check CHECK (year >= 1900 AND year <= 9999)
);

CREATE UNIQUE INDEX IF NOT EXISTS student_of_the_year_awards_club_year_unique_idx
  ON public.student_of_the_year_awards (club_id, year);

CREATE INDEX IF NOT EXISTS student_of_the_year_awards_club_id_idx
  ON public.student_of_the_year_awards (club_id);

COMMENT ON TABLE public.student_of_the_year_awards IS
  'Annual Student of the Year winners displayed on the public academy page.';

ALTER TABLE public.student_of_the_year_awards ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_of_the_year_awards TO service_role;

-- Pre-populate Kingston Jiu Jitsu Adults winners (2014–2025).
INSERT INTO public.student_of_the_year_awards (club_id, year, student_name)
VALUES
  ('a869a3a1-2174-43a5-87d1-3f365f11c68a', 2025, 'Maddie Meatyard'),
  ('a869a3a1-2174-43a5-87d1-3f365f11c68a', 2024, 'Ray Stokes'),
  ('a869a3a1-2174-43a5-87d1-3f365f11c68a', 2023, 'Daniel Lau'),
  ('a869a3a1-2174-43a5-87d1-3f365f11c68a', 2022, 'Mike Lemos'),
  ('a869a3a1-2174-43a5-87d1-3f365f11c68a', 2021, 'Brendan van Rooyen'),
  ('a869a3a1-2174-43a5-87d1-3f365f11c68a', 2020, 'Sandy Doyle'),
  ('a869a3a1-2174-43a5-87d1-3f365f11c68a', 2019, 'Simon Marshall'),
  ('a869a3a1-2174-43a5-87d1-3f365f11c68a', 2018, 'Andreas Wichmann'),
  ('a869a3a1-2174-43a5-87d1-3f365f11c68a', 2017, 'Alan Kentish'),
  ('a869a3a1-2174-43a5-87d1-3f365f11c68a', 2016, 'Yiyang Ng'),
  ('a869a3a1-2174-43a5-87d1-3f365f11c68a', 2015, 'Graham Inman'),
  ('a869a3a1-2174-43a5-87d1-3f365f11c68a', 2014, 'Matt Jardine')
ON CONFLICT (club_id, year) DO NOTHING;

COMMIT;
