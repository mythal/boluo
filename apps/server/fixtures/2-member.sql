-- Members and channel memberships for spaces and channels
-- Character names represent in-game personas; empty string when OOC/no character.
-- Uses ON CONFLICT to allow re-running fixtures safely.

-- =========================
-- Space memberships
-- =========================

-- 星落王国
INSERT INTO public.space_members (user_id, space_id, is_admin)
VALUES
  ('026c7b78-071f-4b1d-8744-35f522be3962', 'a400dd6f-c26c-4849-bdfb-74b67154ab28', true),  -- GM Luna
  ('8020002a-ba14-4912-80f9-de7399ef2b36', 'a400dd6f-c26c-4849-bdfb-74b67154ab28', false), -- mossyroad
  ('68e8485b-3b45-4471-8e1a-7818e2e06ece', 'a400dd6f-c26c-4849-bdfb-74b67154ab28', false), -- citrus_soda
  ('043172b0-d742-4a36-a70b-366f47ac9238', 'a400dd6f-c26c-4849-bdfb-74b67154ab28', false), -- joe_is_joe
  ('ac3bdce5-3210-4ab3-bb49-049de31177c3', 'a400dd6f-c26c-4849-bdfb-74b67154ab28', false), -- blueweekday
  ('1e0650f3-90e0-4561-aecd-158f19b48dda', 'a400dd6f-c26c-4849-bdfb-74b67154ab28', false), -- halfdecaf
  ('e98f79dd-dd50-4393-abcd-cee3dc5371d1', 'a400dd6f-c26c-4849-bdfb-74b67154ab28', false), -- reading_2025
  ('2f4058ea-cb9f-4020-9cea-ffe9508f61a5', 'a400dd6f-c26c-4849-bdfb-74b67154ab28', false), -- late_to_bus
  ('f6254e0a-2467-4a64-a303-af0579a28b70', 'a400dd6f-c26c-4849-bdfb-74b67154ab28', false), -- not_a_robot
  ('35920741-50f7-476e-a0bc-6555a2f849fc', 'a400dd6f-c26c-4849-bdfb-74b67154ab28', false)  -- geiger_low
ON CONFLICT (user_id, space_id) DO NOTHING;

-- 霓虹学园
INSERT INTO public.space_members (user_id, space_id, is_admin)
VALUES
  ('026c7b78-071f-4b1d-8744-35f522be3962', '2d7c2985-cb47-4912-a3cd-3966d347ced6', true),  -- GM Luna
  ('68e8485b-3b45-4471-8e1a-7818e2e06ece', '2d7c2985-cb47-4912-a3cd-3966d347ced6', false), -- citrus_soda
  ('ac3bdce5-3210-4ab3-bb49-049de31177c3', '2d7c2985-cb47-4912-a3cd-3966d347ced6', false), -- blueweekday
  ('1e0650f3-90e0-4561-aecd-158f19b48dda', '2d7c2985-cb47-4912-a3cd-3966d347ced6', false), -- halfdecaf
  ('8ccbdc2f-050c-4d1b-9fa6-6c864c51f19a', '2d7c2985-cb47-4912-a3cd-3966d347ced6', false), -- cloudberry
  ('33490760-851e-474f-88cc-7c63f34a5e7d', '2d7c2985-cb47-4912-a3cd-3966d347ced6', false), -- paperplane
  ('a48ce39a-2824-41b8-8613-4bebd84cfb3c', '2d7c2985-cb47-4912-a3cd-3966d347ced6', false), -- midnight_ramen
  ('41ccf774-ad1f-4d4b-9ecd-0ceddd8caee5', '2d7c2985-cb47-4912-a3cd-3966d347ced6', false), -- tea_and_code
  ('5458e4c4-b9bb-4df7-bfad-3f97ffce35ab', '2d7c2985-cb47-4912-a3cd-3966d347ced6', false), -- daily_typo
  ('e2b90df5-2ed0-45b3-9a7e-b867884a6163', '2d7c2985-cb47-4912-a3cd-3966d347ced6', false), -- dawn_runner
  ('6e56af33-8d56-4817-bb7f-1dbb4d40216a', '2d7c2985-cb47-4912-a3cd-3966d347ced6', false), -- slow_piano
  ('0207f80d-c02f-4483-88a6-791de3865fea', '2d7c2985-cb47-4912-a3cd-3966d347ced6', false)  -- mono_chrome
ON CONFLICT (user_id, space_id) DO NOTHING;

-- 雾港疑云
INSERT INTO public.space_members (user_id, space_id, is_admin)
VALUES
  ('026c7b78-071f-4b1d-8744-35f522be3962', 'd72d44be-d71f-4e5a-a678-f8aeaa6d8c63', true),  -- GM Luna
  ('043172b0-d742-4a36-a70b-366f47ac9238', 'd72d44be-d71f-4e5a-a678-f8aeaa6d8c63', false), -- joe_is_joe
  ('e98f79dd-dd50-4393-abcd-cee3dc5371d1', 'd72d44be-d71f-4e5a-a678-f8aeaa6d8c63', false), -- reading_2025
  ('35920741-50f7-476e-a0bc-6555a2f849fc', 'd72d44be-d71f-4e5a-a678-f8aeaa6d8c63', false), -- geiger_low
  ('d0f95538-fab3-4664-8218-e5593a35c465', 'd72d44be-d71f-4e5a-a678-f8aeaa6d8c63', false), -- napping_cat
  ('e2b90df5-2ed0-45b3-9a7e-b867884a6163', 'd72d44be-d71f-4e5a-a678-f8aeaa6d8c63', false), -- dawn_runner
  ('6e56af33-8d56-4817-bb7f-1dbb4d40216a', 'd72d44be-d71f-4e5a-a678-f8aeaa6d8c63', false), -- slow_piano
  ('33490760-851e-474f-88cc-7c63f34a5e7d', 'd72d44be-d71f-4e5a-a678-f8aeaa6d8c63', false), -- paperplane
  ('41ccf774-ad1f-4d4b-9ecd-0ceddd8caee5', 'd72d44be-d71f-4e5a-a678-f8aeaa6d8c63', false)  -- tea_and_code
ON CONFLICT (user_id, space_id) DO NOTHING;


-- =========================
-- Channel memberships
-- =========================

-- 星落王国: in-game channels with character names
INSERT INTO public.channel_members (user_id, channel_id, character_name, is_master)
VALUES
  -- GM (no character, but master on in-game channels)
  ('026c7b78-071f-4b1d-8744-35f522be3962', '08425ab2-f640-43c0-a3c5-a63f798c585a', '', true),
  ('026c7b78-071f-4b1d-8744-35f522be3962', '75b6f818-9d6c-4275-9b39-32dcf0c8e186', '', true),
  -- Players
  ('8020002a-ba14-4912-80f9-de7399ef2b36', '08425ab2-f640-43c0-a3c5-a63f798c585a', '凯尔·荆足', false),
  ('68e8485b-3b45-4471-8e1a-7818e2e06ece', '08425ab2-f640-43c0-a3c5-a63f798c585a', '米卡·光羽', false),
  ('043172b0-d742-4a36-a70b-366f47ac9238', '08425ab2-f640-43c0-a3c5-a63f798c585a', '铁匠乔', false),
  ('ac3bdce5-3210-4ab3-bb49-049de31177c3', '08425ab2-f640-43c0-a3c5-a63f798c585a', '罗兰·雨书', false),
  ('1e0650f3-90e0-4561-aecd-158f19b48dda', '08425ab2-f640-43c0-a3c5-a63f798c585a', '莎楠·轻吟', false),
  ('e98f79dd-dd50-4393-abcd-cee3dc5371d1', '08425ab2-f640-43c0-a3c5-a63f798c585a', '阿祖尔·书吏', false),
  ('2f4058ea-cb9f-4020-9cea-ffe9508f61a5', '08425ab2-f640-43c0-a3c5-a63f798c585a', '浪人·仁', false),
  ('f6254e0a-2467-4a64-a303-af0579a28b70', '08425ab2-f640-43c0-a3c5-a63f798c585a', 'K-1N 保镖', false),
  ('35920741-50f7-476e-a0bc-6555a2f849fc', '08425ab2-f640-43c0-a3c5-a63f798c585a', '低电·盖格', false),
  -- Also join the tavern
  ('8020002a-ba14-4912-80f9-de7399ef2b36', '75b6f818-9d6c-4275-9b39-32dcf0c8e186', '凯尔·荆足', false),
  ('68e8485b-3b45-4471-8e1a-7818e2e06ece', '75b6f818-9d6c-4275-9b39-32dcf0c8e186', '米卡·光羽', false),
  ('043172b0-d742-4a36-a70b-366f47ac9238', '75b6f818-9d6c-4275-9b39-32dcf0c8e186', '铁匠乔', false),
  ('ac3bdce5-3210-4ab3-bb49-049de31177c3', '75b6f818-9d6c-4275-9b39-32dcf0c8e186', '罗兰·雨书', false),
  ('1e0650f3-90e0-4561-aecd-158f19b48dda', '75b6f818-9d6c-4275-9b39-32dcf0c8e186', '莎楠·轻吟', false),
  ('e98f79dd-dd50-4393-abcd-cee3dc5371d1', '75b6f818-9d6c-4275-9b39-32dcf0c8e186', '阿祖尔·书吏', false)
ON CONFLICT (user_id, channel_id) DO NOTHING;

-- 星落王国: OOC/system/doc channels (no character names)
INSERT INTO public.channel_members (user_id, channel_id, character_name)
VALUES
  -- Everyone to town-square (OOC)
  ('026c7b78-071f-4b1d-8744-35f522be3962', 'd0cbaa7b-fd1e-40d2-b4ff-ca2f93143389', ''),
  ('8020002a-ba14-4912-80f9-de7399ef2b36', 'd0cbaa7b-fd1e-40d2-b4ff-ca2f93143389', ''),
  ('68e8485b-3b45-4471-8e1a-7818e2e06ece', 'd0cbaa7b-fd1e-40d2-b4ff-ca2f93143389', ''),
  ('043172b0-d742-4a36-a70b-366f47ac9238', 'd0cbaa7b-fd1e-40d2-b4ff-ca2f93143389', ''),
  ('ac3bdce5-3210-4ab3-bb49-049de31177c3', 'd0cbaa7b-fd1e-40d2-b4ff-ca2f93143389', ''),
  ('1e0650f3-90e0-4561-aecd-158f19b48dda', 'd0cbaa7b-fd1e-40d2-b4ff-ca2f93143389', ''),
  ('e98f79dd-dd50-4393-abcd-cee3dc5371d1', 'd0cbaa7b-fd1e-40d2-b4ff-ca2f93143389', ''),
  ('2f4058ea-cb9f-4020-9cea-ffe9508f61a5', 'd0cbaa7b-fd1e-40d2-b4ff-ca2f93143389', ''),
  ('f6254e0a-2467-4a64-a303-af0579a28b70', 'd0cbaa7b-fd1e-40d2-b4ff-ca2f93143389', ''),
  ('35920741-50f7-476e-a0bc-6555a2f849fc', 'd0cbaa7b-fd1e-40d2-b4ff-ca2f93143389', ''),
  -- Dice channel
  ('026c7b78-071f-4b1d-8744-35f522be3962', 'bdda1b2a-563a-4111-ad69-9c23c88a4a4d', ''),
  ('8020002a-ba14-4912-80f9-de7399ef2b36', 'bdda1b2a-563a-4111-ad69-9c23c88a4a4d', ''),
  ('68e8485b-3b45-4471-8e1a-7818e2e06ece', 'bdda1b2a-563a-4111-ad69-9c23c88a4a4d', ''),
  ('043172b0-d742-4a36-a70b-366f47ac9238', 'bdda1b2a-563a-4111-ad69-9c23c88a4a4d', ''),
  ('ac3bdce5-3210-4ab3-bb49-049de31177c3', 'bdda1b2a-563a-4111-ad69-9c23c88a4a4d', ''),
  ('1e0650f3-90e0-4561-aecd-158f19b48dda', 'bdda1b2a-563a-4111-ad69-9c23c88a4a4d', ''),
  ('e98f79dd-dd50-4393-abcd-cee3dc5371d1', 'bdda1b2a-563a-4111-ad69-9c23c88a4a4d', ''),
  ('2f4058ea-cb9f-4020-9cea-ffe9508f61a5', 'bdda1b2a-563a-4111-ad69-9c23c88a4a4d', ''),
  ('f6254e0a-2467-4a64-a303-af0579a28b70', 'bdda1b2a-563a-4111-ad69-9c23c88a4a4d', ''),
  ('35920741-50f7-476e-a0bc-6555a2f849fc', 'bdda1b2a-563a-4111-ad69-9c23c88a4a4d', ''),
  -- GM notes (GM only)
  ('026c7b78-071f-4b1d-8744-35f522be3962', '2a06c5b1-b929-40d1-b1dd-8a44246f2332', '')
ON CONFLICT (user_id, channel_id) DO NOTHING;


-- 霓虹学园：in-game channels with character names
INSERT INTO public.channel_members (user_id, channel_id, character_name, is_master)
VALUES
  -- GM
  ('026c7b78-071f-4b1d-8744-35f522be3962', '78b4e903-4de3-4c6b-a240-5c76d8887b94', '', true),
  ('026c7b78-071f-4b1d-8744-35f522be3962', '5ebee10f-2213-44d0-a128-536106ac6bee', '', true),
  -- Students / members
  ('68e8485b-3b45-4471-8e1a-7818e2e06ece', '78b4e903-4de3-4c6b-a240-5c76d8887b94', '橘野 ミカ', false),
  ('ac3bdce5-3210-4ab3-bb49-049de31177c3', '78b4e903-4de3-4c6b-a240-5c76d8887b94', '水野 周三', false),
  ('1e0650f3-90e0-4561-aecd-158f19b48dda', '78b4e903-4de3-4c6b-a240-5c76d8887b94', '半井 カ', false),
  ('8ccbdc2f-050c-4d1b-9fa6-6c864c51f19a', '78b4e903-4de3-4c6b-a240-5c76d8887b94', '云莓', false),
  ('33490760-851e-474f-88cc-7c63f34a5e7d', '78b4e903-4de3-4c6b-a240-5c76d8887b94', '纸 飞机', false),
  ('a48ce39a-2824-41b8-8613-4bebd84cfb3c', '78b4e903-4de3-4c6b-a240-5c76d8887b94', '夜食 ラメン', false),
  ('41ccf774-ad1f-4d4b-9ecd-0ceddd8caee5', '78b4e903-4de3-4c6b-a240-5c76d8887b94', '茶木 代碼', false),
  ('5458e4c4-b9bb-4df7-bfad-3f97ffce35ab', '78b4e903-4de3-4c6b-a240-5c76d8887b94', '错字', false),
  ('e2b90df5-2ed0-45b3-9a7e-b867884a6163', '78b4e903-4de3-4c6b-a240-5c76d8887b94', '晨 跑', false),
  ('6e56af33-8d56-4817-bb7f-1dbb4d40216a', '78b4e903-4de3-4c6b-a240-5c76d8887b94', '真野 アンダンテ', false),
  ('0207f80d-c02f-4483-88a6-791de3865fea', '78b4e903-4de3-4c6b-a240-5c76d8887b94', '白黒 モノ', false),
  -- Occult club overlap
  ('68e8485b-3b45-4471-8e1a-7818e2e06ece', '5ebee10f-2213-44d0-a128-536106ac6bee', '橘野 ミカ', false),
  ('ac3bdce5-3210-4ab3-bb49-049de31177c3', '5ebee10f-2213-44d0-a128-536106ac6bee', '水野 周三', false),
  ('41ccf774-ad1f-4d4b-9ecd-0ceddd8caee5', '5ebee10f-2213-44d0-a128-536106ac6bee', '茶木 代碼', false),
  ('6e56af33-8d56-4817-bb7f-1dbb4d40216a', '5ebee10f-2213-44d0-a128-536106ac6bee', '真野 アンダンテ', false)
ON CONFLICT (user_id, channel_id) DO NOTHING;

-- 霓虹学园：OOC/system channels
INSERT INTO public.channel_members (user_id, channel_id, character_name)
VALUES
  -- Cafeteria OOC
  ('026c7b78-071f-4b1d-8744-35f522be3962', '00b4caba-2fca-412a-a6c7-bcf1c7d0f9f8', ''),
  ('68e8485b-3b45-4471-8e1a-7818e2e06ece', '00b4caba-2fca-412a-a6c7-bcf1c7d0f9f8', ''),
  ('ac3bdce5-3210-4ab3-bb49-049de31177c3', '00b4caba-2fca-412a-a6c7-bcf1c7d0f9f8', ''),
  ('1e0650f3-90e0-4561-aecd-158f19b48dda', '00b4caba-2fca-412a-a6c7-bcf1c7d0f9f8', ''),
  ('8ccbdc2f-050c-4d1b-9fa6-6c864c51f19a', '00b4caba-2fca-412a-a6c7-bcf1c7d0f9f8', ''),
  ('33490760-851e-474f-88cc-7c63f34a5e7d', '00b4caba-2fca-412a-a6c7-bcf1c7d0f9f8', ''),
  ('a48ce39a-2824-41b8-8613-4bebd84cfb3c', '00b4caba-2fca-412a-a6c7-bcf1c7d0f9f8', ''),
  ('41ccf774-ad1f-4d4b-9ecd-0ceddd8caee5', '00b4caba-2fca-412a-a6c7-bcf1c7d0f9f8', ''),
  ('5458e4c4-b9bb-4df7-bfad-3f97ffce35ab', '00b4caba-2fca-412a-a6c7-bcf1c7d0f9f8', ''),
  ('e2b90df5-2ed0-45b3-9a7e-b867884a6163', '00b4caba-2fca-412a-a6c7-bcf1c7d0f9f8', ''),
  ('6e56af33-8d56-4817-bb7f-1dbb4d40216a', '00b4caba-2fca-412a-a6c7-bcf1c7d0f9f8', ''),
  ('0207f80d-c02f-4483-88a6-791de3865fea', '00b4caba-2fca-412a-a6c7-bcf1c7d0f9f8', ''),
  -- Dice channel
  ('026c7b78-071f-4b1d-8744-35f522be3962', '3cc3c023-0f27-4913-bdac-cf694d75aff6', ''),
  ('68e8485b-3b45-4471-8e1a-7818e2e06ece', '3cc3c023-0f27-4913-bdac-cf694d75aff6', ''),
  ('ac3bdce5-3210-4ab3-bb49-049de31177c3', '3cc3c023-0f27-4913-bdac-cf694d75aff6', ''),
  ('1e0650f3-90e0-4561-aecd-158f19b48dda', '3cc3c023-0f27-4913-bdac-cf694d75aff6', ''),
  ('8ccbdc2f-050c-4d1b-9fa6-6c864c51f19a', '3cc3c023-0f27-4913-bdac-cf694d75aff6', ''),
  ('33490760-851e-474f-88cc-7c63f34a5e7d', '3cc3c023-0f27-4913-bdac-cf694d75aff6', ''),
  ('a48ce39a-2824-41b8-8613-4bebd84cfb3c', '3cc3c023-0f27-4913-bdac-cf694d75aff6', ''),
  ('41ccf774-ad1f-4d4b-9ecd-0ceddd8caee5', '3cc3c023-0f27-4913-bdac-cf694d75aff6', ''),
  ('5458e4c4-b9bb-4df7-bfad-3f97ffce35ab', '3cc3c023-0f27-4913-bdac-cf694d75aff6', ''),
  ('e2b90df5-2ed0-45b3-9a7e-b867884a6163', '3cc3c023-0f27-4913-bdac-cf694d75aff6', ''),
  ('6e56af33-8d56-4817-bb7f-1dbb4d40216a', '3cc3c023-0f27-4913-bdac-cf694d75aff6', ''),
  ('0207f80d-c02f-4483-88a6-791de3865fea', '3cc3c023-0f27-4913-bdac-cf694d75aff6', '')
ON CONFLICT (user_id, channel_id) DO NOTHING;


-- 雾港疑云：in-game channels with character names
INSERT INTO public.channel_members (user_id, channel_id, character_name, is_master)
VALUES
  -- GM
  ('026c7b78-071f-4b1d-8744-35f522be3962', '75a1c0f0-b5a3-4da8-85d2-7033da8d3306', '', true),
  -- Investigators
  ('043172b0-d742-4a36-a70b-366f47ac9238', '75a1c0f0-b5a3-4da8-85d2-7033da8d3306', '乔·马洛', false),
  ('e98f79dd-dd50-4393-abcd-cee3dc5371d1', '75a1c0f0-b5a3-4da8-85d2-7033da8d3306', '青石·店员', false),
  ('35920741-50f7-476e-a0bc-6555a2f849fc', '75a1c0f0-b5a3-4da8-85d2-7033da8d3306', '盖格·测量员', false),
  ('d0f95538-fab3-4664-8218-e5593a35c465', '75a1c0f0-b5a3-4da8-85d2-7033da8d3306', '午睡的猫', false),
  ('e2b90df5-2ed0-45b3-9a7e-b867884a6163', '75a1c0f0-b5a3-4da8-85d2-7033da8d3306', '晨·巡警', false),
  ('6e56af33-8d56-4817-bb7f-1dbb4d40216a', '75a1c0f0-b5a3-4da8-85d2-7033da8d3306', '阿多·钢琴师', false),
  ('33490760-851e-474f-88cc-7c63f34a5e7d', '75a1c0f0-b5a3-4da8-85d2-7033da8d3306', '纸飞机·记者', false),
  ('41ccf774-ad1f-4d4b-9ecd-0ceddd8caee5', '75a1c0f0-b5a3-4da8-85d2-7033da8d3306', '茶与代码·黑客', false)
ON CONFLICT (user_id, channel_id) DO NOTHING;

-- 雾港疑云：OOC/system/doc channels
INSERT INTO public.channel_members (user_id, channel_id, character_name)
VALUES
  -- OOC
  ('026c7b78-071f-4b1d-8744-35f522be3962', 'bb682813-9e71-4445-8965-f97f0884f826', ''),
  ('043172b0-d742-4a36-a70b-366f47ac9238', 'bb682813-9e71-4445-8965-f97f0884f826', ''),
  ('e98f79dd-dd50-4393-abcd-cee3dc5371d1', 'bb682813-9e71-4445-8965-f97f0884f826', ''),
  ('35920741-50f7-476e-a0bc-6555a2f849fc', 'bb682813-9e71-4445-8965-f97f0884f826', ''),
  ('d0f95538-fab3-4664-8218-e5593a35c465', 'bb682813-9e71-4445-8965-f97f0884f826', ''),
  ('e2b90df5-2ed0-45b3-9a7e-b867884a6163', 'bb682813-9e71-4445-8965-f97f0884f826', ''),
  ('6e56af33-8d56-4817-bb7f-1dbb4d40216a', 'bb682813-9e71-4445-8965-f97f0884f826', ''),
  ('33490760-851e-474f-88cc-7c63f34a5e7d', 'bb682813-9e71-4445-8965-f97f0884f826', ''),
  ('41ccf774-ad1f-4d4b-9ecd-0ceddd8caee5', 'bb682813-9e71-4445-8965-f97f0884f826', ''),
  -- Dice
  ('026c7b78-071f-4b1d-8744-35f522be3962', 'aeeb9e83-8792-4249-b94c-fd20523bbbfa', ''),
  ('043172b0-d742-4a36-a70b-366f47ac9238', 'aeeb9e83-8792-4249-b94c-fd20523bbbfa', ''),
  ('e98f79dd-dd50-4393-abcd-cee3dc5371d1', 'aeeb9e83-8792-4249-b94c-fd20523bbbfa', ''),
  ('35920741-50f7-476e-a0bc-6555a2f849fc', 'aeeb9e83-8792-4249-b94c-fd20523bbbfa', ''),
  ('d0f95538-fab3-4664-8218-e5593a35c465', 'aeeb9e83-8792-4249-b94c-fd20523bbbfa', ''),
  ('e2b90df5-2ed0-45b3-9a7e-b867884a6163', 'aeeb9e83-8792-4249-b94c-fd20523bbbfa', ''),
  ('6e56af33-8d56-4817-bb7f-1dbb4d40216a', 'aeeb9e83-8792-4249-b94c-fd20523bbbfa', ''),
  ('33490760-851e-474f-88cc-7c63f34a5e7d', 'aeeb9e83-8792-4249-b94c-fd20523bbbfa', ''),
  ('41ccf774-ad1f-4d4b-9ecd-0ceddd8caee5', 'aeeb9e83-8792-4249-b94c-fd20523bbbfa', ''),
  -- Caseboard (GM + two players)
  ('026c7b78-071f-4b1d-8744-35f522be3962', '73bf49a7-4a59-4c52-9c90-25796042a6a3', ''),
  ('043172b0-d742-4a36-a70b-366f47ac9238', '73bf49a7-4a59-4c52-9c90-25796042a6a3', ''),
  ('41ccf774-ad1f-4d4b-9ecd-0ceddd8caee5', '73bf49a7-4a59-4c52-9c90-25796042a6a3', '')
ON CONFLICT (user_id, channel_id) DO NOTHING;

