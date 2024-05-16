import { type createStore } from 'jotai';
import { DevTools } from 'jotai-devtools';
import 'jotai-devtools/styles.css';

export const JotaiDevtool = ({ store }: { store: ReturnType<typeof createStore> }) => <DevTools store={store} />;

export default JotaiDevtool;
