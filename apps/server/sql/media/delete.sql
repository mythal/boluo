DELETE
FROM media
WHERE id = $1
RETURNING media as "media!: Media";
