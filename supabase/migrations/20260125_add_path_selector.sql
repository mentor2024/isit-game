-- Add path_selector_config to level_configurations
alter table public.level_configurations
add column if not exists path_selector_config jsonb default '{}'::jsonb;
