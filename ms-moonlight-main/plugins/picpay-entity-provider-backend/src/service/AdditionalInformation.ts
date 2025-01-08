import { cleanObject } from '../provider/utils';
import { AdditionalInformation } from '../database/tables';
import { CatalogApi } from '@backstage/catalog-client';
import { Database } from '../database/Database';
import { BadRequestError } from '../exceptions';
import { parseEntityRef, stringifyEntityRef } from '@backstage/catalog-model';
import nunjucks from 'nunjucks';
import { EntityRef } from '../provider/Record';

const getLeadEntity = async (
  catalogApi: CatalogApi,
  req: any
): Promise<string> => {
  const userEntity: any = await catalogApi.getEntityByRef(
    req.body?.identifier.startsWith("group:") ? req.body?.identifier : `group:${req.body?.identifier}`
  );

  if (userEntity?.spec?.leadRef) {
    return userEntity?.spec?.leadRef.replace('user:', 'group:');
  }

  return `group:${req.body?.identifier}`;
};

const njucks = nunjucks.configure({
  throwOnUndefined: false,
  autoescape: false,
});


const userExists = async (
  catalogApi: CatalogApi,
  entityRef: string
): Promise<boolean> => {
  try {
    const userEntity = await catalogApi.getEntityByRef(
      entityRef.includes(":") ? entityRef : `user:${entityRef}`
    );
    if (userEntity?.metadata?.name) {
      return true;
    }
    return false;
  } catch (err: any) {
    return false;
  }
};


const mergeAdditionalInformation = (existingEntity: any, newEntity: any) => {
  const mergedEntity = { ...existingEntity };

  Object.keys(newEntity).forEach(key => {
    if (key !== 'members' && key !== 'github' && existingEntity.hasOwnProperty(key)) {
      mergedEntity[key] = newEntity[key];
    }
  });

  return mergedEntity;
};

const validateMembers = async (members: any, catalogApi: CatalogApi) => {
  if (!members) return;
  if (!Array.isArray(members) || members.some((m: any) => typeof m !== 'string')) {
    throw new BadRequestError('Members must be an array of strings');
  }

  if (members && Array.isArray(members)) {
    const exists = await Promise.all(members.map((m: string) => userExists(catalogApi, m)));
    if (exists.some((e) => !e)) {
      throw new BadRequestError('One or more members do not exist or the correct namespace wasnt provided');
    }
  }
}


const validateGithubTeams = async (github: string[], catalogApi: CatalogApi) => {
  if (!github) return;
  if (!Array.isArray(github) || github.some(g => typeof g !== 'string')) {
    throw new BadRequestError('Github teams must be an array of strings');
  }
  for (const gh of github) {
    const teamRef = parseEntityRef(gh, { defaultKind: 'group', defaultNamespace: 'default' });
    if (teamRef.kind !== 'group') {
      throw new BadRequestError(`Github team '${gh}' must be a group entityref`);
    }
    const entity = await catalogApi.getEntityByRef(teamRef);
    if (!entity) {
      throw new BadRequestError(`Github team '${gh}' does not exist`);
    }
  }
};

export const additionalInformationHandler = async ({
  catalogApi,
  database,
  req,
  res,
}: {
  catalogApi: CatalogApi;
  database: Database;
  req: any;
  res: any;
}) => {
  try {
    const entityRef = await getLeadEntity(catalogApi, req);

    const infos = await database.additionalInformationRepository().query({ content: { metadata: { name: req.body.name } } });
    const infosWithDiffEntityRef = infos?.filter((i) => i.entityRef !== entityRef) ?? [];
    if (infosWithDiffEntityRef.length > 0) {
      res.status(409).send('Entity with same name already exists');
      return;
    }

    await validateMembers(req.body.members, catalogApi);
    await validateGithubTeams(req.body.githubTeams, catalogApi);

    const info: Partial<AdditionalInformation> = {
      entityRef,
      orphan: false,
      content: cleanObject({
        metadata: {
          namespace: req.body.namespace,
          name: req.body.name,
          description: req.body.description,
        },
        spec: {
          type: req.body.type,
          profile: {
            displayName: req.body.displayName,
            email: req.body.email,
            picture: req.body.picture,
          },
        },
      }),
    };

    if (req.body.githubTeams && req.body.githubTeams.length > 0) {
      const groupRefs = req.body.githubTeams.map((gh: string) => stringifyEntityRef(parseEntityRef(gh, { defaultKind: 'group', defaultNamespace: 'default' })));
      // @ts-ignore
      info.content.spec.children = groupRefs;
    }

    const id = await database.additionalInformationRepository().save(info, infos?.[0]?.id);
    if (req.body.members) {
      await database.members().removeMembers(id);
      await Promise.all([
        ...(req.body.members ? req.body.members.map((member: string) =>
          database.members().save({ entityRef: member.includes(":") ? member : `user:${member}`, additionalInformationId: id })) : [])
      ]);
    }

    res.status(204).send({ id });
  } catch (err: any) {
    if (err instanceof BadRequestError) {
      res.status(400).send(err.message);
      return;
    }
    res.status(400).send(err?.message || 'Error getting entity ref');
    return;
  }
};


export const additionalInformationPatchHandler = async ({
  catalogApi,
  database,
  req,
  res,
}: {
  catalogApi: CatalogApi;
  database: Database;
  req: any;
  res: any;
}) => {
  try {
    const entity = await database.additionalInformationRepository().getById(req.params.id as string);
    if (!entity) {
      res.status(404).send('Entity not found');
      return;
    }

    await validateMembers(req.body.members, catalogApi);
    await validateGithubTeams(req.body.githubTeams, catalogApi);

    const newEntity: any = cleanObject(mergeAdditionalInformation(entity, req.body));

    if (req.body.githubTeams && req.body.githubTeams.length > 0) {
      const groupRefs = req.body.githubTeams.map((gh: string) => stringifyEntityRef(parseEntityRef(gh, { defaultKind: 'group', defaultNamespace: 'default' })));
      // @ts-ignore
      newEntity.content.spec.children = groupRefs;
    }

    const id = await database.additionalInformationRepository().save(newEntity, entity.id);

    if (req.body.members) {
      await database.members().removeMembers(id);
      await Promise.all([
        ...(req.body.members ? req.body.members.map((member: string) =>
          database.members().save({ entityRef: member, additionalInformationId: id })) : [])
      ]);
    }
    res.status(204).send({ id });
  } catch (err: any) {
    res.status(400).send(err?.message || 'Error getting entity ref');
    return;
  }
};


export const additionalInformationMembersWebhookHandler = async ({
  baseUrl,
  notModifiedTemplate,
  modifiedTemplate,
  replacedTemplate,
  database,
  req,
  res,
}: {
  baseUrl: string;
  notModifiedTemplate: string;
  modifiedTemplate: string;
  replacedTemplate: string;
  database: Database;
  req: any;
  res: any;
}) => {
  try {
    const entity = await database.additionalInformationRepository().query({ content: { metadata: { name: req.body.group?.name } } })
    if (!entity) {
      res.status(404).send('Entity not found');
      return;
    }

    const previousGroups = [];
    if (req.body.leadRef) {
      const leadGroups = await database.additionalInformationRepository().get(EntityRef.fromEmail(req.body.leadEmail, "group").toString(), false);
      for (const group of leadGroups) {
        if (group.id === entity[0].id) continue;
        const groupMembers = await database.members().getByAdditionalInformationId(group.id);
        if (!groupMembers || groupMembers.length === 0 || !groupMembers.find(e => e.entityRef === req.body.userRef)) continue;
        await database.members().removeFromGroup(req.body.userRef, group.id);
        previousGroups.push(group.content?.metadata?.name); 
      }
    }
    const groupMembers = await database.members().getByAdditionalInformationId(entity[0].id);
    const currentUserGroup = groupMembers?.find((m: any) => m.entityRef === req.body.userRef)
    if (currentUserGroup) {
      await fetch(`${baseUrl}/api/slack/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: req.body.leadEmail,
          message: await njucks.renderString(notModifiedTemplate, {
            leadEmail: req.body.leadEmail ?? 'unknown',
            leadRef: req.body.leadRef ?? 'unknown',
            userRef: req.body.userRef,
            group: entity[0]?.content ?? {},
          }),
        }),
      });
      res.status(204).send();
      return;
    }

    await database.members().save({ entityRef: req.body.userRef, additionalInformationId: entity[0].id })
    await fetch(`${baseUrl}/api/slack/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: req.body.leadEmail,
        message: await njucks.renderString(previousGroups.length > 0 ? replacedTemplate : modifiedTemplate, {
          leadEmail: req.body.leadEmail ?? 'unknown',
          leadRef: req.body.leadRef ?? 'unknown',
          userRef: req.body.userRef,
          group: entity[0]?.content ?? {},
          previousGroups: previousGroups.join(',')
        }),
      }),
    });
    res.status(202).send();
  } catch (err: any) {
    res.status(400).send(err?.message || 'Error getting entity ref');
    return;
  }
};

export const additionalInformationQuery = async ({
  database,
  req,
  res,
}: {
  catalogApi: CatalogApi;
  database: Database;
  req: any;
  res: any;
}) => {
  const entityRef: string = req.query.entityRef ?? "";
  const name: string = req.query.name ?? "";
  const orphan: boolean | undefined = req.query.orphan !== undefined ? req.query.orphan?.toString() === 'true' : req.query.orphan;
  let informations: AdditionalInformation[] | undefined = []
  if (entityRef && name) {
    res.status(400).send('entityRef and name cannot be filled at the same time');
    return;
  } else if (!entityRef && name) {
    informations = await database.additionalInformationRepository().query({ content: { metadata: { name } } });
  } else if (!entityRef && orphan === undefined) {
    informations = await database.additionalInformationRepository().getAll();
  } else if (!entityRef && orphan) {
    informations = await database.additionalInformationRepository().getOrphans();
  } else if (!entityRef && !orphan) {
    informations = await database.additionalInformationRepository().getNonOrphans();
  } else {
    informations = await database.additionalInformationRepository().get(entityRef);
  }
  const result = {
    data: informations ? await Promise.all(
      informations.map(async info => ({
        ...info,
        orphan: ['1', 'true'].includes(info.orphan.toString()),
        members: await database.members().getByAdditionalInformationId(info.id) ?? []
      }))
    ) : []
  };
  res.status(200).send(result);
};

export const additionalInformationMembers = async ({
  database,
  req,
  res,
}: {
  database: Database;
  req: any;
  res: any;
}) => {
  const id: string = req.params.id ?? "";
  if (!id) {
    res.status(400).send('id is required');
    return;
  }
  const members = await database.members().getByAdditionalInformationId(id);
  res.status(200).send({ data: members });
};



export const additionalInformationGetById = async ({
  database,
  req,
  res,
}: {
  database: Database;
  req: any;
  res: any;
}) => {
  const id: string = req.params.id ?? "";
  let informations: AdditionalInformation | undefined = undefined;
  if (!id) {
    res.status(400).send('id is required');
    return;
  }
  informations = await database.additionalInformationRepository().getById(id);
  res.status(200).send({ data: informations });
};

export const additionalInformationOrphans = async ({
  database,
  res,
}: {
  database: Database;
  res: any;
}) => {
  const orphans = await database.additionalInformationRepository().getOrphans();
  res.status(200).send({ data: orphans });
};

export const additionalInformationAssumeOrphan = async ({
  database,
  req,
  res,
}: {
  database: Database;
  req: any;
  res: any;
}) => {
  if (req.body.entityRef === undefined && req.body.name === undefined) {
    res.status(400).send('entityRef or name must be filled');
    return;
  }
  if (req.body.entityRef && req.body.name) {
    res.status(400).send('entityRef and name cannot be filled at the same time');
    return;
  }

  if (req.body.newEntityRef === undefined) {
    res.status(400).send('newEntityRef is required');
    return;
  }

  let orphans: AdditionalInformation[] | undefined = [];
  if (req.body.entityRef) {
    orphans = await database.additionalInformationRepository().query({ entityRef: req.body.entityRef as string, orphan: true });
  }
  if (req.body.name) {
    orphans = await database.additionalInformationRepository().query({ content: { metadata: { name: req.body.name as string } }, orphan: true });
  }
  if (!orphans || orphans.length === 0) {
    res.status(404).send('Entity not found');
    return;
  }

  await Promise.all(orphans.map((orphan) => {
    orphan.entityRef = req.body.newEntityRef;
    orphan.orphan = false;
    database.additionalInformationRepository().save(orphan, orphan.id);
  }));
  res.status(200).send({ data: orphans });
};

export const additionalInformationDelete = async ({
  database,
  req,
  res,
}: {
  database: Database;
  req: any;
  res: any;
}) => {
  const id: string = req.params.id as string ?? "";
  if (!id) {
    res.status(400).send('id is required');
    return;
  }
  const info = await database.additionalInformationRepository().getById(id);
  if (!info) {
    res.status(404).send('entity not found');
    return;
  }
  await database.members().removeMembers(id);
  await database.additionalInformationRepository().delete(id);
  res.status(204).send();
};


export const additionalInformationDeleteFromEntityRef = async ({
  database,
  req,
  res,
}: {
  database: Database;
  req: any;
  res: any;
}) => {
  try {
    const infos = await database.additionalInformationRepository().get(`${req.params.entityRef}`);
    await Promise.all(
      infos?.map(async i => await database.members().removeMembers(i.id)) ?? []
    );
    await Promise.all(
      infos?.map(async i => await database.additionalInformationRepository().delete(i.id)) ?? []
    );

    res.status(204).send();
  } catch (err: any) {
    if (err instanceof BadRequestError) {
      res.status(400).send(err.message);
      return;
    }
    res.status(400).send(err?.message || 'Error getting entity ref');
    return;
  }
};