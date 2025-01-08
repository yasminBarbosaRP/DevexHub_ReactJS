import React, { useCallback, useEffect, useState } from 'react';
import { Grid, Button } from '@material-ui/core';
import {
  Content,
  ContentHeader,
  SupportButton,
  Select,
  SelectedItems,
} from '@backstage/core-components';
import { PipelineFetchComponent } from '../PipelineFetchComponent';
import { PipelineRunApiRef } from '../../api';
import { useApi, alertApiRef } from '@backstage/core-plugin-api';
import MapIcon from '@material-ui/icons/Map';
import { useStyles } from './styles';
import { TutorialModal } from '../TutorialModal';
import { PipelineRun, PipelineStatus, Status } from '../../interfaces';
import { oldLogsButton, pipelineItems, statusItems } from '../shared/shared';

export const PipelineComponent = () => {
  const [data, setData] = useState<Array<PipelineRun>>([]);
  const [filteredData, setFilteredData] = useState<Array<PipelineRun>>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedPipeline, setSelectedPipeline] = useState<string>('All');
  const [openModal, setOpenModal] = useState(false);
  const classes = useStyles();
  const api = useApi(PipelineRunApiRef);
  const alertApi = useApi(alertApiRef);

  const handleFilter = useCallback((): PipelineRun[] => {
    const tempData = data.filter(el => {
      const tempStatus =
        selectedStatus === Status.All ? el.status : selectedStatus;
      const tempPipeline =
        selectedPipeline === PipelineStatus.All
          ? el.pipeline
          : selectedPipeline;

      return el.status === tempStatus && el.pipeline === tempPipeline;
    });
    return tempData;
  }, [data, selectedPipeline, selectedStatus]);

  useEffect(() => {
    let isCancelled = false;
    api
      .getPipelineRun()
      .then(res => {
        if (isCancelled) return;
        setData(res.data);
        setFilteredData(res.data);
      })
      .catch(e => {
        alertApi.post({
          message: `Error loading existing pipelines: ${e.message}`,
          severity: 'error',
        });
        throw new Error(e);
      });
    return () => {
      isCancelled = true;
    };
  }, [api, alertApi]);

  useEffect(() => {
    let isCancelled = false;
    const result = handleFilter();

    if (!isCancelled) {
      setFilteredData(result);
    }

    return () => {
      isCancelled = true;
    };
  }, [handleFilter, selectedPipeline, selectedStatus]);

  const toggleModal = useCallback(() => {
    setOpenModal(p => !p);
  }, []);

  const onSelectStatus = useCallback((event: SelectedItems) => {
    setSelectedStatus(event as string);
  }, []);

  const onSelectPipeline = useCallback((event: SelectedItems) => {
    setSelectedPipeline(event as string);
  }, []);

  const handleModal = useCallback(() => {
    return (
      <>
        <TutorialModal open={openModal} toggle={toggleModal} />
      </>
    );
  }, [openModal, toggleModal]);

  const tutorialButton = () => {
    return (
      <Button
        data-testid="tutorial-button"
        color="default"
        startIcon={<MapIcon />}
        href=""
        onClick={toggleModal}
      >
        Tutorial
      </Button>
    );
  };

  return (
    <Content>
      <Grid container item md={12}>
        <Grid data-testid="status-select" item md={2}>
          <Select
            onChange={onSelectStatus}
            label="Status"
            items={statusItems}
            selected={selectedStatus}
          />
        </Grid>
        <Grid data-testid="pipeline-select" item md={2}>
          <Select
            onChange={onSelectPipeline}
            label="Pipeline"
            items={pipelineItems}
            selected={selectedPipeline}
          />
        </Grid>
        <Grid item md={8} className={classes.grid}>
          <Content>
            <ContentHeader title="">
              {oldLogsButton()}
              {tutorialButton()}
              {handleModal()}
              <SupportButton />
            </ContentHeader>
          </Content>
        </Grid>
      </Grid>
      <Grid container direction="column">
        <Grid item>
          <PipelineFetchComponent data={filteredData} />
        </Grid>
      </Grid>
    </Content>
  );
};
