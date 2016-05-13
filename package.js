Package.describe({
  name: 'jss:anti-search-source',
  version: '1.2.0',
  summary: 'Flexible search in collections based on publish/subscribe',
  git: 'https://github.com/JSSolutions/meteor-anti-search-source',
  documentation: 'README.md'
});

Package.onUse(function (api) {
  api.versionsFrom('1.2');
  api.use('templating');
  api.use('coffeescript');
  api.use('check');
  api.use('tracker');
  api.use('underscore');
  api.use('dburles:mongo-collection-instances@0.1.3');

  api.addFiles('lib/both.coffee');
  api.addFiles(['lib/client.coffee'], 'client');
  api.addFiles(['lib/server.coffee'], 'server');
});
