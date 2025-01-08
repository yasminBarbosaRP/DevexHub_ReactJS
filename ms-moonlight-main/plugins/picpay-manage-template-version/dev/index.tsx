import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { manageTemplateVersionPlugin, ManageTemplateVersionPage } from '../src/plugin';

createDevApp()
  .registerPlugin(manageTemplateVersionPlugin)
  .addPage({
    element: <ManageTemplateVersionPage />,
    title: 'Root Page',
    path: '/picpay-manage-template-version'
  })
  .render();