import { filterBy } from './filterFileByName';
import { isThereMoonlightWebhookConfigured } from './moonlightWebhookPolicy';
import { isThereInLegacyClusters } from './filterIsOnLegacyClusters';
import { isHelmchartsVersionAvailable } from './helmchartVersionPolicy';

const isThereCatalogInfo = filterBy('catalog-info.yaml');
const isThereMoonlightYAML = filterBy('.moonlight.yaml');
const isThereSonarProperties = filterBy('.sonarcloud.properties');

export {
  isThereCatalogInfo,
  isThereMoonlightYAML,
  isThereSonarProperties,
  isThereMoonlightWebhookConfigured,
  isThereInLegacyClusters,
  isHelmchartsVersionAvailable,
};
