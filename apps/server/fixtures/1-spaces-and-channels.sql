INSERT INTO public.spaces (id, name, description, owner_id, language, default_dice_type, explorable, allow_spectator)
VALUES (
  'a400dd6f-c26c-4849-bdfb-74b67154ab28',
  '星落王国',
  '高魔奇幻：龙灾将王国化为焦土，余烬未冷，
   派系争夺古龙遗藏与王位正统。远古符文在地下苏醒，
   流亡者、吟游诗人与龙裔佣兵踏上夺回星落之火的旅途。',
  '026c7b78-071f-4b1d-8744-35f522be3962',
  'zh-CN',
  'd20',
  true,
  true
);

INSERT INTO public.spaces (id, name, description, owner_id, language, default_dice_type, explorable, allow_spectator)
VALUES (
  '2d7c2985-cb47-4912-a3cd-3966d347ced6',
  '霓虹学园：午夜都市传说',
  '学园都市系轻奇幻：午夜后，校园传说开始兑现——
   天台足音、旧体育馆的镜中人、食堂自动售货机的第十三号菜单。
   神秘学社团在期末与补考之间追查线索，让弹幕、表情包与法阵并行。',
  '026c7b78-071f-4b1d-8744-35f522be3962',
  'zh-CN',
  'd6',
  true,
  true
);

INSERT INTO public.spaces (id, name, description, owner_id, language, default_dice_type, explorable, allow_spectator)
VALUES (
  'd72d44be-d71f-4e5a-a678-f8aeaa6d8c63',
  '雾港疑云',
  '克苏鲁式调查：潮汐在码头写下无法辨读的螺旋文字，溺亡者口袋里
   装着同一枚盐锈硬币。雾港的钟声在凌晨四点响起，只有调查员听见——
   越是靠近真相，越要掷理智。',
  '026c7b78-071f-4b1d-8744-35f522be3962',
  'zh-CN',
  'd100',
  false,
  true
);


INSERT INTO public.channels (id, name, topic, space_id, is_public, default_dice_type, default_roll_command, is_document, type)
VALUES
  ('08425ab2-f640-43c0-a3c5-a63f798c585a', 'adventure', '主线冒险与战斗', 'a400dd6f-c26c-4849-bdfb-74b67154ab28', true, 'd20', 'd', false, 'in_game'),
  ('75b6f818-9d6c-4275-9b39-32dcf0c8e186', 'tavern', '酒馆跑团与支线', 'a400dd6f-c26c-4849-bdfb-74b67154ab28', true, 'd20', 'd', false, 'in_game'),
  ('d0cbaa7b-fd1e-40d2-b4ff-ca2f93143389', 'town-square', 'OOC闲聊与招募', 'a400dd6f-c26c-4849-bdfb-74b67154ab28', true, 'd20', 'd', false, 'out_of_game'),
  ('bdda1b2a-563a-4111-ad69-9c23c88a4a4d', 'dice', '掷骰频道', 'a400dd6f-c26c-4849-bdfb-74b67154ab28', true, 'd20', 'd', false, 'in_game'),
  ('2a06c5b1-b929-40d1-b1dd-8a44246f2332', 'gm-notes', '主持人文档与世界观', 'a400dd6f-c26c-4849-bdfb-74b67154ab28', false, 'd20', 'd', true, 'out_of_game');

INSERT INTO public.channels (id, name, topic, space_id, is_public, default_dice_type, default_roll_command, is_document, type)
VALUES
  ('78b4e903-4de3-4c6b-a240-5c76d8887b94', 'homeroom', '日常与课间事件', '2d7c2985-cb47-4912-a3cd-3966d347ced6', true, 'd6', 'd', false, 'in_game'),
  ('5ebee10f-2213-44d0-a128-536106ac6bee', 'occult-club', '神秘学社团的调查据点', '2d7c2985-cb47-4912-a3cd-3966d347ced6', true, 'd6', 'd', false, 'in_game'),
  ('00b4caba-2fca-412a-a6c7-bcf1c7d0f9f8', 'cafeteria', 'OOC闲聊与表情包', '2d7c2985-cb47-4912-a3cd-3966d347ced6', true, 'd6', 'd', false, 'out_of_game'),
  ('3cc3c023-0f27-4913-bdac-cf694d75aff6', 'dice', '掷骰频道', '2d7c2985-cb47-4912-a3cd-3966d347ced6', true, 'd6', 'd', false, 'in_game');

INSERT INTO public.channels (id, name, topic, space_id, is_public, default_dice_type, default_roll_command, is_document, type)
VALUES
  ('75a1c0f0-b5a3-4da8-85d2-7033da8d3306', 'dockside', '雾港码头现场', 'd72d44be-d71f-4e5a-a678-f8aeaa6d8c63', true, 'd100', 'd', false, 'in_game'),
  ('73bf49a7-4a59-4c52-9c90-25796042a6a3', 'caseboard', '案件线索与拼图（文档）', 'd72d44be-d71f-4e5a-a678-f8aeaa6d8c63', false, 'd100', 'd', true, 'out_of_game'),
  ('bb682813-9e71-4445-8965-f97f0884f826', 'ooc', 'OOC讨论与汇总', 'd72d44be-d71f-4e5a-a678-f8aeaa6d8c63', true, 'd100', 'd', false, 'out_of_game'),
  ('aeeb9e83-8792-4249-b94c-fd20523bbbfa', 'dice', '掷骰频道', 'd72d44be-d71f-4e5a-a678-f8aeaa6d8c63', true, 'd100', 'd', false, 'in_game');
