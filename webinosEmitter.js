(function webinosEmitter(exports) {
  var emitter = function() {
    this.eventHandlers = {};
  };

  emitter.prototype.addListener = function(evt, callback) {
    if (!this.eventHandlers.hasOwnProperty(evt)) {
      this.eventHandlers[evt] = [];
    }
    this.eventHandlers[evt].push(callback);
  };

  emitter.prototype.removeListener = function(evt, callback) {
    if (this.eventHandlers.hasOwnProperty(evt)) {
      var idx = this.eventHandlers[evt].indexOf(callback);
      if (idx >= 0) {
        this.eventHandlers[evt].splice(idx,1);
      }
    }
  };

  emitter.prototype.emit = function(evt, data) {
    if (this.eventHandlers.hasOwnProperty(evt)) {
      var lst = this.eventHandlers[evt];
      for (var cb in lst) {
        if (typeof lst[cb] === "function") {
          lst[cb](Array.prototype.slice.call(arguments).slice(1));
        }
      }
    }
  };

  exports.WebinosEmitter = emitter;
}(window))