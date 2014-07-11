'use strict';

var common = require('./rules/common.json');
var sMarketplace = require('./rules/marketplace.json');

// TODO: These should probably go somewhere better.
var DEFAULT_WEBAPP_MRKT_URLS = [
  'https://marketplace.firefox.com',
  'https://marketplace-dev.allizom.org'
];

var BANNED_ORIGINS = [
  'gaiamobile.org',
  'mozilla.com',
  'mozilla.org'
]

var Warning = function (message) {
  this.name = 'Warning';
  this.message = message || '';
};

Warning.prototype = Error.prototype;

// Stealing some notions from underscore.js
var ObjProto = Object.prototype;
var toString = ObjProto.toString;

var clean = function (word) {
  return word.toString().trim();
};

var camelCase = function (word) {
  var words = word.toString().split('_');
  var finalWord = [];

  words.forEach(function (w) {
    finalWord.push(clean(w.charAt(0).toUpperCase() + w.slice(1)));
  });

  return finalWord.join('');
};

// glueKey takes a string prefix, an array of string parents, and then any
// number of additional parameters. Except for the prefix, these are all
// converted to CamelCase and concatenated together
var glueKey = function (prefix, parents) {
  var rest = Array.prototype.slice.call(arguments, 2);
  var parts = parents.concat(rest).filter(function (item) {
    return item !== '';
  }).map(function (item) {
    return camelCase(item);
  });
  return prefix + parts.join('');
};

// glueKey takes a string prefix, an array of string parents, and then any
// number of additional parameters. These are all concatenated together with a
// '.' separator.
var glueObjectPath = function (prefix, parents) {
  var rest = Array.prototype.slice.call(arguments, 2);
  var parts = parents.concat(rest).filter(function (item) {
    return item !== '';
  });
  return prefix + parts.join('.');
};

var parseUrl = function (path) {
  // TODO: Could replace this with a different implementation to make it
  // node-agnostic and work in a browser. http://nodejs.org/api/url.html
  return require('url').parse(path);
};

var pathValid = function (path, options) {

  if (path == '*') {
    return !!options.canBeAsterisk;
  }

  if (path.indexOf('data:') !== -1) {
    return !!options.canBeData;
  }

  // Nothing good comes from relative protocols.
  if (path.indexOf('//') === 0) {
    return false;
  }

  // Try to parse the URL.
  try {
    var parsed = parseUrl(path);

    // If the URL is relative, return whether the URL can be relative.
    if (!parsed.protocol || !parsed.host) {
      if (parsed.pathname && parsed.pathname.indexOf('/') === 0) {
        return !!options.canBeAbsolute;
      } else {
        return !!options.canBeRelative;
      }
    }

    // If the URL is absolute but uses an invalid protocol, return False
    if (['http:', 'https:'].indexOf(parsed.protocol.toLowerCase()) === -1) {
      return false;
    }

    return !!options.canHaveProtocol;

  } catch (e) {
    // If there was an error parsing the URL, return False.
    return false;
  }

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

  var hasValidSchema = function (subject, schema, name, parents) {
    name = ('undefined' === typeof name) ? '' : name;
    parents = ('undefined' === typeof parents) ? [] : parents;

    hasValidPropertyType(subject, schema, name, parents);

    if ('string' === typeof subject) {
      hasValidStringItem(subject, schema, name, parents);
      hasRequiredStringLength(subject, schema, name, parents);
    }

    if ('[object Array]' === toString.call(subject)) {
      if (schema.items) {
        hasValidItemTypes(subject, schema, name, parents);
      }
    }

    if ('[object Object]' === toString.call(subject)) {

      if (schema.required) {
        hasMandatoryKeys(subject, schema, name, parents);
      }

      if (schema.properties && !schema.additionalProperties) {
        hasNoUnexpectedKeys(subject, schema, name, parents);
      }

      if (schema.properties) {
        for (var k in schema.properties) {
          if (k in subject) {
            hasValidSchema(subject[k], schema.properties[k],
                           k, parents.concat([name]));
          }
        }
      }

      if (schema.additionalProperties) {
        var additional = schema.additionalProperties;
        for (var k in subject) {
          if (!schema.properties || !schema.properties.hasOwnProperty(k)) {
            hasValidSchema(subject[k], additional,
                           k, parents.concat([name]));
          }
        }
      }

    }
  };

  var hasMandatoryKeys = function (subject, schema, name, parents) {
    if (!schema.required) {
      return;
    }

    var missingKeys = [];
    var keys = schema.required;

    if (parents.length === 0 && self.appType === 'mkt') {
      keys = keys.concat(sMarketplace.required);
    }

    for (var i = 0; i < keys.length; i ++) {
      if (!subject || !subject[keys[i]]) {
        errors[glueKey('MandatoryField', parents, name, keys[i])] = new Error(
            'Mandatory field ' + keys[i] + ' is missing');
      }
    }
  };

  var hasNoUnexpectedKeys = function (subject, schema, name, parents) {
    for (var k in subject) {
      if (!schema.properties.hasOwnProperty(k)) {
        errors[glueKey('UnexpectedProperty', parents, name)] = new Error(
            'Unexpected property `' + k + '` found in `' +
            glueObjectPath('', parents, name) + '`');
      }
    }
  };

  var isValidObjectType = function (prop, type) {
    if ('array' === type) {
      if (toString.call(prop) !== '[object Array]') {
        return false;
      }
    } else if ('object' === type) {
      if (toString.call(prop) !== '[object Object]') {
        return false;
      }
    } else if (typeof prop !== type) {
      return false;
    }
    return true;
  };

  var hasValidPropertyType = function (subject, schema, name, parents) {
      var type = schema.type;
      if (type && !isValidObjectType(subject, type)) {
        errors[glueKey('InvalidPropertyType', parents, name)] = new Error(
            '`' + name + '` must be of type `' + type + '`');
      }
  };

  var hasValidItemTypes = function (subject, schema, name, parents) {
    var itemSchema = schema.items;

    // TODO: Implement [object Array] form of items schema
    if ('[object Object]' === toString.call(itemSchema)) {
      var type = itemSchema.type;

      // Validate each of the items in the subject array
      for (var i = 0; i < subject.length; i++) {
        var itemSubject = subject[i];

        if (!isValidObjectType(itemSubject, type)) {
          errors[glueKey('InvalidItemType', parents, name)] = new Error(
              'items of array `' + name + '` must be of type `' + type + '`');
        }

        if ('[object Object]' === toString.call(itemSubject)) {
          hasValidSchema(itemSubject, itemSchema,
                         i, parents.concat([name]));
        }

      }
    }
  };

  var hasValidStringItem = function (subject, schema, name, parents) {
    if (schema.oneOf && schema.oneOf.indexOf(subject) === -1) {
      errors[glueKey('InvalidStringType', parents, name)] = new Error('`' + name +
             '` must be one of the following: ' + schema.oneOf.toString());
    } else if (schema.anyOf) {
      subject.split(',').forEach(function (v) {
        if (schema.anyOf.indexOf(v.trim()) === -1) {
          errors[glueKey('InvalidStringType', parents, name)] = new Error('`' + name +
             '` must be any of the following: ' + schema.anyOf.toString());
        }
      });
    }
  };

  var hasRequiredStringLength = function (subject, schema, name, parents) {
    if (schema.minLength && subject.toString().length < schema.minLength) {
      errors[glueKey('InvalidPropertyLength', parents, name)] = new Error(
          '`' + name + '` must be at least ' + schema.minLength + ' in length');
    }
    if (schema.maxLength && subject.toString().length > schema.maxLength) {
      errors[glueKey('InvalidPropertyLength', parents, name)] = new Error(
        '`' + name + '` must not exceed length ' + schema.maxLength);
    }
  };

  var hasValidDeveloperUrl = function () {
    if (self.manifest.developer && self.manifest.developer.url) {
      if (!pathValid(self.manifest.developer.url, {canHaveProtocol: true})) {
        errors['InvalidDeveloperUrl'] = new Error(
          'Developer URL must be an absolute HTTP or HTTPS URL');
      }
    }
  };

  var hasValidLaunchPath = function () {
    if (self.manifest.launch_path) {
      var pattern = new RegExp(common.properties.launch_path.pattern);
      var launchPath = clean(self.manifest.launch_path);

      if (launchPath.length > 0) {
        if (pattern.test(launchPath) === false) {
          errors['InvalidLaunchPath'] = new Error(
            "`launch_path` must be a path relative to app's origin");
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
          errors['InvalidIconSize' + camelCase(k)] = new Error(
            'Icon size must be a natural number');
        }

        if (!self.manifest.icons[k] || self.manifest.icons[k].length < 1) {
          errors['InvalidIconPath' + camelCase(k)] = new Error(
            'Paths to icons must be absolute paths, relative URIs, or data URIs');
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

  var hasValidInstallsAllowedFrom = function () {
    if (!self.manifest.installs_allowed_from) {
      return;
    }

    var marketURLs = [];

    var invalid = function (subkey, msg) {
      errors['Invalid' + subkey + 'InstallsAllowedFrom'] = new Error(msg);
    };

    if (0 === self.manifest.installs_allowed_from.length) {
      return invalid('Empty', '`installs_allowed_from` cannot be empty when present');
    }

    var InstallsAllowedFrom = self.manifest.installs_allowed_from;
    for (var i = 0; i < InstallsAllowedFrom.length; i++) {
      var item = InstallsAllowedFrom[i];

      if ('string' !== typeof item) {
        return invalid('ArrayOfStrings',
            '`installs_allowed_from` must be an array of strings');
      }

      var validPath = pathValid(item, {
        canBeAsterisk: true,
        canHaveProtocol: true
      });
      if (!validPath) {
        return invalid('Url',
            '`installs_allowed_from` must be a list of valid absolute URLs or `*`');
      }

      if ('*' === item || DEFAULT_WEBAPP_MRKT_URLS.indexOf(item) !== -1) {
        marketURLs.push(item);
      } else {
        var swap_http = item.replace('http://', 'https://');
        if (DEFAULT_WEBAPP_MRKT_URLS.indexOf(swap_http) !== -1) {
          return invalid('SecureMarketplaceUrl',
              '`installs_allowed_from` must use https:// when Marketplace URLs are included');
        }
      }

    }

    if (self.options.listed && 0 === marketURLs.length) {
      return invalid('ListedRequiresMarketplaceUrl',
          '`installs_allowed_from` must include a Marketplace URL when app is listed');
    }

  };

  var hasValidScreenSize = function () {
    var screenSize = self.manifest.screen_size;

    if (!screenSize || 'object' !== typeof screenSize) {
      return;
    }

    if (!(screenSize.hasOwnProperty('min_width') ||
          screenSize.hasOwnProperty('min_height'))) {
      errors['InvalidEmptyScreenSize'] = new Error(
        '`screen_size` should have at least min_height or min_width');
      return;
    }

    var validSize = function (key) {
      var val = screenSize[key];

      if (val && !(/^\d+$/.test(val))) {
        errors['InvalidNumberScreenSize' + camelCase(key)] = new Error(
          '`'+ key +'` must be a number');
      }
    };

    validSize('min_width');
    validSize('min_height');
  };

  var hasValidType = function () {
    var type = self.manifest.type;

    if (!type) {
      return;
    }

    if (self.options.listed && 'certified' === self.manifest.type) {
      errors['InvalidTypeCertifiedListed'] = new Error(
        '`certified` apps cannot be listed');
    }

    if (!self.options.packaged && 'web' !== self.manifest.type) {
      errors['InvalidTypeWebPrivileged'] = new Error(
        'unpackaged web apps may not have a type of `certified` or `privileged`');
    }
  };

  var hasValidAppCachePath = function () {
    var appcachePath = self.manifest.appcache_path;

    if (appcachePath) {
      if (self.options.packaged) {
        if (appcachePath) {
          errors['InvalidAppCachePathType'] = new Error(
            "packaged apps cannot use Appcache. The `appcache_path` field should " +
            "not be provided in a packaged app's manifest");
        }
      }

      if (!pathValid(appcachePath, {canHaveProtocol: true})) {
        errors['InvalidAppCachePathURL'] = new Error(
          'The `appcache_path` must be a full, absolute URL to the application ' +
          'cache manifest');
      }
    }
  };

  var hasValidMessages = function () {
    var messages = self.manifest.messages;
    if (!messages || '[object Array]' !== toString.call(messages)) {
      return;
    }
    for (var i = 0; i < messages.length; i++) {
      var item = messages[i];
      if ('[object Object]' !== toString.call(item)) {
        continue;
      }
      var keyCt = 0;
      for (var k in item) {
        if (item.hasOwnProperty(k)) {
          keyCt++;
        }
      }
      if (keyCt > 1) {
        errors['InvalidMessagesEntry'] = new Error(
          'objects in array `messages` must each have only one property');
      }
    }
  };

  var hasValidOrigin = function () {
    if (self.manifest.origin) {
      if (['certified', 'privileged'].indexOf(self.manifest.type) === -1) {
        errors['InvalidOriginType'] = new Error(
          'Apps that are not privileged may not use the `origin` field of the manifest');
      } else {
        var pattern = new RegExp(common.properties.origin.pattern);

        if (pattern.test(clean(self.manifest.origin)) === false) {
          errors['InvalidOriginFormat'] = new Error(
            'Origin format is invalid');
        } else if (BANNED_ORIGINS.indexOf(self.manifest.origin.split('//')[1]) > -1) {
          errors['InvalidOriginReference'] = new Error(
            'App origins may not reference any of the following: ' + BANNED_ORIGINS.join(','));
        }
      }
    }
  };

  this.validate = function (content, options) {
    errors = {};
    warnings = {};

    this.options = options || {
      listed: false,
      packaged: false
    };

    hasValidJSON(content);
    hasValidSchema(self.manifest, common);

    hasValidDeveloperUrl();
    hasValidLaunchPath();
    hasValidIconSizeAndPath();
    hasValidVersion();
    hasValidDefaultLocale();
    hasValidInstallsAllowedFrom();
    hasValidScreenSize();
    hasValidMessages();
    hasValidType();
    hasValidAppCachePath();
    hasValidOrigin();

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
  }
};
*/
