(function(exports) {
  var directionsDisplay;
  var directionsService = new google.maps.DirectionsService();
  var map;

  function showRoute(start, end) {
    directionsDisplay = new google.maps.DirectionsRenderer();
    var mapOptions = {
      zoom:7,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    }
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
    directionsDisplay.setMap(map);

    var request = {
      origin:start,
      destination:end,
      travelMode: google.maps.DirectionsTravelMode.DRIVING
    };
    directionsService.route(request, function(response, status) {
      if (status == google.maps.DirectionsStatus.OK) {
        directionsDisplay.setDirections(response);
      }
    });
  }

  if (typeof exports.ubitaxi === "undefined") {
    exports.ubitaxi = {};
  }
  exports.ubitaxi.directions = {
    showRoute: showRoute
  }

}(window));
