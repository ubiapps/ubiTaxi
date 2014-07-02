/*
  This file is shared on server and client.
  If you change this file be sure to update both locations.
 */
(function() {
  var jobStore;
  function initialiseStore(store) {
    jobStore = store;
  }

  var jobStatusLookup = [
    "unknown",
    "order taken",
    "driver allocated",
    "on route",
    "picked up",
    "dropped off"
  ];

  var STATUS_UNKNOWN = 0;
  var STATUS_ORDER_TAKEN = 1;
  var STATUS_DRIVER_ALLOCATED = 2;
  var STATUS_ON_ROUTE = 3;
  var STATUS_PICKED_UP = 4;
  var STATUS_DROPPED_OFF = 5;
  var STATUS_ALL = 999;

  function Job(name,contact,pickup,dropoff,people,time) {
    this.id = 0;
    this.name = name;
    this.contact = contact;
    this.pickup = pickup;
    this.dropoff = dropoff;
    this.people = people;
    this.time = time;
    this.progress = [];
  }

  // Gets the index of a given job status - used for filtering.
  function jobStatusIndex(jobStatus) {
    var idx = -1;
    for (var i = 0; i < jobStatusLookup.length; i++) {
      if (jobStatusLookup[i] === jobStatus) {
        idx = i;
        break;
      }
    }

    return idx;
  }

  function getJobStatus(job) {
    var status = jobStatusLookup[STATUS_ORDER_TAKEN];

    if (typeof job.progress !== "undefined") {
      status = job.progress[job.progress.length-1].status;
    }

    return status;
  }

  function timeSort(a,b) {
    var aTime = new Date(a.time);
    var bTime = new Date(b.time);
    return aTime.getTime() - bTime.getTime();
  }

  function getJobs(filterFrom, filterTo, driverId) {
    var jobData = jobStore.load();

    var jobList;
    if (typeof filterFrom === "undefined" && typeof filterTo === "undefined") {
      jobList = jobData.jobs;
    } else {
      jobList = [];
      for (var j in jobData.jobs) {
        var job = jobData.jobs[j];
        var status = getJobStatus(job);
        var jobStatus = jobStatusIndex(status);
        if (jobData.jobs.hasOwnProperty(j) &&
            (typeof filterFrom === "undefined" || jobStatus >= filterFrom) &&
            (typeof filterTo === "undefined" || jobStatus <= filterTo) &&
            (typeof driverId === "undefined" || jobData.jobs[j].driverId === driverId)) {
          jobList.push(job);
        }
      }
    }

    return jobList.sort(timeSort);
  }

  function findJob(jobs,id) {
    var job;

    for (var j = 0; j < jobs.length; j++) {
      if (jobs[j].id === id) {
        job = jobs[j];
        break;
      }
    }

    return job;
  }

  function addJob(job) {
    var jobData = jobStore.load();
    var exists;

    if ((typeof job.id === "undefined") || job.id === 0) {
      var time = new Date();
      job.id = jobData.nextId++;
      job.progress = [{ status: jobStatusLookup[STATUS_ORDER_TAKEN], time: time.getTime() }];
    } else {
      exists = findJob(jobData.jobs,job.id);
    }
    if (typeof exists === "undefined") {
      jobData.jobs.push(job);
      jobStore.save(jobData);
    }

    return job;
  }

  function removeJob(job) {
    var jobData = jobStore.load();
    var jobs = jobData.jobs;

    for (var j = 0; j < jobs.length; j++) {
      if (jobs[j].id === job.id) {
        jobs.splice(j,1);
        jobStore.save(jobData);
        break;
      }
    }
  }

  function allocateDriver(jobId, driverId, time, lat, lng) {
    var jobData = jobStore.load();
    var job = findJob(jobData.jobs,jobId);

    if (typeof job !== "undefined")  {
    var status = getJobStatus(job);
    if (jobStatusIndex(status) === STATUS_ORDER_TAKEN) {
      var progress = findJobProgress(job, jobStatusLookup[STATUS_DRIVER_ALLOCATED], true);
      progress.time = time;
      progress.lat = lat;
      progress.long = lng;

      job.driverId = driverId;

      jobStore.save(jobData);
    } else {
      // Job already allocated.
        job = null;
      }
    } else {
      // Job doesn't exist.
      job = null;
    }

    return job;
  }

  function findJobProgress(job, status, add) {
    var progress;
    for (var p in job.progress) {
      if (job.progress[p].status === status) {
        progress = job.progress[p];
        break;
      }
    }

    if (typeof progress === "undefined" && add) {
      progress = { status: status };
      job.progress.push(progress);
    }
    return progress;
  }

  function updateJobProgress(jobId,jobStatus,time,lat,lng,requireSync) {
    var ok = false;

    var jobData = jobStore.load();
    var job = findJob(jobData.jobs,jobId);

    if (typeof job !== "undefined") {
      // Check job status is valid.
      if (jobStatusIndex(jobStatus)) {
        if (typeof job.progress === "undefined") {
          job.progress = [];
        }

        var progress = findJobProgress(job, jobStatus, true);
        progress.status = jobStatus;
        progress.time = time;
        progress.lat = lat;
        progress.long = lng;
        progress.requireSync = requireSync;

        jobStore.save(jobData);
        ok = true;
      }
    }

    return ok;
  }

  function getCurrentJob(driverId) {
    var jobList = getJobs(STATUS_ON_ROUTE, STATUS_PICKED_UP, driverId);
    var job = null;
    if (jobList.length > 0) {
      job = jobList[0];
    }
    return job;
  }

  function getNextJob(driverId) {
    var jobList = getJobs(STATUS_DRIVER_ALLOCATED, STATUS_DRIVER_ALLOCATED, driverId);
    var job = null;
    if (jobList.length > 0) {
      job = jobList[0];
    }
    return job;
  }

  var exp = {
    STATUS_UNKNOWN: STATUS_UNKNOWN,
    STATUS_ORDER_TAKEN: STATUS_ORDER_TAKEN,
    STATUS_DRIVER_ALLOCATED: STATUS_DRIVER_ALLOCATED,
    STATUS_ON_ROUTE: STATUS_ON_ROUTE,
    STATUS_PICKED_UP: STATUS_PICKED_UP,
    STATUS_DROPPED_OFF: STATUS_DROPPED_OFF,
    STATUS_ALL: STATUS_ALL,
    initialise: initialiseStore,
    Job: Job,
    getJobs: getJobs,
    addJob: addJob,
    allocateDriver: allocateDriver,
    updateJobProgress: updateJobProgress,
    getCurrentJob: getCurrentJob,
    getNextJob: getNextJob,
    jobStatusLookup: jobStatusLookup,
    getJobStatus: getJobStatus,
    getJobStatusIndex: jobStatusIndex,
    removeJob: removeJob
  };

  if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
    module.exports = exp;
  } else {
    if (typeof window.ubitaxi === "undefined") {
      window.ubitaxi = {};
    }
    window.ubitaxi.jobs = exp;
  }

}());
