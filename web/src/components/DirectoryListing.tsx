type Props = {
  directories: string[];
  parentDirectoryFilter?: string;
  onOpenDirectory?: (path: string) => void;
};

const DirectoryListing: React.FC<Props> = ({ directories, parentDirectoryFilter, onOpenDirectory }) => {
  return (
    <div>
      {directories
        .filter(d => {
          if (parentDirectoryFilter == null) return true;
          if (!d.startsWith(parentDirectoryFilter)) return false;
          const s = d.split(parentDirectoryFilter);
          if (s.length !== 2) return false;
          if (s[1] === '') return false;
          if (s[1].replace(/^\//, '').includes('/')) return false;
          return true;
        })
        .sort((a, b) => (a < b ? -1 : 1))
        .map(d => (
          <div key={d}>
            {onOpenDirectory ? (
              <div className="flex margin-top-1">
                <button onClick={() => onOpenDirectory(d)}>go</button>
                <div>{d}</div>
              </div>
            ) : (
              <div>{d}</div>
            )}
          </div>
        ))}
    </div>
  );
};

export default DirectoryListing;
