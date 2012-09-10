// Hack some stuff into the String object
if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str) {
    return this.lastIndexOf(str, 0) === 0;
  }
}

// Add a 'last' method to Array objects
if (typeof Array.prototype.last != 'function') {
  Array.prototype.last = function () {
    return this[this.length - 1];
  }
}

// Avoid `console` errors in browsers that lack a console.
if (!(window.console && console.log)) {
  (function () {
    var noop = function () {};
    var methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd', 'markTimeline', 'table', 'time', 'timeEnd', 'timeStamp', 'trace', 'warn'];
    var length = methods.length;
    var console = window.console = {};
    while (length--) {
      console[methods[length]] = noop;
    }
  }());
}