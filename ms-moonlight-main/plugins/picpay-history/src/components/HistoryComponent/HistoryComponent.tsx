import React, { useCallback, useEffect, useState } from 'react';
import { Grid } from '@material-ui/core';
import {
  ContentHeader,
  Select,
  SupportButton,
  Header,
  Page,
  Content,
} from '@backstage/core-components';
import { FetchHistory } from '../FetchHistory';
import { useApi } from '@backstage/core-plugin-api';
import { HistoryApiRef } from '../../api';
import { ComponentStatus } from '../FetchHistory/interfaces';
import { Owner, Request, Status } from './interfaces';

const statusItems = [
  { label: 'All results', value: Status.All },
  { label: 'Successful', value: Status.Success },
  { label: 'Error', value: Status.Error },
  { label: 'In Progress', value: Status.Approved },
  { label: 'Rejected', value: Status.Rejected },
  { label: 'Waiting Approval', value: Status.WaitingApproval },
];

const requestItems = [
  { label: 'All results', value: Request.All },
  { label: 'Delete', value: Request.Delete },
];

const getOwners = (data: Array<ComponentStatus>) => {
  const owners: Owner[] = [{ label: 'All results', value: Status.All }];

  data.forEach((el: ComponentStatus): void => {
    let flag = false;
    owners.forEach((owner: Owner) => {
      if (owner.value === el.owner) {
        flag = true;
      }
    });

    if (!flag) owners.push({ label: el.owner, value: el.owner });
  });
  return owners;
};

export const HistoryComponent = () => {
  const [data, setData] = useState<Array<ComponentStatus>>([]);
  const [filteredData, setFilteredData] = useState<Array<ComponentStatus>>([]);
  const [ownerList, setOwnerList] = useState<Array<Owner>>([
    { label: 'All results', value: Status.All },
  ]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<string>('all');

  const api = useApi(HistoryApiRef);

  const handleFilter = useCallback(() => {
    const tempData = data.filter(el => {
      const tempStatus =
        selectedStatus === Status.All ? el.status : selectedStatus;
      const tempOwner = selectedOwner === Status.All ? el.owner : selectedOwner;
      const tempSituation =
        selectedRequest === Status.All ? el.type : selectedRequest;

      return (
        el.status === tempStatus &&
        el.owner === tempOwner &&
        el.type === tempSituation
      );
    });
    setFilteredData(tempData);
  }, [data, selectedOwner, selectedRequest, selectedStatus]);

  useEffect(() => {
    api
      .getHistoryComponent()
      .then(res => {
        setData(res.data);
        setFilteredData(res.data);
        const owners = getOwners(res.data);
        setOwnerList(owners);
      })
      .catch(e => {
        throw new Error(e);
      });
  }, [api, setOwnerList]);

  useEffect(() => {
    handleFilter();
  }, [handleFilter, selectedOwner, selectedRequest, selectedStatus]);

  return (
    <Page themeId="tool">
      <Header
        title="History"
        subtitle="Here you can find all components history information"
      />
      <Content>
        <Grid container item md={12}>
          <Grid data-testid="status-box" item md={2}>
            <Select
              selected={selectedStatus}
              onChange={e => {
                setSelectedStatus(String(e));
              }}
              label="Status"
              items={statusItems}
            />
          </Grid>
          <Grid data-testid="owner-box" item md={2}>
            <Select
              selected={selectedOwner}
              onChange={e => {
                setSelectedOwner(String(e));
              }}
              items={ownerList}
              label="Owner"
            />
          </Grid>
          <Grid data-testid="request-box" item md={6}>
            <Select
              selected={selectedRequest}
              onChange={e => {
                setSelectedRequest(String(e));
              }}
              items={requestItems}
              label="Request"
            />{' '}
          </Grid>
          <Grid item md={2}>
            <Content>
              <ContentHeader title="">
                <SupportButton />
              </ContentHeader>
            </Content>
          </Grid>
        </Grid>
        <Grid container direction="column">
          <Grid item>
            <FetchHistory data={filteredData} />
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};