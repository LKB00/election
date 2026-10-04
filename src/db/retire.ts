import { sql } from 'drizzle-orm';
import type { Db } from '.';

// Every poll on Election is made by a person (owner, Oct 2026: "the app will not generate polls, all user created").
// The site used to add its own: the "Modi or Rahul?" flagship and four starter polls. This hides them once, the first
// time a server starts with this code (votes are kept; the owner can "Show again" one on /admin). The marker row in
// app_migrations stops it from running again, so a poll the owner shows again stays shown.
export const SEEDED_IDS = ['modi-vs-rahul', 'virat-rohit-dhoni', 'ipl-2027-winner', 'up-2027', 'chai-or-coffee'];

export async function retireSeeded(db: Db) {
  await db.execute(sql`create table if not exists app_migrations (name text primary key, ran_at timestamptz not null default now())`);
  await db.execute(sql`
    with m as (insert into app_migrations (name) values ('retire-seeded-polls') on conflict do nothing returning name)
    update polls set hidden = true, featured = false
    where id in (${sql.join(SEEDED_IDS.map((id) => sql`${id}`), sql`, `)}) and exists (select 1 from m)`);
}
