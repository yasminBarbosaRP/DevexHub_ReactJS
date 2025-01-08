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
  Entity,
  EntityLink,
  parseEntityRef,
  RELATION_OWNED_BY,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import GroupIcon from '@material-ui/icons/Group';
import LocalOffer from '@material-ui/icons/LocalOffer';

import { LinkButton } from '@backstage/core-components';
import {
  IconComponent,
  useApi,
  useApp,
  useRouteRef,
} from '@backstage/core-plugin-api';
import {
  ScmIntegrationIcon,
  scmIntegrationsApiRef,
} from '@backstage/integration-react';
import {
  EntityRefLinks,
  FavoriteEntity,
  getEntityRelations,
  getEntitySourceLocation,
} from '@backstage/plugin-catalog-react';
import { TemplateEntityV1beta3 } from '@backstage/plugin-scaffolder-common';
import {
  Box,
  Card,
  Chip,
  IconButton,
  makeStyles,
  Tooltip,
  Typography,
} from '@material-ui/core';
import LanguageIcon from '@material-ui/icons/Language';
import React, { useCallback, useContext } from 'react';
import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import MoonlightLogo from './templateLogos/moonlight.svg';
import {
  sendEvent,
  UserGroups,
  UserGroupsContext,
} from '@internal/plugin-picpay-commons';
import TimelineIcon from '@material-ui/icons/Timeline';
import { TemplateContext } from '@internal/plugin-picpay-commons';

const useStyles = makeStyles(theme => ({
  card: {
    padding: theme.spacing(1.5),
    width: '320px',
    borderRadius: '8px',
    marginTop: theme.spacing(6),
    gap: '12px',
  },

  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  favoriteIcon: {
    marginLeft: 'auto',
    padding: '0',
  },

  cardLogoWrapper: {
    marginTop: '-48px',
    marginLeft: '12px',
    position: 'absolute',
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: '#fff',
    width: '55px',
    height: '55px',
    borderRadius: '50%',
    overflow: 'hidden',
    boxShadow: '0px 4px 4px 0px #00000040',
  },

  logo: {
    maxHeight: '75px',
    maxWidth: '75px',
    objectFit: 'contain',
  },

  templateOwner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  templateTagsWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  templateTags: {
    marginBottom: '8px',
  },

  templateTagItem: {
    marginTop: '8px',
    marginBottom: '0',
  },

  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: theme.spacing(1),
    minHeight: '56px',
  },

  cardCta: {
    marginLeft: 'auto',
  },
}));

const MuiIcon = ({ icon: Icon }: { icon: IconComponent }) => <Icon />;

export type TemplateCardProps = {
  template: TemplateEntityV1beta3;
  deprecated?: boolean;
};

type TemplateProps = {
  description: string;
  tags: string[];
  title: string;
  type: string;
  name: string;
  links: EntityLink[];
  hidden: boolean;
  groupAllowedView: string[];
  restrictions?: string[];
  image?: string;
};

const getTemplateCardProps = (
  template: TemplateEntityV1beta3
): TemplateProps & { key: string } => {
  return {
    key: template.metadata.uid!,
    name: template.metadata.name,
    title: `${template.metadata.title ?? template.metadata.name ?? ''}`,
    type: template.spec.type ?? '',
    hidden:
      (template.metadata.annotations?.['moonlight.picpay/hidden'] ?? false) !==
      false || false,
    groupAllowedView: (template.metadata?.groupAllowedView as string[]) ?? [],
    restrictions: (template.metadata?.restrictions as string[]) ?? [],
    description: template.metadata.description ?? '-',
    tags: (template.metadata?.tags as string[]) ?? [],
    links: template.metadata.links ?? [],
    image: ((template.spec as any) || {})?.imageData ?? null,
  };
};

export const validateCanViewRestrictedTemplate = (
  groupsAllowed: string[],
  userGroups: UserGroups[] | null
): boolean => {
  let allowedToView = false;

  if (groupsAllowed.length === 0) {
    return allowedToView;
  }

  if (userGroups) {
    userGroups.forEach(({ label }: any) => {
      if (groupsAllowed.includes(label)) {
        allowedToView = true;
        return;
      }
    });
  }

  return allowedToView;
};

export const handleSourceLocation = (
  template: Entity,
  scmIntegrationsApi: typeof scmIntegrationsApiRef.T
) => {
  let sourceLocation = getEntitySourceLocation(template, scmIntegrationsApi);
  const locationTargetUrl = sourceLocation?.locationTargetUrl;

  if (locationTargetUrl && !(locationTargetUrl.includes('main') || locationTargetUrl.includes('qa'))) {
    let branch = 'main';

    if (template.metadata.name.toLocaleLowerCase().endsWith('-qa')) {
      branch = 'qa';
    }

    const link = `${locationTargetUrl.substring(0, locationTargetUrl.indexOf('tree/'))}tree/${branch}`

    sourceLocation = {
      ...sourceLocation,
      locationTargetUrl: link,
    };

  }
  return sourceLocation;
}

export const CustomTemplateCard = ({ template }: TemplateCardProps) => {
  const app = useApp();
  const { userGroups } = useContext(UserGroupsContext);
  const templateRoute = useRouteRef(scaffolderPlugin.routes.selectedTemplate);
  const templateProps = getTemplateCardProps(template);
  const { extractIdentityValue } = useContext(TemplateContext);

  const ownedByRelations = getEntityRelations(
    template as Entity,
    RELATION_OWNED_BY
  );

  const classes = useStyles();
  const { name, namespace } = parseEntityRef(stringifyEntityRef(template));
  const href = templateRoute
    ? templateRoute({ templateName: name, namespace })
    : '';

  const canSeeDueToRestrictions = useCallback((): boolean => {
    try {
      if (templateProps.restrictions && templateProps.restrictions.length > 0) {
        return templateProps.restrictions.some(restriction =>
          extractIdentityValue(restriction, true) === 'true'
        );
      }
      return true;
    }catch(err) {
      return false;
    }
  }, [extractIdentityValue, templateProps])

  const iconResolver = (key?: string): IconComponent =>
    key ? app.getSystemIcon(key) ?? LanguageIcon : LanguageIcon;

  const scmIntegrationsApi = useApi(scmIntegrationsApiRef);
  const sourceLocation = handleSourceLocation(template, scmIntegrationsApi);
  const validateCanViewTemplate = validateCanViewRestrictedTemplate(
    templateProps.groupAllowedView,
    userGroups
  );

  if (templateProps.hidden && !validateCanViewTemplate || !canSeeDueToRestrictions()) {
    return null;
  }

  return (
    <Card className={classes.card}>
      <Box className={classes.cardHeader}>
        <Box className={classes.cardLogoWrapper}>
          <img
            src={templateProps.image ?? MoonlightLogo}
            alt={`${templateProps.title} template logo`}
            className={classes.logo}
          />
        </Box>

        <FavoriteEntity entity={template} className={classes.favoriteIcon} />
      </Box>
      <Typography variant="h4">{templateProps.title}</Typography>

      <Typography variant="body2">{templateProps.description}</Typography>

      <Box className={classes.templateOwner}>
        <Tooltip title="Owner">
          <GroupIcon />
        </Tooltip>
        <EntityRefLinks
          entityRefs={ownedByRelations}
          defaultKind="Group"
          hideIcons
        />
      </Box>

      <Box className={classes.templateTagsWrapper}>
        <Tooltip title="Tags">
          <LocalOffer />
        </Tooltip>
        <Box className={classes.templateTags}>
          {templateProps.tags?.map(tag => (
            <Chip
              size="small"
              label={tag}
              key={tag}
              className={classes.templateTagItem}
            />
          ))}
        </Box>
      </Box>
      <Box className={classes.cardFooter}>
        {sourceLocation && (
          <Tooltip
            title={
              sourceLocation.integrationType ?? sourceLocation.locationTargetUrl
            }
          >
            <IconButton href={sourceLocation.locationTargetUrl}>
              <ScmIntegrationIcon type={sourceLocation.integrationType} />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip
          key={`tasks_${name}`}
          title="Tasks"
        >
          <LinkButton size="medium" to={`/catalog/${namespace}/template/${name}/tasks`}>
            <MuiIcon icon={TimelineIcon} />
          </LinkButton>
        </Tooltip>

        {templateProps.links?.map(link => (
          <Tooltip
            key={`${link.url}_${link.title}`}
            title={link.title ?? link.url}
          >
            <IconButton size="medium" href={link.url}>
              <MuiIcon icon={iconResolver(link.icon)} />
            </IconButton>
          </Tooltip>
        ))}

        <LinkButton
          to={href}
          variant="contained"
          color="primary"
          href={href}
          aria-label={`Choose ${templateProps.title}`}
          className={classes.cardCta}
          onClick={() => {
            sendEvent('template_chosen', {
              category: 'template',
              label: templateProps.title,
              action: 'click',
            });
          }}
        >
          Choose
        </LinkButton>
      </Box>
    </Card>
  );
};