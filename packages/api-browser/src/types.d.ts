declare const process:
  | {
      env:
        | {
            PUBLIC_BACKEND_URL: string | undefined;
          }
        | undefined;
    }
  | undefined;
