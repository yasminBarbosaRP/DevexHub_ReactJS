import React from 'react';
import { SvgIcon } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  circle: {
    fill: theme.palette.type === 'dark' ? '#FFF' : '#616161',
  },
}));

export const PicPayLogo = (props: any) => {
  const classes = useStyles();

  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <defs>
        <mask id="mask">
          <rect width="100%" height="100%" fill="white" />
          <path 
            d="M16.463 1.587v7.537h7.537v-7.537zm1.256 1.256h5.025v5.025h-5.025zm1.256 1.256v2.513h2.513v-2.513zm-15.205 1.256v3.175h3.376c2.142 0 3.358 1.04 3.358 2.939 0 1.947-1.216 3.011-3.358 3.011h-3.377v-5.95h-3.769v13.884h3.769v-4.76h3.57c4.333 0 6.815-2.352 6.815-6.32 0-3.771-2.482-5.978-6.814-5.978z"
            fill="black"
            transform="scale(0.7) translate(4,3)"
          />
        </mask>
      </defs>
      <circle
        cx="12"
        cy="12"
        r="12"
        className={classes.circle}
        mask="url(#mask)"
      />
    </SvgIcon>
  );
};
