/*
* videojs-ga - v0.4.2 - 2017-01-31
* Copyright (c) 2017 Michael Bensoussan
* Licensed MIT
*/
(function() {
  var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  videojs.plugin('ga', function(options) {
    var dataSetupOptions, defaultsEventsToTrack, end, error, eventCategory, eventLabel, eventsToTrack, fullscreen, loaded, pad, parsedOptions, pause, percentsAlreadyTracked, percentsPlayedInterval, play, removePercentTrackedSlice, resize, secondsToHms, seekEnd, seekStart, seeking, sendbeacon, stringrepeat, timeupdate, volumeChange;
    if (options == null) {
      options = {};
    }
    dataSetupOptions = {};
    if (this.options()["data-setup"]) {
      parsedOptions = JSON.parse(this.options()["data-setup"]);
      if (parsedOptions.ga) {
        dataSetupOptions = parsedOptions.ga;
      }
    }
    defaultsEventsToTrack = ['loaded', 'percentsPlayed', 'start', 'end', 'seek', 'play', 'pause', 'resize', 'volumeChange', 'error', 'fullscreen'];
    eventsToTrack = options.eventsToTrack || dataSetupOptions.eventsToTrack || defaultsEventsToTrack;
    percentsPlayedInterval = options.percentsPlayedInterval || dataSetupOptions.percentsPlayedInterval || 10;
    eventCategory = options.eventCategory || dataSetupOptions.eventCategory || 'Video';
    eventLabel = options.eventLabel || dataSetupOptions.eventLabel;
    options.debug = options.debug || false;
    percentsAlreadyTracked = [];
    seekStart = seekEnd = 0;
    seeking = false;
    loaded = function() {
      if (!eventLabel) {
        eventLabel = this.currentSrc().split("/").slice(-1)[0].replace(/\.(\w{3,4})(\?.*)?$/i, '');
      }
      if (__indexOf.call(eventsToTrack, "loadedmetadata") >= 0) {
        sendbeacon('loadedmetadata', true);
      }
    };
    timeupdate = function() {
      var currentTime, currentTimeAlreadyReported, duration, hmsCurrentTime, paddedpercent, percent, percentPlayed, roughSecondsPerInterval, _i;
      currentTime = Math.round(this.currentTime());
      hmsCurrentTime = secondsToHms(currentTime);
      duration = Math.round(this.duration());
      percentPlayed = Math.round(currentTime / duration * 100);
      currentTimeAlreadyReported = false;
      roughSecondsPerInterval = Math.round(duration / (100 / percentsPlayedInterval));
      for (percent = _i = 0; _i <= 99; percent = _i += percentsPlayedInterval) {
        if (percentPlayed >= percent && __indexOf.call(percentsAlreadyTracked, percent) < 0) {
          if (__indexOf.call(eventsToTrack, "start") >= 0 && percent === 0 && percentPlayed > 0) {
            sendbeacon('start', true);
          } else if (__indexOf.call(eventsToTrack, "percentsPlayed") >= 0 && percentPlayed !== 0) {
            paddedpercent = pad(percent, 2);
            if (this.seeking()) {
              sendbeacon("seeked past " + paddedpercent + "%", true);
            } else {
              if (currentTimeAlreadyReported === false) {
                sendbeacon("played " + paddedpercent + "% ( " + hmsCurrentTime + " )", true, roughSecondsPerInterval);
                currentTimeAlreadyReported = true;
              } else {
                sendbeacon("scrubbed past " + paddedpercent + "%", true);
              }
            }
          }
          if (percentPlayed > 0) {
            percentsAlreadyTracked.push(percent);
          }
        }
      }
      if (__indexOf.call(eventsToTrack, "seek") >= 0) {
        seekStart = seekEnd;
        seekEnd = currentTime;
        if (Math.abs(seekStart - seekEnd) > 1) {
          seeking = true;
          sendbeacon('seek start', false, 0);
          sendbeacon('seek end', false, 0);
          if (seekEnd < seekStart) {
            removePercentTrackedSlice(seekEnd, seekStart, duration);
          }
        }
      }
    };
    removePercentTrackedSlice = function(littleTime, bigTime, duration) {
      var bigPercent, littlePercent, percent, percentidx, _i, _results;
      littlePercent = Math.round(littleTime / duration * 100);
      bigPercent = Math.round(bigTime / duration * 100);
      _results = [];
      for (percent = _i = 0; _i <= 99; percent = _i += percentsPlayedInterval) {
        if ((littlePercent < percent && percent < bigPercent)) {
          if (__indexOf.call(percentsAlreadyTracked, percent) >= 0) {
            percentidx = percentsAlreadyTracked.indexOf(percent);
            _results.push(percentsAlreadyTracked.splice(percentidx, 1));
          } else {
            _results.push(void 0);
          }
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };
    end = function() {
      sendbeacon('end', true);
    };
    play = function() {
      var currentTime;
      currentTime = Math.round(this.currentTime());
      sendbeacon('play', true, currentTime);
      seeking = false;
    };
    pause = function() {
      var currentTime, duration;
      currentTime = Math.round(this.currentTime());
      duration = Math.round(this.duration());
      if (currentTime !== duration && !seeking) {
        sendbeacon('pause', false, currentTime);
      }
    };
    volumeChange = function() {
      var volume;
      volume = this.muted() === true ? 0 : this.volume();
      sendbeacon('volume change', false, volume);
    };
    resize = function() {
      sendbeacon('resize - ' + this.width() + "*" + this.height(), true);
    };
    error = function() {
      var currentTime;
      currentTime = Math.round(this.currentTime());
      sendbeacon('error', true, currentTime);
    };
    fullscreen = function() {
      var currentTime;
      currentTime = Math.round(this.currentTime());
      if ((typeof this.isFullscreen === "function" ? this.isFullscreen() : void 0) || (typeof this.isFullScreen === "function" ? this.isFullScreen() : void 0)) {
        sendbeacon('enter fullscreen', false, currentTime);
      } else {
        sendbeacon('exit fullscreen', false, currentTime);
      }
    };
    pad = function(number, padTo) {
      var padZeros, padded;
      padZeros = padTo - 1;
      if (number < Math.pow(10, padZeros)) {
        padded = stringrepeat("0", padZeros) + number;
      } else {
        padded = "" + number;
      }
      return padded;
    };
    stringrepeat = function(pattern, repeatTimes) {
      var res;
      res = '';
      while (repeatTimes > 0) {
        if (repeatTimes & 1) {
          res += pattern;
        }
        repeatTimes >>>= 1;
        pattern += pattern;
      }
      return res;
    };
    secondsToHms = function(d) {
      var h, m, res, s;
      d = Number(d);
      h = Math.floor(d / 3600);
      m = Math.floor(d % 3600 / 60);
      s = Math.floor(d % 3600 % 60);
      if (h > 0) {
        res = pad(h, 2) + ':' + pad(m, 2) + ':' + pad(s, 2);
      } else {
        res = pad(m, 2) + ':' + pad(s, 2);
      }
      return res;
    };
    sendbeacon = function(action, nonInteraction, value) {
      if (window.dataLayer) {
        dataLayer.push({
          'eventCategory': eventCategory,
          'eventAction': action,
          'eventLabel': eventLabel,
          'eventValue': value,
          'event': 'videojs'
        });
      } else if (window.ga) {
        ga('set', 'nonInteraction', nonInteraction);
        ga('send', 'event', {
          'eventCategory': eventCategory,
          'eventAction': action,
          'eventLabel': eventLabel,
          'eventValue': value
        });
      } else if (window._gaq) {
        _gaq.push(['_trackEvent', eventCategory, action, eventLabel, value, nonInteraction]);
      } else if (options.debug) {
        console.log("Google Analytics not detected");
      }
    };
    this.ready(function() {
      this.on("loadedmetadata", loaded);
      this.on("timeupdate", timeupdate);
      if (__indexOf.call(eventsToTrack, "end") >= 0) {
        this.on("ended", end);
      }
      if (__indexOf.call(eventsToTrack, "play") >= 0) {
        this.on("play", play);
      }
      if (__indexOf.call(eventsToTrack, "pause") >= 0) {
        this.on("pause", pause);
      }
      if (__indexOf.call(eventsToTrack, "volumeChange") >= 0) {
        this.on("volumechange", volumeChange);
      }
      if (__indexOf.call(eventsToTrack, "resize") >= 0) {
        this.on("resize", resize);
      }
      if (__indexOf.call(eventsToTrack, "error") >= 0) {
        this.on("error", error);
      }
      if (__indexOf.call(eventsToTrack, "fullscreen") >= 0) {
        return this.on("fullscreenchange", fullscreen);
      }
    });
    return {
      'sendbeacon': sendbeacon
    };
  });

}).call(this);
