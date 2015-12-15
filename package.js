Package.describe({
  name: 'jss:anti-search-source',
  version: '0.8.1',
  summary: 'Flexible search in collections based on publish/subscribe',
  git: 'git@github.com:JSSolutions/meteor-anti-search-source.git',
  documentation: 'README.md'
});

Package.onUse(function (api) {
  api.versionsFrom('METEOR@1.1.0.3');
  api.addFiles('anti-search-source.js');
});