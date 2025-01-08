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

import { errorHandler } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import {
  MultipleResultError,
  NoResultError,
  ValidationError,
} from '../types/errors';
import { Config } from '@backstage/config';
import { ParsedQs } from 'qs';
import { UserRepository, GroupsRepository } from '../interfaces/repository';
import { UserService } from './User';
import { RequestModel } from '../models/request';
import { getIdentityFromToken } from '@internal/plugin-picpay-core-components';
import { GroupsService } from './Groups';
import { UserDTO, UserEntityDTO } from '../dtos/userDto';
import { CatalogApi } from '@backstage/catalog-client';
import { BackstageUserIdentity } from '@backstage/core-plugin-api';
import { Entity, parseEntityRef } from '@backstage/catalog-model';

export interface RouterOptions {
  config: Config;
  logger: Logger;
  userRepository: UserRepository;
  catalog: CatalogApi;
  groupsRepository: GroupsRepository;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { config, logger, userRepository, groupsRepository } = options;

  const router = Router();
  const userService = new UserService(userRepository);
  const groupsService = new GroupsService(groupsRepository);
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.send({ status: 'ok' });
  });

  const getUserEntity = async (
    user: BackstageUserIdentity,
  ): Promise<Entity> => {
    const { kind, namespace, name } = parseEntityRef(user.userEntityRef);
    const { items } = await options.catalog.getEntities({
      filter: {
        'metadata.name': name,
        'metadata.namespace': namespace,
        kind: kind,
      },
    });

    return items[0];
  };

  const validateRequest = (request: RequestModel) => {
    if (!request.sso_email && !request.username)
      throw new ValidationError(
        'either sso_email or username should be provided',
      );
  };

  const getRequestModel = (req: ParsedQs): RequestModel => {
    const reqModel: RequestModel = {};
    if (req.sso_email) reqModel.sso_email = req.sso_email as string;
    if (req.username) reqModel.username = req.username as string;
    return reqModel;
  };

  router.get('/info', (req, response) => {
    void (async () => {
      try {
        const user = await getIdentityFromToken({ config, request: req });
        if (!user) {
          response.status(401);
          response.end();
          return;
        }

        const requestModel = getRequestModel(req.query);
        const userGuest =
          config.getOptionalString('localhost.user') ?? 'user.guest';

        if (
          !requestModel.username &&
          !requestModel.sso_email &&
          !user.userEntityRef.includes(userGuest)
        ) {
          if (user.ownershipEntityRefs.length > 0) {
            // this means is tied to an entity already, so we have all data we need
            const userEntity = await getUserEntity(user);
            response.send(UserEntityDTO(userEntity));
            return;
          }
          /**
           * user on backstage is actually the e-mail of the person without the domain
           * putting @ at the final of the username avoids getting the wrong user from katchau
           * ex: two users with similar emails, person.brazil and person.brazilian
           */
          const { name: ssoPrefix } = parseEntityRef(user.userEntityRef);
          requestModel.sso_email = `${ssoPrefix}@`;
        }

        if (
          !requestModel.username &&
          !requestModel.sso_email &&
          process.env.NODE_ENV === 'development'
        ) {
          requestModel.username = userGuest;
        }

        validateRequest(requestModel);

        const userFullData = await userService.getUser(requestModel);
        const groups = await groupsService.getUserGroups(userFullData.username);

        response.send(UserDTO(userFullData, groups));
      } catch (err) {
        if (typeof err === 'string') {
          response.status(500).send({ message: err });
        } else if (err instanceof ValidationError) {
          response.status(400).send({ message: err.message });
        } else if (err instanceof MultipleResultError) {
          response.status(400).send({
            message: 'more than one user was found from your request',
          });
        } else if (err instanceof NoResultError) {
          response.status(404).send({ message: err.message });
        } else if (err instanceof Error) {
          response.status(500).send({ message: err.message });
        } else {
          response.status(500).send({ message: err });
        }
      }
    })();
  });

  router.use(errorHandler());
  return router;
}
