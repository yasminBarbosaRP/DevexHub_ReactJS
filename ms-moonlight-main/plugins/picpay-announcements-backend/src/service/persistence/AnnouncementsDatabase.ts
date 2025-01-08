import { Knex } from 'knex';
import { DateTime } from 'luxon';
import { Announcement } from '../model';
import moment, { Moment } from 'moment';

const announcementsTable = 'announcements';

type AnnouncementUpsert = {
  id: string;
  category?: string;
  publisher: string;
  title: string;
  excerpt: string;
  body: string;
  created_at: DateTime;
  expires_at?: string;
  user_dismissible?: boolean;
};

export type DbAnnouncement = {
  id: string;
  category?: string;
  publisher: string;
  title: string;
  excerpt: string;
  body: string;
  created_at: string;
  expires_at?: string | null;
  user_dismissible: boolean;
};

export type DbAnnouncementWithCategory = DbAnnouncement & {
  category_slug?: string;
  category_title?: string;
};

type AnnouncementsFilters = {
  max?: number;
  offset?: number;
  category?: string;
};

type AnnouncementsList = {
  count: number;
  results: Announcement[];
};

const timestampToDateTime = (input: Date | string): DateTime => {
  if (typeof input === 'object') {
    return DateTime.fromJSDate(input).toUTC();
  }

  const result = input.includes(' ')
    ? DateTime.fromSQL(input, { zone: 'utc' })
    : DateTime.fromISO(input, { zone: 'utc' });
  if (!result.isValid) {
    throw new TypeError('Not valid');
  }

  return result;
};

const announcementUpsertToDB = (
  announcement: AnnouncementUpsert,
): DbAnnouncement => {
  return {
    id: announcement.id,
    category: announcement.category,
    title: announcement.title,
    excerpt: announcement.excerpt,
    body: announcement.body,
    publisher: announcement.publisher,
    created_at: announcement.created_at.toSQL()!,
    expires_at: announcement.expires_at ?? null,
    user_dismissible: announcement.user_dismissible ?? false,
  };
};

const DBToAnnouncementWithCategory = (
  announcementDb: DbAnnouncementWithCategory,
): Announcement => {
  return {
    id: announcementDb.id,
    category:
      announcementDb.category && announcementDb.category_title
        ? {
            slug: announcementDb.category,
            title: announcementDb.category_title,
          }
        : undefined,
    title: announcementDb.title,
    excerpt: announcementDb.excerpt,
    body: announcementDb.body,
    publisher: announcementDb.publisher,
    created_at: timestampToDateTime(announcementDb.created_at),
    expires_at: announcementDb.expires_at
      ? timestampToDateTime(announcementDb.expires_at)
      : null,
    user_dismissible: announcementDb.user_dismissible,
  };
};

export class AnnouncementsDatabase {
  constructor(private readonly db: Knex) {}

  async announcements(
    request: AnnouncementsFilters,
  ): Promise<AnnouncementsList> {
    const countQueryBuilder = this.db<DbAnnouncement>(announcementsTable).count<
      Record<string, number>
    >('id', { as: 'total' });

    if (request.category) {
      countQueryBuilder.where('category', request.category);
    }

    const countResult = await countQueryBuilder.first();

    const queryBuilder = this.db<DbAnnouncementWithCategory>(announcementsTable)
      .select(
        'id',
        'publisher',
        'announcements.title',
        'excerpt',
        'body',
        'category',
        'created_at',
        'expires_at',
        'user_dismissible',
        'categories.title as category_title',
      )
      .orderBy('created_at', 'desc')
      .leftJoin('categories', 'announcements.category', 'categories.slug');

    if (request.category) {
      queryBuilder.where('category', request.category);
    }
    if (request.offset) {
      queryBuilder.offset(request.offset);
    }
    if (request.max) {
      queryBuilder.limit(request.max);
    }

    return {
      count: countResult?.total ?? 0,
      results: (await queryBuilder.select()).map(DBToAnnouncementWithCategory),
    };
  }

  async announcementByID(id: string): Promise<Announcement | undefined> {
    const dbAnnouncement = await this.db<DbAnnouncementWithCategory>(
      announcementsTable,
    )
      .select(
        'id',
        'publisher',
        'announcements.title',
        'excerpt',
        'body',
        'category',
        'created_at',
        'expires_at',
        'user_dismissible',
        'categories.title as category_title',
      )
      .leftJoin('categories', 'announcements.category', 'categories.slug')
      .where('id', id)
      .first();
    if (!dbAnnouncement) {
      return undefined;
    }

    return DBToAnnouncementWithCategory(dbAnnouncement);
  }

  async deleteAnnouncementByID(id: string): Promise<void> {
    return this.db<DbAnnouncement>(announcementsTable).where('id', id).delete();
  }

  async insertAnnouncement(
    announcement: AnnouncementUpsert,
  ): Promise<Announcement> {
    await this.db<DbAnnouncement>(announcementsTable).insert(
      announcementUpsertToDB(announcement),
    );

    return (await this.announcementByID(announcement.id))!;
  }

  async updateAnnouncement(
    announcement: AnnouncementUpsert,
  ): Promise<Announcement> {
    await this.db<DbAnnouncement>(announcementsTable)
      .where('id', announcement.id)
      .update(announcementUpsertToDB(announcement));

    return (await this.announcementByID(announcement.id))!;
  }

  async maxExpiresAt(): Promise<{ records: number; expiresAt?: Moment }> {
    const { records, expires_at } = await this.db(announcementsTable)
      .select(this.db.raw('count(*) as records, max(expires_at) as expires_at'))
      .first();

    return {
      records,
      expiresAt: moment(expires_at),
    };
  }
}
