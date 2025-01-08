import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, Grid, Typography } from '@material-ui/core';
import DeleteForever from '@material-ui/icons/DeleteForever';
import Alert from '@material-ui/lab/Alert';
import { DocsIcon, Progress } from '@backstage/core-components';
import {
  alertApiRef,
  identityApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { Status } from './components/Status';
import { Approver } from './components/Approver';
import { FormDelete } from './components/FormDelete';
import { Steps } from './components/Steps';
import { Requester } from './components/Requester';
import { Reviewers } from './components/Reviewers';
import { Sanctuary2ApiRef } from '../../api';
import {
  StatusResponse,
  ProgressStatus,
  Action,
  StatusPage,
  ReviewerStatus,
  Exceptions,
  PatchModel,
} from '../../models';
import { useStyles } from './styles';
import { useEntity } from '@backstage/plugin-catalog-react';
import { RepositorySettingsForm } from '@internal/plugin-picpay-repository-settings';

export interface Entity {
  id: string;
  name: string;
  kind: string;
}

interface Props {
  status?: StatusResponse;
  entity?: Entity | null;
}

export const Management = (props: Props) => {
  const { status, entity: entityProp } = props;

  const classes = useStyles();
  const navigate = useNavigate();
  const api = useApi(Sanctuary2ApiRef);
  const identityApi = useApi(identityApiRef);
  const alertApi = useApi(alertApiRef);

  const { entity: _entity } = useEntity();

  const [action, setAction] = useState<Action | null>(null);
  const [values, setValues] = useState<StatusResponse | null>(null);
  const [email, setEmail] = useState<string | undefined>();
  const [statusPage, setStatusPage] = useState<StatusPage>(StatusPage.loading);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  );

  const [entity, setEntity] = useState({
    id: `${_entity?.metadata?.uid || ''}`,
    name: `${_entity?.metadata?.name || ''}`,
    kind: `${_entity?.kind || ''}`,
  });

  const isEntityPage = useCallback(() => {
    return _entity?.metadata?.name ? true : false
  }, [_entity])

  const getComponentId = useCallback(() => {
    return entity?.id || status?.component?.id || '';
  }, [status, entity]);

  const getStatus = useCallback(() => {
    const run = async () => {
      setStatusPage(StatusPage.loading);

      try {
        let res: StatusResponse | null = null;

        if (status?.id) {
          res = await api.getStatusByID(status?.id);
        } else if (getComponentId()) {
          res = await api.getStatusByID(getComponentId());
        }

        if (!res) {
          return;
        }

        if (res.error) {
          setValues(null);
          setStatusPage(StatusPage.success);
          return;
        }

        setValues(res);
        setStatusPage(StatusPage.success);
      } catch (err: any) {
        const { data } = await err.json();
        setStatusPage(StatusPage.error);
        setValues(null);

        switch (data) {
          case Exceptions.COMPONENT_NOT_FOUND:
            navigate('/not_found');
            break;
          case Exceptions.GROUP_OWNER_NOT_FOUND:
            setErrorMessage('Group owner not found.');
            break;
          case Exceptions.REVIEWERS_NOT_FOUND:
            setErrorMessage('Reviewers not found.');
            break;
          case Exceptions.FAILED_GET_REVIEWERS:
            setErrorMessage('An error occurred while getting reviewers.');
            break;
          case Exceptions.FAILED_GET_OWNER:
            setErrorMessage('An error occurred while getting owner.');
            break;
          default:
        }
      }
    };

    run();
  }, [api, status, navigate, getComponentId]);

  const patch = useCallback(
    (req: PatchModel) => {
      if (!values?.id || values?.status !== ProgressStatus.SCHEDULED) return;

      api
        .patch(values.id, req)
        .then(res => {
          if (res.error) {
            setErrorMessage(res.message || 'Unknown error on retry');
            return;
          }

          getStatus();
          alertApi.post({
            message: 'You will no longer receive reminders of this deletion.',
            severity: 'success',
          });
        })
        .catch(res => {
          setStatusPage(StatusPage.error);
          if (res.error) {
            setErrorMessage(res.message);
          }
        });
    },
    [values, api, alertApi, getStatus]
  );

  const shouldRenderReminderInfo = useCallback(() => {
    return (
      email === values?.requestedBy &&
      values?.deletionSchedule &&
      values?.scheduleReminderEnabled &&
      values?.status === ProgressStatus.SCHEDULED
    );
  }, [values, email]);

  const postRetry = useCallback(() => {
    if (!values?.id || values?.status !== ProgressStatus.ERROR) {
      return Promise.resolve();
    }

    return api
      .postRetry(values?.id)
      .then(res => {
        if (res.error) {
          setErrorMessage(res.message || 'Unknown error on retry');
          return;
        }

        getStatus();
      })
      .catch(res => {
        setStatusPage(StatusPage.error);
        if (res.error) {
          setErrorMessage(res.message);
        }
      });
  }, [values, api, getStatus]);

  const cancelDeletion = useCallback(async () => {
    if (
      !values?.id ||
      ![
        ProgressStatus.SCHEDULED,
        ProgressStatus.WAITING_FOR_APPROVAL,
        ProgressStatus.REJECTED,
      ].includes(values?.status)
    ) {
      return Promise.reject({
        message: `not allowed to delete requests of status ${values?.status}`,
      });
    }

    const res = await api.deleteRequest(values?.id);
    if (res?.error) {
      return Promise.reject(res);
    }

    getStatus();
    return res;
  }, [values, api, getStatus]);

  useEffect(() => {
    setStatusPage(StatusPage.loading);
    identityApi
      .getProfileInfo()
      .then(res => {
        setEmail(res.email);
        getStatus();
      })
      .catch(() => {
        setStatusPage(StatusPage.error);
      });
  }, [getStatus, identityApi]);

  useEffect(() => {
    if (!values) {
      return;
    }

    if (values.status !== ProgressStatus.WAITING_FOR_APPROVAL) {
      return;
    }

    const findReviewer = values.reviewers.find(
      el => email === el.email && el.status === ReviewerStatus.PENDING
    );

    if (findReviewer) {
      setAction(Action.approver);
    }
  }, [status, email, entity, values]);

  useEffect(() => {
    if (entityProp?.id) {
      setEntity(entityProp);
    }
  }, [entityProp]);

  return (
    <>
      {statusPage === StatusPage.loading && <Progress />}
      {/* <Header /> */}
      {statusPage === StatusPage.error && (
        <Alert data-testid="alert-error" severity="error">
          <strong>ERROR: </strong>
          {errorMessage || `An unexpected problem occurred.`} <br />
        </Alert>
      )}
      {statusPage === StatusPage.success && (
        <Grid container justifyContent="center" spacing={2}>
          {values?.id && values?.reviewers && action === Action.approver && (
            <Approver
              actionId={values?.id}
              email={email || ''}
              handleConfirm={() => {
                setAction(null);
                getStatus();
              }}
            />
          )}

          {values === null && (
            <>
              <Grid item xs={12} md={12}>
                <Grid container>
                  <Grid item xs={12} md={6}>
                    <Grid className={classes.card} item xs={12} md={12}>
                      <Box className={classes.cardHeader}>
                        <Typography variant="h4">Deletion</Typography>
                        <Button
                          data-testid="see-more"
                          variant="contained"
                          color="primary"
                          startIcon={<DocsIcon />}
                          href="/catalog/default/component/ms-fausthanos/docs/"
                          target="_blank"
                        >
                          Docs
                        </Button>
                      </Box>
                      <Box className={classes.cardContent}>
                        <div className={classes.buttonGroup}>
                          <Button
                            data-testid="btn-delete"
                            className={classes.buttonDelete}
                            variant="contained"
                            color="secondary"
                            startIcon={<DeleteForever />}
                            onClick={() => {
                              setAction(Action.delete);
                            }}
                            disabled={values !== null || action !== null}
                          >
                            Delete project
                          </Button>
                        </div>
                        {action === Action.delete && (
                          <FormDelete
                            componentId={getComponentId()}
                            appName={entity.name}
                            componentKind={entity.kind}
                            handleCancel={() => {
                              setAction(null);
                            }}
                            handleConfirm={(data: StatusResponse) => {
                              setValues(data.error ? null : data);
                            }}
                          />
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                  {isEntityPage() && (<Grid item xs={12} md={6}>
                    <Grid className={classes.card} item xs={12} md={12}>
                      <RepositorySettingsForm />
                    </Grid>
                  </Grid>)}
                </Grid>
              </Grid>
            </>
          )}

          {values?.id && (
            <>
              {isEntityPage() && values?.status !== ProgressStatus.SUCCESS && (
                <Grid
                  data-testid="requester-reminder-component"
                  item
                  xs={12}
                  md={12}
                >
                  <Card>
                    <Alert
                      data-testid="deletion-schedule"
                      severity="info"
                      className={classes.w100}
                    >
                      <strong>
                        You cannot change repository settings while a deletion request is open. You should cancel the deletion request first.
                      </strong>
                    </Alert>
                  </Card>
                </Grid>
              )}
              <Requester data={values} />
              {shouldRenderReminderInfo() && (
                <Grid
                  data-testid="requester-reminder-component"
                  item
                  xs={12}
                  md={12}
                >
                  <Card>
                    <Alert
                      data-testid="deletion-schedule"
                      severity="info"
                      className={classes.info}
                      onClick={() => patch({ scheduleReminderEnabled: false })}
                    >
                      <strong>
                        This deletion is scheduled to occur in the near future.
                        Consequently, you will receive constant email reminders
                        until that time.{' '}
                      </strong>{' '}
                      Click here to opt-out of the reminders.
                    </Alert>
                  </Card>
                </Grid>
              )}
              <Status
                data={values?.status || null}
                postRetry={postRetry}
                cancelDeletion={cancelDeletion}
                deletionSchedule={values?.deletionSchedule}
              />
              <Reviewers reviewers={values?.reviewers} />
              <Steps data={values} refresh={getStatus} />
            </>
          )}
        </Grid>
      )}
    </>
  );
};
