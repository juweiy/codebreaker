alter table games alter column status drop default;

create type game_status_active_archive as enum ('active', 'archived');

alter table games
  alter column status type game_status_active_archive
  using (
    case
      when status::text = 'archived' then 'archived'
      else 'active'
    end
  )::game_status_active_archive;

drop type game_status;
alter type game_status_active_archive rename to game_status;

alter table games alter column status set default 'active';
