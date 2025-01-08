import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { InfoCard, InfoCardVariants } from '@backstage/core-components';
import { Gauge } from '@backstage/core-components';

type CustomGaugeCardProps = {
  title: string;
  subheader?: string;
  progress: number;
  inverse?: boolean;
  deepLink?: { title: string; link: string };
  description?: string;
  icon?: React.ReactNode;
  variant?: InfoCardVariants;
  alignGauge?: 'normal' | 'bottom';
  size?: 'normal' | 'small';
  getColor?: (value: number) => string;
};

const useStyles = makeStyles(() => ({
  wrapper: {
    '& > div': {
      width: '250px',
      height: '419px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: 'none',
    },
  },
  gaugeContainer: {
    width: '100%',
    height: '230px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrapper: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
}));

const getGaugeColor = (value: number): string => {
    if (value <= 40) {
      return 'red';
    }
    if (value <= 70) {
      return 'orange';
    }
    return 'green';
  };

export const CustomGaugeCard: React.FC<CustomGaugeCardProps> = ({
  title,
  subheader,
  progress,
  inverse,
  deepLink,
  description,
  icon,
  variant,
  alignGauge = 'normal',
  size = 'normal',
}) => {
  const classes = useStyles();

  const gaugeProps = {
    inverse,
    description,
    getColor: ({ value }: { value: number }) => getGaugeColor(value),
    value: progress,
  };

  return (
    <div className={classes.wrapper}>
      <InfoCard
        title={title}
        subheader={subheader}
        deepLink={deepLink}
        variant={variant}
        alignContent={alignGauge}
        icon={icon}
        titleTypographyProps={{
          ...(size === 'small' ? { variant: 'subtitle2' } : {}),
        }}
        subheaderTypographyProps={{
          ...(size === 'small' ? { variant: 'body2' } : {}),
        }}
      >
        <div className={classes.gaugeContainer}>
          <Gauge {...gaugeProps} size={size} />
        </div>
      </InfoCard>
    </div>
  );
};
