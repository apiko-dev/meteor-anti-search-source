## jss:anti-search-source

Flexible search in collections based on publish/subscribe

### Features

* Search by multiple fields
* Searched fields transform
* Search in local or global mode
* High security level in global mode
* Search in relatives collections


### Search configuration

* `collection` - instance of collection to search in;
* `searchMode` - where search: `"global"` (server) or `"local"` (client);
* `fields` - fields to search by. Also, support search in related collections;
* `mongoQuery` - additional Mongo query;
* `limit` - count of documents in result.

### Client methods

* `search('stringToSearch')` - changes search string;
* `searchResult([options])` - return search result as Mongo.Cursor (Array for 'global' search). `options` work similarly to Meteor collection `find()`'s. Reactive data source;
* `setMongoQuery(newMongoQuery)` - replaces Mongo query from configuration
* `setLimit(newLimit)` - change limit;
* `incrementLimit([increment=10])` - increase limit on `value`;
* `isDataReady` - reactive state which shows if data is returned.

### Usage example

```js
Persons = new Mongo.Collection('persons');

if (Meteor.isClient) {
  Template.hello.onCreated(function () {
    this.searchSource = this.AntiSearchSource({
      collection: Persons,
      searchMode: 'global',
      fields: ['name', 'email', {
          collection: 'groups',
          referenceField: 'groupId',
          fields: ['groupDescription']
      }, {
          collection: 'home',
          referenceField: 'homeId',
          fields: ['homeDescription','otherField']
      }],
      mongoQuery: {
        age: {$gte: 30}
      },
      limit: 10
    });
  });

  Template.hello.helpers({
    searchResult: function () {
      return Template.instance().searchSource.searchResult();
    }
  });

  Template.hello.events({
    'keyup input': _.throttle(function (event, tmpl) {
      tmpl.searchSource.search($('input').val())
    }, 1500)
  });
}

if (Meteor.isServer) {
  AntiSearchSource.allow('persons', {
    maxLimit: 20,
    securityCheck (userId, configs) {
      return !!userId;
    },
    allowedFields: ['name', 'email']
  });
}
```

### Changelog

* 1.3.0 - Translated to ES6, fully refactored, added search by related documents.


Made by [![Professional Meteor Development Studio](http://s30.postimg.org/jfno1g71p/jss_xs.png)](http://jssolutionsdev.com) - [Professional Meteor Development Company](http://jssolutionsdev.com)
