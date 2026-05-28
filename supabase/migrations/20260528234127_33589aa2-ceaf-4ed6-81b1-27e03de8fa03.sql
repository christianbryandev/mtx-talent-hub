CREATE OR REPLACE FUNCTION public.increment_module_indices(_phase_id UUID, _start_index INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.journey_modules
    SET order_index = order_index + 1
    WHERE phase_id = _phase_id AND order_index >= _start_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_module_indices(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_module_indices(UUID, INTEGER) TO service_role;