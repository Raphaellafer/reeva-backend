ALTER TABLE users
    ADD COLUMN IF NOT EXISTS cpf VARCHAR(11),
    ADD COLUMN IF NOT EXISTS phone_country_code VARCHAR(5),
    ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_cpf_unique
    ON users(cpf)
    WHERE cpf IS NOT NULL;
