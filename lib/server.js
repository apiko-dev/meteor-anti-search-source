class AntiSearchSourceServer extends AntiSearchSourceBase {
  constructor() {
    super();
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

    let mongoQuery = this._buildMongoQuery(searchConfig);

    // make query transformation if needed
    if (allowRule.queryTransform) {
      mongoQuery = allowRule.queryTransform(userId, mongoQuery);
    }

    const collectionInstance = this._getCollectionByName(searchConfig.collection);
    const searchResultCursor = collectionInstance.find(mongoQuery, {
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
      const isFieldAllowed = field => {
        let fieldName = this._isRelatedField(field) ? field : field.referenceField;
        return allowRule.allowedFields.indexOf(fieldName) > -1;
      };

      //remove redundant search fields
      searchConfig.fields = searchConfig.fields.filter(isFieldAllowed);

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
      fields: [Match.OneOf(String, {
        collection: String,
        referenceField: String,
        fields: [String],
        mongoQuery: Match.Optional(Object)
      })],
      searchString: String,
      mongoQuery: Match.Optional(Object),
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