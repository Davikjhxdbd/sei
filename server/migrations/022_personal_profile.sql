-- Personal profile identity: optimized avatar, expressive preset and short personal line.
alter table users
  add column if not exists avatar_url text,
  add column if not exists profile_emoji text,
  add column if not exists profile_bio varchar(80);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_avatar_url_size_check') then
    alter table users add constraint users_avatar_url_size_check
      check (avatar_url is null or (length(avatar_url) <= 450000 and avatar_url ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$'));
  end if;
end $$;
