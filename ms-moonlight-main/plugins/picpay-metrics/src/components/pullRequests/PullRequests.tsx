import { Box, CircularProgress, makeStyles } from "@material-ui/core";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { OpenPullRequests } from "./OpenPullRequests";
import { MergedPullRequests } from "./MergedPullRequests";
import PullRequestsFilters from "./PullRequestsFilter";
import moment from "moment";
import { useApi } from "@backstage/core-plugin-api";
import { PullRequestParams, pullRequestsApiRef } from "../../api";
import { PullRequestDetails, PullRequestResponse } from "@internal/plugin-picpay-metrics-backend";
import { UserGroupsContext } from "@internal/plugin-picpay-commons";
import { catalogApiRef } from "@backstage/plugin-catalog-react";
import { OtherTeamsOpenPullRequests } from "./OtherTeamsOpenPullRequests";
import PullRequestsCards from "./PullRequestsCards";

const useStyles = makeStyles(() => ({
  container: {
    display: 'flex',
    gap: '32px',
    marginRight: '64px',
    alignItems: 'flex-start',
    maxWidth: '100%',
  },
  filtersContainer: {
    minWidth: '230px',
  },
  resultsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    width: 'calc(100% - 230px)',
  }
}));

export const PullRequests = () => {
  const pullRequestsApi = useApi(pullRequestsApiRef);
  const catalogApi = useApi(catalogApiRef);
  const classes = useStyles();
  const { userGroups } = useContext(UserGroupsContext);

  const [pullRequestData, setPullRequestData] = useState<PullRequestResponse>();
  const [openPullRequests, setOpenPullRequests] = React.useState<PullRequestDetails[]>([]);
  const [otherTeamsOpenPullRequests, setOtherTeamsOpenPullRequests] = React.useState<PullRequestDetails[]>([]);
  const [mergedPullRequests, setMergedPullRequests] = React.useState<PullRequestDetails[]>([]);

  const [startDate, setStartDate] = useState<Date>(moment(new Date()).subtract(1, 'months').toDate());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [ownerName, setOwnerName] = useState<string | undefined>(undefined);
  const [serviceName, setServiceName] = useState<string | undefined>(undefined);
  const [isLoadingOwners, setIsLoadingOwners] = useState<boolean>(true);

  const getPullRequests = useCallback(async () => {
    const params: PullRequestParams = {
      startDate: startDate,
      endDate: endDate,
      ownerName: ownerName,
      serviceName: serviceName,
    };

    const response = await pullRequestsApi.getPullRequests(params);
    
    if (response && response.pullRequests) {
      setPullRequestData(response);
      setOpenPullRequests(response.pullRequests
        .filter((pr) => pr.state === 'open' && pr.creatorBelongsToTeamOwner)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setOtherTeamsOpenPullRequests(response.pullRequests
        .filter((pr) => pr.state === 'open' && !pr.creatorBelongsToTeamOwner)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setMergedPullRequests(response.pullRequests
        .filter((pr) => pr.state === 'merged')
        .sort((a, b) => new Date(b.mergedAt ?? 0).getTime() - new Date(a.mergedAt ?? 0).getTime()));
    }
  }, [pullRequestsApi, startDate, endDate, ownerName, serviceName]);

  useEffect(() => {
    const fetchOwners = async () => {
      if (userGroups && userGroups.length > 0) {
        setOwnerName(userGroups[0].label);
      } else {
        const ownersResponse = await catalogApi.getEntities({ filter: { kind: 'Group', 'metadata.namespace': 'default' } });
        if (ownersResponse && ownersResponse.items.length > 0) {
          setOwnerName(ownersResponse.items[0].metadata.name);
        }
      }
      setIsLoadingOwners(false);
    };

    fetchOwners();
  }, [userGroups, catalogApi]);

  useEffect(() => {
    if (!isLoadingOwners) {
      getPullRequests();
    }
  }, [isLoadingOwners, getPullRequests]);

  return (
    <Box className={classes.container}>
      {isLoadingOwners ? (
        <CircularProgress />
      ) : (
        <Box className={classes.filtersContainer}>
          <PullRequestsFilters
            startDate={startDate}
            endDate={endDate}
            onDateRangeSelect={(start: Date, end: Date) => {
              setStartDate(start);
              setEndDate(end);
            }}
            onOwnerSelect={(owner) => setOwnerName(owner ?? undefined)}
            onServiceSelect={(service) => setServiceName(service ?? undefined)}
            initialOwner={ownerName}
          />
        </Box>
      )}

      <Box className={classes.resultsContainer}>
        <PullRequestsCards data={pullRequestData} />
        {openPullRequests && (
          <OpenPullRequests data={openPullRequests} />
        )}
        {otherTeamsOpenPullRequests && (
          <OtherTeamsOpenPullRequests data={otherTeamsOpenPullRequests} />
        )}
        {mergedPullRequests && (
          <MergedPullRequests data={mergedPullRequests} />
        )}
      </Box>
    </Box>
  );
};
