Package.describe({
  name: 'jss:anti-search-source',
  version: '0.2.1',
  summary: 'Flexible search in collections based on publish/subscribe',
  git: 'git@github.com:JSSolutions/meteor-anti-search-source.git',
  documentation: 'README.md'
});

Package.onUse(function (api) {
  api.versionsFrom('METEOR@1.1.0.3');
  api.use('templating');
  api.use('coffeescript');
  api.use('check');
  api.use('reactive-var');
  api.use('underscore');
  api.use('dburles:mongo-collection-instances@0.1.3');

  api.addFiles('lib/both.coffee');
  api.addFiles(['lib/client.coffee'], 'client');
  api.addFiles(['lib/server.coffee'], 'server');
});