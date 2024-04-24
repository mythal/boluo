import { User } from '@boluo/api';
import { FC, MutableRefObject, RefObject, useCallback, useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import { VirtuosoHandle } from 'react-virtuoso';
import { ChatItem } from '../../state/channel.types';
import { ChatContentHeader } from './ChatContentHeader';
import { ChatItemSwitch } from './ChatItemSwitch';
import { ResolvedTheme } from '@boluo/theme';
import { MyChannelMemberResult } from '../../hooks/useMyChannelMember';
import { getOS } from '@boluo/utils';
import { IS_SAFARI } from '../../const';

interface ChunkMove {
  type: 'CHUNK_MOVE';
  direction: 'up' | 'down';
}

interface Measured {
  type: 'MEASURED';
  offset: number;
}

interface Idle {
  type: 'IDLE';
}

export type ChatChunkAction = ChunkMove | Measured | Idle;

export interface ChatChunkState {
  state: 'IDLE' | 'MEASURING' | 'MEASURED' | 'SHRINKING';
  // Reverse index
  bottom: number;
  prevBottom: number;
  offset: number;
}

interface Props {
  iAmMaster: boolean;
  firstItemIndex: number;
  renderRangeRef: MutableRefObject<[number, number]>;
  messageLoadTimestamp: number;
  scrollerRef: MutableRefObject<HTMLDivElement | null>;
  chatList: ChatItem[];
  filteredMessagesCount: number;
  currentUser: User | undefined | null;
  myMember: MyChannelMemberResult;
  theme: ResolvedTheme;
}

export interface VirtualListContext {
  filteredMessagesCount: number;
}

const CONTINUOUS_TIME_MS = 5 * 60 * 1000;
const isContinuous = (a: ChatItem | null | undefined, b: ChatItem | null | undefined): boolean => {
  if (
    a == null ||
    b == null ||
    a.type !== 'MESSAGE' ||
    b.type !== 'MESSAGE' || // type
    a.senderId !== b.senderId ||
    a.name !== b.name || // sender
    a.folded ||
    b.folded ||
    a.whisperToUsers ||
    b.whisperToUsers // other
  ) {
    return false;
  }
  const timeDiff = Math.abs(Date.parse(a.created) - Date.parse(b.created));
  return timeDiff < CONTINUOUS_TIME_MS;
};

const useWorkaroundFirstItemIndex = (virtuosoRef: RefObject<VirtuosoHandle | null>, originalFirstItemIndex: number) => {
  const os = getOS();
  // In iOS/iPadOS, the behavior of `firstItemIndex` is weird, use a fallback method to fix it
  const workaroundOnLoad = os === 'iOS';

  const firstItemIndex = workaroundOnLoad ? 0 : originalFirstItemIndex;

  const prevFirstItemIndex = useRef(originalFirstItemIndex);
  useLayoutEffect(() => {
    if (!workaroundOnLoad || virtuosoRef.current == null) return;
    const virtuoso = virtuosoRef.current;
    if (prevFirstItemIndex.current > originalFirstItemIndex) {
      const diff = prevFirstItemIndex.current - originalFirstItemIndex;
      virtuoso.scrollToIndex({ index: Math.max(0, diff - 1), align: 'start' });
    }
    prevFirstItemIndex.current = originalFirstItemIndex;
  }, [originalFirstItemIndex, virtuosoRef, workaroundOnLoad]);
  return firstItemIndex;
};

const CHUNK_SIZE = 20;
const RENDER_SIZE = CHUNK_SIZE * 3;

export const ChatContentVirtualList: FC<Props> = (props) => {
  const { iAmMaster, chatList, scrollerRef, filteredMessagesCount, currentUser, myMember, theme } = props;
  const totalCount = chatList.length;
  const iAmAdmin = myMember.isOk && myMember.some.space.isAdmin;
  const innerRef = useRef<HTMLDivElement>(null);
  const os = getOS();

  let prevOffsetIndex = Number.MIN_SAFE_INTEGER;
  let prevItem: ChatItem | null = null;
  const myId: string | undefined = currentUser?.id ?? undefined;

  const reducer = (state: ChatChunkState, action: ChatChunkAction): ChatChunkState => {
    if (action.type === 'CHUNK_MOVE') {
      let diff = 0;
      if (action.direction === 'up') {
        diff = CHUNK_SIZE;
      } else {
        diff = -CHUNK_SIZE;
      }
      const nextBottom = Math.max(0, state.bottom + diff);
      if (nextBottom + CHUNK_SIZE > chatList.length) {
        return { state: 'MEASURING', bottom: chatList.length - CHUNK_SIZE, prevBottom: state.bottom, offset: 0 };
      } else {
        return { state: 'MEASURING', bottom: nextBottom, prevBottom: state.bottom, offset: 0 };
      }
    } else if (action.type === 'MEASURED') {
      return { ...state, state: 'MEASURED', offset: action.offset };
    } else if (action.type === 'IDLE') {
      return { state: 'IDLE', bottom: state.bottom, prevBottom: state.bottom, offset: 0 };
    }
    return state;
  };

  const [viewState, dispatch] = useReducer(reducer, {
    state: 'IDLE',
    bottom: 0,
    prevBottom: 0,
    offset: 0,
  });
  console.log(viewState);
  const { bottom, prevBottom, state, offset } = viewState;

  useEffect(() => {
    const scroller = scrollerRef.current;
    const inner = innerRef.current;
    if (scroller == null || inner === null) return;
    if (state === 'MEASURING') {
      let offset = 0;
      inner.childNodes.forEach((node) => {
        if (node instanceof HTMLElement && node.dataset.mesure === 'true') {
          offset += node.scrollHeight;
        }
      });
      if (bottom < prevBottom) {
        if (IS_SAFARI) {
          dispatch({ type: 'MEASURED', offset: -offset });
        } else {
          dispatch({ type: 'MEASURED', offset: 0 });
        }
      } else {
        dispatch({ type: 'MEASURED', offset });
      }
    } else if (state === 'MEASURED') {
      console.log('scroller top', scroller.scrollTop);
      scroller.scrollTop += offset;
      setTimeout(() => {
        dispatch({ type: 'IDLE' });
      }, 1000);
    }
  }, [bottom, offset, prevBottom, scrollerRef, state]);
  const chunkeUp = useCallback(() => {
    console.log('chunk up');
    dispatch({ type: 'CHUNK_MOVE', direction: 'up' });
  }, []);
  const chunkDown = useCallback(() => {
    console.log('chunk down');
    dispatch({ type: 'CHUNK_MOVE', direction: 'down' });
  }, []);

  const itemContent = (item: ChatItem, index: number, measure: boolean, show: boolean) => {
    const isLast = totalCount - 1 === index;

    let continuous = false;
    if (index - 1 === prevOffsetIndex) {
      continuous = isContinuous(prevItem, item);
    }

    prevOffsetIndex = index;
    prevItem = item;
    return (
      <div
        key={item.key}
        data-mesure={measure}
        style={
          measure && !show
            ? {
                height: '0px',
                overflow: 'hidden',
              }
            : {}
        }
      >
        <ChatItemSwitch
          isLast={isLast}
          iAmMaster={iAmMaster}
          iAmAdmin={iAmAdmin}
          myId={myId}
          chatItem={item}
          isMember={myMember.isOk}
          continuous={continuous}
          theme={theme}
        />
      </div>
    );
  };
  const renderList = [];
  const computeStart = (bottom: number) => {
    const start = Math.max(chatList.length - 1 - bottom - RENDER_SIZE, 0);
    if (start < CHUNK_SIZE) {
      return 0;
    } else {
      return start;
    }
  };
  let start;
  if (state === 'IDLE') {
    // [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    // chunk size = 4           ^ bottom = 1
    //                 ^ i start from 5
    start = computeStart(bottom);
    // console.log('start', start);
    // console.log('bottom', bottom);
    // console.log('chatList.length', chatList.length);
    for (let i = start; i < chatList.length - bottom; i++) {
      renderList.push(itemContent(chatList[i]!, i, false, true));
    }
  } else if (state === 'MEASURING' || state === 'MEASURED') {
    const prevStart = computeStart(prevBottom);
    const currentStart = computeStart(bottom);
    const measuring = state === 'MEASURING';
    if (prevBottom < bottom) {
      // prepend
      start = currentStart;
      for (let i = currentStart; i < chatList.length - prevBottom; i++) {
        renderList.push(itemContent(chatList[i]!, i, measuring && i < prevStart, false));
      }
    } else if (state === 'MEASURING') {
      // append
      start = prevStart;
      for (let i = prevStart; i < chatList.length - bottom; i++) {
        renderList.push(itemContent(chatList[i]!, i, i < currentStart, true));
      }
    } else {
      start = computeStart(bottom);
      for (let i = start; i < chatList.length - bottom; i++) {
        renderList.push(itemContent(chatList[i]!, i, false, true));
      }
    }
  }

  return (
    <div
      ref={scrollerRef}
      style={{ overscrollBehaviorY: 'none' } as React.CSSProperties}
      className="h-full min-h-0 overflow-y-scroll"
    >
      <div ref={innerRef} className="flex h-full min-h-0 flex-col">
        <ChatContentHeader chunkUp={chunkeUp} isTopChunk={start === 0} filteredMessagesCount={filteredMessagesCount} />
        {renderList}
        {bottom > 0 && <ChunkDown chunkDown={chunkDown} />}
      </div>
    </div>
  );
};

const ChunkDown: FC<{ chunkDown: () => void }> = ({ chunkDown }) => {
  const ref = useRef<HTMLDivElement>(null);
  // useEffect(() => {
  //   const observer = new IntersectionObserver(
  //     (entries) => {
  //       if (entries.length === 0) return;
  //       if (entries[0]!.isIntersecting) {
  //         console.log('chunk down');
  //         chunkDown();
  //       }
  //     },
  //     { threshold: [0] },
  //   );
  //   observer.observe(ref.current!);
  //   return () => {
  //     observer.disconnect();
  //   };
  // }, [chunkDown]);
  return (
    <div onClick={chunkDown} ref={ref} className="h-32 flex-none text-center">
      ...
    </div>
  );
};
