import React from 'react';
import MDEditor from '@uiw/react-md-editor';
import { InfoCard } from '@backstage/core-components';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import {
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  FormGroup,
  makeStyles,
  TextField,
} from '@material-ui/core';
import {
  Announcement,
  announcementsApiRef,
  CreateAnnouncementRequest,
} from '../../api';
import { Autocomplete } from '@material-ui/lab';
import { useAsync } from 'react-use';

import { DateTimePicker, MuiPickersUtilsProvider } from '@material-ui/pickers';
import MomentUtils from '@date-io/moment';
import moment from 'moment';
import { useHoustonContext } from '@internal/plugin-picpay-houston';

const useStyles = makeStyles(theme => ({
  formRoot: {
    '& > *': {
      margin: theme.spacing(1),
    },
  },
}));

export type AnnouncementFormProps = {
  initialData: Announcement;
  onSubmit: (data: CreateAnnouncementRequest) => Promise<void>;
};

export const AnnouncementForm = ({
  initialData,
  onSubmit,
}: AnnouncementFormProps) => {
  const classes = useStyles();
  const identityApi = useApi(identityApiRef);
  const flags = useHoustonContext();

  let { expires_at } = initialData;

  if (!expires_at) {
    const dt = moment().add(30, 'days');
    dt.hours(23);
    dt.minutes(59);
    dt.seconds(59);
    dt.milliseconds(999);
    expires_at = dt.format();
  }

  const [form, setForm] = React.useState({
    ...initialData,
    expires_at: expires_at ?? null,
    user_dismissible: initialData.user_dismissible ?? false,
    category: initialData.category?.slug,
  });
  const [loading, setLoading] = React.useState(false);

  const announcementsApi = useApi(announcementsApiRef);
  const { value: categories, loading: categoriesLoading } = useAsync(
    () => announcementsApi.categories(),
    [announcementsApi],
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [event.target.id]: event.target.value,
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    setLoading(true);
    event.preventDefault();

    const userIdentity = await identityApi.getBackstageIdentity();
    const createRequest = {
      ...form,
      ...{
        publisher: userIdentity.userEntityRef,
      },
    };

    await onSubmit(createRequest);
    setLoading(false);
  };

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 365);

  if (!flags.admin_announcements) {
    return <></>;
  }

  return (
    <InfoCard
      title={initialData.title ? `Edit announcement` : 'New announcement'}
    >
      <form className={classes.formRoot} onSubmit={handleSubmit}>
        <TextField
          id="title"
          type="text"
          label="Title"
          value={form.title}
          onChange={handleChange}
          variant="outlined"
          fullWidth
          required
        />
        <Autocomplete
          fullWidth
          getOptionSelected={(option, value) => option.slug === value.slug}
          getOptionLabel={option => option.title}
          value={initialData.category}
          onChange={(_event, newInputValue) =>
            setForm({ ...form, category: newInputValue?.slug })
          }
          options={categories ?? []}
          loading={categoriesLoading}
          renderInput={params => (
            <TextField
              {...params}
              id="category"
              label="Category"
              variant="outlined"
              fullWidth
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {categoriesLoading ? (
                      <CircularProgress color="inherit" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
        <TextField
          id="excerpt"
          type="text"
          label="Excerpt"
          value={form.excerpt}
          onChange={handleChange}
          variant="outlined"
          fullWidth
          required
        />
        <MuiPickersUtilsProvider libInstance={moment} utils={MomentUtils}>
          <DateTimePicker
            clearable
            label="Expires at"
            variant="inline"
            value={form.expires_at}
            minDate={new Date()}
            required
            maxDate={maxDate}
            onChange={value =>
              setForm({ ...form, ...{ expires_at: value?.format() ?? '' } })
            }
            format="DD/MM/yyyy hh:mm:ss"
          />
        </MuiPickersUtilsProvider>
        <FormGroup>
          <FormControlLabel
            key="user_dismissible"
            control={
              <Checkbox
                checked={form.user_dismissible}
                onChange={(_e, value) =>
                  setForm({ ...form, ...{ user_dismissible: value } })
                }
              />
            }
            label="User dismissible"
          />
        </FormGroup>
        <MDEditor
          value={form.body}
          style={{ minHeight: '30rem' }}
          onChange={value => setForm({ ...form, ...{ body: value ?? '' } })}
        />
        <Button
          variant="contained"
          color="primary"
          type="submit"
          disabled={loading}
        >
          Submit
        </Button>
      </form>
    </InfoCard>
  );
};
