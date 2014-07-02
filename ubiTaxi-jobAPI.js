if (typeof ubitaxi === "undefined" || typeof ubitaxi.jobs === "undefined" || typeof ubitaxi.LocalCache === "undefined" || typeof secureStorage === "undefined") {
  console.error("required ubitaxi modules missing");
} else {
  (function ubiTaxiJobAPI(exports) {
    var jsonpTimeout = 5000;
    var serverAddy = "http://pzh.ubiapps.com:8050/";
//    var serverAddy = "http://192.168.1.81:8050/";
    var connection;
    var websocket = null;

    var api = {};

    // Set local cache store backing - localStorage/sessionStorage/secureStorage
    var localCache = new ubitaxi.LocalCache(secureStorage);
    ubitaxi.jobs.initialise(localCache);

    api.initialise = function(connection_,socket_) {
      websocket = socket_;
      connection = connection_;
    }

    api.allocateJob = function(jobId, driverId, lat, lng, cb) {
      var time = (new Date()).getTime();
      if (connection.isOnline()) {
        function success(allocatedJob) {
          if (allocatedJob) {
            // Sync local cache.
            ubitaxi.jobs.addJob(allocatedJob);
            ubitaxi.jobs.allocateDriver(jobId, driverId, time, lat, lng);
          }
          cb(null,allocatedJob);
        }
        if (websocket) {
          websocket.send({method: "allocateJob", jobId: jobId, driverId: driverId, time: time, lat: lat, lng: lng }, success);
        } else {
          $.ajax({
            dataType: "jsonp",
            url: serverAddy + "ubitaxi/api/allocateJob/" + jobId + "/" + driverId + "/" + time + "/" + lat + "/" + lng,
            timeout: jsonpTimeout,
            success: success,
            error: function(jqXHR, textStatus, errorThrown ) {
              cb(errorThrown.message);
            }
          });
        }
      } else {
        cb("offline",null);
      }
    };

    api.pendingJobs = function(cb) {
      if (connection.isOnline()) {
        if (websocket) {
          websocket.send({method: "pendingJobs"}, function(data) { cb(null,data); });
        } else {
          $.ajax({
            dataType: "jsonp",
            url: serverAddy + "ubitaxi/api/pendingJobs",
            timeout: jsonpTimeout,
            success: function(data) { cb(null,data); },
            error: function(jqXHR, textStatus, errorThrown ) {
              cb(errorThrown.message);
            }
          });
        }
      } else {
        cb("offline");
      }
    }

    api.allocatedJobs = function(driverId, cb) {
      if (connection.isOnline()) {
        function success(data) {
          // Update local cache with jobs received from server.
          for (var j in data) {
            var job = data[j];
            ubitaxi.jobs.addJob(job);
          }
          cb(null,data);
        }
        if (websocket) {
          websocket.send({method: "allocatedJobs", driverId: driverId }, success);
        } else {
          $.ajax({
            dataType: "jsonp",
            url: serverAddy + "ubitaxi/api/allocatedJobs/" + driverId,
            timeout: jsonpTimeout,
            success: success,
            error: function(jqXHR, textStatus, errorThrown ) {
              cb(errorThrown.message);
            }
          });
        }
      } else {
        // Offline -> return jobs from local cache.
        var data = ubitaxi.jobs.getJobs(ubitaxi.jobs.STATUS_DRIVER_ALLOCATED, ubitaxi.jobs.STATUS_PICKED_UP,driverId);
        cb(null,data);
      }
    }

    api.currentJob = function(driverId, cb) {
      if (connection.isOnline()) {
        function success(job) {
          // Update local cache with job received from server.
          if (job) {
          ubitaxi.jobs.addJob(job);
          }
          cb(null,job);
        }
        if (websocket) {
          websocket.send({method: "currentJob", driverId: driverId }, success);
        } else {
          $.ajax({
            dataType: "jsonp",
            url: serverAddy + "ubitaxi/api/currentJob/" + driverId,
            timeout: jsonpTimeout,
            success: success,
            error: function(jqXHR, textStatus, errorThrown ) {
              cb(errorThrown.message);
            }
          });
        }
      } else {
        var job = ubitaxi.jobs.getCurrentJob();
        if (job === null) {
          job = ubitaxi.jobs.getNextJob();
        }
        cb(null,job);
      }
    };

    api.updateJobProgress = function(jobId, status, time, lat, lng, cb) {
      // First update local cache and mark as sync required until the server
      // update succeeds.
      ubitaxi.jobs.updateJobProgress(jobId, status, time, lat, lng, true);

      if (connection.isOnline()) {
        function success(data) {
          // Update local cache with job progress.
          ubitaxi.jobs.updateJobProgress(jobId, status, time, lat, lng, false);
          cb(null,data);
        }
        if (websocket) {
          websocket.send({method: "updateJobProgress", jobId: jobId, status: status, time: time, lat: lat, lng: lng }, success);
        } else {
          $.ajax({
            dataType: "jsonp",
            url: serverAddy + "ubitaxi/api/updateJobProgress/" + jobId + "/" + status + "/" + time + "/" + lat + "/" + lng,
            timeout: jsonpTimeout,
            success: success,
            error: function(jqXHR, textStatus, errorThrown ) {
              cb(errorThrown.message);
            }
          });
        }
      } else {
        // Not online - update is stored in local cache and marked for sync so callback now.
        cb(null);
      }
    };

    function syncJobProgress(job, progressIdx, cb) {
      var progress = job.progress[progressIdx];
      if (progress.requireSync) {
        api.updateJobProgress(job.id,progress.status, progress.time, progress.lat, progress.long, function(err,updateOK) {
          if (!err && updateOK) {
            if (ubitaxi.jobs.getJobStatusIndex(progress.status) === ubitaxi.jobs.STATUS_DROPPED_OFF) {
              // Job has been completed.
              ubitaxi.jobs.removeJob(job);
            }
          } else {
            // Error during sync...
          }
          cb();
        });
      } else {
        // No sync required.
        if (ubitaxi.jobs.getJobStatusIndex(progress.status) === ubitaxi.jobs.STATUS_DROPPED_OFF) {
          // Job has been completed.
          ubitaxi.jobs.removeJob(job);
        }
        cb();
      }
    }

    function doSyncJobProgress(job, progressIdx, cb) {
      syncJobProgress(job, progressIdx, function () {
        if (progressIdx < job.progress.length - 1) {
          doSyncJobProgress(job, progressIdx+1, cb);
        } else {
          cb();
        }
      });
    }

    function syncJob(job,cb) {
      if (connection.isOnline()) {
        doSyncJobProgress(job, 0, function() {
          // Mark local cache as sync'd.
          cb();
        });
      } else {
        // Nothing to do - offline, delay sync.
        cb();
      }
    };

    function doSync(jobList, jIdx, cb) {
      syncJob(jobList[jIdx], function() {
        if (jIdx < jobList.length - 1) {
          doSync(jobList,jIdx+1,cb);
        } else {
          cb();
        }
      });
    }

    api.synchronise = function(cb) {
      var allocatedJobs = ubitaxi.jobs.getJobs(ubitaxi.jobs.STATUS_DRIVER_ALLOCATED, ubitaxi.jobs.STATUS_ALL);
      if (allocatedJobs.length > 0) {
        doSync(allocatedJobs,0,cb);
      } else {
        cb();
      }
    };

    if (typeof exports.ubitaxi === "undefined") {
      exports.ubitaxi = {};
    }
    exports.ubitaxi.jobAPI = api;

  }(window));
}