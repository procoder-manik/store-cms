-- =====================================================================
-- 0008 SEO REDIRECTS (public read for middleware) + 404 LOG + CHAT HELPERS
-- =====================================================================
create policy "public_redirects" on redirects for select using (true);

-- Count 404s without exposing the table (called with the anon key)
create or replace function public.log_not_found(p_path text)
returns void language sql security definer set search_path = public as $$
  insert into not_found_logs (path) values (left(p_path, 300))
  on conflict (path) do update set hits = not_found_logs.hits + 1, last_seen_at = now();
$$;
grant execute on function public.log_not_found(text) to anon, authenticated;

create or replace function public.count_redirect_hit(p_from text)
returns void language sql security definer set search_path = public as $$
  update redirects set hits = hits + 1 where from_path = p_from;
$$;
grant execute on function public.count_redirect_hit(text) to anon, authenticated;

create index if not exists chat_messages_user_idx on chat_messages (created_at desc) where role = 'user';
