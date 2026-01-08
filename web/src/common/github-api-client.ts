import z from 'zod';
import { httpGET, httpPUT, HttpResponse } from './http-client';

const GITHUB_API_BASE_URL = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';

type CurrentGitHubUser = {
  id: number;
  login: string;
};

type GitHubUserRepositoryListItem = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
};

type RepositoryContentListItem = {
  type: string;
  name: string;
  path: string;
};

type RepositoryFileContent = {
  type: string;
  name: string;
  path: string;
  sha: string;
  content: string;
  encoding: 'base64';
};

type UpsertFileResponse = {
  content: {
    name: string;
    path: string;
  };
};

type CommitTree = { sha: string; tree: { path: string; type: string; sha: string }[] };

const storeToken = (token: string): void => {
  sessionStorage.setItem('github_api_token', token);
};

const loadStoredToken = (): string | null => {
  return sessionStorage.getItem('github_api_token') ?? null;
};

const buildApiEndpoint = (endpoint: string, options?: { searchParams?: Record<string, string> }): string => {
  const apiUrl = new URL(GITHUB_API_BASE_URL);
  apiUrl.pathname = endpoint;

  if (options?.searchParams != null)
    for (const [k, v] of Object.entries(options.searchParams)) apiUrl.searchParams.set(k, v);

  return apiUrl.toString();
};

const getCurrentGithubUser = (): Promise<HttpResponse<CurrentGitHubUser>> => {
  const token = loadStoredToken();
  if (token == null) return Promise.resolve({ success: false, error: new Error('Token not set') });

  return httpGET(buildApiEndpoint('user'), z.object({ id: z.number(), login: z.string() }), {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
    },
  });
};

const getUserRepositories = async (): Promise<HttpResponse<GitHubUserRepositoryListItem[]>> => {
  const token = loadStoredToken();
  if (token == null) return Promise.resolve({ success: false, error: new Error('Token not set') });

  const loadRepositoriesPage = (page: number) =>
    httpGET(
      buildApiEndpoint(`user/repos`, { searchParams: { page: page.toString(), type: 'owner' } }),
      z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          full_name: z.string(),
          html_url: z.string(),
        }),
      ),
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': GITHUB_API_VERSION,
        },
      },
    );

  const loadedRepositories: GitHubUserRepositoryListItem[] = [];

  for (
    let currentBatch = await loadRepositoriesPage(1), page = 1;
    // @ts-ignore
    !currentBatch.success || currentBatch.data.length > 0;
    currentBatch = await loadRepositoriesPage(++page)
  ) {
    if (!currentBatch.success) return currentBatch;
    // @ts-ignore
    loadedRepositories.push(...currentBatch.data);
  }

  return { success: true, data: loadedRepositories };
};

const getRepositoryContents = (
  owner: string,
  repository: string,
  path: string,
): Promise<HttpResponse<RepositoryContentListItem[]>> => {
  const token = loadStoredToken();
  if (token == null) return Promise.resolve({ success: false, error: new Error('Token not set') });

  return httpGET(
    buildApiEndpoint(`/repos/${owner}/${repository}/contents/${path}`),
    z.array(z.object({ type: z.string(), name: z.string(), path: z.string() })),
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
    },
  );
};

const getRepositoryFile = (
  owner: string,
  repository: string,
  path: string,
): Promise<HttpResponse<RepositoryFileContent>> => {
  const token = loadStoredToken();
  if (token == null) return Promise.resolve({ success: false, error: new Error('Token not set') });

  return httpGET(
    buildApiEndpoint(`/repos/${owner}/${repository}/contents/${path}`),
    z.object({
      type: z.string(),
      name: z.string(),
      content: z.string(),
      encoding: z.literal('base64'),
      path: z.string(),
      sha: z.string(),
    }),
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
    },
  );
};

const getLatestCommitHashForRepository = async (owner: string, repository: string): Promise<HttpResponse<string>> => {
  const token = loadStoredToken();
  if (token == null) return Promise.resolve({ success: false, error: new Error('Token not set') });

  const response = await httpGET(
    buildApiEndpoint(`/repos/${owner}/${repository}/commits`, { searchParams: { per_page: '1' } }),
    z.array(z.object({ sha: z.string() })),
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
    },
  );

  if (!response.success) return response;

  // @ts-ignore
  if (response.data.length === 0) return { success: false, error: new Error('No commits found') };

  // @ts-ignore
  return { success: true, data: response.data[0].sha };
};

const getCommitTree = (owner: string, repository: string, commit: string): Promise<HttpResponse<CommitTree>> => {
  const token = loadStoredToken();
  if (token == null) return Promise.resolve({ success: false, error: new Error('Token not set') });

  return httpGET(
    buildApiEndpoint(`/repos/${owner}/${repository}/git/trees/${commit}`, { searchParams: { recursive: 'true' } }),
    z.object({ sha: z.string(), tree: z.array(z.object({ path: z.string(), type: z.string(), sha: z.string() })) }),
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
    },
  );
};

const updateRepositoryFile = (
  owner: string,
  repository: string,
  path: string,
  data: string,
  commitMessage: string,
  sha: string | null,
  branch?: string,
): Promise<HttpResponse<UpsertFileResponse>> => {
  const token = loadStoredToken();
  if (token == null) return Promise.resolve({ success: false, error: new Error('Token not set') });

  return httpPUT(
    buildApiEndpoint(`/repos/${owner}/${repository}/contents/${path}`),
    JSON.stringify({
      message: commitMessage,
      content: data,
      ...(sha ? { sha } : {}),
      branch,
    }),
    z.object({ content: z.object({ name: z.string(), path: z.string() }) }),
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
    },
  );
};

export {
  getCommitTree,
  getCurrentGithubUser,
  getLatestCommitHashForRepository,
  getRepositoryContents,
  getRepositoryFile,
  getUserRepositories,
  storeToken,
  updateRepositoryFile,
};

export type {
  CommitTree,
  CurrentGitHubUser,
  GitHubUserRepositoryListItem,
  RepositoryContentListItem,
  RepositoryFileContent,
};
