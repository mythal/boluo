declare module '*.png' {
  const path: string;
  export default path;
}

declare module '*.jpg' {
  const path: string;
  export default path;
}

declare module '*.jpeg' {
  const path: string;
  export default path;
}

declare module '*.gif' {
  const path: string;
  export default path;
}

declare module '*.svg' {
  export interface SpriteSymbol {
    id: string;
    viewBox: string;
    url: string;
    node: SVGSymbolElement;
  }
  const spriteSymbol: SpriteSymbol;
  export default spriteSymbol;
}
