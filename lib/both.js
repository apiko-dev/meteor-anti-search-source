this.AntiSearchSource = {
  _escapeRegExpStr: function(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  },
  _buildSearchQuery: function(configEntry) {
    let searchStringQueries = [];
    let relativeQueries = [];

    if (configEntry.searchString && configEntry.fields) {
      let escapedSearchString = this._escapeRegExpStr(configEntry.searchString);

      configEntry.fields.forEach(item => {
        if (_.isString(item)) {
          let mainQuery = this._buildQueryByField(item, escapedSearchString, false);
          searchStringQueries.push(mainQuery);
        } else if (_.isObject(item)) {
          let relativeQuery = this._buildQueryByField(item, escapedSearchString, true);
          relativeQueries.push(relativeQuery);
        }
      }); 
    }

    let searchQuery = {
      $and: [_.extend({}, configEntry.mongoQuery)]
    };

    if (searchStringQueries.length > 0) {
      searchQuery.$and.push({
        $or: searchStringQueries
      });
    }

    return {
      searchQuery: searchQuery,
      relativeQueries: relativeQueries
    };
  },
  _buildQueryByField: function(item, escapedSearchString, isObj) {
    let orEntry = {$regex: escapedSearchString, $options: 'i'};
    let query = {};

    if (isObj) {
      query = {
        collection: item.collection,
        fields: item.fields,
        query:{
          [item.referenceField]: orEntry
        }
      };
    } else {
      query[item] = orEntry;
    }

    return query;
  },
  _buildQueryByFieldForRelativeCollection: function(fields, ids) {
    let arr = [];

    for (let item of fields) {
      arr.push({[item]: {$in: ids} });
    }

    return arr;
  },
  _extendSearchQuery: function(query, subQueries) {
    let _query = query;
    let len = _query.$and.length -1;

    for (let subQuery of subQueries) {
      _query.$and[len].$or.push(subQuery);
    }
  
    return _query;
  },
  _getCollectionByName: function(collectionName) {
    return _.isString(collectionName) ? Mongo.Collection.get(collectionName) : collectionName;
  }
};
