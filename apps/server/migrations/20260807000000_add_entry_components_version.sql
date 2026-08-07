ALTER TABLE entries
ADD COLUMN components_version uuid NOT NULL DEFAULT uuidv7();
