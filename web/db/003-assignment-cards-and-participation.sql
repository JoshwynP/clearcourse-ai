-- Apply to the existing identity database. This is practice-account data only.
begin;
create table if not exists identity.assignment_card (
  id text primary key,
  course_id text not null references identity.course(id) on delete cascade,
  identifier text not null,
  title text not null,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  updated_at timestamptz not null default now(),
  unique (course_id, identifier)
);
create index if not exists assignment_card_course_idx on identity.assignment_card(course_id);

create table if not exists identity.participation (
  course_id text not null,
  user_id text not null,
  questions integer not null default 0 check (questions >= 0),
  comments integer not null default 0 check (comments >= 0),
  upvotes integer not null default 0 check (upvotes >= 0),
  shared_at timestamptz,
  primary key (course_id, user_id),
  foreign key (course_id, user_id) references identity.membership(course_id, user_id) on delete cascade
);
commit;
