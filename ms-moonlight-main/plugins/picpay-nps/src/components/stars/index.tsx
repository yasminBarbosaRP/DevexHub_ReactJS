import React from 'react';
import { IconButton } from '@material-ui/core';
import StarOutlineIcon from '@material-ui/icons/StarOutline';
import StarRateIcon from '@material-ui/icons/StarRate';
import { useStyles } from './styles';

interface Props {
  ratingList: number[];
  selectedRating: number;
  handleRating: Function;
  disabled: boolean;
}

export const Stars = (props: Props) => {
  const { ratingList, selectedRating, handleRating, disabled } = props;
  const classes = useStyles();
  const [tempSelected, setTempSelected] = React.useState(-1);

  return (
    <div>
      {ratingList.map((el: number, i: number) => {
        return (
          <IconButton
            role="button"
            data-testid={`star-${i}-${el}`}
            disabled={disabled}
            key={`star-${i}-${el}`}
            onMouseOver={() => {
              setTempSelected(i);
            }}
            onMouseOut={() => {
              setTempSelected(ratingList.indexOf(selectedRating));
            }}
            onClick={() => {
              handleRating(el);
            }}
            aria-label="star"
            className={classes.iconButton}
          >
            {i > tempSelected ? (
              <StarOutlineIcon className={classes.star} color="primary" />
            ) : (
              <StarRateIcon className={classes.star} color="primary" />
            )}
          </IconButton>
        );
      })}
    </div>
  );
};
