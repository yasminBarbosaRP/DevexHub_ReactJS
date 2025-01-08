import { DateTime } from 'luxon';

export type Announcement = {
  id: string;
  category?: Category;
  publisher: string;
  title: string;
  excerpt: string;
  body: string;
  created_at: DateTime;
  expires_at: DateTime | null;
  user_dismissible: boolean;
};

export type Category = {
  slug: string;
  title: string;
};
