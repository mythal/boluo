/// <reference types="node" />
/// <reference types="react-dom" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production' | 'test';
    readonly PUBLIC_URL: string;
  }
}

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
  import type React from 'react';
  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}

declare module '*.woff2' {
  const path: string;
  export default path;
}
