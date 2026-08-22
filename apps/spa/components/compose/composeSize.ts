// Keep enough room for the compose chrome and the pane header when the virtual keyboard is open.
const COMPOSE_AVAILABLE_MAX_HEIGHT = 'calc(var(--view-height, 100dvh) - 8rem)';

export const COMPOSE_LARGE_HEIGHT = `clamp(3rem, ${COMPOSE_AVAILABLE_MAX_HEIGHT}, 40vh)`;
export const COMPOSE_AUTO_MAX_HEIGHT = `clamp(3rem, ${COMPOSE_AVAILABLE_MAX_HEIGHT}, 12rem)`;
