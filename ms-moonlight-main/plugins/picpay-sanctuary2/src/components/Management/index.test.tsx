import { errorApiRef } from '@backstage/core-plugin-api';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { act, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Management } from '.';
import { Sanctuary2ApiClient, Sanctuary2ApiRef } from '../../api';
import { ProgressStatus, StatusResponse, StepStatus } from '../../models';
import * as router from 'react-router';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { RepositorySettingsApiClient, RepositorySettingsApiRef } from '@internal/plugin-picpay-repository-settings';
import { RepositoryVisibility } from '@internal/plugin-picpay-scaffolder-github-common';

const MOCK: StatusResponse = {
  id: '62f2d3d39819cfcb0d173611',
  component: {
    id: '8ec93bb4-ccbe-408b-8dba-0095ffbac8b2',
    name: 'ms-moonlight-app',
  },
  requestedBy: 'alexandre.simoes',
  reviewers: [
    {
      githubProfile: 'Guest',
      email: 'guest@picpay.com',
      status: 'APPROVED',
    },
  ],
  resion: 'teste via api moonlight',
  status: ProgressStatus.SUCCESS,
  steps: [
    {
      type: 'sonar',
      title: 'Deletion process of sonar',
      status: StepStatus.PENDING,
      events: [
        {
          type: 'info',
          message: 'sonarcloud project pending deletion',
          date: '2022-05-20T15:51:38.077Z',
        },
      ],
    },
  ],
  updatedAt: '2022-06-01T00:00:00Z',
  createdAt: '2022-05-20T15:51:38.077Z',
};

let rendered: any;

interface Props {
  appName: string;
  handleCancel: Function;
  handleConfirm: Function;
}

function MockedFormDelete(props: Props) {
  return (
    <>
      <h1>This is a mocked form</h1>
      <button
        data-testid="mocked-delete-form"
        onClick={() => {
          props.handleCancel();
          props.handleConfirm(MOCK);
        }}
      >
        {props.appName}
      </button>
    </>
  );
}

jest.mock('./components/FormDelete', () => ({ FormDelete: MockedFormDelete }));

const mockApi: jest.Mocked<Sanctuary2ApiClient> = {
  getStatusByID: jest.fn().mockResolvedValue({ error: true }),
} as any;

const mockRepositorySettingsApiRef: jest.Mocked<RepositorySettingsApiClient> = {
  getRepositorySettings: jest.fn(),
} as any;

const mockErrorApi: jest.Mocked<typeof errorApiRef.T> = {
  post: jest.fn(),
  error$: jest.fn(),
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('<Management />', () => {
  interface WrapperProps {
    children: React.ReactNode;
  }
  let Wrapper: React.FC<WrapperProps>;

  beforeEach(() => {
    Wrapper = ({ children }: { children?: React.ReactNode }) => (
      <TestApiProvider
        apis={[
          [Sanctuary2ApiRef, mockApi],
          [RepositorySettingsApiRef, mockRepositorySettingsApiRef],
          [errorApiRef, mockErrorApi],
        ]}
      >
        <EntityProvider
          entity={{
            apiVersion: '',
            kind: 'component',
            metadata: {
              uid: '2e63b244-af81-4861-bc6a-e1349875d74a',
              name: 'ms-test',
            },
          }}
        >
          {children}
        </EntityProvider>
      </TestApiProvider>
    );
  });

  it('should to be defined', async () => {
    mockRepositorySettingsApiRef.getRepositorySettings.mockResolvedValueOnce({
      projectSlug: "ms-moonlight",
      canUpdateSetting: false,
      requireApprovals: 2,
      requireCodeOwnerReviews: false,
      deleteBranchOnMerge: true,
      protectionExists: true,
      visibility: RepositoryVisibility.public,
    });
    rendered = await renderInTestApp(
      <Wrapper>
        <Management />
      </Wrapper>,
    );
    expect(Management).toBeDefined();
  });

  it('should view delete button', async () => {
    mockRepositorySettingsApiRef.getRepositorySettings.mockResolvedValueOnce({
      projectSlug: "ms-moonlight",
      canUpdateSetting: false,
      requireApprovals: 2,
      requireCodeOwnerReviews: false,
      deleteBranchOnMerge: true,
      protectionExists: true,
      visibility: RepositoryVisibility.public,
    });
    rendered = await renderInTestApp(
      <Wrapper>
        <Management />
      </Wrapper>,
    );
    expect(rendered.getByTestId('btn-delete')).toBeInTheDocument();
  });

  it('should view delete form', async () => {
    mockRepositorySettingsApiRef.getRepositorySettings.mockResolvedValueOnce({
      projectSlug: "ms-moonlight",
      canUpdateSetting: false,
      requireApprovals: 2,
      requireCodeOwnerReviews: false,
      deleteBranchOnMerge: true,
      protectionExists: true,
      visibility: RepositoryVisibility.public,
    });
    rendered = await renderInTestApp(
      <Wrapper>
        <Management />
      </Wrapper>,
    );
    const btnDelete = rendered.getByTestId('btn-delete');

    act(() => {
      fireEvent.click(btnDelete);
    });
    expect(rendered.getByTestId('mocked-delete-form')).toBeInTheDocument();
  });

  it('should confirm delete', async () => {
    mockRepositorySettingsApiRef.getRepositorySettings.mockResolvedValueOnce({
      projectSlug: "ms-moonlight",
      canUpdateSetting: false,
      requireApprovals: 2,
      requireCodeOwnerReviews: false,
      deleteBranchOnMerge: true,
      protectionExists: true,
      visibility: RepositoryVisibility.public,
    });
    rendered = await renderInTestApp(
      <Wrapper>
        <Management />
      </Wrapper>,
    );

    expect(await waitFor(() => rendered.getByTestId('btn-delete'))).toBeInTheDocument();
    act(() => {
      fireEvent.click(rendered.getByTestId('btn-delete'));
    });
    act(() => {
      fireEvent.click(rendered.getByTestId('mocked-delete-form'));
    });

    expect(rendered.getByTestId('requester-component')).toBeInTheDocument();
    expect(rendered.getByTestId('status-component')).toBeInTheDocument();
    expect(rendered.getByTestId('reviewers-component')).toBeInTheDocument();
    expect(rendered.getByTestId('steps-component')).toBeInTheDocument();
  });

  it('should failed getStatus: DEFAULT', async () => {
    mockRepositorySettingsApiRef.getRepositorySettings.mockResolvedValueOnce({
      projectSlug: "ms-moonlight",
      canUpdateSetting: false,
      requireApprovals: 2,
      requireCodeOwnerReviews: false,
      deleteBranchOnMerge: true,
      protectionExists: true,
      visibility: RepositoryVisibility.public,
    });
    mockApi.getStatusByID.mockRejectedValueOnce({
      json: () => ({
        data: 'message error',
      }),
    });

    rendered = await renderInTestApp(
      <Wrapper>
        <Management />
      </Wrapper>,
    );
    expect(rendered.getByTestId('alert-error')).toBeInTheDocument();
    expect(rendered.queryByText('ERROR:')).toBeInTheDocument();
    expect(
      rendered.queryByText('An unexpected problem occurred.'),
    ).toBeInTheDocument();
  });

  it('should failed getStatusByID: REVIEWERS_NOT_FOUND', async () => {
    mockRepositorySettingsApiRef.getRepositorySettings.mockResolvedValueOnce({
      projectSlug: "ms-moonlight",
      canUpdateSetting: false,
      requireApprovals: 2,
      requireCodeOwnerReviews: false,
      deleteBranchOnMerge: true,
      protectionExists: true,
      visibility: RepositoryVisibility.public,
    });
    mockApi.getStatusByID.mockRejectedValueOnce({
      json: () => ({
        data: 'REVIEWERS_NOT_FOUND',
      }),
    });

    rendered = await renderInTestApp(
      <Wrapper>
        <Management />
      </Wrapper>,
    );
    expect(rendered.getByTestId('alert-error')).toBeInTheDocument();
    expect(rendered.queryByText('ERROR:')).toBeInTheDocument();
    expect(rendered.queryByText('Reviewers not found.')).toBeInTheDocument();
  });

  it('should failed getStatusByID: GROUP_OWNER_NOT_FOUND', async () => {
    mockRepositorySettingsApiRef.getRepositorySettings.mockResolvedValueOnce({
      projectSlug: "ms-moonlight",
      canUpdateSetting: false,
      requireApprovals: 2,
      requireCodeOwnerReviews: false,
      deleteBranchOnMerge: true,
      protectionExists: true,
      visibility: RepositoryVisibility.public,
    });
    mockApi.getStatusByID.mockRejectedValueOnce({
      json: () => ({
        data: 'GROUP_OWNER_NOT_FOUND',
      }),
    });

    rendered = await renderInTestApp(
      <Wrapper>
        <Management />
      </Wrapper>,
    );
    expect(rendered.getByTestId('alert-error')).toBeInTheDocument();
    expect(rendered.queryByText('ERROR:')).toBeInTheDocument();
    expect(rendered.queryByText('Group owner not found.')).toBeInTheDocument();
  });

  it('should failed getStatusByID: COMPONENT_NOT_FOUND', async () => {
    mockRepositorySettingsApiRef.getRepositorySettings.mockResolvedValueOnce({
      projectSlug: "ms-moonlight",
      canUpdateSetting: false,
      requireApprovals: 2,
      requireCodeOwnerReviews: false,
      deleteBranchOnMerge: true,
      protectionExists: true,
      visibility: RepositoryVisibility.public,
    });
    mockApi.getStatusByID.mockRejectedValueOnce({
      json: () => ({
        data: 'COMPONENT_NOT_FOUND',
      }),
    });
    const navigate = jest.fn();
    jest.spyOn(router, 'useNavigate').mockImplementation(() => navigate);
    rendered = await renderInTestApp(
      <Wrapper>
        <Management />
      </Wrapper>,
    );
    expect(navigate).toHaveBeenCalledWith('/not_found');
  });
});
