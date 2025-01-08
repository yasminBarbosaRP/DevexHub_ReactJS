import React from 'react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { alertApiRef } from '@backstage/core-plugin-api';
import { UserGroupsContext, InfoApiRef, TemplateContext } from '@internal/plugin-picpay-commons';
import { Header } from './index';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { useHoustonContext } from '@internal/plugin-picpay-houston';
import { catalogApiRef } from '@backstage/plugin-catalog-react';


const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@internal/plugin-picpay-announcements', () => ({
  AnnouncementsCard: () => <div data-testid="announcements-card">Announcements</div>,
}));

jest.mock('@internal/plugin-picpay-houston', () => ({
  useHoustonContext: jest.fn(),
}));


const mockUserInfo = {
  apiVersion: 'backstage.io/v1beta1',
  kind: 'User',
  metadata: { name: 'jdoe', namespace: 'default' },
  spec: {
    profile: { displayName: 'John Doe' },
    isLead: true,
  },
};

const mockUserGroups = [
  {
    label: 'Team Alpha',
    ref: 'group:default/team-alpha',
    children: [],
    type: 'team',
    isOwnerOfEntities: false,
  },
  {
    label: 'Squad Beta',
    ref: 'group:picpay/squad-beta',
    children: ['user:default/alice'],
    type: 'squad',
    isOwnerOfEntities: false,
  },
];

const mockAdGroup = [
  {
    kind: 'User',
    metadata: {
      name: 'squad-sunrise',
      description: 'A description for squad-sunrise',
    },
    spec: {
      type: 'squad',
      profile: { picture: 'http://example.com/pic.png' },
      children: ['github-team-1', 'github-team-2'],
    },
  },
];

const mockFlags = {
  allows_select_group_to_update: true,
};

describe('<Header />', () => {
  const mockAlertApi = { post: jest.fn() };
  const mockCatalogApi = {
    getEntities: jest.fn(),
  };
  const mockInfoApi = {
    getMembers: jest.fn(),
  };

  beforeEach(() => {
    (useHoustonContext as jest.Mock).mockReturnValue(mockFlags);
    mockAlertApi.post.mockClear();
    mockCatalogApi.getEntities.mockClear();
    mockInfoApi.getMembers.mockClear();
    mockNavigate.mockClear(); 
  });

  const renderComponent = async ({
    userInfo = mockUserInfo,
    userGroups = mockUserGroups,
    adGroup = mockAdGroup,
    infoApi = mockInfoApi,
    catalogApi = mockCatalogApi,
  } = {}) => {
    return await renderInTestApp(
      <TestApiProvider
        apis={[
          [alertApiRef, mockAlertApi],
          [catalogApiRef, catalogApi],
          [InfoApiRef, infoApi],
        ]}
      >
        <UserGroupsContext.Provider value={{ userGroups, userInfo, setUserGroups: jest.fn(), setUserInfo: jest.fn() }}>
          <TemplateContext.Provider value={{ adGroup, extractIdentityValue: jest.fn(), loading: false, processItem: jest.fn() }}>
            <Header myTeams />
          </TemplateContext.Provider>
        </UserGroupsContext.Provider>
      </TestApiProvider>,
    );
  };

  it('renders greeting with user first name', async () => {
    await renderComponent();
    expect(screen.getByText(/Hello, John!/)).toBeInTheDocument();
  });

  it('allows searching for components', async () => {
    const { getByTestId } = await renderComponent();
    const input = within(getByTestId('input-search')).getByRole("textbox");
    fireEvent.change(input, { target: { value: 'my-component' } });
    fireEvent.click(getByTestId('btn-search'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/search?query=my-component');
    });
  });

  it('shows squads and a show more button if more than 5 squads', async () => {
    const bigUserGroups = Array.from({ length: 7 }, (_, i) => ({
      label: `Squad ${i}`,
      ref: `group:default/squad-${i}`,
      children: [],
      type: 'squad',
      isOwnerOfEntities: false,
    }));
    await renderComponent({ userGroups: bigUserGroups });
    expect(screen.getByText('Your organization')).toBeInTheDocument();
    expect(screen.getByText('+ 2')).toBeInTheDocument();
  });

  it('clicking show more toggles to show less', async () => {
    const bigUserGroups = Array.from({ length: 7 }, (_, i) => ({
      label: `Squad ${i}`,
      ref: `group:default/squad-${i}`,
      children: [],
      type: 'squad',
      isOwnerOfEntities: false,
    }));
    await renderComponent({ userGroups: bigUserGroups });
    fireEvent.click(screen.getByText('+ 2'));
    expect(await screen.findByText('- 2')).toBeInTheDocument();
  });

  it('if no userGroups, no squads are shown', async () => {
    await renderComponent({ userGroups: [] });

    expect(screen.queryByText('Your organization')).not.toBeInTheDocument();
  });

  it('shows members avatars if available', async () => {
    mockCatalogApi.getEntities.mockResolvedValueOnce({
      items: [
        {
          kind: 'User', metadata: { name: 'alice', namespace: 'default' },
          spec: { profile: { displayName: 'Alice', picture: 'http://example.com/alice.png' } },
        },
      ],
    });
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Members')).toBeInTheDocument();
    });
    expect(screen.getByAltText('Alice')).toBeInTheDocument();
  });

  it('shows a "show more" button for avatars if more than MAX_AVATAR_PAGINATION members', async () => {
    const avatars = Array.from({ length: 10 }, (_, i) => ({
      kind: 'User', metadata: { name: `user${i}`, namespace: 'default' },
      spec: { profile: { displayName: `User ${i}`, picture: '' } },
    }));
    mockCatalogApi.getEntities.mockResolvedValueOnce({ items: avatars });
    await renderComponent();
    await waitFor(() => screen.getByText('Members'));

    const addFab = screen.getByRole('button', { name: /add/i });
    expect(addFab).toBeInTheDocument();
  });

  it('if userInfo.spec.isLead is true, shows edit icon button', async () => {
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId('edit-organization')).toBeInTheDocument();
    });
  });

  it('does not show edit icon if userInfo.spec.isLead is false', async () => {
    const nonLeadUser = {
      ...mockUserInfo,
      spec: {
        ...mockUserInfo.spec,
        isLead: false,
      },
    };
    await renderComponent({ userInfo: nonLeadUser });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    });
  });

  it('handles errors when loading members', async () => {
    const teams = [mockAdGroup[0],mockAdGroup[0]];
    mockInfoApi.getMembers.mockRejectedValueOnce(new Error('Failed to load members'));
    await renderComponent({ adGroup: teams });
    expect(mockAlertApi.post).toHaveBeenCalledWith({
      message: 'Failed to load members',
      severity: 'error',
    });
  });

  it('handles errors when loading avatars', async () => {
    mockCatalogApi.getEntities.mockRejectedValueOnce(new Error('Failed to load avatars'));
    await renderComponent();
    expect(mockAlertApi.post).toHaveBeenCalledWith({
      message: 'Failed to load avatars',
      severity: 'error',
    });
  });

  it('handles form submission with enter key', async () => {
    const { getByTestId } = await renderComponent();
    const form = getByTestId('form-search');
    const input = within(getByTestId('input-search')).getByRole('textbox');
    
    fireEvent.change(input, { target: { value: 'test-search' } });
    fireEvent.submit(form);
    
    expect(mockNavigate).toHaveBeenCalledWith('/search?query=test-search');
  });

  it('properly sorts squads with default groups first', async () => {
    const mixedSquads = [
      {
        label: 'No Default',
        ref: 'group:picpay/squad-no-default',
        children: ["group:default/squad-no-default"],
        type: 'squad',
        isOwnerOfEntities: true,
      },
      {
        label: 'No Default',
        ref: 'group:default/squad-no-default',
        children: [],
        type: 'squad',
        isOwnerOfEntities: true,
      },
      {
        label: 'With Default',
        ref: 'group:picpay/squad-with-default',
        children: ['group:default/team-default'],
        type: 'squad',
        isOwnerOfEntities: false,
      },
    ];
    
    await renderComponent({ userGroups: mixedSquads });
    const chips = screen.getAllByTestId('chips');
    expect(chips[0]).toHaveTextContent('No Default');
    expect(within(chips[0]).getAllByTestId("icon").length).toBe(2);
    expect(chips[1]).toHaveTextContent('With Default');
  });

  it('getMembers is called', async () => {
    const teams = [mockAdGroup[0],mockAdGroup[0]];
    await renderComponent({ adGroup: teams });
    
    
    expect(mockInfoApi.getMembers).toHaveBeenCalled();
  });

  it('getMembers is not called', async () => {
    const teams = [mockAdGroup[0]];
    await renderComponent({ adGroup: teams });
    
    
    expect(mockInfoApi.getMembers).not.toHaveBeenCalled();
  });

  it('handles multiple teams in adGroup', async () => {
    const multipleTeams = [
      mockAdGroup[0],
      {
        ...mockAdGroup[0],
        metadata: { 
          name: 'squad-sunset',
          description: 'A description for squad-sunset',
        },
      },
    ];
    mockInfoApi.getMembers.mockResolvedValue([]);
    
    await renderComponent({ adGroup: multipleTeams });
    
    expect(mockInfoApi.getMembers).toHaveBeenCalledTimes(2);
  });

  it('shows loading skeleton while loading avatars', async () => {
    let resolvePromise: (value: any) => void;
    mockCatalogApi.getEntities.mockImplementation(() => new Promise(resolve => {
      resolvePromise = resolve;
    }));
    const rendered = renderComponent();
    expect(screen.getByTestId('loading-avatars')).toBeInTheDocument();
    resolvePromise!({ items: [] });
    await rendered;
  });

  it('filters out duplicate members in avatars', async () => {
    const duplicateMembers = [
      {
        kind: 'User',
        metadata: { name: 'alice', namespace: 'default' },
        spec: { profile: { displayName: 'Alice', picture: 'alice.jpg' } },
      },
      {
        kind: 'User',
        metadata: { name: 'alice', namespace: 'default' },
        spec: { profile: { displayName: 'Alice', picture: 'alice.jpg' } },
      },
    ];
    
    mockCatalogApi.getEntities.mockResolvedValueOnce({ items: duplicateMembers });
    await renderComponent();
    
    const avatars = screen.getAllByRole('img');
    expect(avatars).toHaveLength(1);
  });

  it('handles undefined displayName in userInfo', async () => {
    const userInfoNoDisplay = {
      ...mockUserInfo,
      spec: { profile: { displayName: undefined as unknown as string }, isLead: false },
    };
    
    await renderComponent({ userInfo: userInfoNoDisplay });
    expect(screen.getByText('Hello, Guest!')).toBeInTheDocument();
  });
});
