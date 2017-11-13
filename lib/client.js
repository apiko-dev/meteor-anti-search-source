import { Meteor } from 'meteor/meteor';
import { Blaze } from 'meteor/blaze';
import { Tracker } from 'meteor/tracker';
import { _ } from 'meteor/underscore';
import { ReactiveVar } from 'meteor/reactive-var';

import AntiSearchSourceBase from './both';


/**
 * Provides search API on client side
 */
export class AntiSearchSourceClient extends AntiSearchSourceBase {
  /**
   *
   * @param {Mongo.Collection} collection - collection to search in
   * @param {Array} fields - fields to search by
   * @param {Object} [mongoQuery] - additional query for search
   * @param {'local'|'global'} [searchMode] - client/server search type
   * @param {Number} [limit] - maximal count of entries that will be returned
   */
  constructor({ collection, fields, mongoQuery, searchMode, limit = 0, sort = {} }) {
    super();
    // collection should be passed as Mongo.Collection instance
    // for backward compatibility reasons we also support string
    this._collection = this._getCollectionByName(collection);

    this._fields = fields;

    this._searchMode = searchMode || this.SearchMode.LOCAL;
    this._mongoQuery = mongoQuery || {};
    this._limit = limit;
    this._sort = sort;

    this._searchConfigDep = new Tracker.Dependency();
    this._searchResultDep = new Tracker.Dependency();

    this._dataReady = new ReactiveVar();

    // make dummy search after creating
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

  _wrapTransformFunction(basicTransformFn) {
    const transformFn = (documentToTransform) => {
      const document = Object.assign({}, documentToTransform);

      const searchStr = this._searchString;

      if (searchStr) {
        const searchStrRegExp = new RegExp(searchStr, 'ig');

        this._fields.forEach(fieldName => {
          if (!this._isRelatedField(fieldName)) {
            document[fieldName] = basicTransformFn(document[fieldName], searchStrRegExp);
          }
        });
      }

      return document;
    };

    return _.isFunction(basicTransformFn) ? transformFn : null;
  }

  _notifySearchConfigUpdated() {
    this._searchConfigDep.changed();
    this.search();
  }


  _getSearchConfig() {
    const basicSearchConfig = {
      collection: this._getCollectionName(),
      searchMode: this._searchMode,
      fields: this._fields,
      searchString: this._searchString,
      limit: this._limit,
      sort: this._sort,
    };

    if (this._mongoQuery) {
      basicSearchConfig.mongoQuery = this._mongoQuery;
    }

    return basicSearchConfig;
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
    }

    if (this._isGlobalSearch()) {
      this._dataReady.set(false);
      Meteor.call(this.GlobalSearchMethodName, this._getSearchConfig(), (err, res) => {
        if (err) {
          console.error('Error while searching', err);
        } else {
          this._searchResult = res;
          this._searchResultDep.changed();
          this._dataReady.set(true);
        }
      });
    } else {
      this._searchConfigDep.changed();
    }
  }

  isDataReady() {
    return this._dataReady;
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
      const mongoQuery = this._buildMongoQuery(this._getSearchConfig());

      // sort can be overriden using options argument
      const composedOptions = Object.assign({ sort: this._sort }, options, {
        limit: this._limit,
        transform: this._wrapTransformFunction(options.transform),
      });

      return this._collection.find(mongoQuery, composedOptions);
    }

    return this._searchResult || [];
  }

  /**
   * Change DB query's sort param and
   * make query with new param
   *
   * @param {object} sort Change params to sort data in DB query
   * @return void
   */
  setSort(sort = {}) {
    this._sort = sort;
    this._notifySearchConfigUpdated();
  }
}


Blaze.TemplateInstance.prototype.AntiSearchSource = (searchConfiguration) =>
  new AntiSearchSourceClient(searchConfiguration);
