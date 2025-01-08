import { Button, TextField } from '@material-ui/core';
import React, { useState } from 'react';
import { useStyles } from './styles';

interface Props {
  componentId: string;
  appName: string;
  handleCancel: Function;
  handleConfirm: (componentId: string, appName: string) => any;
}

export const FormRename = (props: Props) => {
  const { componentId, appName, handleCancel, handleConfirm } = props;
  const classes = useStyles();
  const [value, setValue] = useState('');

  return (
    <form noValidate autoComplete="off" className={classes.form}>
      <TextField
        data-testid="form-input"
        className={classes.textField}
        label="Insira o novo nome:"
        placeholder="ex: ms-new-name-component"
        variant="filled"
        value={value}
        onChange={e => {
          setValue(e.currentTarget.value);
        }}
      />
      <div className={classes.formActions}>
        <Button
          data-testid="btn-cancel"
          className={classes.formAction}
          variant="contained"
          color="primary"
          onClick={() => {
            handleCancel();
          }}
        >
          Cancel
        </Button>
        <Button
          data-testid="btn-confirm"
          className={classes.formAction}
          color="primary"
          onClick={() => {
            handleConfirm(componentId, appName);
          }}
        >
          Confirm
        </Button>
      </div>
    </form>
  );
};
