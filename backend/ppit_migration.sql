-- PPIT: one designated shepherd, with pastor-visible aggregate summaries.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_ppit_shepherd BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_one_ppit_shepherd
  ON public.profiles (is_ppit_shepherd)
  WHERE is_ppit_shepherd = true;

CREATE TABLE IF NOT EXISTS public.ppit_summary (
  session_date DATE PRIMARY KEY,
  present_count INTEGER NOT NULL DEFAULT 0,
  absent_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  recorded_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.ppit_summary ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_ppit_shepherd()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'shepherd'
      AND is_ppit_shepherd = true
  );
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Attendance viewable by pastor or cell shepherd" ON public.attendance_records;
CREATE POLICY "Attendance viewable by pastor or cell shepherd"
ON public.attendance_records FOR SELECT TO anon, authenticated
USING (
  (service_category <> 'ppit' AND (public.is_pastor() OR shepherd_id = auth.uid() OR cell_group = public.get_assigned_cell()))
  OR
  (service_category = 'ppit' AND (public.is_ppit_shepherd() AND shepherd_id = auth.uid()))
);

DROP POLICY IF EXISTS "Attendance manageable by pastor or cell shepherd" ON public.attendance_records;
CREATE POLICY "Attendance manageable by pastor or cell shepherd"
ON public.attendance_records FOR ALL TO anon, authenticated
USING (
  (service_category <> 'ppit' AND (public.is_pastor() OR shepherd_id = auth.uid() OR cell_group = public.get_assigned_cell()))
  OR
  (service_category = 'ppit' AND public.is_ppit_shepherd() AND shepherd_id = auth.uid())
)
WITH CHECK (
  (service_category <> 'ppit' AND (public.is_pastor() OR shepherd_id = auth.uid() OR cell_group = public.get_assigned_cell()))
  OR
  (service_category = 'ppit' AND public.is_ppit_shepherd() AND shepherd_id = auth.uid())
);

DROP POLICY IF EXISTS "PPIT summary visible to pastor and designated shepherd" ON public.ppit_summary;
CREATE POLICY "PPIT summary visible to pastor and designated shepherd"
ON public.ppit_summary FOR SELECT TO anon, authenticated
USING (public.is_pastor() OR public.is_ppit_shepherd());

DROP POLICY IF EXISTS "PPIT summary writable by designated shepherd" ON public.ppit_summary;
CREATE POLICY "PPIT summary writable by designated shepherd"
ON public.ppit_summary FOR ALL TO anon, authenticated
USING (public.is_ppit_shepherd())
WITH CHECK (public.is_ppit_shepherd());
