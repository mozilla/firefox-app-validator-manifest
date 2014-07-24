'use strict';

var common = require('./rules/common.json');
var sMarketplace = require('./rules/marketplace.json');

// TODO: These constants should probably go somewhere better.
var DEFAULT_WEBAPP_MRKT_URLS = [
  'https://marketplace.firefox.com',
  'https://marketplace.allizom.org',
  'https://marketplace-dev.allizom.org'
];

var BANNED_ORIGINS = [
  'gaiamobile.org',
  'mozilla.com',
  'mozilla.org'
];

var Manifest = function () {

  this.manifest = {};

  var errors = {};
  var warnings = {};

  var self = this;

  this.validate = function (content, options) {
    errors = {};
    warnings = {};

    this.options = options || {
      listed: false,
      packaged: false
    };

    if (hasValidJSON(content)) {
      hasValidSchema(self.manifest, common);

      hasMaximumIdealLengthForName();
      hasValidDeveloperUrl();
      hasValidLaunchPath();
      hasValidIconSizeAndPath();
      hasValidVersion();
      hasValidDefaultLocale();
      hasValidInstallsAllowedFrom();
      hasValidMessages();
      hasValidType();
      hasValidAppCachePath();
      hasValidOrigin();
      hasValidRedirects();
      hasValidRole();
      hasValidPrecompile();
      hasValidPermissions();
      hasValidActivitiesFilters();
    }

    return {
      errors: errors,
      warnings: warnings
    };
  };

  var hasValidJSON = function (content) {
    var validJSON = true;

    try {
      if (typeof content !== 'object') {
        self.manifest = JSON.parse(content);
      } else {
        self.manifest = content;
      }
    } catch (err) {
      validJSON = false;
      errors['InvalidJSON'] = 'Manifest is not in a valid JSON format or has ' +
        'invalid properties';
    }

    return validJSON;
  };

  var hasValidSchema = function (subject, schema, name, parents) {
    name = ('undefined' === typeof name) ? '' : name;
    parents = ('undefined' === typeof parents) ? [] : parents;

    hasValidPropertyType(subject, schema, name, parents);

    if ('string' === typeof subject) {
      hasValidStringItem(subject, schema, name, parents);
      hasRequiredStringLength(subject, schema, name, parents);
      hasValidStringPattern(subject, schema, name, parents);
    }

    if ('[object Array]' === toString.call(subject)) {
      if (schema.items) {
        hasValidItemTypes(subject, schema, name, parents);
      }
    }

    if ('[object Object]' === toString.call(subject)) {
      hasMandatoryKeys(subject, schema, name, parents);
      hasRequiredPropertyCount(subject, schema, name, parents);

      // Collect a set of unexpected keys. Will be cleared out as they turn out
      // to have been expected per schema properties or patternProperties
      var unexpectedKeys = {};
      for (var k in subject) {
        unexpectedKeys[k] = true;
      }

      if (schema.properties) {
        for (var k in schema.properties) {
          if (subject.hasOwnProperty(k)) {
            delete unexpectedKeys[k];
            hasValidSchema(subject[k], schema.properties[k],
                           k, parents.concat([name]));
          }
        }
      }

      if (schema.patternProperties) {
        for (var k in subject) {
          for (var pattern in schema.patternProperties) {
            var patternSchema = schema.patternProperties[pattern];
            var re = new RegExp(pattern);
            if (re.test(k)) {
              delete unexpectedKeys[k];
              hasValidSchema(subject[k], patternSchema,
                             k, parents.concat([name]));
            }
          }
        }
      }

      var additional = schema.additionalProperties;
      if (additional) {
        for (var k in subject) {
          if (!schema.properties || !schema.properties.hasOwnProperty(k)) {
            hasValidSchema(subject[k], additional,
                           k, parents.concat([name]));
          }
        }
      } else if (false === additional) {
        // Now, how about those remaining unexpected keys...
        for (var k in unexpectedKeys) {
          errors[glueKey('UnexpectedProperty', parents, name)] = 'Unexpected property `' +
            k + '` found in `' + glueObjectPath('', parents, name) + '`';
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

    if (parents.length === 0 && self.options.listed) {
      keys = keys.concat(sMarketplace.required);
    }

    for (var i = 0; i < keys.length; i ++) {
      if (!subject || !subject[keys[i]]) {
        errors[glueKey('MandatoryField', parents, name, keys[i])] = 'Mandatory field ' +
          keys[i] + ' is missing';
      }
    }
  };

  var hasRequiredPropertyCount = function (subject, schema, name, parents) {
    var hasMax = schema.hasOwnProperty('maxProperties');
    var hasMin = schema.hasOwnProperty('minProperties');

    if (!(hasMin || hasMax)) {
      return;
    }

    var count = 0;
    for (var k in subject) {
      if (subject.hasOwnProperty(k)) {
        count++;
      }
    }

    if (hasMin && count < schema.minProperties) {
      errors[glueKey('InvalidPropertyCount', parents, name)] = '`' + name +
        '` must have at least ' + schema.minProperties + ' properties.';
    }

    if (hasMax && count > schema.maxProperties) {
      errors[glueKey('InvalidPropertyCount', parents, name)] = '`' + name +
        '` must have no more than ' + schema.maxProperties + ' properties.';
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
    } else if ('number' === type) {
      if (!/^[\d\.]+$/.test(prop)) {
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
      errors[glueKey('InvalidPropertyType', parents, name)] = '`' + name +
        '` must be of type `' + type + '`';
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
          errors[glueKey('InvalidItemType', parents, name)] = 'items of array `' +
            name + '` must be of type `' + type + '`';
        }

        if ('[object Object]' === toString.call(itemSubject)) {
          hasValidSchema(itemSubject, itemSchema, i, parents.concat([name]));
        }
      }
    }
  };

  var hasValidStringItem = function (subject, schema, name, parents) {
    if (schema.oneOf && schema.oneOf.indexOf(subject) === -1) {
      errors[glueKey('InvalidStringType', parents, name)] = '`' + name +
        '` must be one of the following: ' + schema.oneOf.toString();
    } else if (schema.anyOf) {
      subject.split(',').forEach(function (v) {
        if (schema.anyOf.indexOf(v.trim()) === -1) {
          errors[glueKey('InvalidStringType', parents, name)] = '`' + name +
            '` must be any of the following: ' + schema.anyOf.toString();
        }
      });
    }
  };

  var hasRequiredStringLength = function (subject, schema, name, parents) {
    if (schema.minLength && subject.toString().length < schema.minLength) {
      errors[glueKey('InvalidPropertyLength', parents, name)] = '`' + name +
        '` must be at least ' + schema.minLength + ' in length';
    }

    if (schema.maxLength && subject.toString().length > schema.maxLength) {
      errors[glueKey('InvalidPropertyLength', parents, name)] = '`' + name +
        '` must not exceed length ' + schema.maxLength;
    }
  };

  var hasMaximumIdealLengthForName = function () {
    if (self.manifest.name && self.manifest.name.length > 12) {
      warnings['PropertyLengthTooLongName'] = "Your app's name is longer " +
        "than 12 characters and may be truncated on Firefox OS devices. Consider " +
        "using a shorter name for your app";
    }
  };

  var hasValidStringPattern = function (subject, schema, name, parents) {
    if (schema.pattern) {
      var re = new RegExp(schema.pattern);
      if (!re.test(subject)) {
        errors[glueKey('InvalidStringPattern', parents, name)] = '`' + name +
          '` must match the pattern /' + schema.pattern +'/';
      }
    }
  };

  var hasValidDeveloperUrl = function () {
    if (self.manifest.developer && self.manifest.developer.url) {
      if (!pathValid(self.manifest.developer.url, {canHaveProtocol: true})) {
        errors.InvalidDeveloperUrl = 'Developer URL must be an absolute HTTP ' +
          'or HTTPS URL';
      }
    }
  };

  var hasValidLaunchPath = function () {
    if (self.options.packaged && !self.manifest.launch_path) {
      errors.InvalidPackagedRequiresLaunchPath =
        '`launch_path` is required when app is packaged';
    }
  };

  // Icon validation is based on a key name that is tied to the icon size. Can't set this in the schema
  // if it is an arbitrary natural number, so this will suffice for current manifest validation.
  var hasValidIconSizeAndPath = function () {
    if (self.manifest.icons) {
      var icons = self.manifest.icons;
      if (self.options.listed && !icons.hasOwnProperty('128')) {
        errors['InvalidListedRequires128Icon'] =
          '`icons` must include a 128x128 icon when app is listed';
      }
      for (var k in icons) {
        var key = parseInt(k, 10);

        if (isNaN(key) || key < 1) {
          errors['InvalidIconSize' + camelCase(k)] = 'Icon size must be a natural number';
        }

        if (!icons[k] || icons[k].length < 1) {
          errors['InvalidIconPath' + camelCase(k)] = 'Paths to icons must be ' +
            'absolute paths, relative URIs, or data URIs';
        }
      }
    }
  };

  var hasValidVersion = function () {
    if (self.manifest.version) {
      var pattern = new RegExp(common.properties.version.pattern);

      if (pattern.test(clean(self.manifest.version)) === false) {
        errors.InvalidVersion = '`version` is in an invalid format.';
      }
    }
  };

  var hasValidDefaultLocale = function () {
    // only relevant if locales property is not empty
    var error = '`default_locale` must match one of the keys in `locales`';

    if (self.manifest.locales) {
      if (!self.manifest.default_locale) {
        errors.InvalidDefaultLocale = error;
      } else {
        var languages = [];

        for (var i in self.manifest.locales) {
          languages.push(i);
        }

        if (languages.indexOf(self.manifest.default_locale) === -1) {
          errors.InvalidDefaultLocale = error;
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
      errors['Invalid' + subkey + 'InstallsAllowedFrom'] = msg;
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

  var hasValidType = function () {
    var type = self.manifest.type;

    if (!type) {
      return;
    }

    if (self.options.listed && 'certified' === self.manifest.type) {
      errors.InvalidTypeCertifiedListed = '`certified` apps cannot be listed';
    }

    if (!self.options.packaged && 'web' !== self.manifest.type) {
      errors.InvalidTypeWebPrivileged = 'unpackaged web apps may not have a ' +
        'type of `certified` or `privileged`';
    }
  };

  var hasValidAppCachePath = function () {
    var appcachePath = self.manifest.appcache_path;

    if (appcachePath) {
      if (self.options.packaged && appcachePath) {
        errors.InvalidAppCachePathType = "packaged apps cannot use Appcache. " +
          "The `appcache_path` field should not be provided in a packaged app's manifest";
      }

      if (!pathValid(appcachePath, {canHaveProtocol: true})) {
        errors.InvalidAppCachePathURL = 'The `appcache_path` must be a full, ' +
          'absolute URL to the application cache manifest';
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
        errors.InvalidMessagesEntry = 'objects in array `messages` must each ' +
          'have only one property';
      }
    }
  };

  var hasValidOrigin = function () {
    if (self.manifest.origin) {
      if (['certified', 'privileged'].indexOf(self.manifest.type) === -1) {
        errors.InvalidOriginType = 'Apps that are not privileged may not use ' +
          'the `origin` field of the manifest';
      } else {
        var pattern = new RegExp(common.properties.origin.pattern);

        if (pattern.test(clean(self.manifest.origin)) === false) {
          errors.InvalidOriginFormat = 'Origin format is invalid';
        } else if (BANNED_ORIGINS.indexOf(self.manifest.origin.split('//')[1]) > -1) {
          errors.InvalidOriginReference = 'App origins may not reference any ' +
            'of the following: ' + BANNED_ORIGINS.join(',');
        }
      }
    }
  };

  var hasValidRedirects = function () {
    if (self.manifest.redirects) {
      if (['certified', 'privileged'].indexOf(self.manifest.type) === -1) {
        errors.InvalidRedirectsType = 'Apps that are not privileged may not use ' +
          'the `redirects` field of the manifest';
      }
    }
  };

  var hasValidRole = function () {
    if (self.manifest.role) {
      if (['certified', 'privileged'].indexOf(self.manifest.type) === -1) {
        errors.InvalidRoleType = 'Apps that are not privileged may not use ' +
          'the `role` field of the manifest';
      }
    }
  }

  var hasValidPrecompile = function () {
    if (self.manifest.precompile) {
      if (!self.options.packaged) {
        errors.InvalidPrecompileType = 'Apps that are not packaged may not use ' +
          'the `precompile` field of the manifest';
      }
    }
  };

  var hasValidPermissions = function () {
    var permissions = self.manifest.permissions;

    if (!permissions || !('object' === typeof permissions)) {
      return;
    }

    var type = self.manifest.type || 'web';
    var expectedPermissions = self.PERMISSIONS[type];
    if (!expectedPermissions) {
      return;
    }

    for (var name in permissions) {

      if (expectedPermissions.indexOf(name) === -1) {
        errors['InvalidPermissionForType' + camelCase(type)] =
          'Permissions for type `'+ type + '` must be one of ' +
          expectedPermissions.join(', ');
      }

      var schema = PERMISSION_SCHEMA;
      if (self.PERMISSIONS_ACCESS[name]) {
        schema.required = ['description', 'access'];
        schema.properties.access = PERMISSION_ACCESS_SCHEMA;
        schema.properties.access.oneOf = self.PERMISSIONS_ACCESS[name];
      } else {
        schema.required = ['description'];
        if (schema.access) {
          delete schema.access;
        }
      }
      hasValidSchema(permissions[name], schema, name, ['permissions']);

    }
  };

  var PERMISSION_SCHEMA = {
      "type": "object",
      "required": ["description"],
      "additionalProperties": false,
      "properties": {
          "description": { "type": "string" }
      }
  };

  var PERMISSION_ACCESS_SCHEMA = {
      "type": "string",
      "oneOf": ["readonly", "readwrite", "readcreate", "createonly"]
  }

  this.PERMISSIONS = {
    web: [
      'alarms', 'audio-capture', 'audio-channel-content',
      'audio-channel-normal', 'desktop-notification', 'fmradio',
      'geolocation', 'push', 'storage', 'video-capture'
    ],
    privileged: [
      'audio-channel-alarm', 'audio-channel-notification', 'browser', 'camera',
      'contacts', 'device-storage:pictures', 'device-storage:videos',
      'device-storage:music', 'device-storage:sdcard', 'feature-detection',
      'input', 'mobileid', 'mobilenetwork', 'moz-attention',
      'moz-audio-channel-ringer', 'moz-audio-channel-telephony',
      'moz-firefox-accounts', 'speaker-control', 'systemXHR', 'tcp-socket'
    ],
    certified: [
      'attention', 'audio-channel-publicnotification', 'audio-channel-ringer',
      'audio-channel-telephony', 'background-sensors', 'backgroundservice',
      'bluetooth', 'cellbroadcast', 'downloads', 'deprecated-hwvideo',
      'device-storage:apps', 'device-storage:crashes', 'embed-apps',
      'firefox-accounts', 'idle', 'input-manage', 'networkstats-manage', 'nfc',
      'nfc-manager', 'open-remote-window', 'permissions', 'phonenumberservice', 
      'power', 'resourcestats-manage', 'settings', 'sms', 'telephony', 'time',
      'voicemail', 'webapps-manage', 'wifi-manage', 'wappush'
    ]
  };

  var _FULL_PERMISSIONS = ['readonly', 'readwrite', 'readcreate', 'createonly'];

  this.PERMISSIONS_ACCESS = {
    contacts: _FULL_PERMISSIONS,
    'device-storage:apps': _FULL_PERMISSIONS,
    'device-storage:music': _FULL_PERMISSIONS,
    'device-storage:pictures': _FULL_PERMISSIONS,
    'device-storage:sdcard': _FULL_PERMISSIONS,
    'device-storage:videos': _FULL_PERMISSIONS,
    settings: ['readonly', 'readwrite']
  };

  var hasValidActivitiesFilters = function () {
    var activities = self.manifest.activities;
    if (activities) {

      for (var activityName in activities) {
        var activity = activities[activityName];

        if (activity.filters) {

          for (var filterName in activity.filters) {
            var filter = activity.filters[filterName];

            var isArray = '[object Array]' === toString.call(filter);
            var isString = 'string' === typeof filter;
            var isObject = 'object' === typeof filter;

            if (!(isArray || isString || isObject)) {

              errors.InvalidActivitiesFilter =
                'Activity filters must be of type `array`, `string`, or `object`';

            } else if (isObject && !isArray) {

              hasValidSchema(filter, ACTIVITY_FILTER_OBJECT_SCHEMA,
                             filterName, ['filters', activityName]);

              if (filter.hasOwnProperty('value')) {

                var value = filter.value;
                var valueIsArray ='[object Array]' === toString.call(value)

                if (!(valueIsArray || 'string' === typeof value)) {

                  errors.InvalidActivitiesFilterValue =
                    'Activity filter value property must be of type `array` or `string`';

                } else if (valueIsArray) {

                  hasValidSchema(value, ACTIVITY_FILTER_OBJECT_VALUE_SCHEMA,
                                 'value', ['filters', activityName]);

                }
              }
            }
          }
        }
      }
    }
  };

  var ACTIVITY_FILTER_OBJECT_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
      required: { type: 'boolean' },
      min: { type: 'number' },
      max: { type: 'number' },
      pattern: { type: 'string' },
      patternFlags: {
        type: 'string',
        maxLength: 4,
        pattern: '^[igmy]+$'
      },
      // NOTE: This is funky, because `value` can be a string or an array, so
      // it needs special validation below.
      value: { }
    }
  };

  // But if `value` is an array, it should only have strings...
  var ACTIVITY_FILTER_OBJECT_VALUE_SCHEMA = {
    type: 'array',
    items: {
      type: 'string'
    }
  };

};

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
    if (/^\d+$/.test(item)) {
      return 'Item';
    } else {
      return camelCase(item);
    }
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

module.exports = Manifest;
