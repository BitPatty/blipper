import { useEffect, useState } from 'react';

import {
  CurrentGitHubUser,
  getCurrentGithubUser,
  getUserRepositories,
  GitHubUserRepositoryListItem,
  storeToken,
} from '../common/github-api-client';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import RepositoryCard from '../components/RepositoryCard';

type Props = {
  onCallbackCompleted: (data: { user: CurrentGitHubUser; selectedRepository: GitHubUserRepositoryListItem }) => void;
};

type ActiveViewState =
  | { view: 'verifying-token' }
  | { view: 'token-verified'; user: CurrentGitHubUser }
  | { view: 'token-verification-failure'; reason: 'missing-token' | 'api-failure' }
  | { view: 'repositories-lookup-failure'; user: CurrentGitHubUser }
  | { view: 'repository-selection'; user: CurrentGitHubUser; repositories: GitHubUserRepositoryListItem[] };

const AuthenticationCallbackForm: React.FC<Props> = ({ onCallbackCompleted }) => {
  const [activeView, setActiveView] = useState<ActiveViewState>({ view: 'verifying-token' });
  const lastSelectedRepository = localStorage.getItem('last_repository');

  // Load the current user with the provided token
  useEffect(() => {
    if (activeView.view !== 'verifying-token') return;

    const callbackCode = new URL(window.location.href).hash?.replace(/^#/, '');
    if (callbackCode == null || callbackCode === '')
      setActiveView({ view: 'token-verification-failure', reason: 'missing-token' });

    storeToken(callbackCode);

    getCurrentGithubUser().then(r =>
      setActiveView(
        r.success
          ? { view: 'token-verified', user: r.data }
          : { view: 'token-verification-failure', reason: 'api-failure' },
      ),
    );
  }, [activeView]);

  // Load the repositories once the token is verified
  useEffect(() => {
    if (activeView.view !== 'token-verified') return;

    getUserRepositories().then(r =>
      setActiveView(
        r.success
          ? { view: 'repository-selection', user: activeView.user, repositories: r.data }
          : { view: 'repositories-lookup-failure', user: activeView.user },
      ),
    );
  }, [activeView]);

  switch (activeView.view) {
    case 'verifying-token':
      return (
        <div>
          <LoadingState text="Verifying token, please wait..." />
        </div>
      );
    case 'token-verification-failure':
      switch (activeView.reason) {
        case 'api-failure':
          return (
            <div>
              <ErrorState text="Token verification failed" />
            </div>
          );
        case 'missing-token':
          return (
            <div>
              <ErrorState text="Missing Token" />
            </div>
          );
      }
      break;
    case 'token-verified':
      return (
        <div>
          <LoadingState text="Loading repositories, please wait..." />
        </div>
      );
    case 'repositories-lookup-failure':
      return (
        <div>
          <ErrorState text="Could not look up repositories" />
        </div>
      );
    case 'repository-selection':
      const previousSelection = activeView.repositories.find(r => r.name === lastSelectedRepository);

      return (
        <div>
          {activeView.repositories.length === 0 ? (
            <ErrorState text="No repositories found" />
          ) : (
            <div>
              {previousSelection && (
                <div>
                  <div>Last used repository:</div>
                  <div className="margin-top-2">
                    <RepositoryCard
                      onClick={() => {
                        localStorage.setItem('last_repository', previousSelection.name);
                        onCallbackCompleted({ user: activeView.user, selectedRepository: previousSelection });
                      }}
                      owner={activeView.user.login}
                      name={previousSelection.name}
                    />
                  </div>
                </div>
              )}
              <div className="margin-top-2">
                <div>Please select your repository:</div>

                <div className="margin-top-2 grid grid-4">
                  {activeView.repositories.map(r => (
                    <div className="margin-top-2" key={r.id}>
                      <RepositoryCard
                        onClick={() => {
                          localStorage.setItem('last_repository', r.name);
                          onCallbackCompleted({ user: activeView.user, selectedRepository: r });
                        }}
                        owner={activeView.user.login}
                        name={r.name}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      );
  }
};

export default AuthenticationCallbackForm;
