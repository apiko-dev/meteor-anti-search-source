Meteor.publish AntiSearchSource._publisherName, (configEntry) ->
  check configEntry, AntiSearchSource._SearchConfig

  currentAllowRule = AntiSearchSource._allowRules[configEntry.collection]
  # security check
  if currentAllowRule
    unless currentAllowRule.call null, @userId, configEntry
      return

  collection = Mongo.Collection.get(configEntry.collection)

  searchQuery = AntiSearchSource._buildSearchQuery(configEntry)

  queryTranformFn = AntiSearchSource._transforms[configEntry.collection]
  if queryTranformFn then searchQuery = queryTranformFn(@userId, searchQuery)

  cursor = collection.find searchQuery, {limit: configEntry.limit}
  return cursor