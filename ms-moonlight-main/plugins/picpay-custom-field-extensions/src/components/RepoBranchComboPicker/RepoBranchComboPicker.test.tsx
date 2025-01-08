// @ts-nocheck
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepoBranchComboPicker } from './RepoBranchComboPicker';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { githubApiRef, GithubApi } from '@internal/plugin-picpay-github';

describe('<RepoBranchComboPicker />', () => {
  const onChange = jest.fn();
  const onBlur = jest.fn();
  const onFocus = jest.fn();

  const uiSchema = {
    'ui:options': {
      repositories: ['picpay-android', 'picpay-ios'],
    },
  };

  const initialFormData = {
    repository: '',
    branch: '',
  };

  const idSchema = {
    $id: 'test-id',
  };

  const schema = {}; // Provide an empty schema object

  const githubApi: jest.Mocked<GithubApi> = {
    getBranches: jest.fn(),
    getClustersFromBU: jest.fn(),
  } as any;

  const props = {
    id: 'test-field-id',
    onChange,
    onBlur,
    onFocus,
    uiSchema,
    idSchema,
    schema,
    required: false,
    rawErrors: [],
    formContext: {},
  };

  const Wrapper: React.ComponentType = ({ children }: { children?: React.ReactNode }) => (
    <TestApiProvider apis={[[githubApiRef, githubApi]]}>{children}</TestApiProvider>
  );

  beforeEach(() => {
    githubApi.getBranches.mockResolvedValue([
      {
        name: 'main',
        commit: {
          sha: 'abc',
          url: 'github.com',
        },
        protected: true,
        protection: {
          required_status_checks: {
            enforcement_level: 'test',
            contexts: [],
          },
        },
        protection_url: 'test',
      },
      {
        name: 'test-branch',
        commit: {
          sha: 'abc',
          url: 'github.com',
        },
        protected: true,
        protection: {
          required_status_checks: {
            enforcement_level: 'test',
            contexts: [],
          },
        },
        protection_url: 'test',
      },
    ]);
  });

  afterEach(() => jest.resetAllMocks());

  it('fires onChange when repository and branch are selected', async () => {
    // Create a stateful wrapper component
    const TestComponent = () => {
      const [formData, setFormData] = React.useState(initialFormData);

      const handleChange = (newFormData) => {
        setFormData(newFormData);
        onChange(newFormData);
      };

      return (
        <RepoBranchComboPicker
          {...props}
          formData={formData}
          onChange={handleChange}
        />
      );
    };

    await renderInTestApp(
      <Wrapper>
        <TestComponent />
      </Wrapper>,
    );

    // Select repository
    const repositoryAutocomplete = screen.getByLabelText('Repository');
    userEvent.click(repositoryAutocomplete);

    const repositoryOption = await screen.findByText('picpay-android');
    userEvent.click(repositoryOption);

    // Wait for onChange to be called with the repository
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        repository: 'picpay-android',
        branch: '',
      }),
    );

    // Wait for branches to be loaded
    await waitFor(() =>
      expect(githubApi.getBranches).toHaveBeenCalledWith('picpay-android'),
    );

    // Select branch
    const branchAutocomplete = screen.getByLabelText('Branch');
    userEvent.click(branchAutocomplete);

    const branchOption = await screen.findByText('main');
    userEvent.click(branchOption);

    // Wait for onChange to be called with the branch
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        repository: 'picpay-android',
        branch: 'main',
      }),
    );
  });
});
