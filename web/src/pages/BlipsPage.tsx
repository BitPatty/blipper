import MarkdownPreview from '@uiw/react-markdown-preview';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  CommitTree,
  getCommitTree,
  getLatestCommitHashForRepository,
  getRepositoryFile,
  updateRepositoryFile,
} from '../common/github-api-client';

import { resizeAndStripExifToBase64 } from '../common/image-utils';
import DirectoryListing from '../components/DirectoryListing';
import ErrorState from '../components/ErrorState';
import FileListing from '../components/FileListing';
import LoadingState from '../components/LoadingState';

type ActiveViewState =
  | {
      view: 'loading-repository';
      blipsDirectory: string;
      imagesDirectory: string;
    }
  | {
      view: 'repository-loading-failure';
    }
  | {
      view: 'repository-loaded';
      blipsDirectory: string;
      imagesDirectory: string;
      tree: CommitTree['tree'];
    }
  | {
      blipPath: string;
      view: 'load-blip';
      blipsDirectory: string;
      imagesDirectory: string;
      tree: CommitTree['tree'];
    }
  | {
      imagePath: string;
      view: 'save-image';
      blipsDirectory: string;
      imagesDirectory: string;
      content: string;
      sha: string | null;
      tree: CommitTree['tree'];
    }
  | {
      view: 'save-image-failure';
      blipsDirectory: string;
      imagesDirectory: string;
      tree: CommitTree['tree'];
    }
  | {
      blipPath: string;
      view: 'load-blip-failure';
      blipsDirectory: string;
      imagesDirectory: string;
      tree: CommitTree['tree'];
    }
  | {
      blipPath: string;
      view: 'edit-blip';
      blipsDirectory: string;
      imagesDirectory: string;
      content: string;
      sha: string | null;
      tree: CommitTree['tree'];
    }
  | {
      blipPath: string;
      view: 'save-blip';
      blipsDirectory: string;
      imagesDirectory: string;
      content: string;
      sha: string | null;
      tree: CommitTree['tree'];
    }
  | {
      blipPath: string;
      view: 'save-blip-failure';
      blipsDirectory: string;
      imagesDirectory: string;
      content: string;
      sha: string | null;
      tree: CommitTree['tree'];
    };

const BlipsPage: React.FC = () => {
  const [, user, repository] = useMemo(() => {
    const a = new URL(window.location.href);
    const b = a.searchParams.get('user');
    const c = a.searchParams.get('repository');
    return [a, b, c];
  }, []);

  const [activeView, setActiveView] = useState<ActiveViewState>({
    view: 'loading-repository',
    blipsDirectory: localStorage.getItem('blips-directory') ?? '/src/collections/blips',
    imagesDirectory: localStorage.getItem('images-directory') ?? '/public/img/blips',
  });

  const [showDirectorySelector, setShowDirectorySelector] = useState<boolean>(false);
  const [showFiles, setShowFiles] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const navigate = useNavigate();

  // Load repository contents
  useEffect(() => {
    if (activeView.view !== 'loading-repository') return;

    if (user == null || repository == null) {
      navigate('/');
      return;
    }

    getLatestCommitHashForRepository(user, repository).then(r => {
      if (!r.success) {
        setActiveView({ view: 'repository-loading-failure' });
        return;
      }

      getCommitTree(user, repository, r.data).then(t => {
        if (!t.success) {
          setActiveView({ view: 'repository-loading-failure' });
          return;
        }

        const formattedTree = t.data.tree.map(t => ({ ...t, path: `/${t.path}` }));

        setActiveView({
          view: 'repository-loaded',
          blipsDirectory: formattedTree.some(i => i.type === 'tree' && i.path === activeView.blipsDirectory)
            ? activeView.blipsDirectory
            : '/',
          imagesDirectory: formattedTree.some(i => i.type === 'tree' && i.path === activeView.imagesDirectory)
            ? activeView.imagesDirectory
            : '/',
          tree: formattedTree,
        });
      });
    });
  }, [activeView, navigate, user, repository]);

  // Update persistent configuration
  useEffect(() => {
    if (activeView.view !== 'repository-loaded') return;

    localStorage.setItem('blips-directory', activeView.blipsDirectory);
    localStorage.setItem('images-directory', activeView.imagesDirectory);
  }, [activeView]);

  // Load an existing blip
  useEffect(() => {
    if (activeView.view !== 'load-blip') return;
    if (user == null || repository == null) {
      navigate('/');
      return;
    }

    getRepositoryFile(user, repository, activeView.blipPath).then(b => {
      if (!b.success) {
        setActiveView({ ...activeView, view: 'load-blip-failure' });
        return;
      }

      setActiveView({ ...activeView, view: 'edit-blip', content: atob(b.data.content), sha: b.data.sha });
    });
  }, [activeView, navigate, user, repository]);

  // Save a new / update an existing blip
  useEffect(() => {
    if (activeView.view !== 'save-blip') return;
    if (user == null || repository == null) {
      navigate('/');
      return;
    }

    updateRepositoryFile(
      user,
      repository,
      activeView.blipPath.replace(/^\//, ''),
      btoa(activeView.content),
      'update blips',
      activeView.sha,
    ).then(r =>
      setActiveView(
        r.success ? { ...activeView, view: 'loading-repository' } : { ...activeView, view: 'save-blip-failure' },
      ),
    );
  });

  // Save a new / update an existing image
  useEffect(() => {
    if (activeView.view !== 'save-image') return;
    if (user == null || repository == null) {
      navigate('/');
      return;
    }

    updateRepositoryFile(
      user,
      repository,
      activeView.imagePath.replace(/^\//, ''),
      activeView.content,
      'upload image',
      activeView.sha,
    ).then(r =>
      setActiveView(
        r.success ? { ...activeView, view: 'loading-repository' } : { ...activeView, view: 'save-image-failure' },
      ),
    );
  });

  switch (activeView.view) {
    case 'loading-repository':
      return (
        <div>
          <LoadingState text="Loading repository contents..." />
        </div>
      );
    case 'repository-loaded':
      return (
        <div>
          <div>
            <h2>Configuration</h2>
            <div className="flex flex-top">
              <div>
                {showDirectorySelector ? (
                  <button onClick={() => setShowDirectorySelector(false)}>- Hide Directory Selection</button>
                ) : (
                  <button onClick={() => setShowDirectorySelector(true)}>+ Show Directory Selection</button>
                )}
              </div>
              <div>
                {showFiles ? (
                  <button onClick={() => setShowFiles(false)}>- Hide Files</button>
                ) : (
                  <button onClick={() => setShowFiles(true)}>+ Show Files</button>
                )}
              </div>
            </div>
            <div className="flex flex-top margin-top-2">
              <div>
                <div className="padding-2 border bold">Selected Blips Path: {activeView.blipsDirectory}</div>
                {showDirectorySelector && (
                  <div>
                    <DirectoryListing
                      onOpenDirectory={d => setActiveView({ ...activeView, blipsDirectory: d })}
                      directories={activeView.tree.filter(t => t.type === 'tree').map(t => t.path)}
                    />
                  </div>
                )}
                {showFiles && (
                  <div className="margin-top-2">
                    <div className="bold">Files:</div>
                    <div>
                      <FileListing
                        parentDirectoryFilter={activeView.blipsDirectory}
                        files={activeView.tree.filter(t => t.type === 'blob').map(t => t.path)}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div className="padding-2 border bold">Selected Images Path: {activeView.imagesDirectory}</div>
                {showDirectorySelector && (
                  <div>
                    <DirectoryListing
                      onOpenDirectory={d => setActiveView({ ...activeView, imagesDirectory: d })}
                      directories={activeView.tree.filter(t => t.type === 'tree').map(t => t.path)}
                    />
                  </div>
                )}
                {showFiles && (
                  <div className="margin-top-2">
                    <div className="bold">Files:</div>
                    <div>
                      <FileListing
                        parentDirectoryFilter={activeView.imagesDirectory}
                        files={activeView.tree.filter(t => t.type === 'blob').map(t => t.path)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="margin-top-2">
            <h2>Latest Blips</h2>
            <div className="margin-top-2">
              <button
                onClick={() => {
                  const today = new Date();
                  const pathPrefix = `${activeView.blipsDirectory}/${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;

                  const existingBlips = activeView.tree.filter(
                    t => t.type === 'blob' && t.path.startsWith(pathPrefix) && t.path.endsWith('.mdx'),
                  );

                  const blipPath = `${pathPrefix}_${(existingBlips.length + 1).toString().padStart(2, '0')}.mdx`;

                  setActiveView({
                    ...activeView,
                    view: 'edit-blip',
                    blipPath,
                    content: `---\npubDate: ${new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}\n---\n`,
                    sha: null,
                  });
                }}
              >
                Create Blip
              </button>
            </div>
            <div className="margin-top-2">
              <div>
                <FileListing
                  reverseSort
                  limit={5}
                  onOpenFile={f =>
                    setActiveView({
                      view: 'load-blip',
                      blipsDirectory: activeView.blipsDirectory,
                      imagesDirectory: activeView.imagesDirectory,
                      blipPath: f,
                      tree: activeView.tree,
                    })
                  }
                  parentDirectoryFilter={activeView.blipsDirectory}
                  files={activeView.tree.filter(t => t.type === 'blob').map(t => t.path)}
                />
              </div>
            </div>
          </div>
          <div className="margin-top-2">
            <h2>Latest images</h2>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                e.currentTarget.value = '';

                if (!file) return;

                const today = new Date();
                const pathPrefix = `${activeView.imagesDirectory}/${today.getFullYear()}${(today.getMonth() + 1)
                  .toString()
                  .padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;

                const existingImages = activeView.tree.filter(t => t.type === 'blob' && t.path.startsWith(pathPrefix));

                resizeAndStripExifToBase64(file, 1000, 0.9)
                  .then(b => {
                    const imagePath = `${pathPrefix}_${(existingImages.length + 1).toString().padStart(2, '0')}.${b.ext}`;

                    setActiveView({
                      ...activeView,
                      view: 'save-image',
                      imagePath,
                      content: b.base64,
                      sha: null,
                    });
                  })
                  .catch(() =>
                    setActiveView({
                      ...activeView,
                      view: 'save-image-failure',
                    }),
                  );
              }}
            />

            <div className="margin-top-2">
              <button onClick={() => fileInputRef.current?.click()}>Upload image</button>
            </div>

            <div className="margin-top-2">
              <div>
                <FileListing
                  reverseSort
                  limit={5}
                  parentDirectoryFilter={activeView.imagesDirectory}
                  files={activeView.tree.filter(t => t.type === 'blob').map(t => t.path)}
                />
              </div>
            </div>
          </div>
        </div>
      );
    case 'repository-loading-failure':
      return (
        <div>
          <ErrorState text="Could not load repository contents" />
        </div>
      );
    case 'load-blip':
      return (
        <div>
          <LoadingState text="Loading blip..." />
        </div>
      );
    case 'save-image':
      return (
        <div>
          <LoadingState text="Uploading image..." />
        </div>
      );
    case 'save-image-failure':
      return (
        <div>
          <ErrorState text="Could not upload image" />
        </div>
      );
    case 'edit-blip':
    case 'save-blip':
    case 'save-blip-failure':
      return (
        <div>
          <div>
            <div>
              <h2>Modify Blip</h2>
            </div>
            <div>
              <div>
                <label htmlFor="blippath">Blip Path</label>
              </div>
              <div className="margin-top-1">
                <input
                  name="blippath"
                  style={{ width: '100%', height: '1.2rem' }}
                  value={activeView.blipPath}
                  onChange={e => setActiveView({ ...activeView, blipPath: e.target.value })}
                />
              </div>
            </div>
            <div className="margin-top-2">
              <div>
                <label htmlFor="content">Content</label>
              </div>
              <div className="margin-top-1">
                <textarea
                  id="blip-content"
                  name="content"
                  style={{ width: '100%', minHeight: '800px' }}
                  value={activeView.content}
                  onChange={e => setActiveView({ ...activeView, content: e.target.value })}
                />
              </div>
            </div>
            <div className="margin-top-1">
              <div className="flex">
                <div>
                  <button onClick={() => setActiveView({ ...activeView, view: 'loading-repository' })}>Cancel</button>
                </div>
                <div>
                  <button onClick={() => setActiveView({ ...activeView, view: 'save-blip' })}>Save Blip</button>
                </div>
              </div>
            </div>
            {activeView.view === 'save-blip' && (
              <div className="margin-top-2">
                <LoadingState text="Saving blip..." />
              </div>
            )}
            {activeView.view === 'save-blip-failure' && (
              <div className="margin-top-2">
                <ErrorState text="Failed to save blip" />
              </div>
            )}
          </div>
          <div className="margin-top-2">
            <h3>Preview</h3>
          </div>
          <div className="margin-top-2">
            <MarkdownPreview className="padding-2" source={activeView.content.replace(/---[\s\S]*?---/, '').trim()} />
          </div>
          <div className="margin-top-2">
            <h3>Latest Images</h3>
          </div>
          <div>
            <div className="margin-top-2">
              <FileListing
                reverseSort
                limit={5}
                parentDirectoryFilter={activeView.imagesDirectory}
                files={activeView.tree.filter(t => t.type === 'blob').map(t => t.path)}
              />
            </div>
          </div>
        </div>
      );
    case 'load-blip-failure':
      return (
        <div>
          <ErrorState text="Could not load blip" />
        </div>
      );
  }
};

export default BlipsPage;
