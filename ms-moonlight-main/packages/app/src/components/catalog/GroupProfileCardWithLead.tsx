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
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ANNOTATION_EDIT_URL,
  ANNOTATION_LOCATION,
  DEFAULT_NAMESPACE,
  GroupEntity,
  RELATION_CHILD_OF,
  RELATION_PARENT_OF,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import {
  Avatar,
  InfoCard,
  InfoCardVariants,
  Link,
} from '@backstage/core-components';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Tooltip from '@material-ui/core/Tooltip';
import {
  EntityRefLinks,
  catalogApiRef,
  getEntityRelations,
  useEntity,
} from '@backstage/plugin-catalog-react';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import AccountTreeIcon from '@material-ui/icons/AccountTree';
import Alert from '@material-ui/lab/Alert';
import CachedIcon from '@material-ui/icons/Cached';
import EditIcon from '@material-ui/icons/Edit';
import EmailIcon from '@material-ui/icons/Email';
import GroupIcon from '@material-ui/icons/Group';
import LeadIcon from '@material-ui/icons/AccountCircle';
import { useEntityPermission } from '@backstage/plugin-catalog-react/alpha';
import { catalogEntityRefreshPermission } from '@backstage/plugin-catalog-common/alpha';
import { LinksGroup } from './LinksGroup';
import { FullAdditionalInformation, InfoApiRef, Members, MoonlightBreadcrumbs, UserGroupsContext } from '@internal/plugin-picpay-commons';
import { entityTreeApiRef, EntityWithParents } from '@internal/plugin-picpay-entity-tree';
import { useHoustonContext } from '@internal/plugin-picpay-houston';


const CardTitle = (props: { title: string }) => (
  <Box display="flex" alignItems="center">
    <GroupIcon fontSize="inherit" />
    <Box ml={1}>{props.title}</Box>
  </Box>
);

type GroupEntityWithLead = GroupEntity & {
  spec: {
    leadRef?: string;
  };
};

type LinksBreadcrumbs = {
  title: string;
  href: string;
};

const generateLinks = (entity?: EntityWithParents): LinksBreadcrumbs[] | [] => {
  if (entity === undefined) {
    return [];
  }

  const href = `${entity.kind.toLowerCase()}:${entity.namespace}/${entity.name}`;
  let data = [{ title: entity.name, href }];

  if (entity.parents) {
    for (const parent of entity.parents) {
      data = [...data, ...generateLinks(parent)];
    }
  }

  return data;
};

/** @public */
export const GroupProfileCardWithLead = (props: {
  variant?: InfoCardVariants;
  showLinks?: boolean;
}) => {
  const flags = useHoustonContext();
  const { userInfo } = useContext(UserGroupsContext);

  const [dataParents, setDataParents] = useState<EntityWithParents>();
  const catalogApi = useApi(catalogApiRef);
  const alertApi = useApi(alertApiRef);
  const apiInfo = useApi(InfoApiRef);
  const entityTreeApi = useApi(entityTreeApiRef);
  const { entity: group } = useEntity<GroupEntityWithLead>();
  const { allowed: canRefresh } = useEntityPermission(
    catalogEntityRefreshPermission
  );

  const [leadInfo, setLeadInfo] = useState<FullAdditionalInformation[]>();

  const refreshEntity = useCallback(async () => {
    await catalogApi.refreshEntity(stringifyEntityRef(group));
    alertApi.post({
      message: 'Refresh scheduled',
      severity: 'info',
      display: 'transient',
    });
  }, [catalogApi, alertApi, group]);


  const {
    metadata: { namespace, name, description, title, annotations, links },
    spec: { profile },
  } = group;


  useEffect(() => {
    const fetchData = async () => {
      return await entityTreeApi.getParents(name, namespace, 'Group');
    }

    fetchData()
      .then(data => setDataParents(data))
      .catch(() => setDataParents(undefined));
  }, [entityTreeApi, name, namespace]);

  useEffect(() => {
    if (!group || !group.spec.leadRef || !userInfo) return;
    if (flags.allows_select_group_to_update || group.spec?.leadRef === stringifyEntityRef(userInfo)) {
      apiInfo.getFullAdditionalInformation(group.spec.leadRef.replace("user:", "group:")).then(setLeadInfo);
    }
  }, [group, apiInfo, flags, userInfo]);

  const getFormData = useCallback(() => {
    if (!leadInfo || leadInfo.length === 0) return undefined;
    const additionalFormData = {
      "blckr": true,
    };

    if (leadInfo && leadInfo.length > 1) {
      const smallerTeams = leadInfo.map((team: FullAdditionalInformation) => {
        return {
          typeName: team.content?.spec?.type ?? 'squad',
          teamName: team.content?.metadata.name.replace(`${team?.content?.spec?.type ?? 'squad'}-`, ''),
          description: team.content?.metadata.description ?? '',
          // @ts-ignore
          githubTeams: team.content?.spec?.children ?? [],
          // @ts-ignore
          picture: team?.content?.spec?.profile?.picture ?? '',
          members: team.members?.map((member: Members) => member.entityRef),
        }
      });

      return ({
        ...additionalFormData,
        ...(flags.allows_select_group_to_update ? { "allowedToSelectUser": true, "enforceUser": group.spec.leadRef ?? `group:${group.metadata.namespace ?? DEFAULT_NAMESPACE}/${smallerTeams[0].typeName}-${smallerTeams[0].teamName}` } : {}),
        actionToTake: 'split',
        smallerTeams,
      });
    }
    return ({
      ...additionalFormData,
      actionToTake: 'rename',
      newName: leadInfo[0].content?.metadata.name.replace(`${leadInfo[0].content?.spec?.type}-`, ''),
      ...(flags.allows_select_group_to_update ? { "allowedToSelectUser": true, "enforceUser": group.spec.leadRef ?? `group:${leadInfo[0].content?.metadata?.namespace ?? group.metadata.namespace ?? DEFAULT_NAMESPACE}/${leadInfo[0].content?.metadata?.name}` } : {}),
      typeName: leadInfo[0].content?.spec?.type,
      // @ts-ignore
      githubTeams: leadInfo[0].content?.spec?.children ?? [],
      description: leadInfo[0].content?.metadata.description ?? '',
      // @ts-ignore
      picture: leadInfo[0].content?.spec?.profile?.picture ?? '',
    });
  }, [leadInfo, group, flags.allows_select_group_to_update]);

  if (!group) {
    return <Alert severity="error">Group not found</Alert>;
  }

  const childRelations = getEntityRelations(group, RELATION_PARENT_OF, {
    kind: 'Group',
  });
  const parentRelations = getEntityRelations(group, RELATION_CHILD_OF, {
    kind: 'group',
  });

  const entityLocation = annotations?.[ANNOTATION_LOCATION];
  const allowRefresh =
    entityLocation?.startsWith('url:') || entityLocation?.startsWith('file:');
  const displayName = profile?.displayName ?? title ?? name;
  const emailHref = profile?.email ? `mailto:${profile.email}` : '#';

  const formData = getFormData();
  const templateLink = `/create/templates/default/moonlight-template-additional-group-information-v2?formData=${encodeURIComponent(JSON.stringify(formData))}`;
  const entityMetadataEditUrl =
    group.metadata.annotations?.[ANNOTATION_EDIT_URL];
  const infoCardAction = entityMetadataEditUrl ? (
    <IconButton
      aria-label="Edit"
      title="Edit Group"
      component={Link}
      to={entityMetadataEditUrl}
    >
      <EditIcon />
    </IconButton>
  ) : (
    <IconButton
      aria-label="Edit"
      title="Edit Group"
      component={Link}
      to={templateLink}
      disabled={!formData?.actionToTake}
    >
      <EditIcon />
    </IconButton>
  );

  return (
    <>
      <MoonlightBreadcrumbs
        inverse
        active={name}
        links={generateLinks(dataParents)}
        iconComponent={
          <ListItemIcon>
            <Tooltip title="Structure">
              <AccountTreeIcon />
            </Tooltip>
          </ListItemIcon>
        }
      />

      <InfoCard
        title={<CardTitle title={displayName} />}
        subheader={description}
        variant={props.variant}
        action={
          <>
            {allowRefresh && canRefresh && (
              <IconButton
                aria-label="Refresh"
                title="Schedule entity refresh"
                onClick={refreshEntity}
              >
                <CachedIcon />
              </IconButton>
            )}
            {infoCardAction}
          </>
        }
      >
        <Grid container spacing={1}>
          <Grid item xs={12} sm={1} xl={1}>
            <Avatar displayName={displayName} picture={profile?.picture} />
          </Grid>
          <Grid item md={11} xl={11}>
            <List>
              {profile?.email && (
                <ListItem>
                  <ListItemIcon>
                    <Tooltip title="Email">
                      <EmailIcon />
                    </Tooltip>
                  </ListItemIcon>
                  <ListItemText
                    primary={<Link to={emailHref}>{profile.email}</Link>}
                    secondary="Email"
                  />
                </ListItem>
              )}
              <ListItem>
                <ListItemIcon>
                  <Tooltip title="Department">
                    <AccountTreeIcon />
                  </Tooltip>
                </ListItemIcon>
                <ListItemText
                  primary={
                    parentRelations.length ? (
                      <EntityRefLinks
                        entityRefs={parentRelations}
                        defaultKind="Group"
                      />
                    ) : (
                      'N/A'
                    )
                  }
                  secondary="Department"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Tooltip title="Team leader">
                    <LeadIcon />
                  </Tooltip>
                </ListItemIcon>
                <ListItemText
                  primary={
                    group.spec.leadRef ? (
                      <EntityRefLinks
                        entityRefs={[group.spec.leadRef]}
                        defaultKind="Group"
                      />
                    ) : (
                      'N/A'
                    )
                  }
                  secondary="Team leader"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Tooltip title="Subgroup">
                    <GroupIcon />
                  </Tooltip>
                </ListItemIcon>
                <ListItemText
                  primary={
                    childRelations.length ? (
                      <EntityRefLinks
                        entityRefs={childRelations}
                        defaultKind="Group"
                      />
                    ) : (
                      'N/A'
                    )
                  }
                  secondary="Subgroup"
                />
              </ListItem>

              {props?.showLinks && <LinksGroup links={links} />}
            </List>
          </Grid>
        </Grid>
      </InfoCard>
    </>
  );
};
