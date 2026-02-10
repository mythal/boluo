CREATE INDEX IF NOT EXISTS "space_members_space_id_index" ON "space_members" ("space_id");
CREATE INDEX IF NOT EXISTS "channel_members_channel_id_is_joined_index" ON "channel_members" ("channel_id", "is_joined");
