import { Config } from '@backstage/config';
import { HumanDuration, JsonObject } from '@backstage/types';
import { Duration } from 'luxon';
import { AwsCredentialIdentity } from '@aws-sdk/types';

const CONFIG_PREFIX_MODULE = 'events.modules.awsSqs';
const DEFAULT_WAIT_TIME_AFTER_EMPTY_RECEIVE = { minutes: 1 };
const MAX_WAIT_SECONDS = 20;

export interface AwsSqsEventSourceConfig {
  pollingWaitTime: Duration;
  queueUrl: string;
  region: string;
  timeout: Duration;
  visibilityTimeout?: Duration;
  waitTimeAfterEmptyReceive: Duration;
  credentials?: AwsCredentialIdentity;
}

function readOptionalHumanDuration(
  config: Config,
  key: string,
): HumanDuration | undefined {
  return config.getOptional<JsonObject>(key) as HumanDuration;
}

function readOptionalDuration(
  config: Config,
  key: string,
): Duration | undefined {
  const duration = readOptionalHumanDuration(config, key);
  return duration ? Duration.fromObject(duration) : undefined;
}

export function readConfig(config: Config): AwsSqsEventSourceConfig {
  const topic = config.getConfig(CONFIG_PREFIX_MODULE);
  const key = `${CONFIG_PREFIX_MODULE}.`;
  const pollingWaitTime = Duration.fromObject(
    readOptionalHumanDuration(topic, 'waitTime') ?? {
      seconds: MAX_WAIT_SECONDS,
    },
  );

  const configCredentials = config.getOptionalConfig(
    `${CONFIG_PREFIX_MODULE}.credentials`,
  );
  let credentials: AwsCredentialIdentity | undefined;

  if (configCredentials) {
    credentials = {
      accessKeyId: configCredentials.getString('accessKeyId'),
      secretAccessKey: configCredentials.getString('secretAccessKey'),
      sessionToken: configCredentials.getOptionalString('sessionToken'),
    };
  }

  if (
    pollingWaitTime.valueOf() < 0 ||
    pollingWaitTime.as('seconds') > MAX_WAIT_SECONDS
  ) {
    throw new Error(
      `${key}.waitTime must be within 0..${MAX_WAIT_SECONDS} seconds.`,
    );
  }

  const waitTimeAfterEmptyReceive = Duration.fromObject(
    readOptionalHumanDuration(topic, 'waitTimeAfterEmptyReceive') ??
    DEFAULT_WAIT_TIME_AFTER_EMPTY_RECEIVE,
  );
  if (waitTimeAfterEmptyReceive.valueOf() < 0) {
    throw new Error(
      `The ${key}.waitTimeAfterEmptyReceive must not be negative.`,
    );
  }
  const timeout =
    readOptionalDuration(topic, 'timeout') ??
    pollingWaitTime
      .plus(waitTimeAfterEmptyReceive)
      .plus(Duration.fromObject({ seconds: 180 }));
  if (
    timeout.valueOf() <=
    pollingWaitTime.valueOf() + waitTimeAfterEmptyReceive.valueOf()
  ) {
    throw new Error(
      `The ${key}.timeout must be greater than ${key}.waitTime + ${key}.waitTimeAfterEmptyReceive.`,
    );
  }
  const visibilityTimeout = readOptionalDuration(topic, 'visibilityTimeout');
  return {
    pollingWaitTime,
    queueUrl: topic.getString('queueUrl'),
    region: topic.getOptionalString('region') ?? 'us-east-1',
    timeout,
    visibilityTimeout,
    waitTimeAfterEmptyReceive,
    credentials,
  };
}
