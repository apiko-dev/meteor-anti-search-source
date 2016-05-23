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

  _buildMongoQueryForFields(fields, escapedSearchString, mongoQuery = false) {
    const mongoQueryForField = fieldName => {
      return {[fieldName]: {$regex: escapedSearchString, $options: 'i'}};
    };

    let queries = fields.map(field => {
      if (this._isRelatedField(field)) {
        return this._buildRelativeMongoQuery(field, escapedSearchString);
      } else {
        return mongoQueryForField(field);
      }
    });

    //clean up empty relative queries
    queries = queries.filter(query => query !== false);

    const resultQuery = {
      $and: [
        {$or: queries}
      ]
    };

    if (mongoQuery) {
      resultQuery.$and.push(mongoQuery);
    }

    return resultQuery;
  }

  _buildRelativeMongoQuery(relativeEntry, escapedSearchString) {
    const collectionInstance = this._getCollectionByName(relativeEntry.collection);
    const searchQuery = this._buildMongoQueryForFields(relativeEntry.fields, escapedSearchString, relativeEntry.mongoQuery);
    const relativeIds = collectionInstance.find(searchQuery, {_id: 1}).map(document => document._id);
    return relativeIds.length > 0 ? {[relativeEntry.referenceField]: {$in: relativeIds}} : false;
  }


  _buildMongoQuery(searchConfig) {
    let escapedSearchString = this._escapeRegExpStr(searchConfig.searchString);

    const searchStringQueries = this._buildMongoQueryForFields(searchConfig.fields, escapedSearchString, searchConfig.mongoQuery);

    return escapedSearchString === '' ? searchConfig.mongoQuery : searchStringQueries;
  }

  _getCollectionByName(collectionName) {
    return _.isString(collectionName) ? Mongo.Collection.get(collectionName) : collectionName;
  }

  _isRelatedField(field) {
    return !_.isString(field);
  }
};
