AntiSearchSource.allow = function(collectionName, allowRules) {
  check(allowRules, {
    maxLimit: Match.Optional(Number),
    securityCheck: Match.Optional(Function),
    allowedFields: Match.Optional([
      Match.OneOf(String, {
        collection: String,
        referenceField: String,
        fields: [String]
      })
    ]),
    queryTransform: Match.Optional(Function)
  });
  this._allowRules[collectionName] = allowRules;
  return this._allowRules[collectionName];
};

AntiSearchSource._allowRules = {};

Meteor.methods({
  __makeGlobalSearch: function(configEntry) {

    let collection, currentAllowRule, fieldsToPublish, queries, searchQuery, userId;

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
      let arr = [];
      configEntry.fields.forEach(item => {
        if (_.isString(item) && _.indexOf(currentAllowRule.allowedFields, item) >= 0 ) {
          arr.push(item);
        } else if (_.isObject(item)) {
          arr.push(item); 
        }
      });

      configEntry.fields = arr;
    }

    collection = AntiSearchSource._getCollectionByName(configEntry.collection);
        
    queries = AntiSearchSource._buildSearchQuery(configEntry);
    searchQuery = queries.searchQuery;

    if(queries.relativeQueries.length > 0) {
        let subQueries = _getDataOfRelativeCollection(queries.relativeQueries);
        searchQuery = AntiSearchSource._extendSearchQuery(searchQuery, subQueries);
      }

    // make query transformation if needed
    if (currentAllowRule.queryTransform) {
      searchQuery = currentAllowRule.queryTransform(userId, searchQuery);
    }

    fieldsToPublish = {};
    configEntry.fields.forEach(function(fieldName) {
      if (_.isString(fieldName)) {
        fieldsToPublish[fieldName] = 1;
        return fieldsToPublish[fieldName];
      }  
    });

    return collection.find(searchQuery, {
      limit: configEntry.limit,
      fields: fieldsToPublish
    }).fetch();
  }
});

let _getDataOfRelativeCollection = (relativeQueries) => {
  let fields = {_id: 1};
  let arr = [];

  for (let item of relativeQueries) {
    let collection = AntiSearchSource._getCollectionByName(item.collection);
    let ids = collection.find(item.query, fields).map(_item => _item._id);
    let relativeQuery = AntiSearchSource._buildQueryByFieldForRelativeCollection(item.fields ,ids);
    arr = arr.concat(relativeQuery);
  }
  
  return arr;
};

let _SearchConfig = Match.Where(function(config) {
  check(config, {
    collection: String,
    searchMode: String,
    fields: [Match.OneOf(String, {
      collection: String,
      referenceField: String,
      fields: [String]
    })],
    searchString: Match.Optional(String),
    mongoQuery: Match.Optional(Object),
    limit: Match.Optional(Number)
  });
  return true;
});