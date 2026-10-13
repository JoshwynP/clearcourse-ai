-- Apply to an empty PostgreSQL database before deploying the Next.js app.
-- The Better Auth tables use its documented PostgreSQL column names.
begin;
create schema if not exists identity;

create table if not exists public."user" (
  id text primary key,
  name text not null,
  email text not null unique,
  "emailVerified" boolean not null default false,
  image text,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null
);
create table if not exists public."session" (
  id text primary key,
  "userId" text not null references public."user"(id) on delete cascade,
  token text not null unique,
  "expiresAt" timestamptz not null,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null
);
create index if not exists session_user_idx on public."session"("userId");
create table if not exists public."account" (
  id text primary key,
  "userId" text not null references public."user"(id) on delete cascade,
  "accountId" text not null,
  "providerId" text not null,
  "accessToken" text,
  "refreshToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  "idToken" text,
  password text,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  unique ("providerId", "accountId")
);
create index if not exists account_user_idx on public."account"("userId");
create table if not exists public."verification" (
  id text primary key,
  identifier text not null,
  value text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null
);

create table if not exists identity.profile (
  user_id text primary key references public."user"(id) on delete cascade,
  role text not null check (role in ('student', 'instructor')),
  vote_key text not null,
  created_at timestamptz not null default now()
);
create table if not exists identity.course (
  id text primary key,
  code text not null,
  name text not null,
  join_code text not null unique,
  instructor_id text not null references public."user"(id),
  card jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists identity.membership (
  course_id text not null references identity.course(id) on delete cascade,
  user_id text not null references public."user"(id) on delete cascade,
  primary key (course_id, user_id)
);
create index if not exists membership_user_idx on identity.membership(user_id);
create table if not exists identity.login_attempt (
  email_key text primary key,
  started_at timestamptz not null,
  attempts integer not null
);
commit;
