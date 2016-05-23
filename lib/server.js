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
    this._checkSearchConfig(searchConfig);

    const allowRule = this._getAllowRule(searchConfig.collection);

    this._applyAllowRuleToSearchConfig(allowRule, searchConfig, userId);

    let mongoQuery = this._buildMongoQuery(searchConfig);

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
    if (_.isFunction(allowRule.securityCheck) && !allowRule.securityCheck(userId, searchConfig)) {
      throw new Meteor.Error(403, 'You shall not pass!');
    }

    // check config limit and change it, if it is greater than maximum allowed limit
    if (allowRule.maxLimit && (!searchConfig.limit || searchConfig.limit > allowRule.maxLimit)) {
      searchConfig.limit = allowRule.maxLimit;
    }

    searchConfig.fieldsToReturn = {};

    if (allowRule.allowedFields) {
      const isFieldAllowed = field => {
        let fieldName = this._isRelatedField(field) ? field.referenceField : field;
        return allowRule.allowedFields.indexOf(fieldName) > -1;
      };

      //remove redundant search fields
      searchConfig.fields = searchConfig.fields.filter(isFieldAllowed);

      if (searchConfig.fields.length === 0) {
        throw new Meteor.Error(403, 'No allowed fields in query. Note: fields in search config should exactly match with allow rule.');
      }

      //limit returned fields
      allowRule.allowedFields.forEach(fieldName => {
        Object.assign(searchConfig.fieldsToReturn, {[fieldName]: 1});
      });
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

  _checkSearchConfig(config) {
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
  [AntiSearchSource.GlobalSearchMethodName](searchConfig) {
    return AntiSearchSource.processSearchConfig(searchConfig, this.userId);
  }
});