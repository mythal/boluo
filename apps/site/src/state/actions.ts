export type MakeAction<ActionMap extends Record<string, unknown>, ActionName, C = undefined> = ActionName extends
  keyof ActionMap ? {
    type: ActionName;
    payload: ActionMap[ActionName];
    context: C;
  }
  : never;

export function makeAction<M extends Record<string, unknown>, A extends MakeAction<M, keyof M, C>, C>(
  type: A['type'],
  payload: A['payload'],
  context: C,
): A {
  const action = {
    type,
    payload,
    context,
  } as A;
  return action;
}
