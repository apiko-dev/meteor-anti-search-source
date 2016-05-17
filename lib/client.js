Blaze.TemplateInstance.prototype.AntiSearchSource = (config) => {
  return new AntiSearchSourceClient(config, this);
};


class AntiSearchSourceClient {
  
  constructor(_searchConfig) {
    this._searchConfig = _searchConfig;
    this._searchConfig.limit = _searchConfig.limit || 0;

    let collection = _searchConfig.collection;
    this._collection = _.isString(collection) ? Mongo.Collection.get(collection) : collection;
    this._searchConfig.collection = _.isString(collection) ? collection : collection._name;

    if(_searchConfig.realetive && _searchConfig.realetive.collection) {
      let realetiveCollection = _searchConfig.realetive.collection;
      this._realetiveCollection = _.isString(realetiveCollection) ? Mongo.Collection.get(realetiveCollection) : realetiveCollection;
    }

    this._searchDep = new Tracker.Dependency();
    //make dummy search after creating
    this.search('');
  }

  _createTransformFn(usersTransform) {
    let transformFn = (document) => {
        let searchStr, searchStrRegExp;
        searchStr = this._searchConfig.searchString;
        if (searchStr) {
          searchStrRegExp = new RegExp(searchStr, 'ig');
          this._searchConfig.fields.forEach(function(fieldName) {
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

  _updateQuery() {
    this._searchDep.changed();
    return this.search();
  }

  //Changes search string
  search(searchString) {
    let _onSearchComplete = (err, res) => {
      if (err) {
        return console.log('Error while searching', err);
      } else {
        this._searchResult = res;
        return this._searchDep.changed();
      }
    };

    if (searchString || searchString === '') {
      this._searchConfig.searchString = searchString;
      this._searchDep.changed();
    }
    if (this._searchConfig.searchMode === 'global') {
      return Meteor.call('__makeGlobalSearch', this._searchConfig, _onSearchComplete);
    }
  }

  setMongoQuery(newMongoQuery) {
    if (!_.isEqual(newMongoQuery, this._searchConfig.mongoQuery)) {
      this._searchConfig.mongoQuery = newMongoQuery;
      return this._updateQuery();
    }
  }

  //May be used for infinite scroll or something like that
  setLimit(newLimit) {
    if (this._searchConfig.limit !== newLimit) {
      this._searchConfig.limit = newLimit;
      return this._updateQuery();
    }
  }

  incrementLimit(step = 10) {
    this._searchConfig.limit += step;
    return this._updateQuery();
  }

  _getDataOfRealetiveCollection(subQuerys) {
    let arr = [];
    for (let query of subQuerys) {
      let ids = this._realetiveCollection.find(query, {
          fields: {_id: 1}
        }).map(function(item){ 
          return item._id; 
        });
      arr.push({[this._realetiveCollection._name]: {$in: ids} });
    }
    
    return arr;
  }

  // Reactive data source
  searchResult(options = {}) {
    this._searchDep.depend();
    if (this._searchConfig.searchMode === 'local') {
      let querys = AntiSearchSource._buildSearchQuery(this._searchConfig);
      let query = querys.searchQuery;
      
      if(querys.subQuerys) {
        let subQuery = this._getDataOfRealetiveCollection(querys.subQuerys);
        query = AntiSearchSource._extendSearchQuery(query, subQuery);
      }
      
      _.extend(options, {
        limit: this._searchConfig.limit,
        transform: this._createTransformFn(options.transform)
      });

      return this._collection.find(query, options);
    } else {
      return this._searchResult;
    }
  }

}