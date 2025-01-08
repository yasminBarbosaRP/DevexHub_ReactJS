// @ts-nocheck

import { PipelineComponent } from './PipelineComponent';
import React from 'react';
import { PipelineStatus, Status } from '../../interfaces';
import { PipelineRunClient, PipelineRunApiRef } from '../../api';
import {
  renderInTestApp,
  TestApiProvider,
  wrapInTestApp,
} from '@backstage/test-utils';
import { Select, SupportButton } from '@backstage/core-components';
import {
  act,
  render,
  within,
  RenderResult,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@material-ui/core';

let rendered: any;

const SUPPORT_BUTTON_ID = 'support-button';
const TUTORIAL_BUTTON_ID = 'tutorial-button';

const pipelineItems = [
  { label: 'All', value: PipelineStatus.All },
  { label: 'Pull Request', value: PipelineStatus.PullRequest },
  { label: 'Deploy QA', value: PipelineStatus.DeployQA },
  { label: 'Push Main', value: PipelineStatus.PushMain },
  { label: 'Deploy Production', value: PipelineStatus.DeployProd },
];

const pipelineProps = {
  onChange: jest.fn(),
  label: 'Pipeline',
  placeholder: 'All',
  items: pipelineItems,
};

const mockApi: jest.Mocked<PipelineRunClient> = {
  getPipelineRun: jest.fn().mockResolvedValue({
    data: [
      {
        pipeline_id: 'lib-go',
        pipeline: PipelineStatus.PullRequest,
        status: Status.Running,
        start: '16h45',
        estimated_time: '14 minutes',
        duration: '',
        ci_cd:
          'https://dashboard.tekton.hub.ppay.me/#/namespaces/tekton-builds/pipelines',
      },
    ],
  }),
} as any;

const mockPipelineComponent = jest.fn(() => {
  return <PipelineComponent />;
});

beforeEach(async () => {
  rendered = await renderInTestApp(
    <TestApiProvider apis={[[PipelineRunApiRef, mockApi]]}>
      <PipelineComponent />
      <Select {...pipelineProps} />
    </TestApiProvider>,
  );
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('<SupportButton />', () => {
  it('renders without exploding', async () => {
    let renderResult: RenderResult;

    await act(async () => {
      renderResult = render(wrapInTestApp(<SupportButton />));
    });

    await waitFor(() =>
      expect(
        renderResult.getAllByTestId(SUPPORT_BUTTON_ID).length,
      ).toBeGreaterThan(0),
    );
  });
});

describe('<TutorialButton />', () => {
  it('renders without exploding', async () => {
    let renderResult: RenderResult;

    await act(async () => {
      renderResult = render(
        wrapInTestApp(<Button data-testid="tutorial-button">Tutorial</Button>),
      );
    });

    await waitFor(() =>
      expect(
        renderResult.getAllByTestId(TUTORIAL_BUTTON_ID).length,
      ).toBeGreaterThan(0),
    );

    await act(async () => {
      expect(renderResult.getAllByText('Tutorial').length).toBeGreaterThan(0);
    });
  });
});

describe('PipelineComponent', () => {
  it('should render', () => {
    expect(PipelineComponent).toBeDefined();
  });

  it('should display current value', () => {
    const { getAllByText } = rendered;

    expect(getAllByText('All').length).toBeGreaterThan(0);
  });

  it('should other Pull Request selected', async () => {
    const { getByText, queryByRole, getAllByText, getByTestId } = rendered;

    const pipeline = getByTestId('pipeline-select');

    expect(within(pipeline).getByText('Pipeline')).toBeInTheDocument();

    const select = within(pipeline).getByTestId('select');
    expect(select).toBeInTheDocument();

    const button = within(select).queryByRole('button');
    expect(button).toBeInTheDocument();

    await userEvent.click(button);

    const listBox = queryByRole('listbox');
    expect(listBox).toBeInTheDocument();

    await userEvent.click(within(listBox).getByText('Pull Request'));
    expect(select.textContent).toEqual('Pull Request');
  });

  it('should other Deploy QA selected', async () => {
    const { getByText, queryByRole, getAllByText, getByTestId } = rendered;

    const pipeline = getByTestId('pipeline-select');

    expect(within(pipeline).getByText('Pipeline')).toBeInTheDocument();

    const select = within(pipeline).getByTestId('select');
    expect(select).toBeInTheDocument();

    const button = within(select).queryByRole('button');
    expect(button).toBeInTheDocument();

    await userEvent.click(button);

    const listBox = queryByRole('listbox');
    expect(listBox).toBeInTheDocument();

    await userEvent.click(within(listBox).getByText('Deploy QA'));
    expect(select.textContent).toEqual('Deploy QA');
  });
});
