import './opentelemetry';
import { diag, DiagLogLevel } from '@opentelemetry/api';
import { trace } from '@opentelemetry/api';
import { metricsHandler } from './metrics';
import {
  CacheManager,
  DatabaseManager,
  ServerTokenManager,
  HostDiscovery,
  UrlReaders,
  createRootLogger,
  createServiceBuilder,
  getRootLogger,
  loadBackendConfig,
  notFoundHandler,
  useHotMemoize,
} from '@backstage/backend-common';
import { TaskScheduler } from '@backstage/backend-tasks';
import { Config } from '@backstage/config';
import {
  DefaultIdentityClient,
  getBearerTokenFromAuthorizationHeader,
} from '@backstage/plugin-auth-node';
import { DefaultSignalsService } from '@backstage/plugin-signals-node';
import { ServerPermissionClient } from '@backstage/plugin-permission-node';
import { CatalogClient } from '@backstage/catalog-client';
import {
  AnnotationIntermediator,
  GithubAnnotationIntermediator,
  ClusterIdentifierIntermediator,
  TemplateIntermediator,
  InfrastructureDefinitionIntermediator,
} from '@internal/plugin-picpay-annotation-intermediator-backend';
import { ArgoCDRepository } from '@internal/plugin-picpay-argocd-backend';
import { NextFunction, Request, Response } from 'express';
import Router from 'express-promise-router';
import annotationIntermediators from './plugins/annotationIntermediators';
import announcements from './plugins/announcements';
import app from './plugins/app';
import argocd from './plugins/argocd';
import auth from './plugins/auth';
import getProcessingEngine from './plugins/autodiscover';
import clusterMigration from './plugins/clusterMigration';
import entityTree from './plugins/entity-tree';
import events from './plugins/events';
import apiDocsProxy from './plugins/apiDocs';
import github from './plugins/github';
import healthcheck from './plugins/healthcheck';
import houston from './plugins/houston';
import metrics from './plugins/metrics';
import nps from './plugins/nps';
import proxy from './plugins/proxy';
import sanctuary2 from './plugins/sanctuary2';
import scaffolder from './plugins/scaffolder';
import {
  httpSchedulers,
  problematicLocationScheduler,
  scheduleOrphanRemovals,
  scheduleTaskWatcher,
} from './plugins/schedulers';
import search from './plugins/search';
import sonarqube from './plugins/sonarqube';
import techdocs from './plugins/techdocs';
import tools from './plugins/tools';
import users from './plugins/users';
import vision from './plugins/vision';
import kubernetes from './plugins/kubernetes';
import picpayEntityProvider from './plugins/picpayEntityProvider';
import { PluginEnvironment } from './types';
import entityRefreshState from './plugins/entityRefreshState';
import devTools from './plugins/devtools';
import qeta from './plugins/qeta';
import permission from './plugins/permission';
import manageTemplateVersion from './plugins/manageTemplateVersion';
import explore from './plugins/explore';
import repositoryRules from './plugins/repositoryRules';
import { SqsEventsService, InMemoryEventsService } from '@internal/plugin-picpay-brokers-backend/';
import { DefaultGithubCredentialsProvider } from '@backstage/integration';
import { PicPayGithubCredentialsProvider } from '@internal/plugin-picpay-github-backend';
import slack from './plugins/slack';
import bodyParser from 'body-parser';

function makeCreateEnv(config: Config) {
  const root = getRootLogger();
  const reader = UrlReaders.default({ logger: root, config });
  const discovery = HostDiscovery.fromConfig(config);
  const tokenManager = ServerTokenManager.fromConfig(config, { logger: root });
  root.info(`Created UrlReader ${reader}`);

  const cacheManager = CacheManager.fromConfig(config, {
    logger: root.child({ type: 'cache' }),
  });
  const databaseManager = DatabaseManager.fromConfig(config, {
    logger: root.child({ type: 'database' }),
  });

  const taskScheduler = TaskScheduler.fromConfig(config, {
    databaseManager,
    logger: root.child({ type: 'task-scheduler' }),
  });

  const permissions = ServerPermissionClient.fromConfig(config, {
    discovery,
    tokenManager,
  });

  return (plugin: string): PluginEnvironment => {
    const l = root.child({ type: 'plugin', plugin });
    const database = databaseManager.forPlugin(plugin);
    const cache = cacheManager.forPlugin(plugin);
    const scheduler = taskScheduler.forPlugin(plugin);
    const identity = DefaultIdentityClient.create({
      discovery,
    });

    const eventsService = process.env.NODE_ENV === 'development'
      ? new InMemoryEventsService(l, scheduler)
      : SqsEventsService.fromConfig({
        config,
        logger: l,
        catalog: new CatalogClient({ discoveryApi: discovery }),
        scheduler,
      })

    const signalsService = DefaultSignalsService.create({
      events: eventsService,
    });

    return {
      logger: l,
      database,
      cache,
      config,
      reader,
      discovery,
      tokenManager,
      permissions,
      scheduler,
      identity,
      events: eventsService,
      signals: signalsService,
    };
  };
}

async function main() {
  const logger = createRootLogger(
    {},
    {
      ...process.env,
      NODE_ENV: ['homolog', 'production'].includes(
        process.env.NODE_ENV as string
      )
        ? 'production'
        : 'development', // setting up as JSON on homolog
    }
  );
  // TODO: Change to WARN after the test
  diag.setLogger(logger, DiagLogLevel.NONE);
  const config = await loadBackendConfig({
    argv: process.argv,
    logger,
  });

  logger.info(
    'starting backend with process.env.NODE_ENV',
    process.env.NODE_ENV
  );

  // @ts-ignore
  DefaultGithubCredentialsProvider.fromIntegrations = PicPayGithubCredentialsProvider.fromIntegrations;

  const createEnv = makeCreateEnv(config);

  const announcementsEnv = useHotMemoize(module, () => createEnv('announcements'));
  const healthcheckEnv = useHotMemoize(module, () => createEnv('healthcheck'));
  const catalogEnv = useHotMemoize(module, () => createEnv('catalog'));
  const githubEnv = useHotMemoize(module, () => createEnv('github'));
  const scaffolderEnv = useHotMemoize(module, () => createEnv('scaffolder'));
  const slackEnv = useHotMemoize(module, () => createEnv('slack'));
  const authEnv = useHotMemoize(module, () => createEnv('auth'));
  const proxyEnv = useHotMemoize(module, () => createEnv('proxy'));
  const techdocsEnv = useHotMemoize(module, () => createEnv('techdocs'));
  const searchEnv = useHotMemoize(module, () => createEnv('search'));
  const appEnv = useHotMemoize(module, () => createEnv('app'));
  const npsEnv = useHotMemoize(module, () => createEnv('nps'));
  const annotationsIntermediatorEnv = useHotMemoize(module, () => createEnv('annotations-intermediator'));
  const clusterIntermediatorEnv = useHotMemoize(module, () => createEnv('cluster-intermediator'));
  const apiDocsProxyEnv = useHotMemoize(module, () => createEnv('apiDocProxy'));
  const metricsEnv = useHotMemoize(module, () => createEnv('metrics'));
  const usersEnv = useHotMemoize(module, () => createEnv('users'));
  const argoEnv = useHotMemoize(module, () => createEnv('argocd'));
  const sanctuary2Env = useHotMemoize(module, () => createEnv('sanctuary2'));
  const sonarqubeEnv = useHotMemoize(module, () => createEnv('sonarqube'));
  const eventsEnv = useHotMemoize(module, () => createEnv('events'));
  const houstonEnv = useHotMemoize(module, () => createEnv('houston'));
  const entityTreeEnv = useHotMemoize(module, () => createEnv('entityTree'));
  const httpSchedulersEnv = useHotMemoize(module, () => createEnv('clusterMigrationStatusSwticher'));
  const problematicLocationsSchedulerEnv = useHotMemoize(module, () => createEnv('problematicLocationsScheduler'));
  const orphanRemoverSchedulerEnv = useHotMemoize(module, () => createEnv('orphanRemoverSchedulerEnv'));
  const clusterMigrationEnv = useHotMemoize(module, () => createEnv('clusterMigrationEnv'));
  const toolsEnv = useHotMemoize(module, () => createEnv('tools'));
  const visionEnv = useHotMemoize(module, () => createEnv('vision'));
  const kubernetesEnv = useHotMemoize(module, () => createEnv('kubernetes'));
  const picpayEntityProviderEnv = useHotMemoize(module, () => createEnv('picpayEntityProvider'));
  const qetaEnv = useHotMemoize(module, () => createEnv('qeta'));
  const permissionEnv = useHotMemoize(module, () => createEnv('permission'));
  const devToolsEnv = useHotMemoize(module, () => createEnv('devtools'));
  const manageTemplateVersionEnv = createEnv('manageTemplateVersion');
  const exploreEnv = useHotMemoize(module, () => createEnv('explore'));
  const repositoryRulesEnv = createEnv('repositoryRules');
  const processorIntermediators = [
    await GithubAnnotationIntermediator.init(logger, config),
    await AnnotationIntermediator.init(
      logger,
      annotationsIntermediatorEnv.database
    ),
    await ClusterIdentifierIntermediator.init(
      logger,
      new ArgoCDRepository(config, clusterIntermediatorEnv.logger),
      config
    ),
    await TemplateIntermediator.init(logger, config, catalogEnv.reader),
    await InfrastructureDefinitionIntermediator.init(
      logger,
      config,
      catalogEnv.reader
    ),
  ];


  const catalog = getProcessingEngine(
    logger,
    catalogEnv,
    picpayEntityProviderEnv,
    Number(process.env.MOONLIGHT_AUTODISCOVER_INTERVAL_SECONDS || 1800),
    Number(process.env.MOONLIGHT_AUTODISCOVER_TIMEOUT_SECONDS || 1800),
    processorIntermediators
  )

  if (process.env.AUTODISCOVER_WORKER === 'true') {
    logger.info('Starting autodiscover worker');
    Promise.resolve(catalog)
    const service = createServiceBuilder(module)
      .loadConfig(config)
      .addRouter('', await healthcheck(healthcheckEnv));

    service.start().catch(err => {
      console.log(err);
      process.exit(1);
    });
    return;
  }

  const discovery = HostDiscovery.fromConfig(config);
  const identity = DefaultIdentityClient.create({
    discovery,
    issuer: await discovery.getExternalBaseUrl('auth'),
  });

  const authMiddleware = async (
    request: Request,
    response: Response,
    next: NextFunction
  ) => {
    if (process.env.NODE_ENV === 'development') {
      next();
      return;
    }

    try {
      const token = getBearerTokenFromAuthorizationHeader(
        request.headers.authorization
      );

      request.user = await identity.authenticate(token);
      if (!request.headers.authorization) {
        // Authorization header may be forwarded by plugin requests
        request.headers.authorization = `Bearer ${token}`;
      }

      next();
    } catch (error) {
      response.status(401).send(`Unauthorized`);
    }
  };

  // Task Runners
  httpSchedulers(httpSchedulersEnv);
  problematicLocationScheduler(problematicLocationsSchedulerEnv);
  scheduleOrphanRemovals(orphanRemoverSchedulerEnv);
  scheduleTaskWatcher(scaffolderEnv);

  const apiRouter = Router();

  apiRouter.all('*', (req, res, next) => {
    const span = trace
      .getTracer('default')
      .startSpan(`${req.method} ${req.url}`, {
        attributes: {
          'http.method': req.method,
          'http.url': req.url,
        },
      });

    // @ts-ignore
    req.span = span;
    const spanEnd = () => {
      if (res && res.statusCode)
        span.setAttribute('http.status_code', res.statusCode);
      span.end();
    };

    const spanError = (err: any) => {
      if (res && res.statusCode)
        span.setAttribute('http.status_code', res.statusCode);
      span.setAttribute('error', true);
      span.setAttribute('error.message', err.message);
      span.setAttribute('error.stack', err.stack);
      span.end();
    };

    req.on('close', spanEnd);
    req.on('end', spanEnd);
    res.on('finish', spanEnd);
    res.on('close', spanEnd);
    res.on('error', spanError);

    // Call the next middleware
    next();
  });

  apiRouter.use(
    '/announcements',
    authMiddleware,
    await announcements(announcementsEnv)
  );

  apiRouter.use(
    '/announcements',
    authMiddleware,
    await announcements(announcementsEnv)
  );
  apiRouter.use('/events', bodyParser.urlencoded({ extended: true }), bodyParser.json(), await events(eventsEnv));
  apiRouter.use(
    '/entity-provider',
    await picpayEntityProvider(picpayEntityProviderEnv, catalogEnv)
  );
  apiRouter.use('/auth', await auth(authEnv));
  apiRouter.use('/slack', await slack(slackEnv));
  apiRouter.use('/catalog', await catalog);
  apiRouter.use('/scaffolder', await scaffolder(scaffolderEnv));
  apiRouter.use('/techdocs', await techdocs(techdocsEnv));
  apiRouter.use('/proxy', await proxy(proxyEnv));
  apiRouter.use('/search', await search(searchEnv));
  apiRouter.use('/sonarqube', await sonarqube(sonarqubeEnv));
  apiRouter.use('/metrics', await metrics(metricsEnv));
  apiRouter.use('/users', await users(config, usersEnv));
  apiRouter.use('/argocd', await argocd(config, argoEnv));
  apiRouter.use('/nps', authMiddleware, await nps(npsEnv));
  apiRouter.use(
    '/api-docs-proxy',
    authMiddleware,
    await apiDocsProxy(apiDocsProxyEnv)
  );
  apiRouter.use('/github', await github(config, githubEnv));
  apiRouter.use(
    '/annotation-intermediators',
    await annotationIntermediators(annotationsIntermediatorEnv)
  );
  apiRouter.use(
    '/cluster-migration',
    await clusterMigration(clusterMigrationEnv)
  );
  apiRouter.use(
    '/sanctuary-two',
    authMiddleware,
    await sanctuary2(sanctuary2Env)
  );
  apiRouter.use('/houston', authMiddleware, await houston(houstonEnv));
  apiRouter.use('/tools', await tools(toolsEnv));
  apiRouter.use('/vision', await vision(visionEnv));
  apiRouter.use('/catalog/entities', await entityTree(entityTreeEnv));
  apiRouter.use('/kubernetes', await kubernetes(kubernetesEnv));
  apiRouter.use('/catalog/entities/refresh-state', await entityRefreshState(catalogEnv));
  apiRouter.use('/qeta', await qeta(qetaEnv));
  apiRouter.use('/permission', await permission(config, permissionEnv));
  apiRouter.use('/devtools', await devTools(devToolsEnv));
  apiRouter.use('/manage-template-version', authMiddleware, await manageTemplateVersion(manageTemplateVersionEnv));
  apiRouter.use('/explore', await explore(exploreEnv));
  apiRouter.use('/catalog/repository-rules', await repositoryRules(repositoryRulesEnv));

  apiRouter.use(notFoundHandler());

  const service = createServiceBuilder(module)
    .loadConfig(config)
    .addRouter('', await healthcheck(healthcheckEnv))
    .addRouter('', metricsHandler())
    .addRouter('/api', apiRouter)
    .addRouter('', await app(appEnv));

  await service.start().catch(err => {
    console.log(err);
    process.exit(1);
  });
}

module.hot?.accept();
main().catch(error => {
  console.error(`Backend failed to start up, ${error}`);
  process.exit(1);
});
