class AntiSearchSourceClient
  constructor: (@_searchConfig) ->
    @_searchConfig.limit = @_searchConfig.limit || 0

    collection = @_searchConfig.collection
    @_collection = if _.isString collection then Mongo.Collection.get(collection) else collection
    @_searchConfig.collection = if _.isString collection then collection else collection._name

    @_searchDep = new Tracker.Dependency();
    #make dummy search after creating
    @search('')


  _onSearchComplete: (err, res) =>
    if err
      console.log('Error while searching', err)
    else
      @_searchResult = res

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

    if @_searchConfig.searchMode is 'global'
      Meteor.call 'makeGlobalSearch', @_searchConfig, @_onSearchComplete

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
    if @_searchConfig.searchMode is 'local'
      query = AntiSearchSource._buildSearchQuery(@_searchConfig)
      _.extend options,
        limit: @_searchConfig.limit
        transform: @_createTransformFn(options.transform)

      return @_collection.find(query, options)

    else
      return @_searchResult

@AntiSearchSource =
  _publisherName: '__antiSearchSourcePublisher'
  _transforms: {}

  _clientProto: AntiSearchSourceClient

  _SearchConfig: Match.Where (config) ->
    check config,
      collection: String
      fields: [String]
      searchString: Match.Optional(String)
      mongoQuery: Match.Optional(Object)
      limit: Match.Optional(Number),
      searchMode: String
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

  queryTransform: (collectionName, transformCallback) ->
    @_transforms[collectionName] = transformCallback

  create: (config) -> new AntiSearchSourceClient(config)