begin;
create table public.sold_vehicle_archive (
 vehicle_id uuid primary key references public.vehicles(id) on delete cascade,
 store_id uuid not null references public.stores(id),
 vehicle_snapshot jsonb not null,
 archived_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.sold_vehicle_archive enable row level security;
create policy sold_vehicle_archive_access on public.sold_vehicle_archive
 for all to authenticated
 using (exists(select 1 from public.store_members m where m.store_id=sold_vehicle_archive.store_id and m.user_id=(select auth.uid())))
 with check (exists(select 1 from public.store_members m where m.store_id=sold_vehicle_archive.store_id and m.user_id=(select auth.uid())));
revoke all on public.sold_vehicle_archive from anon;
grant select,insert,update,delete on public.sold_vehicle_archive to authenticated;
create function public.sync_sold_vehicle_archive() returns trigger
 language plpgsql security invoker set search_path=public as $$
begin
 if new.status::text='sold' then
  insert into public.sold_vehicle_archive(vehicle_id,store_id,vehicle_snapshot)
  values(new.id,new.store_id,to_jsonb(new))
  on conflict(vehicle_id) do update set store_id=excluded.store_id,vehicle_snapshot=excluded.vehicle_snapshot,updated_at=now();
 else
  delete from public.sold_vehicle_archive where vehicle_id=new.id;
 end if;
 return new;
end $$;
revoke all on function public.sync_sold_vehicle_archive() from public,anon,authenticated;
create trigger sync_sold_vehicle_archive after insert or update on public.vehicles
 for each row execute function public.sync_sold_vehicle_archive();
insert into public.sold_vehicle_archive(vehicle_id,store_id,vehicle_snapshot)
 select id,store_id,to_jsonb(v) from public.vehicles v where status::text='sold';
create view public.sold_vehicle_inventory with (security_invoker=true) as
 select v.* from public.vehicles v join public.sold_vehicle_archive a on a.vehicle_id=v.id and a.store_id=v.store_id where v.status::text='sold';
revoke all on public.sold_vehicle_inventory from anon;
grant select on public.sold_vehicle_inventory to authenticated;
commit;
