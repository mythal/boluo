SELECT
    media AS "media!: Media"
FROM
    media
WHERE
    id = $1
LIMIT 1;

