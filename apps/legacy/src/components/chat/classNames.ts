export const chatHeaderClassName =
  "z-[6] grid h-full [grid-row:header-start/header-end] grid-cols-[auto_1fr_auto] [grid-template-areas:'title_topic_toolbar'] items-center justify-stretch gap-x-1 bg-legacy-header-background px-2 py-1.5 shadow-[0_-1px_4px_rgba(0,0,0,0.5)]";

export const chatItemContainerClassName =
  "group/chat-item relative grid grid-cols-[1.5rem_auto_1fr] grid-rows-[auto_auto] [grid-template-areas:'handle_name_.'_'handle_content_content'] gap-x-2 gap-y-0 bg-legacy-chat-item-background px-2 py-1 hover:bg-legacy-chat-item-hover data-[in-game=true]:text-[1rem] data-[in-game=false]:bg-legacy-chat-item-out-background data-[in-game=false]:text-[0.875rem] data-[in-game=false]:hover:bg-legacy-chat-item-out-hover data-[moving=true]:pointer-events-none data-[moving=true]:blur-[2px] data-[no-name=true]:grid-rows-[auto] data-[no-name=true]:[grid-template-areas:'handle_content_content'] [&_.handle]:opacity-30 hover:[&_.handle]:opacity-100 [&_.show-on-hover]:invisible hover:[&_.show-on-hover]:visible";

export const chatItemContentClassName =
  'self-center [grid-area:content] leading-[1.6rem] data-[action=true]:italic data-[folded=true]:text-legacy-gray-600 data-[folded=true]:line-through data-[in-game=false]:text-legacy-sidebar-item';

export const chatItemNameContainerClassName = '[grid-area:name]';

export const chatItemImageClassName = 'float-right clear-right mb-1 ml-1';
