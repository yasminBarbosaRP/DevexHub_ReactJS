import yaml from 'js-yaml';
import * as winston from 'winston';
import { versionIsGreaterThan, isDependencyExists, inspectForChartVersion } from './chart-version-config';

describe('versionIsGreaterThan', () => {
  it('should return true if currentVersion is greater than requiredVersion', () => {
    expect(versionIsGreaterThan('2.5.0', '2.4.0')).toBe(true);
  });

  it('should return false if currentVersion is less than requiredVersion', () => {
    expect(versionIsGreaterThan('2.3.0', '2.4.0')).toBe(false);
  });

  it('should return true if currentVersion is equal to requiredVersion', () => {
    expect(versionIsGreaterThan('2.4.0', '2.4.0')).toBe(true);
  });
});

describe('isDependencyExists', () => {
  const chartData = {
    dependencies: [
      { name: 'picpay-ms-v2', version: '2.5.0' },
      { name: 'another-dependency', version: '1.0.0' },
    ],
  };

  it('should return true if the dependency exists', () => {
    expect(isDependencyExists(chartData, 'picpay-ms-v2')).toBe(true);
  });

  it('should return false if the dependency does not exist', () => {
    expect(isDependencyExists(chartData, 'non-existent-dependency')).toBe(false);
  });
});

describe('inspectForChartVersion', () => {
  const logger = winston.createLogger({
    transports: [new winston.transports.Console()],
  });

  const chartConfig = yaml.dump({
    dependencies: [
      { name: 'picpay-ms-v2', version: '2.3.0' },
    ],
  });

  it('should update the dependency version if it is below the required version', () => {
    const [_, needToSetChartVersion, updatedChartContent] = inspectForChartVersion(chartConfig, logger, 'prod');
    expect(needToSetChartVersion).toBe(true);
    const updatedYaml = yaml.load(updatedChartContent);
    // @ts-ignore
    expect(updatedYaml.dependencies[0].version).toBe('2.7.2');
  });

  it('should not update the dependency version if it is above or equal to the required version', () => {
    const validChartConfig = yaml.dump({
      dependencies: [
        { name: 'picpay-ms-v2', version: '2.5.0' },
      ],
    });
    const [_, needToSetChartVersion, updatedChartContent] = inspectForChartVersion(validChartConfig, logger, 'prod');
    expect(needToSetChartVersion).toBe(false);
    expect(updatedChartContent).toBe(validChartConfig);
  });

  it('should update the dependency name and version if it is bellow to the required version', () => {
    const expectedChartConfig = yaml.dump({
      dependencies: [
        { name: 'picpay-ms-v2', version: '2.3.0' },
        { name: 'picpay-ms-v2-qa', version: '2.7.2', repository: "https://chartmuseum.ppay.me"}
      ],
    });

    const validChartConfig = yaml.dump({
      dependencies: [
        { name: 'picpay-ms-v2', version: '2.3.0' }
      ],
    });
    const [needToChangeQAChartName, needToSetChartVersion, updatedChartContent] = inspectForChartVersion(validChartConfig, logger, 'hom');
    expect(needToSetChartVersion).toBe(true);
    expect(needToChangeQAChartName).toBe(true);
    expect(updatedChartContent).toBe(expectedChartConfig);
  });
});
