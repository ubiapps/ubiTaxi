if (typeof WebinosEmitter === "undefined") {
  console.error("required module WebinosEmitter not loaded");
} else {
  (function webinosConnection(exports) {

    var connection = function() {
      WebinosEmitter.call(this);
    };

    connection.prototype = Object.create(WebinosEmitter.prototype);

    connection.prototype.start = function() {
      var self = this;

      webinos.session.addListener("registeredBrowser",function(data){
        self.emit("pzpOnline");
      });

      // Register to receive PZH connection updates from webinos.
      webinos.session.addListener("update",function(data) {
        switch (data.payload.message.state.hub) {
          case "not_connected":
            self.emit("pzhOffline");
            self.emit("offline");
            break;
          case "connected":
            self.emit("pzhOnline");
            self.emit("online");
            break;
        }
      });

      // Handlers to help with connectivity (using https://github.com/PixelsCommander/OnlineJS).
      window.onLineHandler = function() {
        self.emit("networkOnline");
        self.emit("online");
      };

      window.offLineHandler = function() {
        // Force offline here, rather than after the handler is called.
        window.onLine = false;
        self.emit("networkOffline");
        self.emit("offline");
      };
    };

    connection.prototype.isOnline = function() {
      return window.onLine === true && webinos.session && webinos.session.isConnected();
    };

    exports.WebinosConnection = connection;
  }(window))
}
