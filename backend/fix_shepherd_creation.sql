
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role, assigned_cell)
    VALUES (
        new.id,
        new.email,
        COALESCE(NULLIF(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)),
        COALESCE(NULLIF(new.raw_user_meta_data->>'role', '')::public.user_role, 'shepherd'::public.user_role),
        NULLIF(new.raw_user_meta_data->>'assigned_cell', '')
    )
    ON CONFLICT (email) DO UPDATE SET
        id = EXCLUDED.id,
        name = COALESCE(EXCLUDED.name, public.profiles.name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        assigned_cell = COALESCE(EXCLUDED.assigned_cell, public.profiles.assigned_cell),
        updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure shepherd_assignments has an RLS policy so member reassignments succeed
DROP POLICY IF EXISTS "Shepherd assignments manageable by pastor or shepherd" ON public.shepherd_assignments;
CREATE POLICY "Shepherd assignments manageable by pastor or shepherd"
ON public.shepherd_assignments FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);
