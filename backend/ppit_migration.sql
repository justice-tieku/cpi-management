-- PPIT: one designated shepherd, with pastor read-only access to person-level records.
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

CREATE TABLE IF NOT EXISTS public.ppit_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT,
  branch TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.ppit_attendance_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  ppit_member_id TEXT NOT NULL REFERENCES public.ppit_members(id),
  session_date DATE NOT NULL,
  status public.attendance_status NOT NULL,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (ppit_member_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_ppit_members_branch ON public.ppit_members(branch);
CREATE INDEX IF NOT EXISTS idx_ppit_attendance_date ON public.ppit_attendance_records(session_date);
CREATE INDEX IF NOT EXISTS idx_ppit_attendance_member ON public.ppit_attendance_records(ppit_member_id);

ALTER TABLE public.ppit_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppit_attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PPIT roster viewable by pastor and designated shepherd" ON public.ppit_members;
CREATE POLICY "PPIT roster viewable by pastor and designated shepherd"
ON public.ppit_members FOR SELECT TO authenticated
USING (public.is_pastor() OR public.is_ppit_shepherd());

DROP POLICY IF EXISTS "PPIT roster insertable by designated shepherd" ON public.ppit_members;
CREATE POLICY "PPIT roster insertable by designated shepherd"
ON public.ppit_members FOR INSERT TO authenticated
WITH CHECK (public.is_ppit_shepherd());

DROP POLICY IF EXISTS "PPIT roster updatable by designated shepherd" ON public.ppit_members;
CREATE POLICY "PPIT roster updatable by designated shepherd"
ON public.ppit_members FOR UPDATE TO authenticated
USING (public.is_ppit_shepherd())
WITH CHECK (public.is_ppit_shepherd());

DROP POLICY IF EXISTS "PPIT attendance viewable by pastor and designated shepherd" ON public.ppit_attendance_records;
CREATE POLICY "PPIT attendance viewable by pastor and designated shepherd"
ON public.ppit_attendance_records FOR SELECT TO authenticated
USING (public.is_pastor() OR public.is_ppit_shepherd());

DROP POLICY IF EXISTS "PPIT attendance insertable by designated shepherd" ON public.ppit_attendance_records;
CREATE POLICY "PPIT attendance insertable by designated shepherd"
ON public.ppit_attendance_records FOR INSERT TO authenticated
WITH CHECK (public.is_ppit_shepherd() AND recorded_by = auth.uid());

DROP POLICY IF EXISTS "PPIT attendance updatable by designated shepherd" ON public.ppit_attendance_records;
CREATE POLICY "PPIT attendance updatable by designated shepherd"
ON public.ppit_attendance_records FOR UPDATE TO authenticated
USING (public.is_ppit_shepherd())
WITH CHECK (public.is_ppit_shepherd() AND recorded_by = auth.uid());

REVOKE ALL ON public.ppit_members, public.ppit_attendance_records FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ppit_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ppit_attendance_records TO authenticated;

INSERT INTO public.ppit_members (id, name, branch) VALUES
  ('PPIT-001', 'REV FESTUS AGYEI SARFO', 'Legon'),
  ('PPIT-002', 'DANIEL DEGBE', 'Legon'),
  ('PPIT-003', 'DANIEL NKANSAH', 'Legon'),
  ('PPIT-004', 'AUGUSTUS SECHIE', 'Labadi'),
  ('PPIT-005', 'EMMANUEL DANSO', 'Dansoman'),
  ('PPIT-006', 'LINDA AGYEI SARFO', 'Legon'),
  ('PPIT-007', 'EDNA SECHIE', 'Labadi'),
  ('PPIT-008', 'SYLVIA TAWIAH TETTEH', 'Legon'),
  ('PPIT-009', 'THEOPHILUS OFORI', 'Legon'),
  ('PPIT-010', 'GABRIEL TETTEH', 'Legon'),
  ('PPIT-011', 'DESMOND ALAGBO', 'Legon'),
  ('PPIT-012', 'CHRISTINE AGYEI', 'Legon'),
  ('PPIT-013', 'GODWIN EDUSEI', 'Legon'),
  ('PPIT-014', 'KARIN SOWAH', 'Legon'),
  ('PPIT-015', 'JUSTICE TIEKU', 'Legon'),
  ('PPIT-016', 'DIVINE BANNERMAN', 'Legon'),
  ('PPIT-017', 'ABIGAIL ASIEDU EFI', 'Legon'),
  ('PPIT-018', 'JOYCELYN ASANTE', 'Legon'),
  ('PPIT-019', 'FREDRICK QUANSAH', 'Legon'),
  ('PPIT-020', 'MICHAEL JACKSON', 'Legon'),
  ('PPIT-021', 'RHODA DOODO', 'Legon'),
  ('PPIT-022', 'TAGOE SOLOMON', 'Legon'),
  ('PPIT-023', 'FRANCISCA ESHUN', 'Legon'),
  ('PPIT-024', 'SAMUEL MAWULI AMETOR', 'Legon'),
  ('PPIT-025', 'SELASIE JUNIOR DORDZI', 'Legon'),
  ('PPIT-026', 'RUBY POKUAA AGYEMAN', 'Legon'),
  ('PPIT-027', 'EPHRAIM KANU', 'Legon'),
  ('PPIT-028', 'ASEYE AMENYAH', 'Legon'),
  ('PPIT-029', 'PRECIOUS AIDOO', 'Legon'),
  ('PPIT-030', 'PRINCESS AMISSAH', 'Legon'),
  ('PPIT-031', 'MATILDA CLINTON', 'Dansoman'),
  ('PPIT-032', 'BLESSING AGBETIAMEH', 'Dansoman'),
  ('PPIT-033', 'JANET ABUGRI', 'Dansoman'),
  ('PPIT-034', 'DANIEL AMEDOR', 'Dansoman'),
  ('PPIT-035', 'ABDUL-KARIM MOHAMMED', 'Dansoman'),
  ('PPIT-036', 'ISAAC ACQUAH', 'Dansoman'),
  ('PPIT-037', 'JANET NADDEL OFOE', 'Dansoman'),
  ('PPIT-038', 'AUGUSTINE BOATENG', 'Dansoman'),
  ('PPIT-039', 'EMMANUEL ASARE', 'Dansoman'),
  ('PPIT-040', 'DENNIS LARSEY', 'Dansoman'),
  ('PPIT-041', 'JENNIFER AMEVOR', 'Dansoman'),
  ('PPIT-042', 'CLIFFORD APPIAGYEI', 'Dansoman'),
  ('PPIT-043', 'CHRISTIAN BINEY', 'Dansoman'),
  ('PPIT-044', 'EMMANUEL ACQUAH', 'Dansoman'),
  ('PPIT-045', 'ESTHER CLINTON', 'Dansoman'),
  ('PPIT-046', 'STEPHEN GYAN', 'Dansoman'),
  ('PPIT-047', 'SHADRACH MENSAH', 'Labadi'),
  ('PPIT-048', 'HARRIET GYAMFI', 'Labadi'),
  ('PPIT-049', 'ALEX CUDJOE', 'Labadi')
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ppit_members; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ppit_attendance_records; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ppit_summary; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
