(function secureStorage(exports) {

  function SecureStorage(crypto,cipkey) {
    this.crypto = crypto;

    this.key = function(n) {
      var val;
      var store = loadCache(this.crypto);
      var i = 0;
      for (var p in store) {
        if (store.hasOwnProperty(p)) {
          if (i === n) {
            val = p;
            break;
          }
          i++;
        }
      }
      return val;
    };

    this.getItem = function(key) {
      var val;
      var store = loadCache(this.crypto);
      if (store.hasOwnProperty(key)) {
        val = store[key];
      }
      return val;
    };

    this.setItem = function(key,value) {
      var store = loadCache(this.crypto);
      store[key] = value;
      storeCache(store,this.crypto);
    };

    this.removeItem = function(key) {
      var store = loadCache(this.crypto);
      if (store.hasOwnProperty(key)) {
        delete store[key];
      }
      storeCache(store,this.crypto);
    };

    this.clear = function() {
      var store = loadCache(this.crypto);
      for (var p in store) {
        if (store.hasOwnProperty(p)) {
          delete store[p];
        }
      }
      storeCache(store,this.crypto);
    }

    var loadCache = function(crypto) {
      var store;
      var cache = localStorage["secure"];
      if (typeof cache !== "undefined") {
        try {
          var plain = crypto.decrypt(cipkey,cache);
          store = JSON.parse(plain);
        } catch (e) {
          delete localStorage["secure"];
          store = {};
        }
      } else {
        store = {};
      }

      return store;
    };

    var storeCache = function(store,crypto) {
      try {
        var cipher = crypto.encrypt(cipkey,JSON.stringify(store));
        localStorage["secure"] = cipher;
      } catch (e) {
        delete localStorage["secure"];
      }
    };
  }

  exports.secureStorage = new SecureStorage(sjcl, "todo-use_NFC_Key?!?");

}(window))