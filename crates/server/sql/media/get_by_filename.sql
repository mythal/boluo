SELECT
    media AS "media!: Media"
FROM
    media
WHERE
    filename = $1
LIMIT 1;

