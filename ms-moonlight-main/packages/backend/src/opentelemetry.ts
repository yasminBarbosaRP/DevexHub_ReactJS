import { MeterProvider, PeriodicExportingMetricReader, ResourceMetrics } from '@opentelemetry/sdk-metrics';

// SDK
import { NodeSDK } from '@opentelemetry/sdk-node';

import { metrics, trace } from '@opentelemetry/api';

// Express, postgres and http instrumentation
import { NodeTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { KnexInstrumentation } from '@opentelemetry/instrumentation-knex';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis-4';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';

// Collector trace exporter
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { ExportResult } from '@opentelemetry/core';
import { getRootLogger } from '@backstage/backend-common';

class PrefixOTLPMetricExporter extends OTLPMetricExporter {
  export(m: ResourceMetrics, resultCallback: (result: ExportResult) => void): void {
    const modifiedMetrics = {
      ...m,
      scopeMetrics: m.scopeMetrics.map(metric => {
        const clonedMetric = { ...metric };
        clonedMetric.metrics = clonedMetric.metrics.map(e => {
          const modifiedName = `moonlight.${e.descriptor.name}`;
          const modifiedDescriptor = { ...e.descriptor, name: modifiedName };
          return { ...e, descriptor: modifiedDescriptor };
        });
        return clonedMetric;
      })
    }

    super.export(modifiedMetrics, resultCallback);
  }
}

if (process.env.NODE_ENV !== 'development' || process.env.OTEL_ENABLED === 'true') {
  const resource = Resource.default().merge(
    new Resource({
      [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME,
      [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
    }),
  );

  // Tracer provider
  const provider = new NodeTracerProvider({
    resource: resource
  });


  const meterProvider = new MeterProvider({
    resource: resource,
    readers: [new PeriodicExportingMetricReader({
      exporter: new PrefixOTLPMetricExporter({
        url: `${process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT}/v1/metrics`,
      }),
      exportIntervalMillis: 60000,
    })],
  });

  registerInstrumentations({
    meterProvider: meterProvider,
    instrumentations: [
      // Currently to be able to have auto-instrumentation for express
      // We need the auto-instrumentation for HTTP.
      new HttpInstrumentation({
        requestHook: (span, req) => {
          // @ts-ignore
          const { attributes: attrs = {} } = span;
          span.updateName(`${req.method} ${attrs['http.target']}`)
          span.setAttribute('functions.route', attrs['http.route'])
          span.setAttribute('functions.url', attrs['http.url'])
          getRootLogger().info(`httpInstrumentation span: ${JSON.stringify(req)}`)
        },
        ignoreIncomingPaths: [/.*\/healthcheck/],
      }),
      new KnexInstrumentation(),
      new ExpressInstrumentation(),
      new PgInstrumentation(),
      new RedisInstrumentation(),
    ]
  });

  // Tracer exporter
  const traceExporter = new OTLPTraceExporter({ url: `${process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT}/v1/traces` });
  provider.addSpanProcessor(new SimpleSpanProcessor(traceExporter));
  provider.register();

  metrics.setGlobalMeterProvider(meterProvider);
  trace.setGlobalTracerProvider(provider);

  // SDK configuration and start up
  const sdk = new NodeSDK({ traceExporter });

  (async () => {
    try {
      sdk.start();
      console.log('Tracing started.');
    } catch (error) {
      console.error(error);
    }
  })();

  // For local development to stop the tracing using Control+c
  process.on('SIGINT', async () => {
    try {
      await sdk.shutdown();
      console.log('Tracing finished.');
    } catch (error) {
      console.error(error);
    } finally {
      process.exit(0);
    }
  });
}