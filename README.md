# Utangs Viewer

A separate read-only React/Vite website for displaying records from the existing Supabase database.

## Setup

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Add these values to `.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Only the Supabase publishable/anon key is used. Do not add a `service_role` key or any secret key to this project.

## Supabase Public Read-Only Policy

Run this in the Supabase SQL Editor. It drops existing public read policies with these names, then recreates read-only public access for the `anon` role.

```sql
alter table public.people enable row level security;
alter table public.payments enable row level security;

drop policy if exists "Public read access for people" on public.people;
drop policy if exists "Public read access for payments" on public.payments;

grant usage on schema public to anon;
grant select on public.people to anon;
grant select on public.payments to anon;

create policy "Public read access for people"
on public.people
for select
to anon
using (true);

create policy "Public read access for payments"
on public.payments
for select
to anon
using (true);
```

This grants read access only. The website does not perform insert, update, delete, or authentication operations.

## Test Steps

1. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local`.
2. Run `npm.cmd run dev`.
3. Open the local Vite URL.
4. Confirm the loading state appears before data loads.
5. Confirm records are grouped into unpaid and paid sections.
6. Confirm each person shows total amount, monthly amount, paid months, total months, remaining balance, and status.
7. Click a person and confirm month details expand.
8. Confirm there are no login, add, edit, or delete controls.
9. Temporarily use an invalid anon key to confirm the error state appears.
10. Check the layout on a narrow mobile-sized screen.
