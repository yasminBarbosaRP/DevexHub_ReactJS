import { Grid } from "@material-ui/core";
import React, { useState } from "react";
import { Table } from '@backstage/core-components';
import { PullRequestDetails } from "@internal/plugin-picpay-metrics-backend";
import { ApproversColumn } from "./columns/ApproversColumn";
import { TitleColumn } from "./columns/TitleColumn";
import { LinesChangesColumn } from "./columns/LinesChangesColumn";
import { CreatorColumn } from "./columns/CreatorColumn";
import { OwnerColumn } from "./columns/OwnerColumn";
import { CreatedColumn } from "./columns/CreatedColumn";
import { MergedColumn } from "./columns/MergedColumn";

type MergedPullRequestsProps = {
  data: PullRequestDetails[];
};

export const MergedPullRequests: React.FC<MergedPullRequestsProps> = ({ data }) => {
  const [page, setPage] = useState(1);

  return (
    <Grid container>
      <Grid item lg>
        <Table<PullRequestDetails>
          page={page}
          onPageChange={setPage}
          data={data}
          title="Merged Pull Requests"
          columns={[
            {
              title: 'TITLE',
              render: rowData => <TitleColumn title={rowData.title} linkPr={rowData.linkPr} />
            },
            {
              title: 'SERVICE',
              field: 'service'
            },
            {
              title: 'FILES CHANGES',
              field: 'filesChanged',
              align: 'center'
            },
            {
              title: 'LINES CHANGES',
              align: 'center',
              render: rowData => <LinesChangesColumn linesAdded={rowData.linesAdded} linesRemoved={rowData.linesRemoved} />
            },
            {
              title: 'COVERAGE',
              field: 'coverage',
              align: 'center'
            },
            {
              title: 'CREATOR',
              render: rowData => <CreatorColumn creator={rowData.creator} />
            },
            {
              title: 'OWNER',
              render: rowData => <OwnerColumn owner={rowData.owner} />
            },
            {
              title: 'APPROVERS',
              render: rowData => <ApproversColumn approvers={rowData.approvers} />
            },
            {
              title: 'LANGUAGE',
              field: 'language'
            },
            {
              title: 'CREATED',
              render: rowData => <CreatedColumn createdAt={rowData.createdAt} createdRelativeTime={rowData.createdRelativeTime} />
            },
            {
              title: 'MERGED',
              render: rowData => <MergedColumn mergedAt={rowData.mergedAt || null} mergedRelativeTime={rowData.mergedRelativeTime || null} />
            }
          ]}
        />
      </Grid>
    </Grid>
  );
};
