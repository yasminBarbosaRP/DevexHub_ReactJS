import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { pluginGithubPlugin, PluginGithubPage } from '../src/plugin';

createDevApp()
  .registerPlugin(pluginGithubPlugin)
  .addPage({
    element: <PluginGithubPage />,
    title: 'Root Page',
    path: '/picpay-github'
  })
  .render();
