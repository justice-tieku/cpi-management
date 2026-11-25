ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Male', 'Female'));

ALTER TABLE public.ppit_members
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Male', 'Female'));
