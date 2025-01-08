import React from "react";
import { Grid, Box, Typography, Paper, Divider } from "@material-ui/core";

// Função para determinar a cor da barra de progresso
export const getGaugeColor = (value: number): string => {
  if (value <= 40) return "red";
  if (value <= 70) return "orange";
  return "green";
};

// Componente genérico para o Gauge
export const CustomLinearGauge: React.FC<{ value: number; label: string }> = ({ value, label }) => {
  const color = getGaugeColor(value);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="body2">{label}</Typography>
      </Box>
      <Box display="flex" alignItems="center" mt={1}>
        <Box width="100%" mr={1} position="relative">
          <div
            style={{
              width: "100%",
              height: "10px",
              backgroundColor: "#e0e0df",
              borderRadius: "5px",
            }}
          >
            <div
              data-testid="gauge-bar"
              style={{
                width: `${value}%`,
                height: "100%",
                backgroundColor: color,
                borderRadius: "5px",
              }}
            />
          </div>
        </Box>
        <Typography variant="body2">{value}%</Typography>
      </Box>
    </Box>
  );
};

// Componente genérico para métricas
export const MetricCard: React.FC<{
  title: string;
  description: string;
  value: number;
  label: string;
}> = ({ title, description, value, label }) => {
  return (
    <Paper elevation={3} style={{ padding: "20px", height: "100%" }}>
      <Typography data-testid={`${title.toLowerCase()}-metrics`} variant="h5">
        {title}
      </Typography>
      <Typography variant="body1" color="textSecondary" style={{ fontWeight: "normal" }}>
        {description}
      </Typography>

      <Divider style={{ margin: "10px 0" }} />

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box mt={2} width="70%">
            <CustomLinearGauge value={value} label={label} />
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

// Exemplo de uso para MutationMetrics
export const MutationMetrics: React.FC = () => {
  return (
    <MetricCard
      title="Mutation"
      description="Unit test quality indicator."
      value={55}
      label="Mutation Coverage"
    />
  );
};

// Exemplo de uso para CoverageMetrics
export const CoverageMetrics: React.FC = () => {
  return (
    <MetricCard
      title="Coverage"
      description="Overall code coverage indicator."
      value={85}
      label="Code Coverage"
    />
  );
};
