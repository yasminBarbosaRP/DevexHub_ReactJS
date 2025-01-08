import { GetExploreToolsRequest } from '@backstage-community/plugin-explore-common';

export declare type CustomExploreTool = {
  categoryType: string;
  categoryName: string;
  categoryTools: CategoryTool[];
};

export declare type CategoryTool = {
  id: string;
  title: string;
  description?: string;
  image?: string;
  tags?: string[];
  typeInterface?: string;
  productUrl?: string;
  docsUrl?: string;
  lifecycle?: string;
};

export declare type CustomGetExploreToolsResponse = {
  tools: CustomExploreTool[];
};

export interface CustomProvider {
  getTools(
    request: GetExploreToolsRequest,
  ): Promise<CustomGetExploreToolsResponse>;
}
