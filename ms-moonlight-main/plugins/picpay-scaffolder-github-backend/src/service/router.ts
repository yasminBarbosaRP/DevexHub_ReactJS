/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  PluginDatabaseManager,
  errorHandler,
  resolvePackagePath,
} from '@backstage/backend-common';
import { Config } from '@backstage/config';
import express, { Request } from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { Octokit } from 'octokit';
import RepositoryService from './repository';
import {
  getUserToken,
} from '@internal/plugin-picpay-core-components';
import { v4 as uuid } from 'uuid';
import {
  RepositorySettingHistoryModel,
  RepositorySettingHistoryStatus,
  RepositorySettingHistoryTable,
} from './repository-setting-histories';
import { CatalogApi } from '@backstage/catalog-client';
import { Entity } from '@backstage/catalog-model';
import { RepositoryVisibility } from '@internal/plugin-picpay-scaffolder-github-common';
import { PicPayGithubCredentialsProvider } from '@internal/plugin-picpay-github-backend';

const BASE_URL = 'https://github.com/PicPay';
const OWNER = 'PicPay';

export interface RouterOptions {
  config: Config;
  logger: Logger;
  database: PluginDatabaseManager;
  catalogApi: CatalogApi;
}

const SOURCE_LOCATION_RULE = new RegExp(`(?<=github.com\\/).*(?=\\/tree)`);

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { config, logger, database, catalogApi } = options;

  const clientOctokit = async (repoName: String): Promise<Octokit> => {
    const integrations = ScmIntegrations.fromConfig(config);
    const githubCredentialsProvider: GithubCredentialsProvider =
      PicPayGithubCredentialsProvider.fromIntegrations(integrations);

    const credentialProviderToken =
      await githubCredentialsProvider?.getCredentials({
        url: `${BASE_URL}/${repoName}`,
      });

    return new Octokit({
      ...integrations,
      baseUrl: 'https://api.github.com',
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
      auth: credentialProviderToken?.token,
      previews: ['nebula-preview'],
    });
  };

  const migrationsDir = resolvePackagePath(
    '@internal/plugin-picpay-scaffolder-github-backend',
    'migrations',
  );

  const client = await database.getClient();
  await client.migrate.latest({
    directory: migrationsDir,
  });

  const getRepositoryName = ({ metadata }: Entity): string => {
    const sourceLocation = `${metadata.annotations?.['backstage.io/source-location']}`;
    if (SOURCE_LOCATION_RULE.test(sourceLocation)) {
      const projectSlug = sourceLocation.match(SOURCE_LOCATION_RULE)![0];
      return projectSlug.split('/')[1];
    }

    const projectSlug = metadata?.annotations?.['github.com/project-slug'];
    if (projectSlug) {
      const arr = projectSlug.split('/');
      if (arr && arr.length > 0) {
        return arr[arr.length - 1];
      }
    }

    return metadata.name;
  };

  const getUserGithubProfile = async (request: Request): Promise<{ user: string, namespace: string }> => {
    const { name: user, namespace } = await getUserToken({ config, request });
    return { user, namespace };
  };

  const getEntityByName = async (name: string) => {
    const entities = await catalogApi.getEntities({
      filter: { 'metadata.name': name },
      fields: ['metadata.name', 'metadata.annotations', 'spec.owner'],
    });

    if (entities.items.length) {
      return entities.items[0];
    }

    throw new Error('entity not found');
  };

  const canUpdateRepoSetting = async (entity: Entity, username: string, namespace: string) => {
    if (!entity?.spec?.owner) {
      return false;
    }

    const { items: teams } = await catalogApi.getEntities({
      // fields: ['metadata.name'],
      filter: {
        kind: 'Group',
        'relations.hasMember': `user:${namespace}/${username}`,
      },
    });

    return !!teams.find(
      team => team.metadata.name === `${entity?.spec?.owner}`,
    );
  };

  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.send({ status: 'ok' });
  });

  router.get('/file/:repo/:file', async (request, response) => {
    const repo = decodeURIComponent(request.params.repo);
    const file = decodeURIComponent(request.params.file);
    const octokit = await clientOctokit(repo);

    const { data, status } = await octokit.rest.repos.getContent({
      owner: 'PicPay',
      repo: repo,
      path: file,
    });

    if (status > 299) {
      response.status(status).json({ message: JSON.stringify(data) });
    } else {
      // @ts-ignore
      const content = Buffer.from(data.content, 'base64').toString();
      response.status(200).json(JSON.parse(content));
    }
  });

  router.get('/branches/:repo', async (request, response) => {
    const repo = decodeURIComponent(request.params.repo);
    const octokit = await clientOctokit(repo);

    const allBranches: any[] = [];
    let page = 0;
    while (page > -1) {
      // tricking ts to do while true
      const { data, status } = await octokit.rest.repos.listBranches({
        owner: 'PicPay',
        repo: repo,
        page,
        per_page: 100,
      });
      if (status > 299) {
        return response.status(status).json({ message: JSON.stringify(data) });
      }
      if (data.length === 0) {
        return response.status(200).json(allBranches);
      }

      allBranches.push(...data);
      page++;
    }

    return Promise.resolve();
  });

  router.get('/repository/:entityName/settings', (request, response) => {
    (async () => {
      try {
        const entity = await getEntityByName(request.params.entityName);
        const profile = await getUserGithubProfile(request);
        let canUpdateSetting: boolean;
        try {
          canUpdateSetting = await canUpdateRepoSetting(
            entity,
            profile.user,
            profile.namespace
          );
        } catch (err) {
          canUpdateSetting = false;
        }
        const repositoryName = getRepositoryName(entity);
        const octokit = await clientOctokit(repositoryName);
        const repository = new RepositoryService(OWNER, octokit);
        let protectionExists = true;
        let setting: object = {};

        try {
          setting = await repository.getCurrentSetting(repositoryName);
        } catch (err: any) {
          if (err.message?.includes('Branch not protected')) {
            protectionExists = false;
            setting = {
              projectSlug: repositoryName,
              canUpdateSetting,
              requireApprovals: 0,
              requireCodeOwnerReviews: false,
              deleteBranchOnMerge: false,
              visibility: RepositoryVisibility.unknown,
            }
          } else {
            throw err;
          }
        }

        response.json({ ...setting, canUpdateSetting, protectionExists });
      } catch (e: any) {
        response.status(404).json({ error: 'Repository settings not found', details: e.stack });
      }
    })();
  });

  router.patch('/repository/:entityName/settings', (request, response) => {
    (async () => {
      if (!config.getOptionalBoolean('githubRepositorySetting.canEdit')) {
        response.status(401).json({ error: 'disabled for this environment!' });
        return;
      }

      let entity: Entity | null = null;
      let repositoryName: string | null = null;

      try {
        entity = await getEntityByName(request.params.entityName);
        repositoryName = getRepositoryName(entity);
      } catch (error) {
        response.status(404).json({ error: 'repository not found' });
        return;
      }

      const historyId = uuid();
      const profile = await getUserGithubProfile(request);
      try {
        await client<RepositorySettingHistoryModel>(
          RepositorySettingHistoryTable,
        ).insert({
          id: historyId,
          user: profile.user,
          repository: repositoryName,
          require_approvals: request.body.requireApprovals,
          require_code_owner_reviews: request.body.requireCodeOwnerReviews,
          delete_branch_on_merge: request.body.deleteBranchOnMerge,
          visibility: request.body.visibility,
          status: RepositorySettingHistoryStatus.created,
        });
      } catch (e) {
        response
          .status(400)
          .json({ error: 'error creating history, process cancelled' });
        return;
      }

      const updateHistoryStatus = async (
        newStatus: RepositorySettingHistoryStatus,
        errorMessage: string | null,
      ) => {
        await client<Partial<RepositorySettingHistoryModel>>(
          RepositorySettingHistoryTable,
        )
          .update({ status: newStatus, error: errorMessage })
          .where('id', historyId);
      };

      try {
        const octokit = await clientOctokit(repositoryName);
        const repository = new RepositoryService(OWNER, octokit);

        const canUpdateSetting = await canUpdateRepoSetting(entity, profile.user, profile.namespace);
        if (!canUpdateSetting) {
          await updateHistoryStatus(
            RepositorySettingHistoryStatus.notAllowed,
            null,
          );
          response.status(400).json({ error: 'not allowed' });
          return;
        }

        await repository.upsertSettings(repositoryName, request.body);
        await updateHistoryStatus(RepositorySettingHistoryStatus.done, null);

        const setting = await repository.getCurrentSetting(repositoryName);

        response.json({ ...setting, canUpdateSetting, protectionExists: true });
      } catch (err: any) {
        await updateHistoryStatus(
          RepositorySettingHistoryStatus.error,
          err?.message,
        );

        response.status(400).json({ error: err?.message });
      }
    })();
  });

  router.get('/repository-data/:repo', async (request, response) => {
    const repo = decodeURIComponent(request.params.repo);
    const octokit = await clientOctokit(repo);

    const { data, status } = await octokit.request(
      'GET /repos/{owner}/{repo}',
      {
        owner: OWNER,
        repo: repo,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );

    response.status(status).json(data);
  });

  router.post('/:repo/issues/create', async (request, response) => {
    const repo = decodeURIComponent(request.params.repo);
    const octokit = await clientOctokit(repo);

    const { data, status } = await octokit.request(
      'POST /repos/{owner}/{repo}/issues',
      {
        owner: OWNER,
        repo: repo,
        title: request.body.title,
        body: JSON.stringify({
          "title": request.body.title, "body": request.body.body, "assignees": [request.body.owner ?? ""], "milestone": 1, "labels": ["moonlight-error"]
        }),
      },
    );

    response.status(status).json(data);
  });

  router.get('/:repo/issues', async (request, response) => {
    const repo = decodeURIComponent(request.params.repo);
    const octokit = await clientOctokit(repo);

    const { data, status } = await octokit.rest.issues.listForRepo({
      owner: OWNER,
      repo: repo,
    });
    response.status(status).json(data);
  });

  router.use(errorHandler());
  return router;
}
