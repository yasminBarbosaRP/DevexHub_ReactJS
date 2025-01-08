import { EntityLink } from '@backstage/catalog-model';
import { TemplateEntityV1beta3 } from '@backstage/plugin-scaffolder-common';

export type TemplateCardProps = {
  template: TemplateEntityV1beta3;
  deprecated?: boolean;
};

export type TemplateProps = {
  description: string;
  tags: string[];
  title: string;
  type: string;
  name: string;
  links: EntityLink[];
};
