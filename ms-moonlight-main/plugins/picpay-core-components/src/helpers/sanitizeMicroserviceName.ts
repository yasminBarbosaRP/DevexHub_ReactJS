export const sanitizeMicroserviceName = (serviceName: string) => {
  if (!serviceName) {
    throw new Error('Invalid microservice name');
  }

  let microserviceName = serviceName.replace(/^(picpay-dev-)/, '');
  const pattern = /^(ms-)/;
  if (!pattern.test(microserviceName)) {
    microserviceName = `ms-${microserviceName}`;
  }

  return microserviceName;
};
