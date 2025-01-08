
import React, { useCallback, useEffect, useState } from 'react';
import {
    ScaffolderTask,
} from '@backstage/plugin-scaffolder-react';
import {
    Link,
    Table,
} from '@backstage/core-components';
import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import { CreatedAtColumn, OwnerEntityColumn, TaskStatusColumn, TemplateTitleColumn } from './columns';
import {
    useAsyncEntity,
} from '@backstage/plugin-catalog-react';
import { tasksApiRef } from '../../apis';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { Box, Card, CardContent, Grid, Theme, Typography, makeStyles } from '@material-ui/core';
import { TasksStatus } from '@internal/plugin-picpay-tasks-backend';
import TasksFilters from './EntityTasksFilter';
import {
    TaskStatus
} from '@backstage/plugin-scaffolder-node';
import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import moment from 'moment';

const rootRouteRef = scaffolderPlugin.routes.root;

const useStyles = makeStyles((theme: Theme) => ({
    metricContainer: {
        display: 'flex',
        gap: '32px',
        marginRight: '64px',
    },
    filtersContainer: {
        minWidth: '230px',
    },
    cardNumber: {
    },
    cardTitle: {
        color: theme.palette.textSubtle,
    },
    cardInfo: {
        color: theme.palette.textSubtle,
        fontSize: '0.75rem',
    },
    cardStatus: {
        color: theme.palette.textSubtle,
        fontSize: '1rem',
    },
    chartsContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        width: 'calc(100% - 230px)',
    },
}));


const EntityTasks = () => {
    const { entity } = useAsyncEntity();
    const tasksApi = useApi(tasksApiRef);

    const [page, setPage] = useState(1);
    const [startDate, setStartDate] = useState<Date>(moment(new Date()).subtract(1, 'months').toDate());
    const [endDate, setEndDate] = useState<Date>(new Date());
    const [tasks, setTasks] = React.useState<ScaffolderTask[] | undefined>(undefined);
    const [status, setStatus] = React.useState<TasksStatus | undefined>(undefined);

    const classes = useStyles();
    const rootLink = useRouteRef(rootRouteRef);


    const getEntityTasks = useCallback(async () => {
        if (!entity) {
            return;
        }
        const response = await tasksApi.getByEntityRef(stringifyEntityRef(entity), page, startDate, endDate);
        setStatus(response.status);
        setTasks(response.tasks.map(e => {
            return {
                id: e.id,
                spec: e.spec,
                status: e.status,
                lastHeartbeatAt: e.lastHeartbeatAt ?? "",
                createdAt: e.createdAt,
            };
        }));
    }, [tasksApi, page, entity, startDate, endDate]);

    useEffect(() => {
        if (entity) {
            getEntityTasks();
        }
    }, [entity, getEntityTasks, page, startDate, endDate]);

    return (
        <Box className={classes.metricContainer}>
            <Box className={classes.filtersContainer}>
                <TasksFilters
                    startDate={startDate}
                    endDate={endDate}
                    onDateRangeSelect={(start: Date, end: Date) => {
                        setStartDate(start);
                        setEndDate(end);
                    }}
                />
            </Box>
            <Box className={classes.chartsContainer}>
                <Grid container justifyContent='space-between'>
                    {status && Object.keys(status).map((key: string) => (
                        <Grid item lg>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="h5" className={classes.cardNumber} component="div">
                                        {status[key as TaskStatus]?.total}
                                    </Typography>
                                    <Typography className={classes.cardStatus} gutterBottom>
                                        {key}
                                    </Typography>
                                    <Typography className={classes.cardInfo}>
                                        <i>average time {parseFloat((status[key as TaskStatus]?.avgTime ?? 0).toFixed(2))} sec</i>
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}

                </Grid>
                <Grid container>
                    <Grid item lg>
                        <Table<ScaffolderTask>
                            page={page}
                            onPageChange={setPage}
                            data={tasks ?? []}
                            title="Tasks"
                            columns={[
                                {
                                    title: 'Task ID',
                                    field: 'id',
                                    render: row => (
                                        <Link to={`${rootLink()}/tasks/${row.id}`}>{row.id}</Link>
                                    ),
                                },
                                {
                                    title: 'Template',
                                    field: 'spec.templateInfo.entity.metadata.title',
                                    render: row => (
                                        <TemplateTitleColumn
                                            entityRef={row.spec.templateInfo?.entityRef}
                                        />
                                    ),
                                },
                                {
                                    title: 'Created',
                                    field: 'createdAt',
                                    render: row => <CreatedAtColumn createdAt={row.createdAt} />,
                                },
                                {
                                    title: 'Owner',
                                    field: 'createdBy',
                                    render: row => (
                                        <OwnerEntityColumn entityRef={row.spec?.user?.ref} />
                                    ),
                                },
                                {
                                    title: 'Status',
                                    field: 'status',
                                    render: row => <TaskStatusColumn status={row.status} />,
                                },
                            ]}
                        />
                    </Grid>
                </Grid>
            </Box>
        </Box>
    )
}
export { EntityTasks };