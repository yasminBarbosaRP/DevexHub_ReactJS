import {
  createRoutableExtension,
  createRouteRef,
} from '@backstage/core-plugin-api';
import {
  DefaultCatalogPageProps,
  catalogPlugin,
} from '@backstage/plugin-catalog';

export const rootRouteRef = createRouteRef({
  id: 'custom-catalog',
});

/** @public */
export const CustomCatalogIndexPage: (
  props: DefaultCatalogPageProps,
) => JSX.Element = catalogPlugin.provide(
  createRoutableExtension({
    name: 'CatalogIndexPage',
    component: () =>
      import('./catalog/CustomCatalogPage').then(m => m.CatalogPage),
    mountPoint: rootRouteRef,
  }),
);
