import {
  FormControl,
  IconButton,
  Input,
  InputAdornment,
  makeStyles,
  Toolbar,
} from '@material-ui/core';
import Clear from '@material-ui/icons/Clear';
import Search from '@material-ui/icons/Search';
import React from 'react';

const useStyles = makeStyles(_theme => ({
  searchToolbar: {
    paddingLeft: 0,
    paddingRight: 0,
  },
}));

interface SearchBarProps {
  value: string;
  onChange: (search: string) => void;
}

export const SearchBar = ({ onChange, value }: SearchBarProps) => {
  const classes = useStyles();

  return (
    <Toolbar className={classes.searchToolbar}>
      <FormControl>
        <Input
          aria-label="search"
          id="input-with-icon-adornment"
          placeholder="Search"
          autoComplete="off"
          value={value}
          onChange={e => onChange(e.target.value)}
          startAdornment={
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          }
          endAdornment={
            <InputAdornment position="end">
              <IconButton
                aria-label="clear search"
                onClick={() => onChange('')}
                edge="end"
                disabled={value === ''}
              >
                <Clear />
              </IconButton>
            </InputAdornment>
          }
        />
      </FormControl>
    </Toolbar>
  );
};
