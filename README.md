# jss:anti-search-source

Flexible search in collections based on publish/subscribe

# Features

* Search by multiple fields
* Searched fields transform
* Automatic search source destroy on blaze template destroy (in case `this.AntiSearchSource.create()` was used)

# Current limitation

* Only one search source per client


# Usage example
todo

# Future work

* Enable multiple collection search per client (Idea: pass array of search configs into search subscription and return array of related cursors)

Made by [![Professional Meteor Development Studio](http://s30.postimg.org/jfno1g71p/jss_xs.png)](http://jssolutionsdev.com) - [Professional Meteor Development Company](http://jssolutionsdev.com)