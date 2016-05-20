AntiSearchSourceBase = class AntiSearchSourceBase {
  constructor() {
    this.SearchMode = {
      LOCAL: 'local',
      GLOBAL: 'global'
    };

    this.GlobalSearchMethodName = '__makeGlobalSearch'
  }

  _escapeRegExpStr(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }

  _buildMongoQueryForField(fieldName) {
    // {$regex: escapedSearchString, $options: 'i'}
  }

  _buildRelativeMongoQuery(relativeEntry) {
    const collectionInstance = AntiSearchSource._getCollectionByName(relativeEntry.collection);
    let matchedIds = collectionInstance.find(item.query, {_id: 1}).map(_item => _item._id);
    let relativeQuery = AntiSearchSource._buildQueryByFieldForRelativeCollection(item.fields, matchedIds);
    arr = arr.concat(relativeQuery);

    return arr;
  }


  _buildMongoQuery(searchConfig) {
    let searchStringQueries = [];
    let relativeQueries = [];

    if (searchConfig.searchString && searchConfig.fields) {
      let escapedSearchString = this._escapeRegExpStr(searchConfig.searchString);

      searchConfig.fields.forEach(item => {
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
      $and: [_.extend({}, searchConfig.mongoQuery)]
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
  }

  _getCollectionByName(collectionName) {
    return _.isString(collectionName) ? Mongo.Collection.get(collectionName) : collectionName;
  }
};
