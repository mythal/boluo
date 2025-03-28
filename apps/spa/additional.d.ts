interface GeometryChanegEvent extends Event {
  readonly target: { boundingRect: DOMRectReadOnly };
}
interface Navigator {
  virtualKeyboard?: {
    overlaysContent: boolean;
    show: () => void;
    hide: () => void;
    boundingRect: DOMRectReadOnly;
    addEventListener: (
      type: 'geometrychange',
      listener: (event: GeometryChanegEvent) => void,
    ) => void;
    removeEventListener: (
      type: 'geometrychange',
      listener: (event: GeometryChanegEvent) => void,
    ) => void;
  };
}
