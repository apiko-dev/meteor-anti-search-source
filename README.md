## jss:anti-search-source

Flexible search in collections based on publish/subscribe

### Features

* Search by multiple fields
* Searched fields transform
* Automatic search source destroy on blaze template destroy (in case `this.AntiSearchSource.create()` was used)

### Current limitation

* Only one search source per client


### Usage example

```js
Persons = new Mongo.Collection('persons');

if (Meteor.isClient) {
  Template.hello.onCreated(function () {
    this.searchSource = this.AntiSearchSource({
      collection: 'persons',
      fields: ['name'],
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
  AntiSearchSource.allow('persons', function (userId, _searchConfig) {
    return !!userId;
  });
}
```

### Future work

* Enable multiple collection search per client (Idea: pass array of search configs into search subscription and return array of related cursors)

Made by [![Professional Meteor Development Studio](http://s30.postimg.org/jfno1g71p/jss_xs.png)](http://jssolutionsdev.com) - [Professional Meteor Development Company](http://jssolutionsdev.com)