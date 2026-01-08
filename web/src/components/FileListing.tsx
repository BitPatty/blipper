import { useState } from 'react';

type Props = {
  files: string[];
  parentDirectoryFilter?: string;
  onOpenFile?: (path: string) => void;
  reverseSort?: boolean;
  limit?: number;
};

const FileListing: React.FC<Props> = ({ files, parentDirectoryFilter, onOpenFile, reverseSort, limit }) => {
  const [selectedPage, setSelectedPage] = useState<number>(0);

  return (
    <div>
      <div>
        {files
          .filter(f => {
            if (parentDirectoryFilter == null) return true;
            if (!f.startsWith(parentDirectoryFilter)) return false;
            const s = f.split(parentDirectoryFilter);
            if (s.length !== 2) return false;
            if (s[1] === '') return false;
            if (s[1].replace(/^\//, '').includes('/')) return false;
            return true;
          })
          .sort((a, b) => (reverseSort ? -1 : 1) * (a < b ? -1 : 1))
          .filter((_, idx) => (limit == null ? true : idx >= selectedPage * limit && idx < (selectedPage + 1) * limit))
          .map(f => (
            <div key={f}>
              {onOpenFile ? (
                <div className="flex margin-top-1">
                  <button onClick={() => onOpenFile(f)}>go</button>
                  <div>{f}</div>
                </div>
              ) : (
                <div>{f}</div>
              )}
            </div>
          ))}
      </div>
      {limit != null && (
        <div className="flex margin-top-2">
          <div>
            <button onClick={() => setSelectedPage(p => p - 1)} disabled={selectedPage === 0}>
              Previous Page
            </button>
          </div>
          <div>
            <button onClick={() => setSelectedPage(p => p + 1)} disabled={(selectedPage + 1) * limit > files.length}>
              Next Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileListing;
