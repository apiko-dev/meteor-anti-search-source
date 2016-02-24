Meteor.methods
  makeGlobalSearch: (configEntry) ->
    collection = Mongo.Collection.get(configEntry.collection)

    searchQuery = AntiSearchSource._buildSearchQuery(configEntry)

    queryTransformFn = AntiSearchSource._transforms[configEntry.collection]
    if queryTransformFn then searchQuery = queryTransformFn(Meteor.userId, searchQuery)

    return collection.find searchQuery, {limit: configEntry.limit}
      .fetch()