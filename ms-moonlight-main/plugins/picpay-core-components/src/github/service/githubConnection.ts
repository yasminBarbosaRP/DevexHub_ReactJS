import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { Octokit } from 'octokit';

export const githubConnection = async (
  repository: string,
  integrations: ScmIntegrations,
  credentialProviderToken: GithubCredentialsProvider,
): Promise<Octokit> => {
  const repositoryURL = `https://github.com/PicPay/${repository}`;
  const credentialProvider = await credentialProviderToken.getCredentials({
    url: repositoryURL,
  });
  return new Octokit({
    ...integrations,
    baseUrl: 'https://api.github.com',
    headers: {
      Accept: 'application/vnd.github.machine-man-preview+json',
    },
    auth: credentialProvider?.token,
    previews: ['nebula-preview'],
  });
};
