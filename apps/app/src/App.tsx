import Chat from 'chat/src/components/Chat';
import { Providers } from 'chat/src/components/global/Providers';
import 'ui/tailwind.css';

function App() {
  return (
    <Providers>
      <Chat />
    </Providers>
  );
}

export default App;
