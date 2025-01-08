require('sonarqube-scanner')({
  serverUrl:
    'https://sonarcloud.io/organizations/nxgbiqstumcjehqxdrnhyefpsycaavryialkxzjevbfqjzdzsgilzwwgezkpsswareusxfgyqggwwmccvcohbsvxtegwdvrrldwc',
  options: {
    'sonar.projectKey': 'PicPay_picpay-ops-moonlight',
    'sonar.projectName': 'ops-moonlight',
    'sonar.organization':
      'nxgbiqstumcjehqxdrnhyefpsycaavryialkxzjevbfqjzdzsgilzwwgezkpsswareusxfgyqggwwmccvcohbsvxtegwdvrrldwc',
    'sonar.host.url': 'https://sonarcloud.io/',
    'sonar.sources': 'packages/backend/src',
    'sonar.tests': 'packages/backend/src',
    'sonar.sourceEncoding': 'UTF-8',
    'sonar.inclusions': '**',
    'sonar.test.inclusions': 'packages/backend/src/*.test.js',
    'sonar.javascript.lcov.reportPaths': 'coverage/lcov.info',
    'sonar.coverage.jacoco.xmlReportPaths': 'coverage/test-reporter.xml',
  },
});
