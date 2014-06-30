'use strict';

var common = require('./rules/common.json');
var sMarketplace = require('./rules/marketplace.json');

var Warning = function (message) {
  this.name = 'Warning';
  this.message = message || '';
};

Warning.prototype = Error.prototype;

var clean = function (word) {
  return word.toString().trim();
};

var camelCase = function (word) {
  var words = word.split('_');
  var finalWord = [];

  words.forEach(function (w) {
    finalWord.push(clean(w.charAt(0).toUpperCase() + w.slice(1)));
  });

  return finalWord.join('');
};

var Manifest = function () {
  this.manifest;
  this.appType = 'mkt';

  var errors = {};
  var warnings = {};

  var self = this;

  var hasValidJSON = function (content) {
    try {
      if (typeof content !== 'object') {
        self.manifest = JSON.parse(content);
      } else {
        self.manifest = content;
      }
    } catch (err) {
      throw new Error('Manifest is not in a valid JSON format or has invalid properties');
    }
  };

  var hasMandatoryKeys = function () {
    var missingKeys = [];
    var keys = common.required;

    if (self.appType === 'mkt') {
      keys = keys.concat(sMarketplace.required);
    }

    for (var i = 0; i < keys.length; i ++) {
      var currKey = camelCase(keys[i]);

      if (!self.manifest || !self.manifest[keys[i]]) {
        errors['MandatoryField' + currKey] = new Error('Mandatory field ' + keys[i] + ' is missing');
      }
    }
  };

  var hasValidPropertyTypes = function () {
    for (var k in self.manifest) {
      if (typeof self.manifest[k] !== common.properties[k].type) {
        errors['InvalidPropertyType' + camelCase(k)] = new Error('`' + k +
               '` must be of type `' + common.properties[k].type + '`');
      }
    }
  };

  var hasValidStringItem = function () {
    for (var k in self.manifest) {
      if (common.properties[k].oneOf && common.properties[k].oneOf.indexOf(self.manifest[k]) === -1) {
        errors['InvalidStringType' + camelCase(k)] = new Error('`' + k +
               '` must be one of the following: ' + common.properties[k].oneOf.toString());
      } else if (common.properties[k].anyOf) {
        self.manifest[k].split(',').forEach(function (v) {
          if (common.properties[k].anyOf.indexOf(v.trim()) === -1) {
            errors['InvalidStringType' + camelCase(k)] = new Error('`' + k +
               '` must be any of the following: ' + common.properties[k].anyOf.toString());
          }
        });
      }
    }
  };

  var hasRequiredLength = function () {
    for (var k in self.manifest) {
      if (common.properties[k].minLength && self.manifest[k].toString().length < common.properties[k].minLength) {
        errors['InvalidPropertyLength' + camelCase(k)] = new Error(
          '`' + k + '` must not be empty');
      }

      if (common.properties[k].maxLength && self.manifest[k].toString().length > common.properties[k].maxLength) {
        errors['InvalidPropertyLength' + camelCase(k)] = new Error(
          '`' + k + '` must not exceed length ' + common.properties[k].maxLength);
      }
    }
  };

  var hasValidLaunchPath = function () {
    if (self.manifest.launch_path) {
      var pattern = new RegExp(common.properties.launch_path.pattern);
      var launchPath = clean(self.manifest.launch_path);

      if (launchPath.length > 0) {
        if (pattern.test(launchPath) === false) {
          errors['InvalidLaunchPath'] = new Error("`launch_path` must be a path relative to app's origin");
        }
      }
    }
  };

  // Icon validation is based on a key name that is tied to the icon size. Can't set this in the schema
  // if it is an arbitrary natural number, so this will suffice for current manifest validation.
  var hasValidIconSizeAndPath = function () {
    if (self.manifest.icons) {
      for (var k in self.manifest.icons) {
        var key = parseInt(k, 10);

        if (isNaN(key) || key < 1) {
          errors['InvalidIconSize' + camelCase(k)] = new Error('Icon size must be a natural number');
        }

        if (!self.manifest.icons[k] || self.manifest.icons[k].length < 1) {
          errors['InvalidIconPath' + camelCase(k)] = new Error('Paths to icons must be absolute paths, relative URIs, or data URIs');
        }
      }
    }
  };

  var hasValidVersion = function () {
    if (self.manifest.version) {
      var pattern = new RegExp(common.properties.version.pattern);

      if (pattern.test(clean(self.manifest.version)) === false) {
        errors['InvalidVersion'] = new Error('`version` is in an invalid format.');
      }
    }
  };

  var hasValidDefaultLocale = function () {
    // only relevant if locales property is not empty
    var error = new Error('`default_locale` must match one of the keys in `locales`');

    if (self.manifest.locales) {
      if (!self.manifest.default_locale) {
        errors['InvalidDefaultLocale'] = error;
      } else {
        var languages = [];

        for (var i in self.manifest.locales) {
          languages.push(i);
        }

        if (languages.indexOf(self.manifest.default_locale) === -1) {
          errors['InvalidDefaultLocale'] = error;
        }
      }
    }
  };

  this.validate = function (content) {
    errors = {};
    warnings = {};

    hasValidJSON(content);
    hasMandatoryKeys();
    hasValidPropertyTypes();
    hasRequiredLength();
    hasValidLaunchPath();
    hasValidIconSizeAndPath();
    hasValidVersion();
    hasValidStringItem();
    hasValidDefaultLocale();

    return {
      errors: errors,
      warnings: warnings
    };
  };
};

module.exports = Warning;
module.exports = Manifest;

/*

Actual rules here https://github.com/mozilla/app-validator/blob/master/appvalidator/specs/webapps.py

var RULES = {
  "disallowed_nodes": ["widget"],
  "child_nodes": {
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
    "installs_allowed_from": {"expected_type": "object",
                              "process": lambda s: s.process_iaf,
                              "not_empty": true},
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
