import React, { useEffect, useState } from 'react';
import {
  Table,
  TableColumn,
  SubvalueCell,
  Link,
} from '@backstage/core-components';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/ErrorOutline';
import BlockIcon from '@material-ui/icons/Block';
import AutorenewIcon from '@material-ui/icons/Autorenew';
import HourglassEmptyIcon from '@material-ui/icons/HourglassEmpty';
import { useStyles } from './styles';
import { Status, ComponentStatus, convertStatus } from './interfaces';

export const ucWords = (value: string) => {
  let status = null;

  switch (value) {
    case convertStatus.WaitingApproval:
      status = convertStatus.NewWaitingApproval;
      break;
    case convertStatus.Approved:
      status = convertStatus.InProgress;
      break;
    default:
      status = value;
  }

  return (status || '')
    .toLowerCase()
    .replace(/(^([a-zA-Z\p{M}]))|([ -][a-zA-Z\p{M}])/g, s => s.toUpperCase());
};

const DenseTable = (props: any) => {
  const { data } = props;
  const classes = useStyles();

  const [showPagination, setShowPagination] = useState(false);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    setColumns([
      {
        title: 'Component Name',
        customFilterAndSearch: (query: any, row: any) =>
          `${row.component} ${row.subvalue}`
            .toLocaleUpperCase('en-US')
            .includes(query.toLocaleUpperCase('en-US')),
        field: 'component',
        highlight: true,
        render: (row: any): React.ReactNode => (
          <SubvalueCell
            value={<Link to={`/management/${row.id}`}>{row.component}</Link>}
            subvalue={row.subvalue}
          />
        ),
      },
      { title: 'Request', field: 'request' },
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
            {row.status === Status.Rejected && (
              <BlockIcon fontSize="small" className={classes.rejected} />
            )}
            {row.status === Status.InProgress && (
              <AutorenewIcon fontSize="small" className={classes.inProgress} />
            )}
            {row.status === Status.WaitingApproval && (
              <HourglassEmptyIcon
                fontSize="small"
                className={classes.waitingApproval}
              />
            )}
            <span className={classes.label}>{row.status}</span>
          </p>
        ),
      },
      { title: 'Owner', field: 'owner' },
      { title: 'User', field: 'user' },
    ]);

    setRows(
      data.map((item: ComponentStatus) => {
        return {
          id: item.id,
          component: item.component.name,
          request: ucWords(item.type),
          status: ucWords(item.status),
          owner: item.owner,
          user: item.requestedBy,
          subvalue: 'service', // Subvalue of component - Make dynamic when entering other types of services.
        };
      }),
    );

    setShowPagination(data.length > 20);
  }, [
    data,
    setShowPagination,
    setColumns,
    setRows,
    classes.contentStatus,
    classes.error,
    classes.inProgress,
    classes.label,
    classes.rejected,
    classes.success,
    classes.waitingApproval,
  ]);

  return (
    <Table
      title="Actions History"
      options={{
        search: true,
        paging: showPagination,
        pageSize: 20,
        pageSizeOptions: [20, 50, 100],
      }}
      columns={columns}
      data={rows}
    />
  );
};

export const FetchHistory = (props: any) => {
  const { data } = props;
  return <DenseTable data={data} />;
};
