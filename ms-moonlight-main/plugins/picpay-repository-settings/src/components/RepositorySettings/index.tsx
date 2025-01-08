import React, { useCallback, useEffect, useState } from 'react';
import { Content, DocsIcon, Progress } from '@backstage/core-components';
import { IconComponent, alertApiRef, useApi, useApp } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import {
  RepositorySettings,
  RepositoryVisibility,
} from '@internal/plugin-picpay-scaffolder-github-common';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@material-ui/core';
import LockRounded from '@material-ui/icons/LockRounded';
import Save from '@material-ui/icons/Save';
import { Alert } from '@material-ui/lab';
import { RepositorySettingsApiRef } from '../../apis';
import { useStyles } from './styles';

export const RepositorySettingsForm = (props: {
  disable?: boolean;
  disableText?: string;
}) => {
  const classes = useStyles();
  const app = useApp();
  const MuiIcon = ({ icon: Icon }: { icon: IconComponent }) => <Icon />;
  const iconResolver = (key?: string): IconComponent =>
    key ? app.getSystemIcon(key) ?? DocsIcon : DocsIcon;

  const { entity } = useEntity();
  const api = useApi(RepositorySettingsApiRef);
  const alertApi = useApi(alertApiRef);

  const [loading, setLoading] = useState(true);
  const [formChanged, setFormChanged] = useState(false);
  const [disableForm, setDisableForm] = useState(true);
  const [error, setError] = useState<{ message: string, statusCode: number } | undefined>();
  const [setting, setSetting] = useState<RepositorySettings>({
    projectSlug: '',
    canUpdateSetting: false,
    protectionExists: false,
    requireApprovals: 0,
    requireCodeOwnerReviews: false,
    deleteBranchOnMerge: false,
    visibility: RepositoryVisibility.private,
  });

  useEffect(() => {
    api
      .getRepositorySettings(entity.metadata.name)
      .then(data => {
        setSetting(data);
        setDisableForm(!data.canUpdateSetting);
        setLoading(false);
      })
      .catch(({ error: err }) => {
        let annotations = ``;

        if (!entity?.metadata?.annotations?.['github.com/project-slug']) {
          annotations = `(Annotation 'github.com/project-slug' not found!)`;
        }

        setError({ message: `${err || 'Repository settings not found!'} ${annotations}`, statusCode: err?.status ?? err.statusCode ?? err.response?.statusCode ?? 404 });
        setDisableForm(true);
        setLoading(false);
      });
  }, [api, entity, entity.metadata.name, setLoading, setSetting]);

  const handleSubmit = useCallback(
    async (e: any) => {
      try {
        e.preventDefault();

        setLoading(true);

        const updatedSetting = await api.saveRepositorySettings(
          entity.metadata.name,
          setting,
        );

        setSetting(updatedSetting);
        setDisableForm(!updatedSetting.canUpdateSetting);
        setLoading(false);
        alertApi.post({
          message: 'Repository Settings updated successfully!',
          severity: 'success',
          display: 'transient',
        });
        setFormChanged(false);
      } catch (err: any) {
        alertApi.post({
          message: err?.error || 'error updating repository setting',
          severity: 'error',
          display: 'transient',
        });

        setLoading(false);
      }
    },
    [alertApi, api, setting, entity.metadata.name],
  );

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return (
      <Alert variant="filled" severity={error.statusCode === 404 ? "error" : "warning"}>
        {error.message}
      </Alert>
    )
  }

  return (
    <>
      {loading ? (
        <Progress />
      ) : (
        <>
          <Box className={classes.cardHeader}>
            <Typography variant="h4">Settings</Typography>
            <Button
              data-testid="see-more"
              variant="contained"
              color="primary"
              startIcon={<MuiIcon icon={iconResolver('github')} />}
              href={`https://github.com/${setting.projectSlug}`}
              target="_blank"
            >
              Repository
            </Button>
          </Box>
          <Content>
            <form noValidate autoComplete="off" onSubmit={handleSubmit}>
              <Grid
                container
                direction="row"
                spacing={3}
                className={classes.fieldsPadding}
              >
                <Grid item>
                  <Typography variant="h2" className={classes.label}>Pull Requests</Typography>
                  <TextField
                    data-testid="form-input"
                    label="Require approvals"
                    helperText="Required number of approvals before merging"
                    variant="filled"
                    value={setting.requireApprovals}
                    type="number"
                    disabled={disableForm || props.disable}
                    onChange={({ currentTarget }) => {
                      setFormChanged(true);
                      setSetting(old => ({
                        ...old,
                        requireApprovals: +currentTarget.value,
                      }))
                    }
                    }
                  />

                  <FormGroup>
                    <FormControlLabel
                      key="user_dismissible"
                      control={
                        <Checkbox
                          checked={setting.requireCodeOwnerReviews}
                          disabled={disableForm || props.disable}
                          onChange={(_e, value) => {
                            setFormChanged(true);
                            setSetting(old => ({
                              ...old,
                              requireCodeOwnerReviews: value,
                            }))
                          }
                          }
                        />
                      }
                      label="Require code owner reviews"
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormControlLabel
                      key="user_dismissible"
                      control={
                        <Checkbox
                          checked={setting.deleteBranchOnMerge}
                          disabled={disableForm || props.disable}
                          onChange={(_e, value) => {
                            setFormChanged(true);
                            setSetting(old => ({
                              ...old,
                              deleteBranchOnMerge: value,
                            }))
                          }
                          }
                        />
                      }
                      label="Delete branch on merge"
                    />
                  </FormGroup>
                </Grid>
              </Grid>

              <Grid
                container
                direction="row"
                spacing={3}
                className={classes.fieldsPadding}
              >
                <Grid item>
                  <Typography variant="h2" className={classes.label}>Visibility</Typography>
                  <FormControl component="fieldset">
                    <RadioGroup
                      aria-label="approve"
                      name="approve"
                      value={setting.visibility}
                      onChange={(_e, value) => {
                        setFormChanged(true);
                        setSetting(old => ({
                          ...old,
                          visibility: value as any,
                        }))
                      }
                      }
                    >
                      <FormControlLabel
                        value="public"
                        disabled={disableForm || props.disable}
                        control={<Radio />}
                        label={
                          <>
                            <strong>Public</strong> (Open to all PicPay members
                            for writing and reading, through the picpay-developers
                            team)
                          </>
                        }
                      />
                      <FormControlLabel
                        value="restricted"
                        disabled={disableForm || props.disable}
                        control={<Radio />}
                        label={
                          <>
                            <strong>Restricted</strong>
                            (Open to all PicPay members for read, through the
                            picpay-developers team)
                          </>
                        }
                      />
                      <FormControlLabel
                        value="private"
                        disabled={disableForm || props.disable}
                        control={<Radio />}
                        label={
                          <>
                            <strong>Private</strong> (Only the team that created
                            the repository can access it)
                          </>
                        }
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>
              </Grid>

              <Grid container>
                <Grid md={12}>
                  {!setting.protectionExists && !disableForm && <Alert severity='info'>The repository's default branch isn't protected; this action will create a protection.</Alert>}
                </Grid>
                <Grid item md={12} className={classes.buttonGroup}>
                  <Button
                    className={classes.buttonMargin}
                    variant="contained"
                    color="primary"
                    type="submit"
                    disabled={disableForm || props.disable || !formChanged}
                    startIcon={disableForm || props.disable ? <LockRounded /> : <Save />}
                  >
                    Save changes
                  </Button>
                </Grid>
                <Grid md={12}>
                  {(disableForm || props.disable) && !error && <Typography align="center" variant="h2" className={classes.label}>{props.disableText ?? <>You're not in entity's owner <b>{entity.spec?.owner as string}</b> group</>}</Typography>}
                </Grid>
              </Grid>
            </form>
          </Content>
        </>
      )}
    </>
  );
};
