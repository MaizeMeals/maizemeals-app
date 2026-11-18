-- Account deletion: storage.objects has no FK to auth.users, so deleting a user
-- leaves their uploaded photos behind (including orphans with no photos row).
-- The delete-account server action calls this with the service role to find
-- every object the user owns, removes them via the Storage API (SQL deletes on
-- storage.objects are blocked), then deletes the auth user (which cascades to
-- profiles, ratings, photos, food logs, macro goals and favorites).
create or replace function public.storage_objects_owned_by(target_user uuid)
returns table (bucket_id text, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.bucket_id, o.name
  from storage.objects o
  where o.owner = target_user or o.owner_id = target_user::text;
$$;

revoke execute on function public.storage_objects_owned_by(uuid) from public, anon, authenticated;
grant execute on function public.storage_objects_owned_by(uuid) to service_role;

notify pgrst, 'reload schema';
