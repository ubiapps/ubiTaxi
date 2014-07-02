if (typeof ubitaxi === "undefined" || typeof ubitaxi.UbiSocket === "undefined" || typeof ubitaxi.jobAPI === "undefined" || typeof WebinosConnection === "undefined") {
  console.error("ubitaxi modules missing");
} else {
  (function() {
    var statusText = {
      onRoute: "On Route",
      pickedUp: "Picked Up",
      droppedOff: "Dropped Off"
    }
    var statusMessages = {
      offline: "Offline - waiting for re-connection to zone...",
      connectingToUbiTaxi: "Connecting to UbiTaxi server...",
      synchronising: "Synchronising...",
      jobAllocated:  "Sorry - job already allocated",
      ubiTaxiConnectionFailure: "Problem connecting to UbiTaxi server",
      PZHConnected: "webinos connected",
      PZHDisconnected: "webinos disconnected",
      usingOfflineCache: "Offline"
    };

    function formatDate(time) {
      var t = new Date(time);
      var now = new Date();
      var result;
      if (t.toDateString() === now.toDateString()) {
        result = t.getHours() + ":" + ("00" + t.getMinutes()).substr(-2);
      } else {
        result = t.toDateString() + " " +  t.getHours() + ":" + ("00" + t.getMinutes()).substr(-2);
      }
  
      return result;
    }
  
    function addJobListItem(job,takeJob) {
      var li = "<li>";
      if (takeJob) {
          li = li + "<div style='float:right;' ><a id='j-" + job.id  + "' class='takeJob' data-inline='true' data-role='button' href='#'>take job</a></div>";
      }
  
      li = li + "<div class='jobDetail'><span class='detailEmphasis'>" + job.name + "</span> (<a href='tel:" + job.contact + "'>" + job.contact + "</a>)</div>" +
      "<div class='jobDetail'>from <span class='detailEmphasis'>" + job.pickup + "</span></div>" +
           "<div class='jobDetail'>to <span class='detailEmphasis'>" + job.dropoff + "</span></div>" +
      "<div class='jobDetail'>" + job.people + (job.people == 1 ? " person" : " people") + ", pickup at <span class='detailEmphasis'>"  + formatDate(job.time) + "</span></div>";
  
      return li;
    }
  
    function showFeedback(msg) {
      var list;
      switch ($.mobile.activePage.attr('id')) {
        case "detail-page":
          list = "#currentJobList";
          break;
        case "available-page":
          list = "#availableJobList";
          break;
        case "allocated-page":
          list = "#allocatedJobList";
          break;
        case "welcome-page":
          list = "#welcomeJobList";
          break;
        case "map-page":
          // No list on map page.
          break;
        default:
          console.error("unknown page in showFeedback");
          break;
      }

      if (typeof list !== "undefined") {
        $(list).html("");
        $(list).append("<li>" + msg + "</li>");
        $(list).listview("refresh");
      }
      setStatus(msg);
    }
  
    function setStatus(msg) {
      if (!msg || msg.length === 0) {
        if (connection.isOnline()) {
          $(".statusText").html(webinos.session.getPZPId() + (ubitaxiWebSocket ? " [ws]" : " [jsonp]"));
  
        } else {
          $(".statusText").html(statusMessages.usingOfflineCache);
        }
      } else {
          $(".statusText").html(msg);
      }
    }
  
    function takeJob(jobId) {
      getLocation(function(err, loc) {
        if (err) {
          setStatus("Failed to get location: " + err.message);
          // REVIEW - allocate job anyway using bad location?
          loc = { coords: { latitude: 0.0, longitude: 0.0 }};
        }
          ubitaxi.jobAPI.allocateJob(jobId,webinos.session.getPZHId(), loc.coords.latitude, loc.coords.longitude, function(err,allocated) {
            if (err) {
              if (err === "offline") {
                showFeedback(statusMessages.offline);
              } else {
                showFeedback(err);
              }
            } else {
              if (allocated) {
                window.location = "#allocated-page";
              } else {
                showFeedback(statusMessages.jobAllocated);
                setTimeout(loadAvailableJobs,4000);
              }
            }
          });
      });
    }
  
    function displayAvailableJobs(jobList) {
      $("#availableJobList").html("");
      if (jobList.length > 0) {
        for (var j in jobList) {
          var listItem = addJobListItem(jobList[j],true);
          $("#availableJobList").append(listItem).trigger("create");
        }
      } else {
        $("#availableJobList").append("<li>No jobs currently available</li>");
      }
      $("#availableJobList").listview("refresh");
  
      $('.takeJob').on('click',function() {
        $(this).addClass("ui-disabled");
        $(this).find(".ui-btn-text").text("Updating...");
        var jobId = parseInt(this.id.split('-')[1]);
        takeJob(jobId);
        return false;
      });
  
      setStatus();
    }
  
    function loadAvailableJobs() {
      showFeedback(statusMessages.connectingToUbiTaxi);
      ubitaxi.jobAPI.pendingJobs(function(err, data) {
        if (err) {
          if (err === "offline") {
            showFeedback(statusMessages.offline);
          } else {
            showFeedback(err);
          }
        } else {
          displayAvailableJobs(data);
        }
      });
    }
  
    function displayAllocatedJobs(jobList) {
      $("#allocatedJobList").html("");
      if (jobList.length > 0) {
        for (var j in jobList) {
          var li = addJobListItem(jobList[j],false);
          $("#allocatedJobList").append(li).trigger("create");
        }
      } else {
        $("#allocatedJobList").append("<li>No jobs currently pending</li>");
      }
      $("#allocatedJobList").listview("refresh");
      setStatus();
    }
  
    function loadAllocatedJobs() {
      showFeedback(statusMessages.connectingToUbiTaxi);
      ubitaxi.jobAPI.allocatedJobs(webinos.session.getPZHId(), function(err,data) {
        if (err) {
          showFeedback(err);
        } else {
          displayAllocatedJobs(data);
        }
      });
    }
  
    function displayCurrentJob(data) {
      $("#currentJobList").html("");
      if (data != null) {
        $("#currentJobId").val(data.id);

        $("#currentJobList").append("<li>Status: " + ubitaxi.jobs.getJobStatus(data) + "</li>");
        var li = addJobListItem(data,false);
        $("#currentJobList").append(li).trigger("create");

        $("#statusBtn").show();

        switch (ubitaxi.jobs.getJobStatus(data)) {
          case "driver allocated":
            $("#statusBtn .ui-btn-text").text(statusText.onRoute);
            $("#statusBtn").removeClass("ui-disabled");
            break;
          case "on route":
            $("#statusBtn .ui-btn-text").text(statusText.pickedUp);
            $("#statusBtn").removeClass("ui-disabled");
            break;
          case "picked up":
            $("#statusBtn .ui-btn-text").text(statusText.droppedOff);
            $("#statusBtn").removeClass("ui-disabled");
            break;
        }
      } else {
        $("#currentJobId").val("");
        $("#currentJobList").html("");
        $("#currentJobList").append("<li>No jobs currently pending</li>");
        $("#statusBtn").addClass("ui-disabled");
        $("#statusBtn").hide();
      }
      $("#currentJobList").listview("refresh");
      setStatus();
    }
  
    function loadCurrentJob() {
      showFeedback(statusMessages.connectingToUbiTaxi);
      ubitaxi.jobAPI.currentJob(webinos.session.getPZHId(), function(err,data) {
        if (err) {
          showFeedback(err);
        } else {
          displayCurrentJob(data);
        }
      });
    }

    function showMapMessage(msg) {
      if (typeof msg !== "undefined" && msg.length > 0) {
        var ul = '<ul data-role="listview">\
            <li>' + msg + '</li>\
          </ul>';

        $("#map-container").hide();
        $("#map-feedback").show();
        $("#map-feedback").html("");
        $("#map-feedback").append(ul).trigger("create");
      } else {
        $("#map-container").show();
        $("#map-feedback").hide();
      }
      setStatus();
    }

    function displayJobMap(job) {
      if (job === null || job.pickup.length === 0 || job.dropoff.length === 0) {
        showMapMessage("No jobs currently pending");
      } else {
        $("#map-feedback").hide();
        $("#map-container").show();
        var headerHeight = $("#map-page-header").outerHeight();
        $("#map-container").css("top",headerHeight + "px");
        var footerTop = $("#map-page-footer").offset().top;
        $("#map-container").css("height", (footerTop - headerHeight) + "px");
        ubitaxi.directions.showRoute(job.pickup,job.dropoff);
        setStatus();
      }
    }

    function loadMapPage() {
      if (connection.isOnline()) {
        showFeedback(statusMessages.connectingToUbiTaxi);
        ubitaxi.jobAPI.currentJob(webinos.session.getPZHId(), function(err,data) {
          if (err) {
            showFeedback(err);
          } else {
            displayJobMap(data);
          }
        });
      } else {
        showMapMessage("Maps not available when offline");
      }
    }

    function getLocation(cb) {
      webinosServices.findService("http://webinos.org/api/w3c/geolocation", function(err, service) {
          if (err) {
            setStatus("findService failed: " + err.message);
          } else {
            var PositionOptions = {};
            PositionOptions.enableHighAccuracy = true;
            PositionOptions.maximumAge = 5000;
            PositionOptions.timeout = 1000;

            service.getCurrentPosition(function(loc) { cb(null,loc); }, function(err) { cb(err,null); },PositionOptions);
          }
        },
        webinos.session.getPZPId());
    }

    function updateJobProgress(status) {
      var jobId = parseInt($("#currentJobId").val());
      getLocation(function(err, loc) {
        if (err) {
          setStatus("Failed to get location: " + err.message);

          // REVIEW - Update anyway, using invalid location?
          loc = { coords: { latitude: 0.0, longitude: 0.0 }};
        }

          var time = (new Date()).getTime();
          ubitaxi.jobAPI.updateJobProgress(jobId, status, time, loc.coords.latitude, loc.coords.longitude, function(err,data) {
            if (err) {
              showFeedback(err);
            } else {
              loadCurrentJob();
            }
          });
      });
    }

    function initDetailPage() {
      loadCurrentJob();
    }
  
    function initAvailablePage() {
      loadAvailableJobs();
    }
  
    function initAllocatedPage() {
      loadAllocatedJobs();
    }

    function initMapPage() {
      loadMapPage();
    }
  
    function updateCurrentView() {
      switch ($.mobile.activePage.attr('id')) {
        case "detail-page":
          initDetailPage();
          break;
        case "map-page":
          initMapPage();
          break;
        case "available-page":
          initAvailablePage();
          break;
        case "allocated-page":
          initAllocatedPage();
          break;
        default:
          break;
      }
    }
  
    function connectionOnline() {
      if (ubitaxiWebSocket && !ubitaxiWebSocket.isConnected()) {
        setStatus(statusMessages.connectingToUbiTaxi)
        ubitaxiWebSocket.connect(6661,function(ok) {
          if (ok) {
            // Timeout for visual effect.
            showFeedback(statusMessages.synchronising);
            setTimeout(function() { ubitaxi.jobAPI.synchronise(updateCurrentView); },2000);
          } else {
            showFeedback(statusMessages.ubiTaxiConnectionFailure);
            updateCurrentView();
          }
        });
      } else {
        // Timeout for visual effect.
        showFeedback(statusMessages.synchronising);
        setTimeout(function() { ubitaxi.jobAPI.synchronise(updateCurrentView); },2000);
      }
    }
  
    function connectionOffline() {
      if (ubitaxiWebSocket && ubitaxiWebSocket.isConnected()) {
        ubitaxiWebSocket.close();
      }
      updateCurrentView();
    }

    // Initialise webinos connection.
    var connection = new WebinosConnection();
    connection.addListener("online", connectionOnline);
    connection.addListener("offline", connectionOffline);
    connection.start();

    // Initialise connection to ubitaxi job server.
    var ubitaxiWebSocket;
    // We need this as some Samsung Galaxy phones incorrectly report websocket support.
    var isAndroid = navigator.userAgent.match(/Android/i) != null;
    if (!isAndroid && ("WebSocket" in window)) {
      ubitaxiWebSocket = new ubitaxi.UbiSocket();
    }

    ubitaxi.jobAPI.initialise(connection,ubitaxiWebSocket);

    $(document).on("pageinit",'#welcome-page',function() {
      setTimeout(function() { window.location = "#detail-page"; }, 2000);
    });

    // Set up some jqm defaults - must be done before inclusion of jquery mobile script.
    $(document).on("mobileinit", function(){
      $.mobile.popup.prototype.options.history = false;
      $.mobile.defaultPageTransition = "flip";
      $.mobile.page.prototype.options.headerTheme = "a";
      $.mobile.page.prototype.options.contentTheme    = "e";
      $.mobile.page.prototype.options.footerTheme = "a";
    });

    $(function()  {
      // Initialise 'current' page.
      $('#detail-page').on('pageshow',initDetailPage);

      // Initialise 'available' page.
      $('#available-page').on('pageshow', initAvailablePage);

      // Initialise 'pending' page.
      $('#allocated-page').on('pageshow',initAllocatedPage);

      // Initialise 'map' page.
      $('#map-page').on('pageshow',initMapPage)

      $("#statusBtn").click(function() {
        var currentStatus = $(this).text();
        $("#statusBtn").addClass("ui-disabled");
        $("#statusBtn .ui-btn-text").text("Updating...");
        switch (currentStatus) {
          case statusText.onRoute:
            updateJobProgress(ubitaxi.jobs.jobStatusLookup[ubitaxi.jobs.STATUS_ON_ROUTE]);
            break;
          case statusText.pickedUp:
            updateJobProgress(ubitaxi.jobs.jobStatusLookup[ubitaxi.jobs.STATUS_PICKED_UP]);
            break;
          case statusText.droppedOff:
            updateJobProgress(ubitaxi.jobs.jobStatusLookup[ubitaxi.jobs.STATUS_DROPPED_OFF]);
            break;
        }

        return false;
      });
    });

  }());
}
