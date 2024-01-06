import { ChevronsDown } from 'icons';
import { memo } from 'react';
import { Button } from 'ui/Button';

interface Props {
  onClick: () => void;
}

export const GoButtomButton = memo<Props>(({ onClick }) => {
  return (
    <Button onClick={onClick} className="absolute bottom-4 right-6 text-lg">
      <ChevronsDown />
    </Button>
  );
});
GoButtomButton.displayName = 'GoButtomButton';
