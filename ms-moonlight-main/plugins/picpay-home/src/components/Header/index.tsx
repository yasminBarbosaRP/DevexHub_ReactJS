import React, { useContext, useEffect, useState } from 'react';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import * as core from '@material-ui/core';
import Search from '@material-ui/icons/Search';
import { Link, useNavigate } from 'react-router-dom';
import { useStyles } from './styles';
import { InfoApiRef, PicPayLogo, TemplateContext, UserGroups, UserGroupsContext } from '@internal/plugin-picpay-commons';
import { Chip, Fab, Grid } from '@material-ui/core';
import EditIcon from '@material-ui/icons/Edit';
import Avatar from '@material-ui/core/Avatar';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { CompoundEntityRef, DEFAULT_NAMESPACE, Entity, parseEntityRef, stringifyEntityRef } from '@backstage/catalog-model';
import { AnnouncementsCard } from '@internal/plugin-picpay-announcements';
import { Members } from '@internal/plugin-picpay-entity-provider-backend';
import {
  GitHubIcon,
  LinkButton,
} from '@backstage/core-components';
import { useHoustonContext } from '@internal/plugin-picpay-houston';
import Skeleton from '@material-ui/lab/Skeleton';


const EXTERNAL_NAMESPACE = 'external';
const MAX_AVATAR_PAGINATION = 7;

interface Squad {
  label: string;
  link: string;
  name: string;
  hasDefaultGroup: boolean;
  icon?: React.JSX.Element;
  entityRef: CompoundEntityRef;
}

interface UserAvatar {
  label: string;
  link: string;
  image: string;
}

interface Props {
  myTeams: boolean;
}

type TeamMember = `user:${string}`;

type SmallerTeam = {
  typeName?: string;
  members: TeamMember[];
  teamName: string;
  description?: string;
  picture?: string;
};

type ActionObjectFormData = {
  typeName?: string;
  actionToTake: string;
  newName?: string;
  description?: string;
  picture?: string;
  githubTeams?: string[];
  smallerTeams?: SmallerTeam[];
};

export const Header = (_props: Props) => {
  const classes = useStyles();
  const navigate = useNavigate();

  const flags = useHoustonContext();
  const { userInfo, userGroups } = useContext(UserGroupsContext);
  const { adGroup } = useContext(TemplateContext);

  const apiInfo = useApi(InfoApiRef);
  const alertApi = useApi(alertApiRef);

  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [loadingFormData, setLoadingFormData] = useState(true);

  const [search, setSearch] = useState('');
  const [displayName, setDisplayName] = useState<string | undefined>();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [avatars, setAvatars] = useState<UserAvatar[]>([]);
  const catalogApi = useApi(catalogApiRef);
  const [formData, setFormData] = useState<ActionObjectFormData>({
    actionToTake: '',
  });

  useEffect(() => {
    setDisplayName(firstName((userInfo?.spec?.profile as any)?.displayName ?? 'Guest User'));
  }, [userInfo]);

  useEffect(() => {
    const fillMembers = async () => {
      try {
        if (!adGroup || adGroup.length === 0) {
          setLoadingFormData(false);
          return;
        }

        const additionalFormData = {
          "blckr": true,
          ...(flags.allows_select_group_to_update ? { "allowedToSelectUser": true, "enforceUser": userInfo ? stringifyEntityRef(userInfo) : '' } : {}),
        };

        if (adGroup && adGroup.length > 1) {
          const smallerTeams = await Promise.all(adGroup.map(async (team: any) => {
            const members = await apiInfo.getMembers(team.id)
            return {
              typeName: team.spec.type,
              teamName: team.metadata.name.replace(`${team.spec.type}-`, ''),
              description: team.metadata.description ?? '',
              picture: team.spec?.profile?.picture ?? '',
              githubTeams: team.spec?.children ?? [],
              members: members.map((member: Members) => member.entityRef),
            }
          }));

          setFormData({
            ...additionalFormData,
            actionToTake: 'split',
            smallerTeams,
          });
          return
        }
        setFormData({
          ...additionalFormData,
          actionToTake: 'rename',
          newName: adGroup[0].metadata.name.replace(`${adGroup[0].spec.type}-`, ''),
          typeName: adGroup[0].spec.type,
          description: adGroup[0].metadata.description ?? '',
          picture: adGroup[0].spec?.profile?.picture ?? '',
          githubTeams: adGroup[0].spec?.children ?? [],
        });
      } catch (err: any) {
        alertApi.post({
          message: err.message,
          severity: 'error',
        });
      } finally {
        setLoadingFormData(false);
      }
    }
    fillMembers();
  }, [apiInfo, alertApi, flags, userInfo, adGroup]);

  useEffect(() => {
    const loadSquad = async () => {

      if (!userGroups) {
        return;
      }

      setSquads(
        userGroups
          .filter(u => !userGroups.find(e => e.children.includes(u.ref)))
          .map((item: { label: string, ref: string, type: string, children: string[] }) => {
            const hasDefaultGroup: boolean = !!item.children?.[0] && userGroups.some(
              (g: UserGroups) =>
                g.ref === item.children[0] &&
                [DEFAULT_NAMESPACE, EXTERNAL_NAMESPACE].includes(parseEntityRef(g.ref).namespace)
            );

            const groupRef = parseEntityRef(item.ref);

            return {
              label: item.label,
              link: `/catalog/${groupRef.namespace}/${groupRef.kind}/${groupRef.name}`,
              name: groupRef.name,
              entityRef: groupRef,
              hasDefaultGroup,
            };
          })
          .sort((a, b) => Number(b.hasDefaultGroup) - Number(a.hasDefaultGroup))
      );
    };

    loadSquad();
  }, [apiInfo, userGroups]);

  useEffect(() => {
    const loadAvatars = async () => {
      setLoadingAvatars(true);
      try {
        const filter = squads.filter(s => s.entityRef.namespace !== DEFAULT_NAMESPACE).map(squad => ({ 'relations.memberof': stringifyEntityRef(squad.entityRef) }));
        if (!filter || filter.length === 0) {
          setLoadingAvatars(false);
          return;
        }
        const { items: members } = await catalogApi.getEntities({
          filter
        });

        const userRef = stringifyEntityRef(userInfo as Entity);
        const uniqueMembers = Array.from(
          new Map(
            members.filter((item: Entity) => stringifyEntityRef(item) !== userRef).map((item: Entity) => [stringifyEntityRef(item), item])
          ).values()
        );

        setAvatars(
          uniqueMembers.map((item: Entity) => ({
            label: (item.spec?.profile as any)?.displayName ?? item.metadata.name,
            link: `/catalog/${item.metadata.namespace}/user/${item.metadata.name}`,
            // @ts-ignore
            image: item.spec?.profile?.picture ?? '',
          }))
        );
      } catch (err: any) {
        alertApi.post({
          message: err.message,
          severity: 'error',
        })
      }
      setLoadingAvatars(false);
    };
    if (squads.length > 0) {
      loadAvatars();
    }
  }, [apiInfo, alertApi, userInfo, catalogApi, setLoadingAvatars, setAvatars, squads]);

  const handleSearch = async () => {
    navigate(`/search?query=${search}`);
  };

  function firstName(name: string | undefined) {
    if (name?.split(' ').length === 1) {
      return name;
    }

    return name?.split(' ')[0];
  }

  const [showMore, setShowMore] = useState(false);

  const handleShowMore = () => {
    setShowMore(true);
  };

  const [showMoreAvatars, setShowMoreAvatars] = useState(false);

  const handleShowMoreAvatars = () => {
    setShowMoreAvatars(true);
  };

  const handleShowLess = () => {
    setShowMore(false);
  };

  const handleShowLessAvatars = () => {
    setShowMoreAvatars(false);
  };

  return (
    <Grid container>
      <Grid item md={12} xs={12}>
        <Grid container>
          <Grid item md={12} xs={12}>

            <span>Hello, {displayName}! </span>
            <form
              data-testid="form-search"
              className={classes.formSearch}
              onSubmit={e => {
                e.preventDefault();
                void handleSearch();
              }}
            >
              <core.InputLabel htmlFor="input-search" />
              <core.OutlinedInput
                fullWidth
                data-testid='input-search'
                className={classes.search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search for components names"
                id="input-search"
                startAdornment={
                  <core.InputAdornment position="start">
                    <Search />
                  </core.InputAdornment>
                }
              />
              <core.Button
                data-testid="btn-search"
                className={classes.buttonSearch}
                variant="contained"
                color="primary"
                type="submit"
              >
                Search
              </core.Button>
            </form>

          </Grid>
        </Grid>
      </Grid>
      <Grid item md={12} xs={12}>
        <Grid container className={classes.container}>
          <Grid item md={6} xs={12} className={classes.grid}>
            <div className={classes.divAjust}>
              {squads && squads.length > 0 && (
                <>
                  <Grid container md={12} xs={12} className={classes.orgGrid}>
                    <Grid md={!userInfo?.spec?.isLead ? 12 : 10} xs={!userInfo?.spec?.isLead ? 12 : 10}>
                      <span className={classes.spanSquad}>Your organization </span>
                    </Grid>
                    {userInfo?.spec?.isLead && (
                      <Grid md={2} xs={2} alignContent='flex-end'>
                        <core.Box className={classes.coreBox}>
                          <LinkButton data-testid="edit-organization" disabled={loadingFormData} size="small" color="primary" variant="text" to={`/create/templates/default/moonlight-template-additional-group-information-v2${formData.actionToTake ? `?formData=${JSON.stringify(formData)}` : ''}`}>
                            <EditIcon />
                          </LinkButton>
                        </core.Box>
                      </Grid>
                    )}
                  </Grid>
                  <Grid container md={12} xs={12} className={classes.orgGrid}>
                    <Grid md={12} xs={12}>
                      {squads
                        .slice(0, showMore ? squads.length : 5)
                        .map(({ entityRef, label, link, hasDefaultGroup }) => {
                          let icon;
                          if ([DEFAULT_NAMESPACE, EXTERNAL_NAMESPACE].includes(entityRef?.namespace)) {
                            icon = <GitHubIcon data-testid="icon" />;
                          } else if (hasDefaultGroup) {
                            // @ts-ignore
                            icon = <><PicPayLogo data-testid="icon" className="MuiChip-icon" color="primary" /><GitHubIcon data-testid="icon" className="MuiChip-icon" /></>
                          } else {
                            icon = <PicPayLogo data-testid="icon" />;
                          }
                          return (
                            <>
                              <Chip
                                key={`chip-squad-${label}`}
                                className={classes.chip}
                                onClick={() => navigate(link)}
                                data-testid="chips"
                                label={label}
                                component="a"
                                icon={icon}
                                size="small"
                                clickable
                              />
                            </>
                          );
                        })}
                      {squads.length > 5 && !showMore && (
                        <core.Button
                          className={classes.showMoreButton}
                          variant="contained"
                          color="primary"
                          onClick={handleShowMore}
                        >
                          <span className="textButton">+ {squads.length - 5}</span>
                        </core.Button>
                      )}
                      {showMore && (
                        <core.Button
                          className={classes.showMoreButton}
                          variant="contained"
                          color="primary"
                          onClick={handleShowLess}
                        >
                          <span className="textButton">- {squads.length - 5}</span>
                        </core.Button>
                      )}
                    </Grid>
                  </Grid>
                </>
              )}

              {loadingAvatars && (
                <Grid container md={12} xs={12}>
                  <Grid item md={12} xs={12}>
                    <span className={classes.spanSquad}>Members</span>
                  </Grid>

                  <Grid spacing={0} container md={12} xs={12} justifyContent='flex-start'>
                    <Grid item>
                      <Skeleton data-testid="loading-avatars" variant="circle" width="50px" height="50px" className={classes.avatar} />
                    </Grid>
                    <Grid item>
                      <Skeleton variant="circle" width="50px" height="50px" className={classes.avatar} />
                    </Grid>
                    <Grid item>
                      <Skeleton variant="circle" width="50px" height="50px" className={classes.avatar} />
                    </Grid>
                    <Grid item>
                      <Skeleton variant="circle" width="50px" height="50px" className={classes.avatar} />
                    </Grid>
                  </Grid>
                </Grid>
              )}

              {!loadingAvatars && avatars?.length > 0 && (
                <Grid container>
                  <Grid item md={12} xs={12}>
                    <span className={classes.spanSquad}>Members</span>
                  </Grid>
                  <Grid item md={12} xs={12}>
                    <Grid container spacing={0} >
                      {avatars
                        .slice(0, showMoreAvatars ? avatars.length : MAX_AVATAR_PAGINATION)
                        .map(({ label, link, image }) => (
                          <Grid item>
                            <core.Tooltip title={label} key={`avatar-squad-${label}`}>
                              <Link to={link}>
                                <Avatar
                                  key={`avatar-squad-${label}`}
                                  className={classes.avatar}
                                  alt={label}
                                  src={image}
                                />
                              </Link>
                            </core.Tooltip>
                          </Grid>
                        ))}

                      {avatars.length > MAX_AVATAR_PAGINATION + 1 && !showMoreAvatars && (
                        <Grid item>
                          <Fab
                            className={classes.showMoreButtonAvartar}
                            size="medium"
                            color="primary"
                            aria-label={`add ${avatars.length - MAX_AVATAR_PAGINATION}`}
                            variant="circular"
                            onClick={() => handleShowMoreAvatars()}
                          >
                            <AddIcon />
                          </Fab>
                        </Grid>
                      )}
                      {showMoreAvatars && (
                        <Grid item>
                          <Fab
                            className={classes.showMoreButtonAvartar}
                            size="medium"
                            color="primary"
                            aria-label={`remove ${avatars.length - MAX_AVATAR_PAGINATION}`}
                            variant="circular"
                            onClick={() => handleShowLessAvatars()}
                          >
                            <RemoveIcon />
                          </Fab>
                        </Grid>
                      )}
                    </Grid>
                  </Grid>
                </Grid>
              )}
            </div>
          </Grid>
          <Grid item md={6} xs={12} className={classes.grid}>
            <AnnouncementsCard />
          </Grid>
        </Grid>
      </Grid >
    </Grid >
  );
};

