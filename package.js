Package.describe({
  name: 'jss:anti-search-source',
  version: '1.4.0',
  summary: 'Flexible search in collections based on publish/subscribe',
  git: 'https://github.com/JSSolutions/meteor-anti-search-source',
  documentation: 'README.md'
});

Package.onUse(function (api) {
  api.versionsFrom('1.3');
  api.use('templating');
  api.use('ecmascript');
  api.use('check');
  api.use('tracker');
  api.use('underscore');
  api.use('dburles:mongo-collection-instances@0.1.3');

  api.mainModule('lib/client.js', 'client');
  api.mainModule('lib/server.js', 'server');
});