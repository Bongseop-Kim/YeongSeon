delete from public.design_chat_sessions
where repeat_tile_url is null
   or repeat_tile_work_id is null;
