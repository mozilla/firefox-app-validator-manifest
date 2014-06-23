var common = require('./rules/common.json');
var sMarketplace = require('./rules/marketplace.json');

var Warning = function (message) {
  this.name = 'Warning';
  this.message = message || '';
};

Warning.prototype = Error.prototype;

var Manifest = function () {
  this.manifest;
  this.appType = 'mkt';

  var errors = {};
  var warnings = {};

  var onceMatchFields = [
    'activities', 'appcache_path', 'chrome', 'csp', 'default_locale', 'fullscreen',
    'icons', 'inputs', 'installs_allowed_from', 'launch_path', 'locales', 'messages',
    'orientation', 'origin', 'permissions', 'redirects', 'required_features', 'role',
    'screen_size', 'type', 'version'
  ];

  var self = this;

  var hasValidJSON = function (content) {
    try {
      self.manifest = JSON.parse(content);
    } catch (err) {
      errors.InvalidJSON = new Error('Manifest is not in a valid JSON format');
    }
  };

  var hasMandatoryKeys = function () {
    var missingKeys = [];
    var keys = common.required;

    if (self.appType === 'mkt') {
      keys = keys.concat(sMarketplace.required);
    }

    for (var i = 0; i < keys.length; i ++) {
      var currKey = keys[i].charAt(0).toUpperCase() + keys[i].slice(1);

      if (!self.manifest || !self.manifest[keys[i]]) {
        errors['MandatoryField' + currKey] = new Error('Mandatory field ' + keys[i] + ' is missing');
      }
    }
  };

  var hasOnceMatchedFields = function () {
    var keys = onceMatchFields;

    for (var i = 0; i < keys.length; i ++) {
      var currKey = keys[i].charAt(0).toUpperCase() + keys[i].slice(1);

      if (!self.manifest || !self.manifest[keys[i]]) {
        warnings['Field' + currKey] = new Warning('Duplicate field ' + keys[i]);
      }
    }
  };

  this.validate = function (content) {
    errors = {};
    warnings = {};

    hasValidJSON(content);
    hasMandatoryKeys();
    hasOnceMatchedFields();

    return {
      errors: errors,
      warnings: warnings
    };
  };
};

module.exports = Warning;
module.exports = Manifest;

/*
var RULES = {
  "required_nodes_when": {"default_locale": lambda n: "locales" in n},
  "disallowed_nodes": ["widget"],
  "child_nodes": {
    "launch_path": {"expected_type": "string",
                    "process": lambda s: s.process_launch_path,
                    "not_empty": true},
    "icons": {"expected_type": "object",
              "child_process": lambda s: s.process_icon_size,
              "process": lambda s: s.process_icons},
    "developer":
        {"expected_type": "object",
         "child_nodes": {"name": {"expected_type": "string",
                                  "not_empty": true},
                         "url": {"expected_type": "string",
                                 "not_empty": true,
                                 "process":
                                     lambda s: s.process_dev_url}},
         "required_nodes": ["name"],
         "allowed_once_nodes": ["url", "email"]},
    "locales":
        {"expected_type": "object",
         "allowed_nodes": ["*"],
         "child_nodes": {"*": {"expected_type": "object",
                               "child_nodes": {}}}},
    "default_locale": {"expected_type": "string",
                       "not_empty": true},
    "installs_allowed_from": {"expected_type": "object",
                              "process": lambda s: s.process_iaf,
                              "not_empty": true},
    "version": {"expected_type": "string",
                "not_empty": true,
                "value_matches": /^[a-zA-Z0-9_,\*\-\.]+$/,
    "screen_size":
        {"expected_type": "object",
         "allowed_once_nodes": ["min_height", "min_width"],
         "not_empty": true,
         "child_nodes":
             {"min_height":
                  {"expected_type": "number",
                   "process": lambda s: s.process_screen_size},
              "min_width":
                  {"expected_type": "number",
                   "process": lambda s: s.process_screen_size}}},
    "required_features": {"expected_type": "object"},
    "orientation": {"expected_type": DESCRIPTION_TYPES,
                    "process": lambda s: s.process_orientation},
    "fullscreen": {"expected_type": "string",
                   "values": ["true", "false"]},
    "appcache_path": {"expected_type": "string",
                      "process": lambda s: s.process_appcache_path},
    "type": {"expected_type": "string",
             "process": lambda s: s.process_type},
    "activities": {
        "expected_type": "object",
        "allowed_nodes": ["*"],
        "child_nodes": {
            "*": {
                "expected_type": "object",
                "required_nodes": ["href"],
                "allowed_once_nodes": [
                    "disposition", "filters", "returnValue"
                ],
                "child_nodes": WEB_ACTIVITY_HANDLER,
            }
        }
    },
    "inputs": {
        "expected_type": "object",
        "allowed_nodes": ["*"],
        "not_empty": true,
        "child_nodes": {
            "*": {
                "expected_type": "object",
                "required_nodes": ["launch_path", "name", "description",
                                   "types"],
                "allowed_once_nodes": ["locales"],
                "child_nodes": INPUT_DEF_OBJ
            }
        }
    },
    "permissions": {
        "allowed_nodes": PERMISSIONS['web'] |
                         PERMISSIONS['privileged'] |
                         PERMISSIONS['certified'],
        "expected_type": "object",
        "unknown_node_level": "error",
        "child_nodes": {
            "*": {
                "expected_type": "object",
                "required_nodes": ["description"],
                "allowed_once_nodes": ["access"],
                "child_nodes": {
                    "description": {"expected_type": "string",
                                    "not_empty": true},
                    "access": {"expected_type": "string",
                               "not_empty": true}
                }
            }
        },
        "process": lambda s: s.process_permissions
    },
    "csp": {"expected_type": "string",
            "not_empty": true},
    "messages": {
        "expected_type": "object",
        "process": lambda s: s.process_messages,
    },
    "redirects": {
        "expected_type": "object",
        "child_nodes": {
            "expected_type": "object",
            "required_nodes": ["to", "from"],
            "child_nodes": {
                "to": {"expected_type": "string",
                       "not_empty": true},
                "from": {"expected_type": "string",
                         "not_empty": true},
            }
        },
    },
    "origin": {
        "expected_type": "string",
        "value_matches": /^app:\/\/[a-z0-9]+([-.{1}[a-z0-9]+)/
                         /\.[a-z]{2,5}$/]
        "process": lambda s: s.process_origin,
    },
    "chrome": {
        "expected_type": "object",
        "unknown_node_level": "error",
        "allowed_nodes": ["navigation"],
        "child_nodes": {
            "navigation": {"expected_type": "boolean"}
        }
    }
  }
};
*/
