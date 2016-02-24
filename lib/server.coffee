Meteor.methods
  __makeGlobalSearch: (configEntry) ->
    check configEntry, AntiSearchSource._SearchConfig

    currentAllowRule = AntiSearchSource._allowRules[configEntry.collection]

    unless currentAllowRule
      throw new Meteor.Error 404, 'No anti-search source server configuration exists'

    check currentAllowRule,
      maxLimit: Number
      securityCheck: Function
      allowedFields: [String]

    # do a security check
    unless currentAllowRule.securityCheck.call null, Meteor.userId(), configEntry
      throw new Meteor.Error 403, 'You shall not pass!'

    # check config limit and change it, if it is greater than maximum allowed limit
    if not configEntry.limit or configEntry.limit > currentAllowRule.maxLimit
      configEntry.limit = currentAllowRule.maxLimit

    # leave only allowed fields in the search fields config
    configEntry.fields = _.intersection currentAllowRule.allowedFields, configEntry.fields

    collection = Mongo.Collection.get(configEntry.collection)

    searchQuery = AntiSearchSource._buildSearchQuery(configEntry)

    queryTransformFn = AntiSearchSource._transforms[configEntry.collection]
    if queryTransformFn then searchQuery = queryTransformFn(Meteor.userId(), searchQuery)

    return collection.find searchQuery, {limit: configEntry.limit}
      .fetch()