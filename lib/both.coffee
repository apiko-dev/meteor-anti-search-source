class AntiSearchSourceClient
  constructor: (@_searchConfig, @_subscriptionContext = Meteor) ->
    @_searchConfig.limit = @_searchConfig.limit || 21

    @_collection = Mongo.Collection.get(@_searchConfig.collection)
    @_stateFlag = new ReactiveVar(false);
    #make dummy subscription after creating
    @search('')

  _onSubscriptionReady: (err, res) ->
    if err then console.log('Error while searching', err)

  _stateChanged: -> @_stateFlag.set(!@_stateFlag.get())

  _updateQuery: ->
    @_stateChanged()
    @search()

# Changes search string
  search: (searchString) ->
    if searchString or searchString is ''
      @_searchConfig.searchString = searchString
      @_stateChanged()

    if @_searchConfig.searchMode is 'subscription'
      @_searchSubscribtion = @_subscriptionContext.subscribe AntiSearchSource._publisherName, @_searchConfig, @_onSubscriptionReady

  setMongoQuery: (newMongoQuery) ->
    if _.isEqual newMongoQuery, @_searchConfig.mongoQuery
      return
    else
      @_searchConfig.mongoQuery = newMongoQuery

      @_updateQuery()

# May be used for infinite scroll or something like that
  setLimit: (newLimit) ->
    if @_searchConfig.limit == newLimit
      return
    else
    @_searchConfig.limit = newLimit

    @_updateQuery()

  incrementLimit: (step = 10) ->
    @_searchConfig.limit += step

    @_updateQuery()


# Reactive data source
  searchResult: (options = {}) ->
    @_stateFlag.get()
    if @_searchConfig.searchMode is 'local' or @_searchSubscribtion and @_searchSubscribtion.ready()
      query = AntiSearchSource._buildSearchQuery(@_searchConfig)
      _.extend options, {limit: @_searchConfig.limit}
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
    searchQuery = _.extend {}, configEntry.mongoQuery

    if configEntry.searchString
      escapedSearchString = @_escapeRegExpStr(configEntry.searchString)
      searchQuery.$or = []
      configEntry.fields.forEach (fieldName) ->
        $orEntry = {}
        $orEntry[fieldName] = {$regex: escapedSearchString, $options: 'i'}
        searchQuery.$or.push $orEntry

    return searchQuery

  allow: (collectionName, allowCallback) ->
    @_allowRules[collectionName] = allowCallback;

  queryTransform: (collectionName, transformCallback) ->
    @_transforms[collectionName] = transformCallback

  create: (config) -> new AntiSearchSourceClient(config)


