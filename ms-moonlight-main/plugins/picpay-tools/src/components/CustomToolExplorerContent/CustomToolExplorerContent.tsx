import React, { useEffect, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { CustomToolCard } from '../CustomToolCard';
import {
  Content,
  ContentHeader,
  ItemCardGrid,
  Progress,
  SupportButton,
  WarningPanel,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { toolsApiRef } from '../../api';
import { Grid, TextField } from '@material-ui/core';

import { SearchBar } from '@internal/plugin-picpay-commons';
import { Autocomplete } from '@material-ui/lab';
import { CustomExploreTool } from '@internal/plugin-picpay-tools-backend';

interface CustomToolExplorerContentProps {
  title?: string;
}

export const CustomToolExplorerContent = ({
  title,
}: CustomToolExplorerContentProps) => {
  const toolsApi = useApi(toolsApiRef);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filteredTools, setFilteredTools] = useState<CustomExploreTool[]>([]);

  const {
    value: tools,
    loading,
    error,
  } = useAsync(async () => (await toolsApi.getTools())?.tools, [toolsApi]);

  useEffect(() => {
    const searchFilteredTools = search
      ? tools
          ?.map(category => ({
            ...category,
            categoryTools: category.categoryTools.filter(
              v =>
                v.title?.toLowerCase().includes(search.toLowerCase()) ||
                v.typeInterface?.toLowerCase().includes(search.toLowerCase()) ||
                v.description?.toLowerCase().includes(search.toLowerCase()),
            ),
          }))
          .filter(v => v.categoryTools.length > 0)
      : tools;

    const categoryFilteredTools = selectedCategory
      ? searchFilteredTools?.filter(
          category => selectedCategory === category.categoryName,
        )
      : searchFilteredTools;

    setFilteredTools(categoryFilteredTools ?? []);
  }, [search, selectedCategory, tools]);

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return <WarningPanel title="Failed to load tools" />;
  }

  return (
    <Content noPadding>
      <ContentHeader title={title}>
        <SupportButton>Discover the tools in your ecosystem.</SupportButton>
      </ContentHeader>
      <Grid container direction="row">
        <Grid item xs={2}>
          <SearchBar onChange={v => setSearch(v)} value={search} />
          <Autocomplete
            data-testid="autocomplete-filter"
            onChange={(_, v) => setSelectedCategory(v ?? '')}
            options={tools?.map(v => v.categoryName) ?? []}
            renderInput={params => <TextField {...params} label="Category" />}
          />
        </Grid>
        <Grid item xs={10}>
          {filteredTools?.map(category => (
            <Content key={category.categoryType}>
              <ContentHeader title={category.categoryName} />
              <ItemCardGrid>
                {category.categoryTools?.map(tool => (
                  <CustomToolCard key={tool.id} card={tool} />
                ))}
              </ItemCardGrid>
            </Content>
          ))}
        </Grid>
      </Grid>
    </Content>
  );
};
