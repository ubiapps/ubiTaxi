(function ubiTaxiLocalCache(exports) {

  var localCache = function(storage) {
    this.load = function() {
      var cache = storage.getItem("ubiTaxi");
      if (!cache){
        cache = { jobs: []};
      } else {
        cache = JSON.parse(cache);
      }
      return cache;
    }

    this.save = function(cache){
      storage.setItem("ubiTaxi", JSON.stringify(cache));
    }
  }

  if (typeof exports.ubitaxi === "undefined") {
    exports.ubitaxi = {};
  }
  exports.ubitaxi.LocalCache = localCache;

}(window));
