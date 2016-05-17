AntiSearchSource.allow = function(collectionName, allowRules) {
  check(allowRules, {
    maxLimit: Match.Optional(Number),
    securityCheck: Match.Optional(Function),
    allowedFields: Match.Optional([String]),
    queryTransform: Match.Optional(Function)
  });
  this._allowRules[collectionName] = allowRules;
  return this._allowRules[collectionName];
};

AntiSearchSource._allowRules = {};

Meteor.methods({
  __makeGlobalSearch: function(configEntry) {

    let collection, realetiveCollection, currentAllowRule, fieldsToPublish, querys, searchQuery, userId;

    check(configEntry, _SearchConfig);
    currentAllowRule = AntiSearchSource._allowRules[configEntry.collection];

    if (!currentAllowRule) {
      throw new Meteor.Error(404, 'No anti-search source server configuration exists');
    }

    userId = Meteor.userId();
    
    // do a security check
    if (currentAllowRule.securityCheck && !currentAllowRule.securityCheck.call(null, userId, configEntry)) {
      throw new Meteor.Error(403, 'You shall not pass!');
    }

    // check config limit and change it, if it is greater than maximum allowed limit
    if (currentAllowRule.maxLimit && (!configEntry.limit || configEntry.limit > currentAllowRule.maxLimit)) {
      configEntry.limit = currentAllowRule.maxLimit;
    }

    if (currentAllowRule.allowedFields) {
      // leave only allowed fields in the search fields config
      configEntry.fields = _.intersection(currentAllowRule.allowedFields, configEntry.fields);
    }

    collection = Mongo.Collection.get(configEntry.collection);
    if (configEntry.realetive && configEntry.realetive.collection) {
      realetiveCollection = Mongo.Collection.get(configEntry.realetive.collection);
    }
    
    querys = AntiSearchSource._buildSearchQuery(configEntry);
    searchQuery = querys.searchQuery;
      
    if (querys.subQuerys) {
      let subQuery = _getDataOfRealetiveCollection(realetiveCollection, querys.subQuerys);
      searchQuery = AntiSearchSource._extendSearchQuery(searchQuery, subQuery);
    }  

    // make query transformation if needed
    if (currentAllowRule.queryTransform) {
      searchQuery = currentAllowRule.queryTransform(userId, searchQuery);
    }

    fieldsToPublish = {};
    configEntry.fields.forEach(function(fieldName) {
      fieldsToPublish[fieldName] = 1;
      return fieldsToPublish[fieldName];
    });

    return collection.find(searchQuery, {
      limit: configEntry.limit,
      fields: fieldsToPublish
    }).fetch();
  }
});

let _getDataOfRealetiveCollection = (realetiveCollection, subQuerys) => {
  let arr = [];
  for (let query of subQuerys) {
    let ids = realetiveCollection.find(query, {
        fields: {_id: 1}
      }).map(function(item){ 
        return item._id; 
      });
    arr.push({[realetiveCollection._name]: {$in: ids} });
  }
  
  return arr;
};

let _SearchConfig = Match.Where(function(config) {
  check(config, {
    collection: String,
    fields: [String],
    searchString: Match.Optional(String),
    mongoQuery: Match.Optional(Object),
    limit: Match.Optional(Number),
    searchMode: String,
    realetive: Match.Optional(Object)
  });
  return true;
});