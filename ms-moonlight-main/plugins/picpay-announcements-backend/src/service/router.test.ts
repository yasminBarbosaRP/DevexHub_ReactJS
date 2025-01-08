import { getVoidLogger } from '@backstage/backend-common';
import express from 'express';
import { DateTime } from 'luxon';
import request from 'supertest';
import { AnnouncementsContext } from './announcementsContextBuilder';
import { Announcement } from './model';
import { AnnouncementsDatabase } from './persistence/AnnouncementsDatabase';
import { createRouter } from './router';
import {
  AuthorizeResult,
  PermissionEvaluator,
} from '@backstage/plugin-permission-common';
import { CategoriesDatabase } from './persistence/CategoriesDatabase';
import GithubAPI from './api/GithubAPI';
import { PersistenceContext } from './persistence/persistenceContext';

describe('createRouter', () => {
  let app: express.Express;

  const announcementsMock = jest.fn();
  const announcementByIDMock = jest.fn();
  const deleteAnnouncementByIDMock = jest.fn();
  const insertAnnouncementMock = jest.fn();
  const updateAnnouncementMock = jest.fn();
  const githubUpdateAnnouncementMock = jest.fn();

  const mockPersistenceContext: PersistenceContext = {
    announcementsStore: {
      announcements: announcementsMock,
      announcementByID: announcementByIDMock,
      deleteAnnouncementByID: deleteAnnouncementByIDMock,
      insertAnnouncement: insertAnnouncementMock,
      updateAnnouncement: updateAnnouncementMock,
    } as unknown as AnnouncementsDatabase,
    categoriesStore: {} as unknown as CategoriesDatabase,
  };

  const mockGithubAPI = {
    updateAnnouncement: githubUpdateAnnouncementMock,
  } as unknown as GithubAPI;

  const mockedAuthorize: jest.MockedFunction<PermissionEvaluator['authorize']> =
    jest.fn();

  const mockedPermissionQuery: jest.MockedFunction<
    PermissionEvaluator['authorizeConditional']
  > = jest.fn();

  const permissionEvaluator: PermissionEvaluator = {
    authorize: mockedAuthorize,
    authorizeConditional: mockedPermissionQuery,
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  beforeAll(async () => {
    const announcementsContext: AnnouncementsContext = {
      logger: getVoidLogger(),
      persistenceContext: mockPersistenceContext,
      permissions: permissionEvaluator,
      githubAPI: mockGithubAPI,
    };

    const router = await createRouter(announcementsContext);
    app = express().use(router);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /announcements', () => {
    it('returns ok', async () => {
      announcementsMock.mockReturnValueOnce([
        {
          id: 'uuid',
          title: 'title',
          excerpt: 'excerpt',
          body: 'body',
          publisher: 'user:default/name',
          created_at: DateTime.fromISO('2022-11-02T15:28:08.539Z'),
        },
      ] as Announcement[]);

      const response = await request(app).get('/announcements');

      expect(response.status).toEqual(200);
      expect(announcementsMock).toHaveBeenCalledWith({});
      expect(response.body).toEqual([
        {
          id: 'uuid',
          title: 'title',
          excerpt: 'excerpt',
          body: 'body',
          publisher: 'user:default/name',
          created_at: '2022-11-02T15:28:08.539+00:00',
        },
      ]);
    });
  });

  describe('POST /announcements', () => {
    it('create announcement', async () => {
      mockedAuthorize.mockResolvedValueOnce([
        { result: AuthorizeResult.ALLOW },
      ]);
      insertAnnouncementMock.mockReturnValueOnce([
        {
          id: 'uuid',
          title: 'title',
          excerpt: 'excerpt',
          body: 'body',
          publisher: 'user:default/name',
          created_at: DateTime.fromISO('2022-11-02T15:28:08.539Z'),
        },
      ] as Announcement[]);

      githubUpdateAnnouncementMock.mockResolvedValue({});

      const response = await request(app).post('/announcements').send({});

      expect(response.status).toEqual(200);
      expect(insertAnnouncementMock).toHaveBeenCalled();
      expect(githubUpdateAnnouncementMock).toHaveBeenCalled();
      expect(response.body).not.toBeNull();
    });
  });

  describe('PUT /announcements', () => {
    it('update announcement', async () => {
      mockedAuthorize.mockResolvedValueOnce([
        { result: AuthorizeResult.ALLOW },
      ]);
      announcementByIDMock.mockReturnValueOnce({});
      updateAnnouncementMock.mockReturnValueOnce({});

      githubUpdateAnnouncementMock.mockResolvedValue({});

      const response = await request(app).put('/announcements/abc123').send({});

      expect(response.status).toEqual(200);
      expect(announcementByIDMock).toHaveBeenCalledWith('abc123');
      expect(updateAnnouncementMock).toHaveBeenCalled();
      expect(githubUpdateAnnouncementMock).toHaveBeenCalled();
      expect(response.body).not.toBeNull();
    });
  });

  describe('DELETE /announcements', () => {
    it('update announcement', async () => {
      mockedAuthorize.mockResolvedValueOnce([
        { result: AuthorizeResult.ALLOW },
      ]);
      deleteAnnouncementByIDMock.mockReturnValueOnce({});

      githubUpdateAnnouncementMock.mockResolvedValue({});

      const response = await request(app)
        .delete('/announcements/abc123')
        .send({});

      expect(response.status).toEqual(204);
      expect(deleteAnnouncementByIDMock).toHaveBeenCalledWith('abc123');
      expect(githubUpdateAnnouncementMock).toHaveBeenCalled();
      expect(response.body).not.toBeNull();
    });
  });
});
