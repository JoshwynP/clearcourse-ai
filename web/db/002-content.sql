-- Apply as the content-only runtime database role. It must not have SELECT
-- privileges on public.user, public.account, identity.profile, or membership.
begin;
create schema if not exists content;
create table if not exists content.board (
  course_id text primary key,
  state jsonb not null
);
commit;
