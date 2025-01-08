import React, { PropsWithChildren, useContext, useEffect } from 'react';
import { Link, makeStyles } from '@material-ui/core';
import HomeIcon from '@material-ui/icons/Home';
import MenuBook from '@material-ui/icons/MenuBook';
import ExtensionIcon from '@material-ui/icons/Extension';
import Assessment from '@material-ui/icons/Assessment';
import LibraryBooks from '@material-ui/icons/LibraryBooks';
import Build from '@material-ui/icons/Build';
import LiveHelpIcon from '@material-ui/icons/LiveHelp';
import TimelineIcon from '@material-ui/icons/Timeline';
import CreateComponentIcon from '@material-ui/icons/AddCircleOutline';
import LogoFull from './LogoFull';
import LogoIcon from './LogoIcon';
import { NavLink } from 'react-router-dom';
import {
  Settings as SidebarSettings,
  UserSettingsSignInAvatar,
} from '@backstage/plugin-user-settings';
import {
  Sidebar,
  SidebarPage,
  sidebarConfig,
  SidebarItem,
  SidebarDivider,
  SidebarGroup,
  useSidebarOpenState,
} from '@backstage/core-components';
import SearchIcon from '@material-ui/icons/Search';
import MenuIcon from '@material-ui/icons/Menu';
import { SidebarSearchModal } from '@backstage/plugin-search';
import { SearchModal } from '../search/SearchModal';
import HistoryIcon from '@material-ui/icons/History';
import MapIcon from '@material-ui/icons/Map';
import { ThemeSelector } from './ThemeSelector';
import {
  configApiRef,
  errorApiRef,
  identityApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { NotFoundError } from '@backstage/errors';
import { Entity, stringifyEntityRef } from '@backstage/catalog-model';
import { CopyMoonlightToken } from './CopyMoonlightToken';
import { UserGroupsContext } from '@internal/plugin-picpay-commons';
import LayersIcon from '@material-ui/icons/Layers';
import { useHoustonContext } from '@internal/plugin-picpay-houston';

const useSidebarLogoStyles = makeStyles({
  root: {
    width: sidebarConfig.drawerWidthClosed,
    height: 3 * sidebarConfig.logoHeight,
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'center',
    marginBottom: -14,
  },
  link: {
    width: sidebarConfig.drawerWidthClosed,
    marginLeft: 24,
  },
});

const SidebarLogo = () => {
  const classes = useSidebarLogoStyles();
  const { isOpen } = useSidebarOpenState();

  return (
    <div className={classes.root}>
      <Link
        component={NavLink}
        to="/"
        underline="none"
        className={classes.link}
      >
        {isOpen ? <LogoFull /> : <LogoIcon />}
      </Link>
    </div>
  );
};

export const Root = ({ children }: PropsWithChildren<{}>) => {
  const { setUserGroups, setUserInfo } = useContext(UserGroupsContext);
  const identityApi = useApi(identityApiRef);
  const catalogApi = useApi(catalogApiRef);
  const errorApi = useApi(errorApiRef);
  const configApi = useApi(configApiRef);
  const { show_sidebar_metrics } = useHoustonContext();

  useEffect(() => {
    (async (): Promise<void> => {
      let userEntityRef;
      if (process.env.NODE_ENV === 'development') {
        userEntityRef = configApi.getOptionalString('localhost.userEntityRef') ?? 'user:default/user.guest'
      } else {
        const { userEntityRef: identityRef } = await identityApi.getBackstageIdentity();
        userEntityRef = identityRef
      }

      if (!userEntityRef) {
        errorApi.post(new NotFoundError('No user entity ref found'));
      }

      try {

        const { items } = await catalogApi.getEntities({
          fields: ['metadata', 'kind', 'spec.type', 'spec.children', 'relations'],
          filter: [
            {
              kind: 'group',
              ['relations.hasMember']: [userEntityRef],
            },
            {
              kind: 'group',
              ['spec.type']: 'chapter',
            }
          ],
        });

        const entityInfo = await catalogApi.getEntityByRef(userEntityRef);

        const groupValues = items
          .filter((e): e is Entity => Boolean(e))
          .map(item => ({
            label: item.metadata.title ?? item.metadata.name,
            ref: stringifyEntityRef(item),
            type: item.spec?.type as string ?? 'team',
            children: item.spec?.children as string[] ?? [],
            isOwnerOfEntities: item.relations?.find(r => r.type === 'owner') !== undefined,
          }))
          .sort((a, b) => (b.isOwnerOfEntities ? 1 : 0) - (a.isOwnerOfEntities ? 1 : 0));

        setUserGroups(groupValues);

        if (entityInfo)
          setUserInfo(entityInfo);
      } catch (err: any) {
        if (process.env.NODE_ENV !== "development") throw err;

        setUserGroups([
          {
            label: 'mock-team',
            ref: 'group:mock-team',
            type: 'team',
            children: [],
            isOwnerOfEntities: false,
          }
        ]);
      }

    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SidebarPage>
      <Sidebar>
        <SidebarLogo />
        <SidebarGroup label="Search" icon={<SearchIcon />} to="/search">
          <SidebarSearchModal>
            {({ toggleModal }) => <SearchModal toggleModal={toggleModal} />}
          </SidebarSearchModal>
        </SidebarGroup>
        <SidebarDivider />
        <SidebarGroup label="main" icon={<MenuIcon />}>
          <SidebarItem icon={HomeIcon} to="/home" text="Home" />
          <SidebarItem icon={MenuBook} to="/catalog" text="Catalog" />
          <SidebarItem icon={ExtensionIcon} to="api-docs" text="APIs" />
          <SidebarItem icon={LibraryBooks} to="docs" text="Docs" />
          <SidebarItem icon={MapIcon} to="tech-radar" text="Tech Radar" />
          {show_sidebar_metrics && <SidebarItem icon={TimelineIcon} to="tech-metrics" text="Metrics" />}
          <SidebarItem icon={LayersIcon} to="explore" text="Explore" />
          <SidebarItem icon={Assessment} to="reports" text="Reports" />
          <SidebarItem icon={LiveHelpIcon} to="qeta" text="Q&A" />
        </SidebarGroup>
        <SidebarGroup label="subitems" icon={<MenuIcon />}>
          <SidebarDivider />
          <SidebarItem icon={CreateComponentIcon} to="create" text="Create" />
          <SidebarItem icon={HistoryIcon} to="history" text="History" />
          <SidebarItem icon={Build} to="tools" text="Tools" />
          <CopyMoonlightToken />
        </SidebarGroup>
        <SidebarDivider />
        {/* <SidebarItem icon={Info} to="moonlight-info" text="Moonlight Info" /> */}
        <SidebarGroup
          label="Settings"
          icon={<UserSettingsSignInAvatar />}
          to="/settings"
        >
          <SidebarSettings />
          <ThemeSelector />
        </SidebarGroup>
      </Sidebar >
      {children}
    </SidebarPage >
  );
};
