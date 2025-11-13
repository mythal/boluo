interface Props {
  className?: string;
}

export const OopsKaomoji = ({ className }: Props) => {
  return (
    <span role="img" aria-label="Oops" className={className}>
      (； ･`д･´)
    </span>
  );
};
