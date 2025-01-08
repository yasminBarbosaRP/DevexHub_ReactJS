import { renderInTestApp } from '@backstage/test-utils';
import { PipelineFetchComponent } from './PipelineFetchComponent';
import { act, fireEvent } from '@testing-library/react';
import { Status, PipelineStatus } from '../../interfaces';
import React from 'react';

let rendered: any;

const mockProps = {
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
};

beforeEach(async () => {
  rendered = await renderInTestApp(<PipelineFetchComponent {...mockProps} />);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('<PipelineFetchComponent />', () => {
  it('should if rendered text Logs of the last 60 minutes', () => {
    const logTitle = rendered.getAllByText('Logs of the last 60 minutes');
    expect(logTitle.length).toEqual(1);
  });

  it('should if all columns are being rendered', () => {
    const status = rendered.getAllByText('Status');
    expect(status.length).toEqual(1);

    const pipeline = rendered.getAllByText('Pipeline');
    expect(pipeline.length).toEqual(1);
  });

  it('should if the filter is searching correctly', () => {
    const search = rendered.getByPlaceholderText('Filter');
    fireEvent.change(search, { target: { value: 'lib-go' } });
    expect(search.value).toEqual('lib-go');
  });

  it('mocked component', () => {
    const running = rendered.getAllByText('Running');
    expect(running.length).toEqual(1);
  });

  it('validate No information when duration is empty', () => {
    const duration = rendered.getAllByText('No information');
    expect(duration.length).toEqual(1);
  });

  it('validate estimated time in minutes', () => {
    const estimatedTime = rendered.getAllByText('14 minutes');
    expect(estimatedTime.length).toEqual(1);
  });

  it('validate start time', () => {
    const startTime = rendered.getAllByText('16h45');
    expect(startTime.length).toEqual(1);
  });

  it('validate pipeline status', () => {
    const pipelineStatus = rendered.getAllByText('pull-request');
    expect(pipelineStatus.length).toEqual(1);
  });

  it('validate link cicd', () => {
    const url = rendered.getAllByRole('link');
    act(() => {
      fireEvent.click(url[0]);
    });
    expect(url.length).toEqual(1);
  });
});
