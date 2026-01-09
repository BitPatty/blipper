type Props = {
  owner: string;
  name: string;
  onClick?: () => void;
};

const RepositoryCard: React.FC<Props> = ({ owner, name, onClick }) => {
  return (
    <div {...(onClick ? { role: 'button', onClick } : {})} className="padding-2 border border-round">
      {owner}/{name}
    </div>
  );
};

export default RepositoryCard;
