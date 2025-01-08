import React from "react";
import { Grid, Box, Typography, Paper, Divider } from "@material-ui/core";


export const getGaugeColor = (value: number): string => {
  if (value <= 40) return "red";
  if (value <= 70) return "orange";
  return "green";
};

const GaugeBar: React.FC<{ value: number; color: string }> = ({ value, color }) => (
  <div style={{ width: '100%', height: '10px', backgroundColor: '#e0e0df', borderRadius: '5px' }}>
    <div
      data-testid="gauge-bar"
      style={{
        width: `${value}%`,
        height: '100%',
        backgroundColor: color,
        borderRadius: '5px',
      }}
    />
  </div>
);


const LinearGauge: React.FC<{ value: number; title: string; requiredValue?: number }> = ({
  value,
  title,
  requiredValue,
}) => {
  const color = getGaugeColor(value);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="body2">{title}</Typography>
      </Box>
      <Box display="flex" alignItems="center" mt={1}>
        <Box width="100%" mr={1} position="relative">
          <GaugeBar value={value} color={color} />
        </Box>
        <Typography variant="body2">{value}%</Typography>
      </Box>
      {requiredValue && (
        <Typography variant="caption" style={{ marginTop: '4px' }}>
          Required {title}: {requiredValue}%
        </Typography>
      )}
    </Box>
  );
};

export const SonarMetrics: React.FC = () => {
  return (
    <Paper elevation={3} style={{ padding: '20px' }}>
      <Typography data-testid="sonar-metrics" variant="h5">
        Sonar
      </Typography>
      <Typography variant="body1" color="textSecondary" style={{ fontWeight: 'normal' }}>
        Code quality indicator.
      </Typography>

      <Divider style={{ margin: '10px 0' }} />

      <Grid container spacing={3}>
        <Grid item xs={8}>
          <Box mt={2} width="100%">
            <LinearGauge value={86} title="Coverage" requiredValue={80} />
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};
