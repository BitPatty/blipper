type Props = {
  date: Date;
  content: string;
};

const BlipEditForm: React.FC<Props> = ({ date, content }) => {
  return (
    <div>
      <div>{date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</div>
      {content}
    </div>
  );
};

export default BlipEditForm;
