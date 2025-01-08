import React from 'react';
import { Table, TableColumn, Link } from '@backstage/core-components';
import { PipelineRun, Status } from '../../interfaces';
import { useStyles } from './styles';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/ErrorOutline';
import AutorenewIcon from '@material-ui/icons/Autorenew';

export const DenseTable = (props: any) => {
  const data = props.data;
  const classes = useStyles();

  const columns: TableColumn[] = [
    { title: 'Pipeline ID', field: 'pipelineId' },
    { title: 'Pipeline', field: 'pipeline' },
    {
      title: 'Status',
      field: 'status',
      render: (row: any): React.ReactNode => (
        <p className={classes.contentStatus}>
          {row.status === Status.Success && (
            <CheckCircleIcon fontSize="small" className={classes.success} />
          )}
          {row.status === Status.Error && (
            <ErrorIcon fontSize="small" className={classes.error} />
          )}
          {row.status === Status.Running && (
            <AutorenewIcon fontSize="small" className={classes.running} />
          )}
          <span className={classes.label}>{row.status}</span>
        </p>
      ),
    },
    { title: 'Start', field: 'start' },
    { title: 'Estimated Time', field: 'estimatedTime' },
    { title: 'Duration', field: 'duration' },
    {
      title: 'CI/CD',
      customFilterAndSearch: (query: any, row: any) =>
        `${row.cicd}`
          .toLocaleUpperCase('en-US')
          .includes(query.toLocaleUpperCase('en-US')),
      field: 'cicd',
      highlight: true,
      render: (row: any): React.ReactNode => (
        <Link
          to={`https://dashboard.tekton.hub.ppay.me/#/namespaces/tekton-builds/pipelineruns/${row.cicd}`}
        >
          {row.cicd}
        </Link>
      ),
    },
  ];

  const rows = data?.map((item: PipelineRun) => {
    if (item.duration === '') {
      item.duration = 'No information';
    }

    return {
      pipelineId: item.pipeline_id,
      pipeline: item.pipeline,
      status: item.status,
      start: item.start,
      estimatedTime: item.estimated_time,
      duration: item.duration,
      cicd: 'Show details',
    };
  });

  return (
    <Table
      title="Logs of the last 60 minutes"
      options={{
        search: true,
        paging: true,
        pageSize: 5,
        pageSizeOptions: [5, 20, 50, 100],
      }}
      columns={columns}
      data={rows || []}
    />
  );
};

export const PipelineFetchComponent = (props: any) => {
  const data = props.data;
  return <DenseTable data={data} />;
};
