/**
 * Provides search API on client side
 */
class AntiSearchSourceClient extends AntiSearchSourceBase {
  /**
   *
   * @param {Mongo.Collection} collection - collection to search in
   * @param {Array} fields - fields to search by
   * @param {'local'|'global'} searchMode - client/server search type
   * @param {Object} mongoQuery - additional query for search
   * @param {Number} limit - maximal count of entries that will be returned
   */
  constructor({collection, fields, searchMode = AntiSearchSource.SearchMode.LOCAL, mongoQuery = {}, limit = 0}) {
    // collection should be passed as Mongo.Collection instance
    // for backward compatibility reasons we also support string
    this._collection = this._getCollectionByName(collection);

    this._fields = fields.filter(field => _.isString(field));
    this._relatedFields = fields.filter(field => !_.isString(field));

    this._searchMode = searchMode;
    this._mongoQuery = mongoQuery;
    this._limit = limit;

    this._searchConfigDep = new Tracker.Dependency();
    this._searchResultDep = new Tracker.Dependency();

    //make dummy search after creating
    this.search('');
  }

  _getCollectionName() {
    return this._collection._name;
  }

  _isGlobalSearch() {
    return this._searchMode === this.SearchMode.GLOBAL;
  }

  _isLocalSearch() {
    return this._searchMode === this.SearchMode.LOCAL;
  }

  _createTransformFn(usersTransform) {
    // todo:
    let transformFn = (document) => {
      let searchStr = this._searchString;

      if (searchStr) {
        let searchStrRegExp = new RegExp(searchStr, 'ig');

        this._fields.forEach(fieldName => {
          document[fieldName] = usersTransform(document[fieldName], searchStrRegExp);
          return document[fieldName];
        });
      }
      return document;
    };

    if (_.isFunction(usersTransform)) {
      return transformFn;
    } else {
      return null;
    }
  }

  _notifySearchConfigUpdated() {
    this._searchConfigDep.changed();
    this.search();
  }
  

  _getSearchConfig() {
    return {
      collection: this._getCollectionName(),
      searchMode: this._searchMode,
      fields: this._fields,
      relatedFields: this._relatedFields,
      searchString: this._searchString,
      mongoQuery: this._mongoQuery,
      limit: this._limit
    };
  }

  // public methods //

  /**
   * Refresh search
   *
   * @param {String} [searchString] - value to search for
   */
  search(searchString) {
    if (searchString || searchString === '') {
      this._searchString = searchString;

      if (this._isGlobalSearch()) {
        Meteor.call(this.GlobalSearchMethodName, this._getSearchConfig(), (err, res) => {
          if (err) {
            console.error('Error while searching', err);
          } else {
            this._searchResult = res;
            this._searchResultDep.changed();
          }
        });
      } else {
        this._searchConfigDep.changed();
      }
    }
  }

  /**
   * Change MongoDB query
   *
   * @param {Object} newMongoQuery
   */
  setMongoQuery(newMongoQuery) {
    if (!_.isEqual(newMongoQuery, this._mongoQuery)) {
      this._mongoQuery = newMongoQuery;
      this._notifySearchConfigUpdated();
    }
  }

  setLimit(limit) {
    if (this._limit !== limit) {
      this._limit = limit;
      this._notifySearchConfigUpdated();
    }
  }

  /**
   * May be used for infinite scroll or something like that
   */
  incrementLimit(step = 10) {
    this.setLimit(this._limit + step);
  }

  /**
   * Search reactive data source
   *
   * @param options
   * @returns {Collection.Cursor|Array} search result
   */
  searchResult(options = {}) {
    this._searchConfigDep.depend();
    this._searchResultDep.depend();

    if (this._isLocalSearch()) {
      // todo
      let queries = AntiSearchSource._buildSearchQuery(this._searchConfig);
      let query = queries.searchQuery;

      if (queries.relativeQueries.length > 0) {
        let subQueries = this._getDataOfRelativeCollection(queries.relativeQueries);
        query = AntiSearchSource._extendSearchQuery(query, subQueries);
      }

      Object.assign(options, {
        limit: this._limit,
        transform: this._createTransformFn(options.transform)
      });

      return this._collection.find(query, options);
    } else {
      return this._searchResult;
    }
  }
}


Blaze.TemplateInstance.prototype.AntiSearchSource = (searchConfiguration) => {
  return new AntiSearchSourceClient(searchConfiguration);
};