Package.describe({
  name: 'jss:anti-search-source',
  version: '1.0.2',
  summary: 'Flexible search in collections based on publish/subscribe',
  git: 'https://github.com/JSSolutions/meteor-anti-search-source',
  documentation: 'README.md'
});

Package.onUse(function (api) {
  api.versionsFrom('METEOR@1.1.0.3');
  api.use('templating');
  api.use('ecmascript');
  api.use('check');
  api.use('tracker');
  api.use('underscore');
  api.use('dburles:mongo-collection-instances@0.1.3');

  api.addFiles('lib/both.js');
  api.addFiles(['lib/client.js'], 'client');
  api.addFiles(['lib/server.js'], 'server');
});
