declare const process:
  | {
      env:
        | {
            PUBLIC_BACKEND_URL: string | undefined;
            DOMAIN: string | undefined;
          }
        | undefined;
    }
  | undefined;
