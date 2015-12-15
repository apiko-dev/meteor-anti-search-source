Meteor.publish @AntiSearchSource._publisherName, (configEntry) ->
  check configEntry, {
    collection: String
    fields: [String]
    searchString: Match.Optional(String)
    mongoQuery: Match.Optional(Object)
    limit: Match.Optional(Number)
  }

  currentAllowRule = AntiSearchSource._allowRules[configEntry.collection]
  # security check
  if currentAllowRule
    unless currentAllowRule.call null, @userId, configEntry
      return

  collection = new Mongo.Collection(configEntry.collection)

  searchQuery = AntiSearchSource._buildSearchQuery(configEntry)

  return collection.find searchQuery, {limit: configEntry.limit}