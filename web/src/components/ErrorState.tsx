type Props = {
  text: string;
};

const ErrorState: React.FC<Props> = ({ text }) => {
  return (
    <div className="flex flex-v-center padding-2 fg-dark-red bg-light-red border-round">
      <div>!</div>
      <div>{text}</div>
    </div>
  );
};

export default ErrorState;
