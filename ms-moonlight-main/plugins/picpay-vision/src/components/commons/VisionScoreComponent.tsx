import { makeStyles, useTheme } from '@material-ui/core';
import React, { useCallback, useEffect, useState } from 'react';

const useStyles = makeStyles(theme => ({
  circleProgressBar: {
    display: 'inline-block',
    textAlign: 'center',
  },

  circleBackground: {
    fill: 'none',
    stroke: theme.palette.divider,
  },

  circleProgress: {
    fill: 'none',
    transform: 'rotate(-90deg)',
    transformOrigin: 'center',
    transition: 'stroke-dasharray 1s ease-out 0.2s',
  },
  percentageText: {
    fontWeight: 'bold',
    fill: theme.palette.text.primary,
  },

  circleFill: {
    fill: theme.palette.background.paper,
  },
}));

export const VisionScore = ({
  percentage,
  size = 'small',
}: {
  percentage: number;
  size?: 'large' | 'small';
}) => {
  const classes = useStyles();

  const SIZE_VALUES_MAP = {
    small: {
      radius: 63,
      strokeWidth: 14,
      fullSize: 140,
      centerCoordinates: 70,
      fontSize: '22px',
    },
    large: {
      radius: 90,
      strokeWidth: 20,
      fullSize: 200,
      centerCoordinates: 100,
      fontSize: '28px',
    },
  };

  const sizeValue = SIZE_VALUES_MAP[size];

  const radius = SIZE_VALUES_MAP[size].radius;
  const circumference = 2 * Math.PI * radius;
  const theme = useTheme();
  const [strokeDasharray, setStrokeDasharray] = useState(`0, ${circumference}`);

  useEffect(() => {
    const setPercentageAsync = setTimeout(() => {
      const clampedPercentage = Math.min(100, Math.max(0, percentage));

      const dashValue = `${
        (circumference * clampedPercentage) / 100
      }, ${circumference}`;

      setStrokeDasharray(dashValue);
    }, 0);

    return () => clearTimeout(setPercentageAsync);
  }, [percentage, radius, circumference]);

  const getStrokeColor = useCallback(
    (currentPercentage: number) => {
      if (currentPercentage >= 70) {
        return theme.palette.status.ok;
      }

      if (currentPercentage >= 40) {
        return theme.palette.status.warning;
      }

      return theme.palette.status.error;
    },
    [theme],
  );

  return (
    <div className={classes.circleProgressBar}>
      <svg width={sizeValue.fullSize} height={sizeValue.fullSize}>
        <circle
          className={classes.circleBackground}
          cx={sizeValue.centerCoordinates}
          cy={sizeValue.centerCoordinates}
          strokeWidth={sizeValue.strokeWidth}
          r={radius}
        />
        <circle
          className={classes.circleProgress}
          cx={sizeValue.centerCoordinates}
          cy={sizeValue.centerCoordinates}
          strokeWidth={sizeValue.strokeWidth}
          r={radius}
          stroke={getStrokeColor(percentage)}
          strokeDasharray={strokeDasharray}
        />
        <circle
          className={classes.circleFill}
          cx={sizeValue.centerCoordinates}
          cy={sizeValue.centerCoordinates}
          r={radius}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className={classes.percentageText}
          fontSize={sizeValue.fontSize}
        >
          {percentage}%
        </text>
      </svg>
    </div>
  );
};
