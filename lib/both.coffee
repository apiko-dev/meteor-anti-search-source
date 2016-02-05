class AntiSearchSourceClient
  constructor: (@_searchConfig, @_subscriptionContext = Meteor) ->
    @_searchConfig.limit = @_searchConfig.limit || 0

    collection = @_searchConfig.collection
    @_collection = if _.isString collection then Mongo.Collection.get(collection) else collection
    @_searchConfig.collection = if _.isString collection then collection else collection._name

    @_searchDep = new Tracker.Dependency();
    #make dummy subscription after creating
    @search('')

  _onSubscriptionReady: (err, res) ->
    if err then console.log('Error while searching', err)

  _createTransformFn: (usersTransform) ->
    transformFn = (document) =>
      searchStr = @_searchConfig.searchString
      if searchStr
        searchStrRegExp = new RegExp(searchStr, 'ig')
        @_searchConfig.fields.forEach (fieldName) =>
          document[fieldName] = usersTransform(document[fieldName], searchStrRegExp)
      return document

    if _.isFunction usersTransform then transformFn else null

  _updateQuery: ->
    @_searchDep.changed()
    @search()

# Changes search string
  search: (searchString) ->
    if searchString or searchString is ''
      @_searchConfig.searchString = searchString
      @_searchDep.changed()

    if @_searchConfig.searchMode is 'subscription'
      @_searchSubscribtion = @_subscriptionContext.subscribe AntiSearchSource._publisherName, @_searchConfig, @_onSubscriptionReady

  setMongoQuery: (newMongoQuery) ->
    unless _.isEqual newMongoQuery, @_searchConfig.mongoQuery
      @_searchConfig.mongoQuery = newMongoQuery
      @_updateQuery()

# May be used for infinite scroll or something like that
  setLimit: (newLimit) ->
    unless @_searchConfig.limit == newLimit
      @_searchConfig.limit = newLimit
      @_updateQuery()

  incrementLimit: (step = 10) ->
    @_searchConfig.limit += step
    @_updateQuery()

# Reactive data source
  searchResult: (options = {}) ->
    @_searchDep.depend()
    if @_searchConfig.searchMode is 'local' or @_searchSubscribtion and @_searchSubscribtion.ready()
      query = AntiSearchSource._buildSearchQuery(@_searchConfig)
      _.extend options,
        limit: @_searchConfig.limit
        transform: @_createTransformFn(options.transform)

      return @_collection.find(query, options)

# Cancels subscription for search data
  destroy: () -> @_searchSubscribtion.stop()


@AntiSearchSource =
  _publisherName: '__antiSearchSourcePublisher'
  _allowRules: {}
  _transforms: {}

  _clientProto: AntiSearchSourceClient

  _SearchConfig: Match.Where (config) ->
    check config,
      collection: String
      fields: [String]
      searchString: Match.Optional(String)
      mongoQuery: Match.Optional(Object)
      limit: Match.Optional(Number)
    return true

  _escapeRegExpStr: (str) -> str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&")

  _buildSearchQuery: (configEntry) ->
    searchStringQueries = false
    if configEntry.searchString
      escapedSearchString = @_escapeRegExpStr(configEntry.searchString)
      searchStringQueries = configEntry.fields.map (fieldName) ->
        $orEntry = {}
        $orEntry[fieldName] = {$regex: escapedSearchString, $options: 'i'}
        return $orEntry

    searchQuery = {
      $and: [
        _.extend {}, configEntry.mongoQuery
      ]
    }

    if _.isArray searchStringQueries then searchQuery.$and.push {$or: searchStringQueries}

    return searchQuery

  allow: (collectionName, allowCallback) ->
    @_allowRules[collectionName] = allowCallback;

  queryTransform: (collectionName, transformCallback) ->
    @_transforms[collectionName] = transformCallback

  create: (config) -> new AntiSearchSourceClient(config)