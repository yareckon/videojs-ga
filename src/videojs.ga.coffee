##
# ga
# https://github.com/mickey/videojs-ga
#
# Copyright (c) 2013 Michael Bensoussan
# Licensed under the MIT license.
##

videojs.plugin 'ga', (options = {}) ->
  # this loads options from the data-setup attribute of the video tag
  dataSetupOptions = {}
  if @options()["data-setup"]
    parsedOptions = JSON.parse(@options()["data-setup"])
    dataSetupOptions = parsedOptions.ga if parsedOptions.ga

  defaultsEventsToTrack = [
    'loaded', 'percentsPlayed', 'start',
    'end', 'seek', 'play', 'pause', 'resize',
    'volumeChange', 'error', 'fullscreen'
  ]
  eventsToTrack = options.eventsToTrack || dataSetupOptions.eventsToTrack || defaultsEventsToTrack
  percentsPlayedInterval = options.percentsPlayedInterval || dataSetupOptions.percentsPlayedInterval || 10

  eventCategory = options.eventCategory || dataSetupOptions.eventCategory || 'Video'
  # if you didn't specify a name, it will be 'guessed' from the video src after metadatas are loaded
  eventLabel = options.eventLabel || dataSetupOptions.eventLabel

  # if debug isn't specified
  options.debug = options.debug || false

  # init a few variables
  percentsAlreadyTracked = []
  seekStart = seekEnd = 0
  seeking = false

  loaded = ->
    unless eventLabel
      eventLabel = @currentSrc().split("/").slice(-1)[0].replace(/\.(\w{3,4})(\?.*)?$/i,'')

    if "loadedmetadata" in eventsToTrack
      sendbeacon( 'loadedmetadata', true )

    return

  timeupdate = ->
    currentTime = Math.round(@currentTime())
    hmsCurrentTime = secondsToHms(currentTime);
    duration = Math.round(@duration())
    percentPlayed = Math.round(currentTime/duration*100)
    currentTimeAlreadyReported = false
    roughSecondsPerInterval = Math.round(duration / ( 100 / percentsPlayedInterval))

    for percent in [0..99] by percentsPlayedInterval
      if percentPlayed >= percent && percent not in percentsAlreadyTracked

        if "start" in eventsToTrack && percent == 0 && percentPlayed > 0
          sendbeacon( 'start', true )
        else if "percentsPlayed" in eventsToTrack && percentPlayed != 0
          paddedpercent = pad(percent, 2)
          if @seeking()
            sendbeacon( "seeked past #{ paddedpercent }%", true )
          else
            if currentTimeAlreadyReported == false
              sendbeacon( "played #{ paddedpercent }% ( #{ hmsCurrentTime } )", true, roughSecondsPerInterval)
              currentTimeAlreadyReported = true
            else
              sendbeacon( "scrubbed past #{ paddedpercent }%", true)

        if percentPlayed > 0
          percentsAlreadyTracked.push(percent)

    if "seek" in eventsToTrack
      seekStart = seekEnd
      seekEnd = currentTime
      # if the difference between the start and the end are greater than 1 it's a seek.
      if Math.abs(seekStart - seekEnd) > 1
        seeking = true
        sendbeacon( 'seek start', false, 0 )
        sendbeacon( 'seek end', false, 0 )
        # allow tracking again, if seeking backwards by removing percents from the percentsAlreadyTracked array
        if seekEnd < seekStart
          removePercentTrackedSlice(seekEnd, seekStart, duration) # yes the order is right
    return

  #scrubbing = ( percent, duration, timecode )->


  removePercentTrackedSlice = (littleTime, bigTime , duration) ->
    littlePercent = Math.round(littleTime/duration*100)
    bigPercent = Math.round(bigTime/duration*100)
    for percent in [0..99] by percentsPlayedInterval
      if littlePercent < percent < bigPercent
        if percent in percentsAlreadyTracked
          # console.log( "removed #{ percent }")
          percentidx = percentsAlreadyTracked.indexOf(percent)
          percentsAlreadyTracked.splice(percentidx, 1)

  end = ->
    sendbeacon( 'end', true )
    return

  play = ->
    currentTime = Math.round(@currentTime())
    sendbeacon( 'play', true, currentTime )
    seeking = false
    return

  pause = ->
    currentTime = Math.round(@currentTime())
    duration = Math.round(@duration())
    if currentTime != duration && !seeking
      sendbeacon( 'pause', false, currentTime )
    return

  # value between 0 (muted) and 1
  volumeChange = ->
    volume = if @muted() == true then 0 else @volume()
    sendbeacon( 'volume change', false, volume )
    return

  resize = ->
    sendbeacon( 'resize - ' + @width() + "*" + @height(), true )
    return

  error = ->
    currentTime = Math.round(@currentTime())
    # XXX: Is there some informations about the error somewhere ?
    sendbeacon( 'error', true, currentTime )
    return

  fullscreen = ->
    currentTime = Math.round(@currentTime())
    if @isFullscreen?() || @isFullScreen?()
      sendbeacon( 'enter fullscreen', false, currentTime )
    else
      sendbeacon( 'exit fullscreen', false, currentTime )
    return

  pad = ( number, padTo ) ->
    padZeros = padTo - 1
    if number <  Math.pow(10, padZeros)
      padded = stringrepeat("0", padZeros) + number
    else
      padded = "" + number
    return padded

  # thanks http://coffeescript.org/documentation/docs/helpers.html
  stringrepeat = ( pattern, repeatTimes ) ->
    res = ''
    while repeatTimes > 0
      res += pattern if repeatTimes & 1
      repeatTimes >>>= 1
      pattern += pattern
    return res

  secondsToHms = (d) ->
    d = Number(d)
    h = Math.floor(d / 3600)
    m = Math.floor(d % 3600 / 60)
    s = Math.floor(d % 3600 % 60)
    if h > 0
      res = pad(h, 2) + ':' + pad(m, 2) + ':' + pad(s, 2)
    else
      res = pad(m, 2) + ':' + pad(s, 2)
    return res

  sendbeacon = ( action, nonInteraction, value ) ->
    # console.log action, " ", nonInteraction, " ", value
    if window.ga
      ga 'send', 'event',
        'eventCategory' 	: eventCategory
        'eventAction'		  : action
        'eventLabel'		  : eventLabel
        'eventValue'      : value
        'nonInteraction'	: nonInteraction
    else if window._gaq
      _gaq.push(['_trackEvent', eventCategory, action, eventLabel, value, nonInteraction])
    else if options.debug
      console.log("Google Analytics not detected")
    return

  @ready ->
    @on("loadedmetadata", loaded)
    @on("timeupdate", timeupdate)
    @on("ended", end) if "end" in eventsToTrack
    @on("play", play) if "play" in eventsToTrack
    @on("pause", pause) if "pause" in eventsToTrack
    @on("volumechange", volumeChange) if "volumeChange" in eventsToTrack
    @on("resize", resize) if "resize" in eventsToTrack
    @on("error", error) if "error" in eventsToTrack
    @on("fullscreenchange", fullscreen) if "fullscreen" in eventsToTrack

  return 'sendbeacon': sendbeacon
