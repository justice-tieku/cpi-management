ALTER TABLE public.visitors
  ADD COLUMN IF NOT EXISTS linked_member_id TEXT REFERENCES public.members(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.visitor_attendance_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  visitor_id TEXT NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status public.attendance_status NOT NULL CHECK (status IN ('Present', 'Absent')),
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (visitor_id, attendance_date)
);

ALTER TABLE public.visitor_attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Visitor attendance viewable by pastor or assigned shepherd" ON public.visitor_attendance_records;
CREATE POLICY "Visitor attendance viewable by pastor or assigned shepherd"
ON public.visitor_attendance_records FOR SELECT TO authenticated
USING (
  public.is_pastor() OR EXISTS (
    SELECT 1 FROM public.visitors v
    WHERE v.id = visitor_id AND v.assigned_shepherd_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Visitor attendance insertable by pastor or assigned shepherd" ON public.visitor_attendance_records;
CREATE POLICY "Visitor attendance insertable by pastor or assigned shepherd"
ON public.visitor_attendance_records FOR INSERT TO authenticated
WITH CHECK (
  public.is_pastor() OR EXISTS (
    SELECT 1 FROM public.visitors v
    WHERE v.id = visitor_id AND v.assigned_shepherd_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Visitor attendance updatable by pastor or assigned shepherd" ON public.visitor_attendance_records;
CREATE POLICY "Visitor attendance updatable by pastor or assigned shepherd"
ON public.visitor_attendance_records FOR UPDATE TO authenticated
USING (
  public.is_pastor() OR EXISTS (
    SELECT 1 FROM public.visitors v
    WHERE v.id = visitor_id AND v.assigned_shepherd_id = auth.uid()
  )
)
WITH CHECK (
  public.is_pastor() OR EXISTS (
    SELECT 1 FROM public.visitors v
    WHERE v.id = visitor_id AND v.assigned_shepherd_id = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE ON public.visitor_attendance_records TO authenticated;

DROP POLICY IF EXISTS "Members deletable by pastor only" ON public.members;
DROP POLICY IF EXISTS "Members deletable by pastor or cell shepherd" ON public.members;
CREATE POLICY "Members deletable by pastor or cell shepherd"
ON public.members FOR DELETE TO authenticated
USING (
  public.is_pastor() OR
  current_shepherd_id = auth.uid() OR
  cell_group = public.get_assigned_cell()
);

ALTER TABLE public.ppit_attendance_records
  DROP CONSTRAINT IF EXISTS ppit_attendance_records_ppit_member_id_fkey;
ALTER TABLE public.ppit_attendance_records
  ADD CONSTRAINT ppit_attendance_records_ppit_member_id_fkey
  FOREIGN KEY (ppit_member_id) REFERENCES public.ppit_members(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "PPIT roster deletable by designated shepherd" ON public.ppit_members;
CREATE POLICY "PPIT roster deletable by designated shepherd"
ON public.ppit_members FOR DELETE TO authenticated
USING (public.is_ppit_shepherd());

GRANT DELETE ON public.ppit_members TO authenticated;
