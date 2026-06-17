
ALTER TABLE public.lab_map_contexts
  ADD COLUMN IF NOT EXISTS tile_style text NOT NULL DEFAULT 'osm',
  ADD COLUMN IF NOT EXISTS tile_filters jsonb NOT NULL DEFAULT '{"brightness":100,"contrast":100,"saturate":100,"invert":false,"hueRotate":0}'::jsonb;
