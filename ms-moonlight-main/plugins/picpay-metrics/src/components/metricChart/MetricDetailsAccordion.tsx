import React, { useMemo, useState } from 'react';
import { MetricChartDetailsDeploy } from '@internal/plugin-picpay-metrics-backend';
import {
  Accordion as MuiAccordion,
  AccordionDetails as MuiAccordionDetails,
  AccordionSummary,
  Box,
  Table,
  TableBody,
  TableCell as MuiTableCell,
  TableContainer,
  TableHead,
  TableRow as MuiTableRow,
  Typography,
  withStyles,
  createStyles,
} from '@material-ui/core';
import { Link } from '@backstage/core-components';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import moment from 'moment';
import { EntityRefLink } from '@backstage/plugin-catalog-react';

const Accordion = withStyles({
  root: {
    boxShadow: 'none',
    '&:before': {
      display: 'none',
    },
    '&$expanded': {
      margin: 'auto',
    },
  },
  expanded: {},
})(MuiAccordion);

const AccordionDetails = withStyles({
  root: {
    padding: 0,
  },
  expanded: {},
})(MuiAccordionDetails);

const TableCell = withStyles(theme =>
  createStyles({
    head: {
      backgroundColor: theme.palette.background.default,
    },
    body: {
      fontSize: 14,
    },
  })
)(MuiTableCell);

const TableRow = withStyles(theme =>
  createStyles({
    root: {
      '&:nth-of-type(odd)': {
        backgroundColor: theme.palette.background.paper,
      },
      '&:nth-of-type(even)': {
        backgroundColor: theme.palette.background.default,
      },
    },
  })
)(MuiTableRow);

export const MetricDetailsAccordion = ({
  deploy,
}: {
  deploy: MetricChartDetailsDeploy;
}) => {
  const [expanded, setExpanded] = useState(false);

  const isExpandable = useMemo(
    () => deploy.commits.length > 0,
    [deploy.commits]
  );

  const handleChange = () => {
    if (isExpandable) {
      setExpanded(!expanded);
    }
  };

  return (
    <Accordion expanded={expanded} onChange={handleChange}>
      <AccordionSummary
        style={{ cursor: isExpandable ? 'pointer' : 'default' }}
        expandIcon={isExpandable ? <ExpandMoreIcon /> : null}
      >
        <Typography component="div">
          <Box fontSize={16}>
            Build{' '}
            <Link onClick={event => event.stopPropagation()} to={deploy.url}>
              {deploy.version}
            </Link>
          </Box>
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>Commit</TableCell>
                <TableCell align="right">Commit Date</TableCell>
                <TableCell align="right">Merge Date</TableCell>
                <TableCell align="right">Author</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deploy.commits.map(commit => (
                <TableRow key={commit.hash}>
                  <TableCell component="th" scope="row">
                    <Link
                      onClick={event => event.stopPropagation()}
                      to={commit.url}
                    >
                      {commit.hash}
                    </Link>
                  </TableCell>
                  <TableCell align="right">
                    {commit.mergeDate
                      ? moment(commit.date).format('DD/MM/YYYY HH:mm')
                      : ''}
                  </TableCell>
                  <TableCell align="right">
                    {commit.mergeDate
                      ? moment(commit.mergeDate).format('DD/MM/YYYY HH:mm')
                      : ''}
                  </TableCell>
                  <TableCell align="right">
                    {commit.authorUrl && (
                      <EntityRefLink
                        entityRef={commit.authorUrl}
                        defaultKind="User"
                        hideIcon
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </AccordionDetails>
    </Accordion>
  );
};
