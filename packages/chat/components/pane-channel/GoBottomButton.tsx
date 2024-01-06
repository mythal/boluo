import { ChevronsDown } from 'icons';
import { memo } from 'react';
import { Button } from 'ui/Button';

interface Props {
  onClick: () => void;
}

export const GoButtomButton = memo<Props>(({ onClick }) => {
  return (
    <Button onClick={onClick} className="absolute right-6 bottom-4 text-lg">
      <ChevronsDown />
    </Button>
  );
});
GoButtomButton.displayName = 'GoButtomButton';
