import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { waitFor, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { toolsApiRef } from '../../api';
import { CustomToolExplorerContent } from './CustomToolExplorerContent';
import { CustomExploreTool } from '@internal/plugin-picpay-tools-backend';

describe('<ToolExplorerContent />', () => {
  const exploreApi: jest.Mocked<typeof toolsApiRef.T> = {
    getTools: jest.fn(),
  };

  const Wrapper = ({ children }: { children?: React.ReactNode }) => (
    <TestApiProvider apis={[[toolsApiRef, exploreApi]]}>
      {children}
    </TestApiProvider>
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });
  it('renders a grid of tools', async () => {
    const tools: CustomExploreTool[] = [
      {
        categoryType: 'TEST',
        categoryName: 'TEST',
        categoryTools: [
          {
            id: 'aaa-aaa',
            title: 'Test 1 title',
            description: 'Test 1 description',
            productUrl: '/test-1',
            typeInterface: 'Test 1 interface',
          },

          {
            id: 'bbb-bbb',
            title: 'Test 2 title',
            description: 'Test 2 description',
            productUrl: '/test-2',
            typeInterface: 'Test 2 interface',
          },
        ],
      },
    ];
    exploreApi.getTools.mockResolvedValue({ tools });

    const { getByText } = await renderInTestApp(
      <Wrapper>
        <CustomToolExplorerContent title="" />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(getByText('Test 1 title')).toBeInTheDocument();
      expect(getByText('Test 2 title')).toBeInTheDocument();
    });
  });

  it('renders a custom title', async () => {
    exploreApi.getTools.mockResolvedValue({ tools: [] });

    const { getByText } = await renderInTestApp(
      <Wrapper>
        <CustomToolExplorerContent title="Our Tools" />
      </Wrapper>,
    );

    await waitFor(() => expect(getByText('Our Tools')).toBeInTheDocument());
  });

  it('filters tools by searchbar', async () => {
    const tools: CustomExploreTool[] = [
      {
        categoryType: 'TEST',
        categoryName: 'TEST',
        categoryTools: [
          {
            id: 'aaa-aaa',
            title: 'Test 1 title',
            description: 'Test 1 description',
            productUrl: '/test-1',
            typeInterface: 'Test 1 interface',
          },

          {
            id: 'bbb-bbb',
            title: 'Test 2 title',
            description: 'Test 2 description',
            productUrl: '/test-2',
            typeInterface: 'Test 2 interface',
          },
        ],
      },
    ];

    exploreApi.getTools.mockResolvedValue({ tools });

    const { getByText, getByPlaceholderText, queryByText } =
      await renderInTestApp(
        <Wrapper>
          <CustomToolExplorerContent title="Our Tools" />
        </Wrapper>,
      );

    const searchInput = getByPlaceholderText('Search');

    fireEvent.change(searchInput, { target: { value: 'test 1 title' } });

    await waitFor(() => {
      expect(getByText('Test 1 title')).toBeInTheDocument();
      expect(queryByText('Test 2 title')).toBeNull();
    });
  });

  it('filters tools by category autocomplete', async () => {
    const tools: CustomExploreTool[] = [
      {
        categoryType: 'TEST_CATEGORY_1',
        categoryName: 'TEST CATEGORY 1',
        categoryTools: [
          {
            id: 'aaa-aaa',
            title: 'Test 1 title',
            description: 'Test 1 description',
            productUrl: '/test-1',
            typeInterface: 'Test 1 interface',
          },

          {
            id: 'bbb-bbb',
            title: 'Test 2 title',
            description: 'Test 2 description',
            productUrl: '/test-2',
            typeInterface: 'Test 2 interface',
          },
        ],
      },

      {
        categoryType: 'TEST_CATEGORY_2',
        categoryName: 'TEST CATEGORY 2',
        categoryTools: [
          {
            id: 'ccc-ccc',
            title: 'Test 3 title',
            description: 'Test 3 description',
            productUrl: '/test-3',
            typeInterface: 'Test 3 interface',
          },

          {
            id: 'ddd-ddd',
            title: 'Test 4 title',
            description: 'Test 4 description',
            productUrl: '/test-4',
            typeInterface: 'Test 4 interface',
          },
        ],
      },
    ];

    exploreApi.getTools.mockResolvedValue({ tools });

    const { getByText, queryByText, getByTestId } = await renderInTestApp(
      <Wrapper>
        <CustomToolExplorerContent title="Our Tools" />
      </Wrapper>,
    );

    const autocomplete = getByTestId('autocomplete-filter');
    const input = within(autocomplete).getByRole('textbox');
    autocomplete.focus();
    fireEvent.change(input, { target: { value: 'TEST CATEGORY 1' } });
    fireEvent.keyDown(autocomplete, { key: 'ArrowDown' });
    fireEvent.keyDown(autocomplete, { key: 'Enter' });

    await waitFor(() => {
      expect(getByText('TEST CATEGORY 1')).toBeInTheDocument();
      expect(queryByText('TEST CATEGORY 2')).toBeNull();
    });
  });

  it('filters tools by searchbar and category autocomplete', async () => {
    const tools: CustomExploreTool[] = [
      {
        categoryType: 'TEST_CATEGORY_1',
        categoryName: 'TEST CATEGORY 1',
        categoryTools: [
          {
            id: 'aaa-aaa',
            title: 'Test 1 title',
            description: 'Test 1 description',
            productUrl: '/test-1',
            typeInterface: 'Test 1 interface',
          },

          {
            id: 'bbb-bbb',
            title: 'Test 2 title',
            description: 'Test 2 description',
            productUrl: '/test-2',
            typeInterface: 'Test 2 interface',
          },
        ],
      },

      {
        categoryType: 'TEST_CATEGORY_2',
        categoryName: 'TEST CATEGORY 2',
        categoryTools: [
          {
            id: 'ccc-ccc',
            title: 'Test 1 title',
            description: 'Test 1 description',
            productUrl: '/test-1',
            typeInterface: 'Test 1 interface',
          },

          {
            id: 'ddd-ddd',
            title: 'Test 2 title',
            description: 'Test 2 description',
            productUrl: '/test-2',
            typeInterface: 'Test 2 interface',
          },
        ],
      },
    ];

    exploreApi.getTools.mockResolvedValue({ tools });

    const { getByText, queryByText, getByTestId, getByPlaceholderText } =
      await renderInTestApp(
        <Wrapper>
          <CustomToolExplorerContent title="Our Tools" />
        </Wrapper>,
      );

    const autocomplete = getByTestId('autocomplete-filter');
    const autocompleteInput = within(autocomplete).getByRole('textbox');
    autocomplete.focus();
    fireEvent.change(autocompleteInput, {
      target: { value: 'TEST CATEGORY 2' },
    });
    fireEvent.keyDown(autocomplete, { key: 'ArrowDown' });
    fireEvent.keyDown(autocomplete, { key: 'Enter' });

    const searchInput = getByPlaceholderText('Search');

    fireEvent.change(searchInput, { target: { value: 'test 1 title' } });

    await waitFor(() => {
      expect(getByText('TEST CATEGORY 2')).toBeInTheDocument();
      expect(queryByText('TEST CATEGORY 1')).toBeNull();
      expect(getByText('Test 1 title')).toBeInTheDocument();
      expect(queryByText('Test 2 title')).toBeNull();
    });
  });
});
