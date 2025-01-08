import express, { Request } from 'express';
import Router from 'express-promise-router';
import { DateTime } from 'luxon';
import slugify from 'slugify';
import { v4 as uuid } from 'uuid';
import { errorHandler } from '@backstage/backend-common';
import { NotAllowedError } from '@backstage/errors';
import { getBearerTokenFromAuthorizationHeader } from '@backstage/plugin-auth-node';
import {
  AuthorizeResult,
  BasicPermission,
} from '@backstage/plugin-permission-common';
import {
  announcementCreatePermission,
  announcementDeletePermission,
  announcementUpdatePermission,
} from '@internal/plugin-picpay-announcements-common';
import { AnnouncementsContext } from './announcementsContextBuilder';

interface AnnouncementRequest {
  publisher: string;
  category?: string;
  title: string;
  excerpt: string;
  body: string;
  expires_at?: string;
  user_dismissible?: boolean;
}

interface CategoryRequest {
  title: string;
}

export async function createRouter(
  options: AnnouncementsContext,
): Promise<express.Router> {
  const { persistenceContext, permissions, githubAPI } = options;

  const isRequestAuthorized = async (
    req: Request,
    permission: BasicPermission,
  ): Promise<boolean> => {
    const token = getBearerTokenFromAuthorizationHeader(
      req.header('authorization'),
    );

    const decision = (
      await permissions.authorize([{ permission: permission }], {
        token,
      })
    )[0];

    return decision.result !== AuthorizeResult.DENY;
  };

  const router = Router();
  router.use(express.json());

  // eslint-disable-next-line spaced-comment
  /*****************
   * Announcements *
   ****************/
  router.get(
    '/announcements',
    (
      req: Request<
        {},
        {},
        {},
        { category?: string; page?: number; max?: number }
      >,
      res,
    ) => {
      (async () => {
        const results =
          await persistenceContext.announcementsStore.announcements({
            category: req.query.category,
            max: req.query.max,
            offset: req.query.page
              ? (req.query.page - 1) * (req.query.max ?? 10)
              : undefined,
          });

        res.json(results);
      })();
    },
  );

  router.get(
    '/announcements/:id',
    (req: Request<{ id: string }, {}, {}, {}>, res) => {
      (async () => {
        const result =
          await persistenceContext.announcementsStore.announcementByID(
            req.params.id,
          );

        res.json(result);
      })();
    },
  );

  router.delete(
    '/announcements/:id',
    (req: Request<{ id: string }, {}, {}, {}>, res) => {
      (async () => {
        if (!(await isRequestAuthorized(req, announcementDeletePermission))) {
          throw new NotAllowedError('Unauthorized');
        }

        await persistenceContext.announcementsStore.deleteAnnouncementByID(
          req.params.id,
        );

        await githubAPI?.updateAnnouncement();

        res.status(204).end();
      })();
    },
  );

  router.post(
    '/announcements',
    (req: Request<{}, {}, AnnouncementRequest, {}>, res) => {
      (async () => {
        if (!(await isRequestAuthorized(req, announcementCreatePermission))) {
          throw new NotAllowedError('Unauthorized');
        }

        const announcement =
          await persistenceContext.announcementsStore.insertAnnouncement({
            ...req.body,
            ...{
              id: uuid(),
              created_at: DateTime.now(),
            },
          });

        await githubAPI?.updateAnnouncement();

        res.status(200).json(announcement);
      })();
    },
  );

  router.put(
    '/announcements/:id',
    (req: Request<{ id: string }, {}, AnnouncementRequest, {}>, res) => {
      (async () => {
        if (!(await isRequestAuthorized(req, announcementUpdatePermission))) {
          throw new NotAllowedError('Unauthorized');
        }

        const initialAnnouncement =
          await persistenceContext.announcementsStore.announcementByID(
            req.params.id,
          );
        if (!initialAnnouncement) {
          res.status(404).end();
          return;
        }

        const announcement =
          await persistenceContext.announcementsStore.updateAnnouncement({
            ...initialAnnouncement,
            ...{
              title: req.body.title,
              excerpt: req.body.excerpt,
              body: req.body.body,
              publisher: req.body.publisher,
              category: req.body.category,
              expires_at: req.body.expires_at,
              user_dismissible: req.body.user_dismissible,
            },
          });

        await githubAPI?.updateAnnouncement();

        res.status(200).json(announcement);
      })();
    },
  );

  // eslint-disable-next-line spaced-comment
  /**************
   * Categories *
   **************/
  router.get('/categories', (_req, res) => {
    (async () => {
      const results = await persistenceContext.categoriesStore.categories();
      res.json(results);
    })();
  });

  router.post(
    '/categories',
    (req: Request<{}, {}, CategoryRequest, {}>, res) => {
      (async () => {
        const category = {
          ...req.body,
          ...{
            slug: slugify(req.body.title, {
              lower: true,
            }),
          },
        };

        await persistenceContext.categoriesStore.insert(category);

        res.status(201).json(category);
      })();
    },
  );

  router.use(errorHandler());

  return router;
}
