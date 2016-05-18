## jss:anti-search-source

Flexible search in collections based on publish/subscribe

### Features

* Search by multiple fields
* Searched fields transform
* Automatic search source destroy on blaze template destroy (in case `this.AntiSearchSource.create()` was used)
* Search in local or global mode
* High security level in global mode
* Search in relatives collections


### Usage example

```js
Persons = new Mongo.Collection('persons');

if (Meteor.isClient) {
  Template.hello.onCreated(function () {
    this.searchSource = this.AntiSearchSource({
      collection: 'persons',
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

Made by [![Professional Meteor Development Studio](http://s30.postimg.org/jfno1g71p/jss_xs.png)](http://jssolutionsdev.com) - [Professional Meteor Development Company](http://jssolutionsdev.com)