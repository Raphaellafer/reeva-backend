ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS policy_text TEXT;
