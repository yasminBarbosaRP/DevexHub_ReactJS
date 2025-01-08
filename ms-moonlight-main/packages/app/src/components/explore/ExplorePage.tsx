import {
  DomainExplorerContent,
  GroupsExplorerContent,
  ExploreLayout,
} from '@backstage-community/plugin-explore';
import React from 'react';

export const ExplorePage = () => {
  return (
    <ExploreLayout
      title="Explore the PicPay corp ecosystem"
      subtitle="Browse our ecosystem"
    >
      <ExploreLayout.Route path="domains" title="Domains">
        <DomainExplorerContent />
      </ExploreLayout.Route>
      <ExploreLayout.Route path="groups" title="Groups">
        <GroupsExplorerContent />
      </ExploreLayout.Route>
    </ExploreLayout>
  );
};

export const explorePage = <ExplorePage />;
