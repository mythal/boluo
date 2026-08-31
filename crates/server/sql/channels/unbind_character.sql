UPDATE channel_members member
SET character_id = NULL
WHERE member.character_id = $1
RETURNING member AS "member!: ChannelMember";
