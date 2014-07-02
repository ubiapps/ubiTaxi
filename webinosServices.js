(function webinosServices(exports) {

  var services = function () {

  };

  function bindService(service, cb) {
    service.bindService({
        onBind: function(svc) { cb(null, svc); }
    });
  }

  services.findService = function (serviceType, cb, zoneAddress) {
    webinos.discovery.findServices(new ServiceType(serviceType), {
      onFound: function (service) {
        if (typeof zoneAddress === "undefined" || service.serviceAddress === zoneAddress) {
          bindService(service,cb);
        }
      },
      onError: function(err) {
        cb(err);
      }
    });
  };

  exports.webinosServices = services;

}(window));