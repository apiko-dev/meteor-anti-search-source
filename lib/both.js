this.AntiSearchSource = {
  _escapeRegExpStr: function(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  },
  _buildSearchQuery: function(configEntry) {
    let searchStringQueries = false;
    let subQuerys = false;
    if (configEntry.searchString) {
      let escapedSearchString = this._escapeRegExpStr(configEntry.searchString);

      searchStringQueries = this._buildQuerysByFields(configEntry.fields, escapedSearchString);
      if(configEntry.realetive && configEntry.realetive.collection) {
        subQuerys = this._buildQuerysByFields(configEntry.realetive.fields, escapedSearchString);
      }
      
    }

    let searchQuery = {
      $and: [_.extend({}, configEntry.mongoQuery)]
    };

    if (_.isArray(searchStringQueries)) {
      searchQuery.$and.push({
        $or: searchStringQueries
      });
    }

    return {
      searchQuery: searchQuery,
      subQuerys: subQuerys
    };
  },
  _buildQuerysByFields: function(fields, escapedSearchString) {
    let result = fields.map(function(fieldName) {
      return {
        [fieldName]: {
          $regex: escapedSearchString,
          $options: 'i'
        }
      };
    });

    return result;
  },
  _extendSearchQuery: function(query, subQuery) {
    let searchQuery = query;
    if (_.isArray(subQuery)) {
      let len = searchQuery.$and.length -1;
      for (let q of subQuery) {
        searchQuery.$and[len].$or.push(q);
      }
    }

    return searchQuery;
  }
};
