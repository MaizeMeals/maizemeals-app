-- MaizeMacros persists only the user's selected goal and editable daily
-- nutrition targets. Calculator inputs stay inside the browser session.
comment on table public.user_macro_goals is
  'User-selected MaizeMacros goal and editable daily nutrition targets.';

notify pgrst, 'reload schema';
