-- In-app feedback. Anyone can send it (guests too); the server writes it with
-- the service role after validating and rate-limiting, and only admins read it.
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null default 'other' check (kind in ('idea', 'bug', 'praise', 'other')),
  message text not null check (char_length(message) between 1 and 2000),
  contact_email text check (contact_email is null or char_length(contact_email) <= 254),
  page_path text check (page_path is null or char_length(page_path) <= 300),
  user_agent text check (user_agent is null or char_length(user_agent) <= 400),
  is_installed boolean not null default false,
  source text not null default 'link' check (source in ('link', 'prompt', 'settings')),
  -- sha256(ip + server secret): lets us rate-limit without storing the address.
  client_hash text,
  status text not null default 'new' check (status in ('new', 'read', 'done', 'archived')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 2000)
);

create index feedback_created_at_idx on public.feedback (created_at desc);
create index feedback_status_idx on public.feedback (status, created_at desc);
create index feedback_client_hash_idx on public.feedback (client_hash, created_at desc);
create index feedback_user_id_idx on public.feedback (user_id);

-- No policies: anon and authenticated can neither read nor write directly.
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;
