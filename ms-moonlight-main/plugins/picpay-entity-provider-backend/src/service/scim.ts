import _ from 'lodash';
import { cleanObject } from '../provider/utils';
import { EntityRef } from '../provider/Record';
import { Database } from '../database/Database';
import express from 'express';
import { LoggerService } from '@backstage/backend-plugin-api';


export const EXTENSION_ENTERPRISE =
  'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User';

export interface ScimUser {
  schemas: string[];
  id: string;
  userName: string;
  name: {
    givenName: string;
    familyName: string;
  };
  emails: {
    value: string;
    type: string;
    primary: boolean;
  }[];
  externalId: string;
  active: boolean;
  meta: {
    resourceType: string;
    location: string;
  };
}

export function mapContentToScimUser({
  id,
  externalId,
  meta,
  userName,
  name,
  active,
  emails,
  ...content
}: any): ScimUser {
  const result: any = {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id,
    userName,
    name,
    emails,
    externalId,
    active,
    meta,
  };

  if (content[EXTENSION_ENTERPRISE]) {
    result.schemas.push(
      'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'
    );
    result[EXTENSION_ENTERPRISE] = content[EXTENSION_ENTERPRISE];
  }

  return result;
}

const fixPath = (path: string) =>
  path
    .replace('urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:', '')
    .replace('/', '.');

export function applyOperations(content: any, operations: any) {
  const newContent = _.cloneDeep(content);
  if (!operations) return newContent;
  
  operations.forEach((operation: any) => {
    const fixedPath = fixPath(operation.path);

    switch (`${operation.op}`.toLowerCase()) {
      case 'add':
      case 'replace':
        if (operation.path.startsWith(EXTENSION_ENTERPRISE)) {
          if (!newContent[EXTENSION_ENTERPRISE]) {
            newContent[EXTENSION_ENTERPRISE] = {};
          }
          _.set(newContent[EXTENSION_ENTERPRISE], fixedPath, operation.value);
        } else {
          _.set(newContent, fixedPath, operation.value);
        }
        break;

      case 'remove':
        if (operation.path.startsWith(EXTENSION_ENTERPRISE)) {
          _.unset(newContent[EXTENSION_ENTERPRISE], fixedPath);
        } else {
          _.unset(newContent, fixedPath);
        }
        break;

      default:
        break;
    }
  });

  return cleanObject(newContent);
}

export function managerChanged(content: any, newContent: any): boolean {
  return (
    content[EXTENSION_ENTERPRISE]?.manager !==
    newContent[EXTENSION_ENTERPRISE]?.manager
  );
}

export function isNowInactive(content: any, newContent: any): boolean {
  return (
    content?.active.toString().toLowerCase() === 'true' &&
    newContent?.active.toString().toLowerCase() === 'false'
  );
}

export function departmentChanged(content: any, newContent: any): boolean {
  return (
    content[EXTENSION_ENTERPRISE]?.department !==
    newContent[EXTENSION_ENTERPRISE]?.department
  );
}

export function getManagerEmail(content: any): string | undefined {
  return content[EXTENSION_ENTERPRISE]?.manager ?? undefined;
}

export async function handleActiveChanged(database: Database, previousContent: any, newContent: any) {
  if (!isNowInactive(previousContent.content, newContent)) {
    return;
  }

  await database.additionalInformationRepository().makeItOrphan(
    EntityRef.fromEmail(newContent.id, 'group').toString()
  );
  await database.members().remove(
    EntityRef.fromEmail(newContent.id, 'user').toString()
  );

}

export async function handleManagerChange(database: Database, previousContent: any, newContent: any) {
  if (!managerChanged(previousContent.content, newContent)) {
    return;
  }

  const userEntityRef = EntityRef.fromEmail(newContent.id, 'user').toString();
  const previousManager = getManagerEmail(previousContent.content);

  if (!previousManager) {
    return;
  }

  const previousManagerInfo = await database.microsoftAD().get(previousManager);
  if (!previousManagerInfo) {
    return;
  }

  const userGroupRef = EntityRef.fromEmail(newContent.id, 'group').toString();
  const previousManagerGroupRef = EntityRef.fromEmail(previousManager, 'group').toString();

  if (departmentChanged(previousContent.content, newContent) || previousManagerInfo?.content?.active) {
    // user was moved to another department with another manager
    const groups = await database.additionalInformationRepository().get(previousManagerGroupRef);

    await database.additionalInformationRepository().makeItOrphan(userGroupRef);
    await Promise.all(groups.map(async (group) =>
      database.members().removeFromGroup(userEntityRef, group.id)
    ));

  }
}

export const authorizeScim =
  (scimToken: string) => (req: any, res: any, next: any) => {
    const authorizedBearer = `Bearer ${scimToken}`;

    if (authorizedBearer !== req.headers.authorization) {
      res.status(401).send('Unauthorized');
      return;
    }

    next();
  };

export interface BulkOperation {
  method?: string;
  path?: string;
  body?: any;
}

export interface BulkOperationResult {
  status: string;
  location?: string;
  response?: any;
}

export async function createUser(
  req: express.Request<Record<string, any>, any, { userName: string }>,
  res: express.Response,
  logger: LoggerService,
  database: Database,
): Promise<void> {
  try {
    const content = {
      id: req.body.userName,
      ...req.body,
    };

    logger.info(`Creating user: ${content.id}`);
    await database.microsoftAD().create({ id: content.id, content });
    await database.events().save("POST", `/scim/v2/Users`, 200, req.body);
    res.status(200).send(content);
  } catch (e) {
    logger.error(`Could not create user: ${req?.body?.userName}`, {
      error: e instanceof Error ? e.message : '',
    });
    await database.events().save("POST", `/scim/v2/Users`, 400, e instanceof Error ? e.message : 'Could not create user');
    res.status(400).send({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: e instanceof Error ? e.message : 'Could not create user',
      status: 400,
    });
  }
}

export async function patchUser(
  req: any,
  res: express.Response,
  logger: LoggerService,
  database: Database,
): Promise<void> {
  try {
    const previousContent = await database.microsoftAD().get(req.params.id);

    if (!previousContent?.content) {
      res.status(404).send({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: 'User not found',
        status: 404,
      });

      return;
    }

    const newContent = applyOperations(previousContent.content, req?.body?.Operations);

    logger.info(`Updating user: ${previousContent.id}`);
    await database.microsoftAD().update(previousContent.id, newContent);

    await handleManagerChange(database, previousContent, newContent);
    await handleActiveChanged(database, previousContent, newContent);

    await database.events().save("PATCH", `/scim/v2/Users/${req.params.id}`, 200, req.body);
    res.status(200).send(newContent);
  } catch (e) {
    logger.error(`Could not update user: ${req?.body?.userName}`, {
      error: e instanceof Error ? e.message : '',
    });
    await database.events().save("PATCH", `/scim/v2/Users/${req.params.id}`, 400, e instanceof Error ? e.message : 'Could not update user');
    res.status(400).send({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: e instanceof Error ? e.message : 'Could not update user',
      status: 400,
    });
  }
}

export async function deleteUser(
  req: any,
  res: express.Response,
  logger: LoggerService,
  database: Database,
): Promise<void> {
  try {
    const result = await database.microsoftAD().get(req.params.id);

    if (!result?.content) {
      res.status(404).send({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: 'User not found',
        status: 404,
      });

      return;
    }

    logger.info(`Deleting user: ${result.id}`);
    result.content.active = false;
    await database.microsoftAD().update(result.id, result.content);

    await database.additionalInformationRepository().makeItOrphan(
      EntityRef.fromEmail(result.id, 'group').toString() // elton.carvalho@picpay.com -> group:picpay/elton-carvalho
    );
    await database.members().remove(
      EntityRef.fromEmail(result.id, 'user').toString() // elton.carvalho@picpay.com -> user:picpay/elton-carvalho
    );
    await database.events().save("DELETE", `/scim/v2/Users/${req.params.id}`, 200, req.body);
    res.status(204).send();
  } catch (e) {
    logger.error(`Could not delete user: ${req?.params?.id}`);
    await database.events().save("DELETE", `/scim/v2/Users/${req.params.id}`, 400, e instanceof Error ? e.message : 'Could not delete user');
    res.status(400).send({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Could not delete user',
      status: 400,
    });
  }
}