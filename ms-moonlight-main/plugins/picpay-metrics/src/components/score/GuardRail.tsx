import { Grid } from "@material-ui/core";
import React from "react";
import { Table } from '@backstage/core-components';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';

export type MetricsData = {
  squad: string;
  service: string;
  sonar: boolean;
  mutation: boolean;
  endToEnd: boolean;
};

type MetricsTableProps = {
  page: number;
  onPageChange: (page: number) => void;
  data: MetricsData[];
};

export const GuardRailTable: React.FC<MetricsTableProps> = ({ page, onPageChange, data }) => {
  if (data.length === 0) {
    return <div>No data available</div>;
  }
  return (
    <Grid container direction="column" spacing={2}>
      <Grid item>
        <Table<MetricsData>
          page={page}
          onPageChange={onPageChange}
          data={data}
          title="Guard Rails"
          subtitle="Overview of protections validated through per-service status checks, consider enabling them to ensure the quality and security of your code."
          columns={[
            { title: 'Service', field: 'service' },
            { title: 'squad', field: 'squad' },
            {
              title: 'Sonar',
              render: rowData => rowData.sonar ? <CheckIcon  data-testid="sonar-check-icon" style={{ color: 'green', marginLeft: '15px' }} /> : <CloseIcon data-testid="sonar-close-icon" style={{ color: 'red', marginLeft: '15px' }} />,
            },
            {
              title: 'Mutation',
              render: rowData => rowData.mutation ? <CheckIcon data-testid="mutation-check-icon" style={{ color: 'green', marginLeft: '15px' }} /> : <CloseIcon data-testid="mutation-close-icon" style={{ color: 'red', marginLeft: '15px' }} />,
            },
            {
              title: 'End to End',
              render: rowData => rowData.endToEnd ? <CheckIcon data-testid="endtoend-check-icon" style={{ color: 'green', marginLeft: '15px' }} /> : <CloseIcon data-testid="endtoend-close-icon" style={{ color: 'red', marginLeft: '15px' }} />,
            },
          ]}
          options={{
            search: false,
            paging: true,
            filtering: false,
            padding: 'dense',
          }}
        />
      </Grid>
    </Grid>
  );
};
