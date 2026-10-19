-- Helpers used only by Edge Functions (service role).
create or replace function public.increment_proof_usage(p_entry_id uuid, p_user_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.proof_entries set used_count = used_count + 1 where id = p_entry_id and user_id = p_user_id;
$$;
revoke execute on function public.increment_proof_usage(uuid, uuid) from public, anon, authenticated;
