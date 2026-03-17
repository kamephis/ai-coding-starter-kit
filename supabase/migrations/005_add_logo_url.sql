-- Add logo_url field to widget_config for company branding
ALTER TABLE widget_config ADD COLUMN IF NOT EXISTS logo_url text;
