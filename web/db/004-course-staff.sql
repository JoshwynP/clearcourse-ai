-- Apply to the identity database before deploying course staff controls.
begin;
create table if not exists identity.course_staff (
  course_id text not null references identity.course(id) on delete cascade,
  user_id text not null references public."user"(id) on delete cascade,
  role text not null check (role in ('professor', 'ta')),
  had_membership boolean not null default false,
  added_at timestamptz not null default now(),
  primary key (course_id, user_id)
);
create index if not exists course_staff_user_idx on identity.course_staff(user_id);
commit;
