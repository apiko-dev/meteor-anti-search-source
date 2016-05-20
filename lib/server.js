class AntiSearchSourceServer extends AntiSearchSourceBase {
  constructor() {
    this._allowRules = {};
  }

  allow(collectionName, allowRule) {
    AntiSearchSourceServer._checkAllowRule(allowRule);
    this._allowRules[collectionName] = allowRule;
  }


  processSearchConfig(searchConfig, userId) {
    AntiSearchSourceServer._checkSearchConfig(searchConfig);

    const allowRule = this._getAllowRule(searchConfig.collection);

    this._applyAllowRuleToSearchConfig(allowRule, searchConfig, userId);

    // todo
    let queries = this._buildSearchQuery(searchConfig);
    let searchQuery = queries.searchQuery;

    // make query transformation if needed
    if (allowRule.queryTransform) {
      searchQuery = allowRule.queryTransform(userId, searchQuery);
    }


    const collectionInstance = this._getCollectionByName(searchConfig.collection);
    const searchResultCursor = collectionInstance.find(searchQuery, {
      limit: searchConfig.limit,
      fields: searchConfig.fieldsToReturn
    });
    
    return searchResultCursor.fetch();
  }

  _applyAllowRuleToSearchConfig(allowRule, searchConfig, userId) {
    if (!allowRule) {
      throw new Meteor.Error(404, 'No anti-search source server configuration exists');
    }

    // do a security check
    if (_.isFunction(allowRule.securityCheck) && allowRule.securityCheck(userId, searchConfig)) {
      throw new Meteor.Error(403, 'You shall not pass!');
    }

    // check config limit and change it, if it is greater than maximum allowed limit
    if (allowRule.maxLimit && (!searchConfig.limit || searchConfig.limit > allowRule.maxLimit)) {
      searchConfig.limit = allowRule.maxLimit;
    }

    if (allowRule.allowedFields) {
      const isFieldAllowed = fieldName => allowRule.allowedFields.indexOf(fieldName) > -1;

      //remove redundant search fields
      searchConfig.fields = searchConfig.fields.filter(isFieldAllowed);

      searchConfig.relatedFields = searchConfig.relatedFields.filter(
        fieldEntry => isFieldAllowed(fieldEntry.referenceField)
      );

      //limit returned fields
      searchConfig.fieldsToReturn = allowRule.allowedFields.map(fieldName => {
        return {[fieldName]: 1};
      });
    } else {
      searchConfig.fieldsToReturn = {};
    }
  }

  _getAllowRule(collectionName) {
    return this._allowRules[collectionName];
  }

  static _checkAllowRule(allowRule) {
    check(allowRule, {
      maxLimit: Match.Optional(Number),
      securityCheck: Match.Optional(Function),
      allowedFields: Match.Optional([String]),
      queryTransform: Match.Optional(Function)
    });
  }

  static _checkSearchConfig(config) {
    check(config, {
      collection: String,
      searchMode: Match.OneOf(... _.values(this.SearchMode)),
      fields: [String],
      relatedFields: [{
        collection: String,
        referenceField: String,
        fields: [String]
      }],
      searchString: String,
      mongoQuery: Object,
      limit: Number
    });
  }
}

AntiSearchSource = new AntiSearchSourceServer();

Meteor.methods({
  [AntiSearchSource.GlobalSearchMethodName](configEntry) {
    return AntiSearchSource.processSearchConfig(configEntry, this.userId);
  }
});