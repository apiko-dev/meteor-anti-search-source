import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';


export default class AntiSearchSourceBase {
  constructor() {
    this.SearchMode = {
      LOCAL: 'local',
      GLOBAL: 'global',
    };

    this.GlobalSearchMethodName = '__makeGlobalSearch';
  }

  _escapeRegExpStr(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
  }

  _buildMongoQueryForFields(fields, escapedSearchString, mongoQuery = false) {
    const mongoQueryForField = fieldName =>
      ({ [fieldName]: { $regex: escapedSearchString, $options: 'i' } });

    let queries = fields.map(field => {
      if (this._isRelatedField(field)) {
        return this._buildRelativeMongoQuery(field, escapedSearchString);
      }

      return mongoQueryForField(field);
    });

    // clean up empty relative queries
    queries = queries.filter(query => query !== false);
    const resultQuery = {
      $and: [],
    };
    if (!_.isEmpty(queries)) {
      resultQuery.$and.push({ $or: queries });
    }

    if (mongoQuery) {
      resultQuery.$and.push(mongoQuery);
    }

    return resultQuery.$and.length === 0 ? {} : resultQuery;
  }

  _buildRelativeMongoQuery(relativeEntry, escapedSearchString) {
    const collectionInstance = this._getCollectionByName(relativeEntry.collection);

    const searchQuery = this._buildMongoQueryForFields(relativeEntry.fields, escapedSearchString,
      relativeEntry.mongoQuery);

    const relativeIds = collectionInstance.find(searchQuery, { _id: 1 })
      .map(document => document._id);

    return relativeIds.length > 0 ? { [relativeEntry.referenceField]: { $in: relativeIds } } :
      false;
  }


  _buildMongoQuery(searchConfig) {
    const escapedSearchString = this._escapeRegExpStr(searchConfig.searchString);

    const searchStringQueries = this._buildMongoQueryForFields(searchConfig.fields,
      escapedSearchString, searchConfig.mongoQuery);

    return escapedSearchString === '' ? searchConfig.mongoQuery : searchStringQueries;
  }

  _getCollectionByName(collectionName) {
    return _.isString(collectionName) ? Mongo.Collection.get(collectionName) : collectionName;
  }

  _isRelatedField(field) {
    return !_.isString(field);
  }
}
