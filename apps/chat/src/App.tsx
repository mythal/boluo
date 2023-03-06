import zhCn from 'lang/compiled/zh_CN.json';
import { FormattedMessage, IntlProvider } from 'react-intl';
import { Button } from 'ui';

function App() {
  return (
    <IntlProvider locale={'zh'} messages={zhCn}>
      <div className="p-4">
        <div>
          <FormattedMessage defaultMessage="Boluo" />
        </div>
        <div>
          <Button>I'm a button</Button>
        </div>
      </div>
    </IntlProvider>
  );
}

export default App;
