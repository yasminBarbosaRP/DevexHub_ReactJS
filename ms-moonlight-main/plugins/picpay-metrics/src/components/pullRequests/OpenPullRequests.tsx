import { Grid } from "@material-ui/core";
import React, { useState } from "react";
import { Table } from '@backstage/core-components';
import { PullRequestDetails } from "@internal/plugin-picpay-metrics-backend";
import { TitleColumn } from "./columns/TitleColumn";
import { LinesChangesColumn } from "./columns/LinesChangesColumn";
import { CreatorColumn } from "./columns/CreatorColumn";
import { OwnerColumn } from "./columns/OwnerColumn";
import { CreatedColumn } from "./columns/CreatedColumn";

type OpenPullRequestsProps = {
  data: PullRequestDetails[];
};

export const OpenPullRequests: React.FC<OpenPullRequestsProps> = ({ data }) => {
  const [page, setPage] = useState(1);

  return (
    <Grid container>
      <Grid item lg>
        <Table<PullRequestDetails>
          page={page}
          onPageChange={setPage}
          data={data}
          title="Open Pull Requests"
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
              title: 'CREATOR',
              align: 'center',
              render: rowData => <CreatorColumn creator={rowData.creator} />
            },
            {
              title: 'OWNER',
              render: rowData => <OwnerColumn owner={rowData.owner} />
            },
            {
              title: 'CREATED',
              render: rowData => <CreatedColumn createdAt={rowData.createdAt} createdRelativeTime={rowData.createdRelativeTime} />
            }
          ]}
        />
      </Grid>
    </Grid>
  );
};
