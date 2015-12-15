Package.describe({
  name: 'jss:anti-search-source',
  version: '0.8.1',
  summary: 'Flexible search in collections based on publish/subscribe',
  git: 'git@github.com:JSSolutions/meteor-anti-search-source.git',
  documentation: 'README.md'
});

Package.onUse(function (api) {
  api.versionsFrom('METEOR@1.1.0.3');
  api.use('templating');
  api.use('coffeescript');
  api.use('reactive-var');

  api.addFiles('lib/both.coffee');
  api.addFiles(['lib/client.coffee'],'client');
  api.addFiles(['lib/server.coffee'],'server');
});