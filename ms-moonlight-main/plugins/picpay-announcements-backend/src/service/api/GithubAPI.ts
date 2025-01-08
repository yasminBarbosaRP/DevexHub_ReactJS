import { Config } from '@backstage/config';
import { GithubCredentialsProvider } from '@backstage/integration';
import { Octokit } from '@octokit/rest';
import moment from 'moment';
import { PersistenceContext } from '../persistence/persistenceContext';

export default class GithubAPI {
  constructor(
    private config: Config,
    private persistenceContext: PersistenceContext,
    private githubCredentialsProvider: GithubCredentialsProvider,
  ) {}

  async updateAnnouncement() {
    const githubCredentials = await this.getGithubCredentials();
    const octokit = new Octokit({ auth: githubCredentials.token });

    const { records, expiresAt } =
      await this.persistenceContext.announcementsStore.maxExpiresAt();

    if (records > 0) {
      await this.pushAnnouncement(
        octokit,
        expiresAt && expiresAt.isValid() ? expiresAt : moment().add(2, 'days'),
      );
      return;
    }

    await this.removeAnnouncement(octokit);
  }

  private async getGithubCredentials() {
    return this.githubCredentialsProvider.getCredentials({
      url: 'https://github.com/PicPay',
    });
  }

  private async pushAnnouncement(octokit: Octokit, expiresAt: moment.Moment) {
    const baseUrl = this.config.getString('app.baseUrl');

    await octokit.request('PATCH /orgs/{org}/announcement', {
      org: 'PicPay',
      headers: { 'X-GitHub-Api-Version': '2022-11-28' },
      announcement: `Você tem um novo aviso no Moonlight! [Click aqui e saiba mais](${baseUrl}/announcements).`,
      expires_at: (expiresAt.isValid()
        ? expiresAt
        : moment().add(2, 'days')
      ).format(),
      user_dismissible: false,
    });
  }

  private async removeAnnouncement(octokit: Octokit) {
    await octokit.request('DELETE /orgs/{org}/announcement', {
      org: 'PicPay',
      headers: { 'X-GitHub-Api-Version': '2022-11-28' },
    });
  }
}
