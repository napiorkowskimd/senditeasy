'use strict';


var log_info = function(msg) {
    console.log("INFO: " + msg);
}

var log_warning = function(msg) {
    console.log("WARNING: " + msg);
}

var log_error = function(msg) {
    console.log("ERROR: " + msg);
}

var log_debug = function(msg) {
    console.log("DEBUG: " + msg)
}

var log = function(msg) {
    log_info(msg);
}

log.INFO = log_info;
log.WARNING = log_warning;
log.ERROR = log_error;
log.DEBUG = log_debug;

export var LOG = Object.freeze(log);
