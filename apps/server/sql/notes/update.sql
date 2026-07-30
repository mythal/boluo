UPDATE notes
SET title = $4,
    keywords = $5,
    tags = $6,
    text = $7,
    entities = $8,
    access_policy = ($9::text)::access_policy,
    access_channel_id = $10,
    revision = revision + 1,
    modified = now()
WHERE space_id = $1
  AND id = $2
  AND revision = $3
  AND archived_at IS NULL
RETURNING revision;
