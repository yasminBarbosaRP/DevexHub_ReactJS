import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ExhibitionPeriod,
  MetricsResponse,
} from '@internal/plugin-picpay-metrics-backend';
import { useApi } from '@backstage/core-plugin-api';
import { metricsApiRef } from '../api';
import { useAsyncFn } from 'react-use';
import moment from 'moment';
import { MetricsEntityTab } from './MetricsEntityTab';
import { Entity } from '@backstage/catalog-model';
import { MetricsHomeWidget } from './MetricsHomeWidget';
import { UserGroupsContext } from '@internal/plugin-picpay-commons';

export type MetricsSource = 'SERVICE' | 'GROUP' | 'HOME_PAGE';

type MetricsProps = { source: MetricsSource; entity?: Entity };

export const Metrics = ({ source, entity }: MetricsProps) => {
  const initialStartDate = useMemo(
    () => moment(Date.now()).subtract(6, 'months').toDate(),
    []
  );
  const initialEndDate = useMemo(() => moment(Date.now()).toDate(), []);

  const [startDate, setStartDate] = useState<Date>(initialStartDate);
  const [endDate, setEndDate] = useState<Date>(initialEndDate);
  const [groupedBy, setGroupedBy] = useState<ExhibitionPeriod>('MONTH');
  const metricsApi = useApi(metricsApiRef);

  const { userGroups } = useContext(UserGroupsContext);

  const squads = useMemo(() => {
    // filter by those who are not children of any other group, which means they're an organizational group
    const sortedSquads = userGroups?.filter(u => !userGroups.find(e => e.children.includes(u.ref))).map(group => group.label) ?? [];
    // shows those who contains squad first
    sortedSquads.sort((a, b) => {
      const aHasSquad = a.toLowerCase().includes('squad') ? -1 : 0;
      const bHasSquad = b.toLowerCase().includes('squad') ? -1 : 0;
      return aHasSquad - bHasSquad;
    });
    return sortedSquads;
  }, [userGroups]);

  const [selectedSquad, setSelectedSquad] = useState('');
  const [selectedHomeMetric, setSelectedHomeMetric] = useState<
    keyof MetricsResponse
  >('deploymentFrequency');

  useEffect(() => {
    setSelectedSquad(squads[0] ?? '');
  }, [squads]);

  useEffect(() => {
    setEndDate(moment(Date.now()).utc().startOf('day').toDate());
    switch (groupedBy) {
      case 'DAY':
        return setStartDate(moment(Date.now()).utc().startOf('day').subtract(183, 'days').toDate());
      case 'WEEK':
        return setStartDate(moment(Date.now()).utc().startOf('day').subtract(1, 'month').toDate());
      case 'MONTH':
      default:
        return setStartDate(moment(Date.now()).utc().startOf('day').subtract(6, 'months').toDate());
    }
  }, [groupedBy]);

  const getOwnerNames = useCallback((): string[] => {
    if (entity?.spec?.type === 'business-unit') {
      return (entity?.spec?.children as string[]) ?? [];
    }
    if (entity?.spec?.type === 'organization') {
      return ['*'];
    }

    return [entity?.metadata?.name ?? '', ...(entity?.spec?.children as string[] ?? [])];
  }, [entity]);

  const [bffResponse, fetchBffResponse] = useAsyncFn(async () => {
    const params = {
      startDate,
      endDate,
      exhibition: groupedBy,
    };
    switch (source) {
      case 'HOME_PAGE': {
        // if it's an organizational group, get the children too (github groups)
        return await metricsApi.getMetricsByGroup(
          [selectedSquad, ...(userGroups?.find(u => u.label === selectedSquad)?.children ?? [])],
          selectedSquad,
          params
        );
      }

      case 'GROUP':
        return await metricsApi.getMetricsByGroup(
          getOwnerNames(),
          entity?.metadata.name ?? '',
          params
        );

      case 'SERVICE':
      default:
        return await metricsApi.getMetricsByService(
          entity?.metadata?.name ?? '',
          params
        );
    }
  }, [metricsApi, startDate, endDate, groupedBy, selectedSquad]);

  useEffect(() => {
    if (source === 'HOME_PAGE' && !squads.length) return;

    fetchBffResponse();
  }, [
    fetchBffResponse,
    source,
    squads.length,
    metricsApi,
    startDate,
    endDate,
    groupedBy,
    selectedSquad,
  ]);

  return source === 'HOME_PAGE' ? (
    <MetricsHomeWidget
      bffResponse={bffResponse}
      endDate={endDate}
      groupedBy={groupedBy}
      setEndDate={setEndDate}
      setGroupedBy={setGroupedBy}
      setStartDate={setStartDate}
      startDate={startDate}
      selectedSquad={selectedSquad}
      setSelectedSquad={setSelectedSquad}
      squads={squads}
      selectedMetric={selectedHomeMetric}
      setSelectedMetric={setSelectedHomeMetric}
    />
  ) : (
    <MetricsEntityTab
      bffResponse={bffResponse}
      endDate={endDate}
      groupedBy={groupedBy}
      setEndDate={setEndDate}
      setGroupedBy={setGroupedBy}
      setStartDate={setStartDate}
      startDate={startDate}
      source={source}
    />
  );
};
