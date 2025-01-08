import React from 'react';
import { waitFor } from '@testing-library/react';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { EntityIssues } from './EntityIssues';
import { GithubApi, GithubIssue, githubApiRef } from '../../api';
import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';

const mockWindowOpen = jest.fn();
global.open = mockWindowOpen;

const entity = {
    apiVersion: 'backstage', kind: 'Component', metadata: {
        name: 'repo1', annotations: {
            'github.com/project-slug': 'PicPay/repo1',
            'backstage.io/source-location': 'url',
            'backstage.io/managed-by-location': 'url',
        }
    },
}

describe('EntityIssues', () => {
    const mockIssues: GithubIssue[] = [
        {
            id: 1,
            title: 'Issue 1',
            html_url: 'https://github.com/PicPay/repo1/issues/1',
            labels: [{
                name: 'bug',
                id: 0,
                node_id: '',
                url: '',
                color: '',
                default: false,
                description: ''
            }],
            user: {
                login: 'user1[bot]',
                id: 0,
                node_id: '',
                avatar_url: '',
                gravatar_id: '',
                url: '',
                html_url: '',
                followers_url: '',
                following_url: '',
                gists_url: '',
                starred_url: '',
                subscriptions_url: '',
                organizations_url: '',
                repos_url: '',
                events_url: '',
                received_events_url: '',
                type: '',
                site_admin: false
            },
            body: 'Issue description',
            node_id: '',
            url: '',
            repository_url: '',
            labels_url: '',
            comments_url: '',
            events_url: '',
            number: 0,
            state: 'open',
            assignee: '',
            assignees: [],
            milestone: '',
            locked: false,
            active_lock_reason: '',
            comments: 0,
            pull_request: {
                url: '',
                html_url: '',
                diff_url: '',
                patch_url: ''
            },
            closed_at: '',
            created_at: '',
            updated_at: ''
        },
        {
            id: 2,
            title: 'Issue 2',
            html_url: 'https://github.com/PicPay/repo1/issues/2',
            labels: [{
                name: 'feature',
                id: 0,
                node_id: '',
                url: '',
                color: '',
                default: false,
                description: ''
            }],
            user: {
                login: 'user2[bot]',
                id: 0,
                node_id: '',
                avatar_url: '',
                gravatar_id: '',
                url: '',
                html_url: '',
                followers_url: '',
                following_url: '',
                gists_url: '',
                starred_url: '',
                subscriptions_url: '',
                organizations_url: '',
                repos_url: '',
                events_url: '',
                received_events_url: '',
                type: '',
                site_admin: false
            },
            body: 'Issue description',
            node_id: '',
            url: '',
            repository_url: '',
            labels_url: '',
            comments_url: '',
            events_url: '',
            number: 0,
            state: 'open',
            assignee: '',
            assignees: [],
            milestone: '',
            locked: false,
            active_lock_reason: '',
            comments: 0,
            pull_request: {
                url: '',
                html_url: '',
                diff_url: '',
                patch_url: ''
            },
            closed_at: '',
            created_at: '',
            updated_at: ''
        },
    ];

    const githubApiMock: jest.Mocked<GithubApi> = {
        getIssues: jest.fn(),
        getBranches: jest.fn(),
        getClustersFromBU: jest.fn(),
        getRepo: jest.fn()
    };

    let Wrapper: React.ComponentType<React.PropsWithChildren<{}>>;

    beforeEach(() => {
        Wrapper = ({ children }: { children?: React.ReactNode }) => (
            <TestApiProvider apis={[[githubApiRef, githubApiMock]]}>
                {children}
            </TestApiProvider>
        );
    });


    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('renders loading state and fetches issues', async () => {
        githubApiMock.getIssues.mockResolvedValue(mockIssues);
        const { getByText, findAllByText } = await renderInTestApp(
            <Wrapper>
                <EntityProvider entity={entity}>
                    <EntityIssues />
                </EntityProvider>
            </Wrapper>
        );

        expect(getByText('Issues Pending')).toBeInTheDocument();
        await waitFor(() => expect(githubApiMock.getIssues).toHaveBeenCalledWith('repo1'));
        expect(getByText('Issue 1')).toBeInTheDocument();
        expect(getByText('Issue 2')).toBeInTheDocument();
        expect((await findAllByText('Open Issue')).length).toBeGreaterThan(0);
    });

    it('renders error state if fetching issues fails', async () => {
        githubApiMock.getIssues.mockRejectedValue(new Error('Failed to fetch issues'));
        const { getByText } = await renderInTestApp(
            <Wrapper>
                <EntityProvider entity={entity}>
                    <EntityIssues />
                </EntityProvider>
            </Wrapper>
        );

        await waitFor(() => expect(githubApiMock.getIssues).toHaveBeenCalledWith('repo1'));
        expect(getByText('Error fetching issues: Failed to fetch issues')).toBeInTheDocument();
    });
});
