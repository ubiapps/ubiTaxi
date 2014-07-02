if (typeof WebinosEmitter === "undefined") {
  console.error("required module WebinosEmitter not loaded");
} else {
  (function ubiTaxiWebSocket(exports) {
    var webSocketServerAddy = "ws://pzh.ubiapps.com";
//    var webSocketServerAddy = "ws://192.168.1.81";

    var UbiSocket = function() {
      WebinosEmitter.call(this);

      this.ws = null;
      this.msgId = 0;
      this.callbacks = {};
    };

    UbiSocket.prototype = Object.create(WebinosEmitter.prototype);

    UbiSocket.prototype.connect = function (port, callback) {
      var self = this;

      if (self.ws) {
        return;
      }

      self.ws  = new WebSocket(webSocketServerAddy + ":" + port);

      self.ws.onopen = function() {
        if (typeof callback === "function") {
          callback(true);
          callback = null;
        }
      };

      self.ws.onmessage = function(message) {
        var msg = JSON.parse(message.data);
        if (typeof msg.id !== "undefined") {
          // This is a callback.
          if (msg.id in self.callbacks) {
            self.callbacks[msg.id](msg.result);
            delete self.callbacks[msg.id];
          } else {
            console.log("No callback for msg with id " + msg.id + " : " + msg);
          }
        } else {
          // Push from server?
        }
      };

      self.ws.onclose = function() {
        if (typeof callback === "function") {
          // If the connection callback hasn't been called to indicate successful
          // socket connection, call it now to indicate failure.
          callback(false);
        }
        self.emit("closed");
        self.ws = null;
      }
    };

    UbiSocket.prototype.send = function (data, callback) {
      if (this.ws) {
        var msg = { user: this.user, message: data };
        if (typeof callback === "function") {
          msg.id = this.msgId++;
          this.callbacks[msg.id] = callback;
        }
        var jsonStr = JSON.stringify(msg);
        this.ws.send(jsonStr);
      }
    };

    UbiSocket.prototype.isConnected = function() {
      return this.ws != null && this.ws.readyState === this.ws.OPEN;
    };

    UbiSocket.prototype.close = function() {
      if (this.isConnected()) {
        this.ws.close();
        this.ws.onclose = null;
      }
      this.ws = null;
    }

    if (typeof exports.ubitaxi === "undefined") {
      exports.ubitaxi = {};
    }
    exports.ubitaxi.UbiSocket = UbiSocket;

  }(window));
}
