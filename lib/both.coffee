class AntiSearchSourceClient
  constructor: (@_searchConfig, @subscriptionContext=Meteor) ->
    @_collection = new Mongo.Collection(@_searchConfig.collection)
    #make dummy subscription after creating
    @search('')

# Changes search string
  search: (searchString) ->
    @_searchConfig.searchString = searchString
    @_searchSubscribtion = @subscriptionContext.subscribe AntiSearchSource._publisherName, @_searchConfig

# Reactive data source
  searchResult: ->
    if @_searchSubscribtion and @_searchSubscribtion.ready()
      query = AntiSearchSource._buildSearchQuery(@_searchConfig)
      return @_collection.find(query, {limit: @_searchConfig.limit})

# Cancels subscription for search data
  destroy: () -> @_searchSubscribtion.stop()


@AntiSearchSource =
  _publisherName: '__antiSearchSourcePublisher'
  _allowRules: {}

  _escapeRegExpStr: (str) -> str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&")

  _buildSearchQuery: (configEntry) ->
    searchQuery = _.extend {}, configEntry.mongoQuery

    if configEntry.searchString
      escapedSearchString = @_escapeRegExpStr(configEntry.searchString)
      searchQuery.$or = []
      configEntry.fields.forEach (fieldName) ->
        $orEntry = {}
        $orEntry[fieldName] = {$regex: escapedSearchString, $options: 'ig'}
        searchQuery.$or.push $orEntry

    return searchQuery

  allow: (collectionName, allowCallback) ->
    @_allowRules[collectionName] = allowCallback;

  create: (config) -> new AntiSearchSourceClient(config)


Blaze.TemplateInstance.prototype.AntiSearchSource =
  create: (config) -> new AntiSearchSourceClient(config, this)