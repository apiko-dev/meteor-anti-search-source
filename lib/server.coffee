Meteor.publish AntiSearchSource._publisherName, (configEntry) ->
  check configEntry, AntiSearchSource._SearchConfig

  currentAllowRule = AntiSearchSource._allowRules[configEntry.collection]
  # security check
  if currentAllowRule
    unless currentAllowRule.call null, @userId, configEntry
      return

  collection = Mongo.Collection.get(configEntry.collection)

  searchQuery = AntiSearchSource._buildSearchQuery(configEntry)

  cursor = collection.find searchQuery, {limit: configEntry.limit}

  return cursor