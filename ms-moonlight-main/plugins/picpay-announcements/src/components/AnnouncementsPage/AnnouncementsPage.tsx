import React, { ReactNode } from 'react';
import { useAsyncRetry } from 'react-use';
import { useLocation } from 'react-router-dom';
import { usePermission } from '@backstage/plugin-permission-react';
import {
  announcementCreatePermission,
  announcementUpdatePermission,
  announcementDeletePermission,
} from '@internal/plugin-picpay-announcements-common';
import { DateTime } from 'luxon';
import {
  Page,
  Header,
  Content,
  Link,
  ItemCardGrid,
  Progress,
  ItemCardHeader,
  ContentHeader,
  LinkButton,
  GitHubIcon,
} from '@backstage/core-components';
import { alertApiRef, useApi, useRouteRef } from '@backstage/core-plugin-api';
import { parseEntityRef } from '@backstage/catalog-model';
import {
  EntityPeekAheadPopover,
  entityRouteRef,
} from '@backstage/plugin-catalog-react';
import Alert from '@material-ui/lab/Alert';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  makeStyles,
} from '@material-ui/core';
import {
  announcementCreateRouteRef,
  announcementEditRouteRef,
  announcementViewRouteRef,
  rootRouteRef,
} from '../../routes';
import { Announcement, announcementsApiRef } from '../../api';
import { DeleteAnnouncementDialog } from './DeleteAnnouncementDialog';
import { useDeleteAnnouncementDialogState } from './useDeleteAnnouncementDialogState';
import { GithubAnnouncementDialog } from './GithubAnnouncementDialog';
import { useGithubAnnouncementDialogState } from './useGithubAnnouncementDialogState';
import { Pagination } from '@material-ui/lab';
import { ContextMenu } from './ContextMenu';
import { useHoustonContext } from '@internal/plugin-picpay-houston';

const useStyles = makeStyles(theme => ({
  cardHeader: {
    color: theme.palette.text.primary,
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: theme.spacing(4),
  },
}));

const AnnouncementCard = ({
  announcement,
  onSendToGithub,
  onDelete,
}: {
  announcement: Announcement;
  onSendToGithub: () => void;
  onDelete: () => void;
}) => {
  const classes = useStyles();
  const flags = useHoustonContext();
  const announcementsLink = useRouteRef(rootRouteRef);
  const viewAnnouncementLink = useRouteRef(announcementViewRouteRef);
  const editAnnouncementLink = useRouteRef(announcementEditRouteRef);
  const entityLink = useRouteRef(entityRouteRef);

  const publisherRef = parseEntityRef(announcement.publisher);
  const title = (
    <Link
      className={classes.cardHeader}
      to={viewAnnouncementLink({ id: announcement.id })}
    >
      {announcement.title}
    </Link>
  );
  const subTitle = (
    <>
      By{' '}
      <EntityPeekAheadPopover entityRef={announcement.publisher}>
        <Link to={entityLink(publisherRef)}>{publisherRef.name}</Link>
      </EntityPeekAheadPopover>
      {announcement.category && (
        <>
          {' '}
          in{' '}
          <Link
            to={`${announcementsLink()}?category=${announcement.category.slug}`}
          >
            {announcement.category.title}
          </Link>
        </>
      )}
      , {DateTime.fromISO(announcement.created_at).toRelative()}
    </>
  );
  const { loading: loadingCreatePermission, allowed: canCreate } =
    usePermission({ permission: announcementCreatePermission });
  const { loading: loadingDeletePermission, allowed: canDelete } =
    usePermission({ permission: announcementDeletePermission });
  const { loading: loadingUpdatePermission, allowed: canUpdate } =
    usePermission({ permission: announcementUpdatePermission });

  return (
    <Card>
      <CardMedia>
        <ItemCardHeader title={title} subtitle={subTitle} />
      </CardMedia>
      <CardContent>{announcement.excerpt}</CardContent>
      {flags.admin_announcements && (
        <CardActions>
          {!loadingCreatePermission && canCreate && (
            <Button onClick={onSendToGithub} color="default">
              <GitHubIcon />
            </Button>
          )}
          {!loadingUpdatePermission && canUpdate && (
            <LinkButton
              to={editAnnouncementLink({ id: announcement.id })}
              color="default"
            >
              <EditIcon />
            </LinkButton>
          )}
          {!loadingDeletePermission && canDelete && (
            <Button onClick={onDelete} color="default">
              <DeleteIcon />
            </Button>
          )}
        </CardActions>
      )}
    </Card>
  );
};

const AnnouncementsGrid = ({
  maxPerPage,
  category,
}: {
  maxPerPage: number;
  category?: string;
}) => {
  const classes = useStyles();
  const announcementsApi = useApi(announcementsApiRef);
  const alertApi = useApi(alertApiRef);

  const [page, setPage] = React.useState(1);
  const handleChange = (_event: any, value: number) => {
    setPage(value);
  };

  const {
    value: announcementsList,
    loading,
    error,
    retry: refresh,
  } = useAsyncRetry(
    async () =>
      announcementsApi.announcements({ max: maxPerPage, page, category }),
    [page, maxPerPage, category],
  );
  const {
    isOpen: isDeleteDialogOpen,
    open: openDeleteDialog,
    close: closeDeleteDialog,
    announcement: announcementToDelete,
  } = useDeleteAnnouncementDialogState();
  const {
    isOpen: isGithubDialogOpen,
    open: openGithubDialog,
    close: closeGithubDialog,
    announcement: announcementToGithub,
  } = useGithubAnnouncementDialogState();

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  const onCancelDialog = () => {
    closeDeleteDialog();
    closeGithubDialog();
  };
  const onConfirmDelete = async () => {
    onCancelDialog();

    try {
      await announcementsApi.deleteAnnouncementByID(announcementToDelete!.id);

      alertApi.post({ message: 'Announcement deleted.', severity: 'success' });
    } catch (err) {
      alertApi.post({ message: (err as Error).message, severity: 'error' });
    }

    refresh();
  };
  const onConfirmSendToGithub = async () => {
    onCancelDialog();

    try {
      await announcementsApi.sendAnnouncementToGithub(announcementToGithub!.id);

      alertApi.post({ message: 'Announcement sended.', severity: 'success' });
    } catch (err) {
      alertApi.post({ message: (err as Error).message, severity: 'error' });
    }

    refresh();
  };

  return (
    <>
      <ItemCardGrid>
        {announcementsList?.results!.map(announcement => (
          <AnnouncementCard
            key={announcement.id}
            announcement={announcement}
            onSendToGithub={() => openGithubDialog(announcement)}
            onDelete={() => openDeleteDialog(announcement)}
          />
        ))}
      </ItemCardGrid>

      {announcementsList && +announcementsList.count > 0 && (
        <div className={classes.pagination}>
          <Pagination
            count={Math.ceil(announcementsList.count / maxPerPage)}
            page={page}
            onChange={handleChange}
          />
        </div>
      )}

      <DeleteAnnouncementDialog
        open={isDeleteDialogOpen}
        onCancel={onCancelDialog}
        onConfirm={onConfirmDelete}
      />
      <GithubAnnouncementDialog
        open={isGithubDialogOpen}
        onCancel={onCancelDialog}
        onConfirm={onConfirmSendToGithub}
      />
    </>
  );
};

type AnnouncementsPageProps = {
  themeId: string;
  title: string;
  subtitle?: ReactNode;
  maxPerPage?: number;
  category?: string;
};

export const AnnouncementsPage = (props: AnnouncementsPageProps) => {
  const location = useLocation();
  const flags = useHoustonContext();
  const queryParams = new URLSearchParams(location.search);
  const newAnnouncementLink = useRouteRef(announcementCreateRouteRef);
  const { loading: loadingCreatePermission, allowed: canCreate } =
    usePermission({ permission: announcementCreatePermission });

  return (
    <Page themeId={props.themeId}>
      <Header title={props.title} subtitle={props.subtitle}>
        <ContextMenu />
      </Header>

      <Content>
        <ContentHeader title="">
          {flags.admin_announcements && !loadingCreatePermission && (
            <LinkButton
              disabled={!canCreate}
              to={newAnnouncementLink()}
              color="primary"
              variant="contained"
            >
              New announcement
            </LinkButton>
          )}
        </ContentHeader>

        <AnnouncementsGrid
          maxPerPage={props.maxPerPage ?? 10}
          category={props.category ?? queryParams.get('category') ?? undefined}
        />
      </Content>
    </Page>
  );
};
