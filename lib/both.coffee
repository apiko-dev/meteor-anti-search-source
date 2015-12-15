class AntiSearchSourceClient
  constructor: (@_searchConfig, @_subscriptionContext=Meteor) ->
    @_collection = Mongo.Collection.get(@_searchConfig.collection)
    @_stateFlag = new ReactiveVar(false);
    #make dummy subscription after creating
    @search('')

  _onSubscriptionReady: (err, res) ->
    if err then console.log('Error while searching', err)

  _stateChanged: -> @_stateFlag.set(!@_stateFlag.get())

# Changes search string
  search: (searchString) ->
    if searchString or searchString is ''
      @_searchConfig.searchString = searchString
      @_stateChanged()
    @_searchSubscribtion = @_subscriptionContext.subscribe AntiSearchSource._publisherName, @_searchConfig, @_onSubscriptionReady

  setMongoQuery: (newMongoQuery) ->
    @_searchConfig.mongoQuery = newMongoQuery
    @_stateChanged()
    @_search()

# May be used for infinite scroll or something like that
  setLimit: (newLimit) ->
    @_searchConfig.limit = newLimit
    @_stateChanged()
    # Update subscription
    @search()


# Reactive data source
  searchResult: (options) ->
    @_stateFlag.get()
    if @_searchSubscribtion and @_searchSubscribtion.ready()
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


