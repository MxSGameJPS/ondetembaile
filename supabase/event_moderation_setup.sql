-- Event moderation support
-- Run this script in the Supabase SQL editor before deploying the application changes.

alter table public.events
  add column if not exists rejection_is_permanent boolean not null default false;

comment on column public.events.rejection_is_permanent is
  'When true, the producer cannot edit/resubmit the rejected event. Only an administrator can change its moderation status.';
