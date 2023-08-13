export type MakeAction<ActionMap extends Record<string, unknown>, ActionName> = ActionName extends keyof ActionMap ? {
    type: ActionName;
    payload: ActionMap[ActionName];
  }
  : never;
