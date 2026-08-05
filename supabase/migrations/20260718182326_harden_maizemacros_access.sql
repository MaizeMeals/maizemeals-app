-- RLS protects row operations, but TRUNCATE bypasses RLS. Supabase's default
-- table grants include privileges that MaizeMacros does not need, so keep the
-- API surface to authenticated CRUD only.
revoke all privileges on table public.user_macro_goals from anon;
revoke all privileges on table public.food_logs from anon;
revoke all privileges on table public.user_macro_goals from authenticated;
revoke all privileges on table public.food_logs from authenticated;

grant select, insert, update, delete on table public.user_macro_goals to authenticated;
grant select, insert, update, delete on table public.food_logs to authenticated;

drop policy if exists "Users can read their own macro goals" on public.user_macro_goals;
create policy "Users can read their own macro goals"
  on public.user_macro_goals for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users can create their own macro goals" on public.user_macro_goals;
create policy "Users can create their own macro goals"
  on public.user_macro_goals for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update their own macro goals" on public.user_macro_goals;
create policy "Users can update their own macro goals"
  on public.user_macro_goals for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete their own macro goals" on public.user_macro_goals;
create policy "Users can delete their own macro goals"
  on public.user_macro_goals for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own food log" on public.food_logs;
create policy "Users can read their own food log"
  on public.food_logs for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users can add to their own food log" on public.food_logs;
create policy "Users can add to their own food log"
  on public.food_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update their own food log" on public.food_logs;
create policy "Users can update their own food log"
  on public.food_logs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete from their own food log" on public.food_logs;
create policy "Users can delete from their own food log"
  on public.food_logs for delete to authenticated
  using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
