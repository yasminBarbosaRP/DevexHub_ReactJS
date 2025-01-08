import {
  MetricChartDetails,
  MetricChartDetailsModal,
  MetricsResponse,
} from '@internal/plugin-picpay-metrics-backend';
import { useTheme } from '@material-ui/core';
import { ResponsiveLine } from '@nivo/line';
import React from 'react';
import { ChartTooltip } from './MetricChartTooltip';
import { MetricDetailsModal } from './MetricDetailsModal';

export const FulfilledMetricChart = ({
  metric,
}: {
  metric: MetricsResponse[keyof MetricsResponse];
}) => {
  const theme = useTheme();

  const [modalStatus, setModalStatus] = React.useState('CLOSED');
  const [modalData, setModalData] = React.useState<{
    details: MetricChartDetailsModal;
    metricName: string;
    metricValue: string;
    metricTimestamp: string;
  }>();

  return (
    <>
      <ResponsiveLine
        theme={{
          text: {
            color: theme.palette.text.primary,
          },
          grid: {
            line: {
              stroke: theme.palette.text.primary,
              strokeWidth: 0.1,
            },
          },
          axis: {
            ticks: {
              line: {
                stroke: theme.palette.text.primary,
                strokeWidth: 0.1,
              },
            },
          },
        }}
        data={[metric.data.chart]}
        onClick={point => {
          const { details, xFormatted } = point.data as unknown as {
            details: MetricChartDetails;
            xFormatted: string;
          };

          if (details.modal.repositories.length > 0) {
            setModalData({
              details: details.modal,
              metricName: metric.data.chart.id,
              metricValue: details.tooltip.text,
              metricTimestamp: xFormatted,
            });
            setModalStatus('OPEN');
          }
        }}
        colors={['#238662']}
        tooltip={input => {
          const tooltipData = input.point.data as unknown as {
            xFormatted: string | number;
            yStacked?: number | undefined;
            details: MetricChartDetails;
          };

          return (
            <ChartTooltip
              pointLabel={tooltipData.xFormatted}
              color={input.point.color}
              text={tooltipData.details.tooltip.text}
              hasDetails={tooltipData.details.modal.repositories.length > 0}
            />
          );
        }}
        margin={{ top: 20, right: 60, bottom: 60, left: 50 }}
        yScale={{
          min: Math.min(...metric.data.leftAxisTicks),
          max: Math.max(...metric.data.leftAxisTicks),
          type: 'linear',
          reverse: false,
        }}
        axisTop={null}
        axisRight={null}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legendOffset: -40,
          legendPosition: 'middle',
          format: value => Math.round(value),
          tickValues: metric.data.leftAxisTicks,
        }}
        axisBottom={{
          tickValues: metric.data.bottomAxisTicks,
        }}
        pointSize={10}
        pointBorderWidth={2}
        pointLabelYOffset={-12}
        gridYValues={metric.data.leftAxisTicks}
        gridXValues={metric.data.bottomAxisTicks}
        useMesh
        isInteractive
        onMouseEnter={(_, event) => {
          const target = event.currentTarget as HTMLElement;
          target.style.cursor = 'pointer';
        }}
      />
      <MetricDetailsModal
        open={modalStatus === 'OPEN'}
        data={modalData}
        onClose={() => setModalStatus('CLOSED')}
      />
    </>
  );
};
