@AntiSearchSource.allow = (collectionName, allowRules) ->
  check allowRules,
    maxLimit: Match.Optional(Number)
    securityCheck: Match.Optional(Function)
    allowedFields: Match.Optional([String])
    queryTransform: Match.Optional(Function)

  @_allowRules[collectionName] = allowRules


Meteor.methods
  __makeGlobalSearch: (configEntry) ->
    check configEntry, AntiSearchSource._SearchConfig

    currentAllowRule = AntiSearchSource._allowRules[configEntry.collection]

    unless currentAllowRule
      throw new Meteor.Error 404, 'No anti-search source server configuration exists'

    userId = Meteor.userId()

    # do a security check
    if currentAllowRule.securityCheck and not currentAllowRule.securityCheck.call null, userId, configEntry
      throw new Meteor.Error 403, 'You shall not pass!'

    # check config limit and change it, if it is greater than maximum allowed limit
    if currentAllowRule.maxLimit and (not configEntry.limit or configEntry.limit > currentAllowRule.maxLimit)
      configEntry.limit = currentAllowRule.maxLimit

    if currentAllowRule.allowedFields
      # leave only allowed fields in the search fields config
      configEntry.fields = _.intersection currentAllowRule.allowedFields, configEntry.fields

    collection = Mongo.Collection.get(configEntry.collection)

    searchQuery = AntiSearchSource._buildSearchQuery(configEntry)

    # make query transformation if needed
    if currentAllowRule.queryTransform then searchQuery = currentAllowRule.queryTransform(userId, searchQuery)

    return collection.find searchQuery, {limit: configEntry.limit}
      .fetch()