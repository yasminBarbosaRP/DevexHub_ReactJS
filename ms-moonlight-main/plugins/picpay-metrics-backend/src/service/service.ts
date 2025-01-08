import moment from 'moment';
import { MetricsApiData, PullRequestApiData, ReviewPullRequestApiData } from '../repository/repository';
import {
  CfrApiResponse,
  DeployFrequencyApiResponse,
  LeadTimeApiResponse,
  MetricDetails,
} from '../types/api';
import {
  BaseMetricDataResponse,
  ChangeFailureRateResponse,
  DeploymentFrequencyResponse,
  ExhibitionPeriod,
  LeadTimeResponse,
  MetricChart,
  MetricChartDetailsRepository,
  MetricPerformance,
  MetricsResponse,
  PullRequestResponse,
} from '../types/domain';
import { MetricsParams } from './router';
import { parseEntityRefWithDefaults, pluralize } from '@internal/plugin-picpay-core-components';
import { CatalogApi } from '@backstage/catalog-client';
import { stringifyEntityRef, DEFAULT_NAMESPACE } from '@backstage/catalog-model';
import { Logger } from 'winston';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const getDatesInRange = (start: Date, end: Date): Date[] => {
  const daysInRange =
    Math.floor((end.getTime() - start.getTime()) / MS_IN_DAY) + 1;
  return Array.from(
    { length: daysInRange },
    (_, index) => new Date(start.getTime() + index * MS_IN_DAY)
  );
};

const getDatesForExhibition = (
  dates: Date[],
  exhibition: ExhibitionPeriod
): string[] => {
  switch (exhibition) {
    case 'DAY':
      return dates.map(date => {
        const formattedDate = moment(date).format('YYYY/MM/DD');
        return `day_${formattedDate}`;
      });

    case 'WEEK':
      return Array.from(
        new Set(
          dates.map(date => {
            const formattedDate = moment(date).format('YYYY/WW');
            return `week_${formattedDate}`;
          })
        )
      );

    case 'MONTH':
    default:
      return Array.from(
        new Set(
          dates.map(date => {
            const formattedDate = moment(date).format('YYYY/MM');
            return `month_${formattedDate}`;
          })
        )
      );
  }
};

const formatDateForChart =
  (exhibition: ExhibitionPeriod) => (exhibitionDate: string) => {
    switch (exhibition) {
      case 'DAY': {
        const [year, month, day] = exhibitionDate.split('_')[1].split('/');
        return `${day}/${month}/${year}`;
      }
      case 'WEEK': {
        const [year, week] = exhibitionDate.split('_')[1].split('/');
        return `Week ${week}/${year}`;
      }

      case 'MONTH':
      default: {
        const [year, month] = exhibitionDate.split('_')[1].split('/');
        return `Month ${month}/${year}`;
      }
    }
  };

const getBottomAxisTicks = (dates: string[]) => {
  return dates.filter((_, index) => dates.length <= 8 || index % 4 === 0);
};

const getLeftAxisTicks = (dates: number[]) => {
  const minYValue = Math.min(...dates);
  const maxYValue = Math.max(...dates);

  const numTicks = 8;
  const yTickInterval = Math.ceil((maxYValue - minYValue) / (numTicks - 1));

  return Array.from(
    { length: numTicks },
    (_, index) => minYValue + index * yTickInterval
  );
};

const getDetailsModal = (details: MetricDetails) => {
  if (!details) return { repositories: [] };

  const commitShaRegex: RegExp = /^[0-9a-f]{40}$/;

  const repositoriesMap = Object.keys(details).reduce<{
    [key: string]: MetricChartDetailsRepository;
  }>((acc, deployId) => {
    const repositoryName = details[deployId].service.name;

    const buildUrl = commitShaRegex.test(details[deployId]?.build.id)
      ? `https://github.com/PicPay/${repositoryName}/commit/${details?.[deployId]?.build.id}`
      : `https://github.com/PicPay/${repositoryName}/releases/tag/${details?.[deployId]?.build.id}`;

    const repositoryData = {
      name: repositoryName,
      url: `https://github.com/PicPay/${repositoryName}`,
      deploys: [
        ...(acc?.[repositoryName]?.deploys ?? []),
        {
          version: details?.[deployId]?.build.id,
          source: details?.[deployId]?.source,
          url: buildUrl,
          commits:
            details?.[deployId]?.commits?.map(v => ({
              authorName: v.author,
              authorUrl: v.author ? `user:default/${v.author}` : '',
              date: v.date,
              mergeDate: v.merged_at,
              hash: v.commit_id,
              url: `https://github.com/PicPay/${repositoryName}/commit/${v.commit_id}`,
            })) ?? [],
        },
      ],
    };

    return {
      ...acc,
      [repositoryName]: repositoryData,
    };
  }, {});

  return { repositories: Object.values(repositoriesMap) };
};

const getCsvData = (detailsList: MetricDetails[]) => {
  return detailsList.flatMap((details: MetricDetails) => {
    if (!details) return [];

    return Object.keys(details).reduce<BaseMetricDataResponse['csvData']>(
      (acc, deployId) => {
        const deploy = details[deployId];
        const firstCommit = deploy.commits?.[0];

        const baseData = {
          deploy_identifier: deploy.id,
          service_name: deploy.service.name,
          status: deploy.status,
          source: deploy.source,
          first_commit_author: firstCommit?.author ?? '',
          first_commit_date: firstCommit?.date ?? '',
          deploy_date: deploy.ended_at,
          first_commit_sha: `https://github.com/PicPay/${deploy.service.name}/commit/${firstCommit?.commit_id}`,
        };

        const data = deploy.lead_time
          ? { ...baseData, lead_time: Math.floor(deploy.lead_time) }
          : baseData;

        return [...acc, data];
      },
      []
    );
  });
};

const getDetailsList = (response: {
  [key: string]: { details: MetricDetails };
}) => Object.values(response).map(v => v.details);

const resolveDeploymentFrequencyResponse = (
  entityName: string,
  datesForExhibition: string[],
  formatExhibitionDate: (exhibitionDate: string) => string,
  deployFrequencyData: DeployFrequencyApiResponse
): DeploymentFrequencyResponse => {
  const chartData: MetricChart['data'] = datesForExhibition.map(date => {
    const deployCount = deployFrequencyData.frequency_days[date]?.count ?? 0;
    const deployDetails = deployFrequencyData.frequency_days[date]?.details;

    return {
      details: {
        tooltip: {
          text: `${deployCount} ${pluralize('Deploy', deployCount)}`,
        },
        modal: getDetailsModal(deployDetails),
      },
      x: formatExhibitionDate(date),
      y: deployCount,
    };
  });

  return {
    behavior: 'DEPLOYMENT_FREQUENCY',
    data: {
      average: Number(deployFrequencyData.frequency_average.toFixed(2)),
      performace:
        deployFrequencyData.performance.toUpperCase() as MetricPerformance,
      bottomAxisTicks: getBottomAxisTicks(chartData.map(data => data.x)),
      leftAxisTicks: getLeftAxisTicks(chartData.map(data => data.y)),
      chart: {
        id: entityName,
        data: chartData,
      },
      csvData: getCsvData(getDetailsList(deployFrequencyData.frequency_days)),
    },
  };
};

const resolveLeadTimeResponse = (
  entityName: string,
  datesForExhibition: string[],
  formatExhibitionDate: (exhibitionDate: string) => string,
  leadTimeData: LeadTimeApiResponse,
  hasDeploysInPeriod: boolean
): LeadTimeResponse => {
  if (!hasDeploysInPeriod) {
    return {
      behavior: 'EMPTY_LEAD_TIME',
      data: {
        performace: 'N/A',
        chart: {
          id: entityName,
          data: [],
        },
        median: '-',
        bottomAxisTicks: [],
        leftAxisTicks: [],
        csvData: [],
      },
    };
  }

  const chartData: MetricChart['data'] = datesForExhibition.map(date => {
    const leadTimeInHours = Math.trunc(
      (leadTimeData.deployments[date]?.lead_time ?? 0) / 60
    );

    const deployDetails = leadTimeData.deployments[date]?.details;

    return {
      details: {
        tooltip: {
          text: leadTimeInHours
            ? `${leadTimeInHours} ${pluralize('Hour', leadTimeInHours)}`
            : 'No Deploys',
        },
        modal: getDetailsModal(deployDetails),
      },
      x: formatExhibitionDate(date),
      y: leadTimeInHours,
    };
  });

  return {
    behavior: 'LEAD_TIME',
    data: {
      median: `${Math.trunc(leadTimeData.average / 60)}H`,
      performace: leadTimeData.performance.toUpperCase() as MetricPerformance,
      bottomAxisTicks: getBottomAxisTicks(chartData.map(data => data.x)),
      leftAxisTicks: getLeftAxisTicks(chartData.map(data => data.y)),
      chart: {
        id: entityName,
        data: chartData,
      },
      csvData: getCsvData(getDetailsList(leadTimeData.deployments)),
    },
  };
};

const resolveChangeFailureRateResponse = (
  entityName: string,
  datesForExhibition: string[],
  formatExhibitionDate: (exhibitionDate: string) => string,
  cfrData: CfrApiResponse,
  hasDeploysInPeriod: boolean
): ChangeFailureRateResponse => {
  if (!hasDeploysInPeriod) {
    return {
      behavior: 'EMPTY_CFR',
      data: {
        performace: 'N/A',
        chart: {
          id: entityName,
          data: [],
        },
        rate: '-',
        bottomAxisTicks: [],
        leftAxisTicks: [],
        csvData: [],
      },
    };
  }

  const chartData: MetricChart['data'] = datesForExhibition.map(date => {
    const failures = cfrData.failures[date]?.count ?? 0;
    const deployDetails = cfrData.failures[date]?.details;

    return {
      details: {
        tooltip: {
          text: `${failures} ${pluralize('Failure', failures)}`,
        },
        modal: getDetailsModal(deployDetails),
      },
      x: formatExhibitionDate(date),
      y: failures,
    };
  });

  return {
    behavior: 'CFR',
    data: {
      rate: `${cfrData.average}%`,
      performace: cfrData.performance.toUpperCase() as MetricPerformance,
      bottomAxisTicks: getBottomAxisTicks(chartData.map(data => data.x)),
      leftAxisTicks: getLeftAxisTicks(chartData.map(data => data.y)),
      chart: {
        id: entityName,
        data: chartData,
      },
      csvData: getCsvData(getDetailsList(cfrData.failures)),
    },
  };
};

export const resolveMetricsResponse = (
  entityName: string,
  params: MetricsParams,
  metricsData: MetricsApiData
): MetricsResponse => {
  const { leadTimeData, deployFrequencyData, cfrData } = metricsData;

  const datesInRange = getDatesInRange(
    new Date(params.startDate),
    new Date(params.endDate)
  );

  const datesForExhibition = getDatesForExhibition(
    datesInRange,
    params.exhibition
  );

  const hasDeploysInPeriod = deployFrequencyData.deployments > 0;

  const metricsResponse: MetricsResponse = {
    deploymentFrequency: resolveDeploymentFrequencyResponse(
      entityName,
      datesForExhibition,
      formatDateForChart(params.exhibition),
      deployFrequencyData
    ),
    leadTime: resolveLeadTimeResponse(
      entityName,
      datesForExhibition,
      formatDateForChart(params.exhibition),
      leadTimeData,
      hasDeploysInPeriod
    ),
    changeFailureRate: resolveChangeFailureRateResponse(
      entityName,
      datesForExhibition,
      formatDateForChart(params.exhibition),
      cfrData,
      hasDeploysInPeriod
    ),
  };

  return metricsResponse;
};

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes === 0) {
    return 'just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  }
  if (diffMinutes < 1440) {
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  const diffDays = Math.floor(diffMinutes / 1440);
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.toLocaleString('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })} GMT-3`;
};

const fetchUserDetailsFromCatalog = async (
  catalogApi: CatalogApi,
  logger: Logger
): Promise<Record<string, { entityRef: string; displayName?: string; picture?: string }>> => {
  const userDetails: Record<string, { entityRef: string; displayName?: string; picture?: string }> = {};

  try {
    const usersEntities = await catalogApi.getEntities({
      filter: { kind: 'user' },
      fields: [
        'kind',
        'metadata.name',
        'metadata.namespace',
        'spec.profile.displayName',
        'spec.profile.picture',
        'spec.github.login',
      ],
    });

    usersEntities.items.forEach((entity) => {
      const profile = entity.spec?.profile as { displayName?: string; picture?: string } | undefined;
      const github = entity.spec?.github as { login?: string } | undefined;
      const name = entity.metadata?.name;
      const kind = entity.kind;
      const namespace = entity.metadata?.namespace;
      const githubLogin = github?.login;
      const displayName = profile?.displayName || name;
      const picture = profile?.picture;

      if (githubLogin) {
        const entityRef = (`${kind}:${namespace}/${name}`).toLowerCase();
        userDetails[githubLogin] = { entityRef, displayName, picture };
      }
    });
  } catch (error) {
    logger.error('Failed to fetch user details from catalog:', error)
  }
  return userDetails;
};

export const resolvePullRequestResponse = async (
  pullRequestData: PullRequestApiData,
  catalogApi: CatalogApi,
  logger: Logger
): Promise<PullRequestResponse> => {
  const userDetails = await fetchUserDetailsFromCatalog(catalogApi, logger);

  const pullRequests = pullRequestData.pull_requests.map((pr) => {
    const approverLogins = pr.reviews && Object.keys(pr.reviews).length > 0
      ? Object.keys(pr.reviews).filter(reviewer =>
          pr.reviews[reviewer].some((review: ReviewPullRequestApiData) => review.state === 'APPROVED')
        )
      : [];

    const creatorDetails = userDetails[pr.author_login] || { entityRef: '', displayName: pr.author_login, picture: '' };

    const approvers = approverLogins.map((login) => {
      const approverDetails = userDetails[login] || { entityRef: '', displayName: login, picture: '' };
      return {
        entityRef: approverDetails.entityRef || '',
        name: approverDetails.displayName || login,
        picture: approverDetails.picture || '',
      };
    });

    const owner = pr.owner_name && pr.owner_name.trim() !== ''
      ? stringifyEntityRef(parseEntityRefWithDefaults(pr.owner_name, { kind: 'group', namespace: DEFAULT_NAMESPACE }))
      : pr.owner_name;

    return {
      title: pr.title,
      service: pr.service.name,
      creator: {
        entityRef: creatorDetails.entityRef || '',
        name: creatorDetails.displayName || pr.author_login,
        picture: creatorDetails.picture || '',
      },
      linkPr: `https://github.com/PicPay/${pr.service.name}/pull/${pr.number}`,
      state: pr.state,
      owner: owner,
      filesChanged: pr.size.files,
      linesAdded: pr.size.additions,
      linesRemoved: pr.size.deletions,
      createdAt: formatDate(pr.created_at),
      createdRelativeTime: formatTimeAgo(new Date(pr.created_at)),
      mergedAt: pr.merged_at ? formatDate(pr.merged_at) : null,
      mergedRelativeTime: pr.merged_at ? formatTimeAgo(new Date(pr.merged_at)) : null,
      language: pr.language ? pr.language.toUpperCase() : '',
      coverage: pr.coverage,
      approvers: approvers,
      creatorBelongsToTeamOwner: pr.author_belongs_to_team_owner,
    };
  });

  return {
    openPullRequests: pullRequestData.open_pull_requests,
    closedPullRequests: pullRequestData.closed_pull_requests,
    mergedPullRequests: pullRequestData.merged_pull_requests,
    otherTeamsOpenPullRequests: pullRequestData.other_teams_open_pull_requests,
    averageFilesChanged: pullRequestData.average_files_changed,
    averageOpenTime: pullRequestData.average_open_time / 60,
    averageTimeToStartReview: pullRequestData.average_time_to_start_review / 60,
    averageTimeToRequiredReview: pullRequestData.average_time_to_required_review / 60,
    pullRequests: pullRequests,
  };
};
