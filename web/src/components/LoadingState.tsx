import LoadingSpinner from './LoadingSpinner';

type Props = {
  text: string;
};

const LoadingState: React.FC<Props> = ({ text }) => {
  return (
    <div className="flex padding-2 fg-dark-blue bg-light-blue border-round">
      <div>
        <LoadingSpinner />
      </div>
      <div>{text}</div>
    </div>
  );
};

export default LoadingState;
