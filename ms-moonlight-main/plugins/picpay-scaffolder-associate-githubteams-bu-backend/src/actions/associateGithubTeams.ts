import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { resolveSafeChildPath } from '@backstage/backend-common';
import { Octokit } from 'octokit';
import { MoonlightOrgYaml } from '../model/MoonlighOrgYaml';
import MoonlightOrg from '../service/MoonlightOrg';
import GithubRepository from '../repository/GithubRepository';
import { sanitizeDirectoryBuName } from '@internal/plugin-picpay-core-components';

const OWNER = 'PicPay';
const REPOSITORY = 'moonlight-org';

export const associateGithubTeams = (
  integrations: ScmIntegrations,
  githubCredentialsProvider?: GithubCredentialsProvider,
) => {
  return createTemplateAction<{
    team: string;
    bu: string;
  }>({
    id: 'moonlight:associate-githubteams-bu',
    schema: {
      input: {
        required: ['team', 'bu'],
        type: 'object',
        properties: {
          team: {
            type: 'string',
            title: 'team',
            description: 'Github team names',
          },
          bu: {
            type: 'string',
            title: 'bu',
            description: 'Bu name',
          },
        },
        output: {
          properties: {
            teamName: {
              type: 'string',
              title: 'teamName',
              description: 'Github team names',
            },
            buName: {
              type: 'string',
              title: 'buName',
              description: 'Bu name',
            },
          },
        },
      },
    },
    async handler(ctx) {
      const { team, bu } = ctx.input;
      const workDir = resolveSafeChildPath(ctx.workspacePath, `./`);
      const pathRepoBu = `${sanitizeDirectoryBuName(bu).replace(
        /^(picpay\/)/,
        '',
      )}`;
      const pathRepo = `/repos/${OWNER}/${REPOSITORY}/contents/picpay/${pathRepoBu}`;

      const repoURL = `https://github.com/${OWNER}/${REPOSITORY}`;
      const credentialProviderToken =
        await githubCredentialsProvider?.getCredentials({ url: repoURL });

      ctx.logger.info(`pathRepo ${pathRepo}`);
      ctx.logger.info(`pathBuRepo ${pathRepoBu}`);
      ctx.logger.info(`repoURL ${repoURL}`);
      ctx.logger.info(`TeamName ${team}`);
      ctx.logger.info(`BuName ${bu}`);

      const octokit = new Octokit({
        ...integrations,
        baseUrl: `https://api.github.com`,
        headers: {
          Accept: 'application/vnd.github.machine-man-preview+json',
        },
        auth: credentialProviderToken?.token,
        previews: ['nebula-preview'],
      });

      const github = new GithubRepository(octokit);
      const options = {
        bu: bu.replace(/^(picpay\/)/, ''),
        team,
        pathRepo,
        pathTemp: workDir,
        owner: OWNER,
        repository: REPOSITORY,
        github,
      };
      const moonlightOrg = new MoonlightOrg(options);
      const content: MoonlightOrgYaml = await moonlightOrg.getContent();
      await moonlightOrg.changeContent(content);

      try {
        await moonlightOrg.push();
      } catch (e: any) {
        ctx.logger.info(e);
      }
      ctx.output('teamName', team);
      ctx.output('buName', bu);
    },
  });
};
