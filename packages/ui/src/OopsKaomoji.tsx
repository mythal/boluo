interface Props {
  className?: string;
}

export const OopsKaomoji = ({ className }: Props) => {
  return (
    <span role="img" aria-label="Oops" className={className}>
      ∑(O_O；)
    </span>
  );
};
