process.env.NODE_ENV = 'test';

var should = require('should');
var Manifest = require('../index');
var m = new Manifest();
var common;

describe('validate', function () {
  beforeEach(function () {
    common = {
      description: 'test app',
      name: 'app',
      developer: {
        name: 'Some Dev'
      }
    };
  });

  it('should return an invalid manifest object', function () {
    var results = m.validate('');
    results.errors.InvalidJSON.should.equal('Manifest is not in a valid JSON ' +
      'format or has invalid properties');
  });

  it('should be invalid if `widgets` is included', function () {
    common.widgets = {};

    var results = m.validate(common);
    results.errors.UnexpectedProperty.should.equal('Unexpected property `widgets` found in ``');
  });

  it('should return an invalid manifest with missing mandatory keys for the marketplace', function () {
    var results = m.validate({});

    ['name', 'description', 'developer'].forEach(function (f) {
      var currKey = results.errors['MandatoryField' + f.charAt(0).toUpperCase() + f.slice(1)];
      currKey.should.equal('Mandatory field ' + f + ' is missing');
    });
  });

  it('should return an invalid manifest with missing mandatory keys for non-marketplace', function () {
    content = '{}';
    m.appType = '';

    var results = m.validate(content);

    ['name', 'description'].forEach(function (f) {
      var currKey = results.errors['MandatoryField' + f.charAt(0).toUpperCase() + f.slice(1)];
      currKey.should.equal('Mandatory field ' + f + ' is missing');
      should.not.exist(results.errors.MandatoryFieldDeveloper);
    });
  });

  describe('launch_path', function () {
    it('should return an invalid property type', function () {
      common.launch_path = [];

      var results = m.validate(common);
      results.errors.InvalidPropertyTypeLaunchPath.should.equal(
        "`launch_path` must be of type `string`");
    });

    it('should return an invalid launch path', function () {
      common.launch_path = '//';

      var results = m.validate(common);
      results.errors.InvalidLaunchPath.should.equal("`launch_path` must be a path relative to app's origin");
    });

    it('should return a valid launch path', function () {
      common.launch_path = '/';

      var results = m.validate(common);
      should.not.exist(results.errors.InvalidLaunchPath);
    });
  });

  describe('icons', function () {
    it('should have an invalid icon size and invalid icon path', function () {
      common.icons = {
        a: ''
      };

      var results = m.validate(common);

      results.errors.InvalidIconSizeA.should.equal('Icon size must be a natural number');
      results.errors.InvalidIconPathA.should.equal(
        'Paths to icons must be absolute paths, relative URIs, or data URIs');
    });

    it('should have a valid icon size and valid icon path', function () {
      common.icons = {
        '128': '/path/to/icon.png'
      };

      var results = m.validate(common);

      should.not.exist(results.errors.InvalidIconSize128);
      should.not.exist(results.errors.InvalidIconPath128);
    });
  });

  describe('default_locale', function () {
    it('should have an invalid length if a minLength is provided', function () {
      common.default_locale = '';

      var results = m.validate(common);
      results.errors.InvalidPropertyLengthDefaultLocale.should.equal(
        '`default_locale` must be at least 1 in length');
    });

    it('should have a valid length if a minLength is provided', function () {
      common.default_locale = 'en';

      var results = m.validate(common);

      should.not.exist(results.errors.InvalidPropertyLengthDefaultLocale);
    });

    it('should have an invalid default_locale', function () {
      common.locales = {
        es: {}
      };

      var results = m.validate(common);
      results.errors.InvalidDefaultLocale.should.equal(
        '`default_locale` must match one of the keys in `locales`');
    });

    it('should have a valid default_locale', function () {
      common.locales = {
        es: {}
      };

      common.default_locale = 'es';

      var results = m.validate(common);
      results.errors.should.be.empty;
    });
  });

  describe('name', function () {
    it('should have an invalid length if a maxLength is provided', function () {
      common.name = Array(130).join('x');

      var results = m.validate(common);
      results.errors.InvalidPropertyLengthName.should.equal(
        '`name` must not exceed length 128');
    });

    it('should have a valid length if a maxLength is provided', function () {
      common.name = 'my app';

      var results = m.validate(common);
      should.not.exist(results.errors.InvalidPropertyLengthName);
    });

    it('should return a warning if the `name` field is longer than 12 characters', function () {
      common.name = Array(14).join('x');

      var results = m.validate(common);
      results.warnings.PropertyLengthTooLongName.should.equal(
        "Your app's name is longer than 12 characters and may be truncated " +
        "on Firefox OS devices. Consider using a shorter name for your app");
    });
  });

  describe('developer', function () {
    it('should have an invalid developer name if empty', function () {
      common.developer = {
        name: ''
      };

      var results = m.validate(common);
      results.errors.InvalidPropertyLengthDeveloperName.should.equal(
        '`name` must be at least 1 in length');
    });

    it('should have an invalid developer name if not string', function () {
      common.developer = {
        name: {
          'I have': 'no idea what I am doing'
        }
      };

      var results = m.validate(common);

      results.errors.InvalidPropertyTypeDeveloperName.should.equal('`name` must be of type `string`');
    });

    it('should have an invalid developer property if name is missing', function () {
      common.developer = {};

      var results = m.validate(common);

      results.errors.MandatoryFieldDeveloperName.should.equal('Mandatory field name is missing');
    });

    it('should have an invalid developer url error if url invalid', function () {
      common.developer = {
        name: 'Doge',
        url: 'foo'
      };
      var results = m.validate(common);
      results.errors.InvalidDeveloperUrl.should.equal('Developer URL must be an ' +
        'absolute HTTP or HTTPS URL');
    });

    it('should have no error for an unexpected developer property', function () {
      common.developer = {
        name: 'doge',
        yo: 'doge'
      };

      (function () {
        var results = m.validate(common);
      }).should.not.throw();
    });
  });

  describe('version', function () {
    it('should have an invalid version', function () {
      common.version = 'v1.0!!';

      var results = m.validate(common);
      results.errors.InvalidVersion.should.equal('`version` is in an invalid format.');
    });

    it('should have a valid version', function () {
      common.version = 'v1.0';

      var results = m.validate(common);
      results.errors.should.be.empty;
    });
  });

  describe('role', function () {
    it('should have an invalid string type for oneOf', function () {
      common.role = 'test';

      var results = m.validate(common);
      results.errors.InvalidStringTypeRole.should.equal(
        '`role` must be one of the following: system,input,homescreen');
    });

    it('should have a valid string type for oneOf', function () {
      common.role = 'system';

      var results = m.validate(common);
      results.errors.should.be.empty;
    });
  });

  describe('orientation', function () {
    it('should have an invalid string type for anyOf', function () {
      common.orientation = 'test';

      var results = m.validate(common);
      results.errors.InvalidStringTypeOrientation.should.equal(
        '`orientation` must be any of the following: portrait,landscape,' +
        'portrait-secondary,landscape-secondary,portrait-primary,landscape-primary');
    });

    it('should have a valid string type for anyOf', function () {
      common.orientation = 'portrait, landscape';

      var results = m.validate(common);
      results.errors.should.be.empty;
    });
  });

  describe('installs_allowed_from', function () {
    it('should be valid when installs_allowed_from is an array', function () {
      common.installs_allowed_from = [
        'https://apps.lmorchard.com'
      ];

      var results = m.validate(common);
      results.errors.should.be.empty;
    });

    it('should be valid when installs_allowed_from contains a wildcard', function () {
      common.installs_allowed_from = [
        '*'
      ];

      var results = m.validate(common);
      results.errors.should.be.empty;
    });

    it('should have an invalid type for installs_allowed_from when not an array', function () {
      common.installs_allowed_from = 'THIS IS NOT A LIST';

      var results = m.validate(common);
      results.errors.InvalidPropertyTypeInstallsAllowedFrom.should.equal(
        '`installs_allowed_from` must be of type `array`');
    });

    it('should have an invalid error for installs_allowed_from when any array item is not a string', function () {
      common.installs_allowed_from = [
        {
          this: 'is not a string'
        }
      ];

      var results = m.validate(common);
      results.errors.InvalidArrayOfStringsInstallsAllowedFrom.should.equal(
        '`installs_allowed_from` must be an array of strings');
    });

    it('should be invalid when installs_allowed_from is present but empty', function () {
      common.installs_allowed_from = [];

      var results = m.validate(common);
      results.errors.InvalidEmptyInstallsAllowedFrom.should.equal(
        '`installs_allowed_from` cannot be empty when present');
    });

    it('should be invalid when installs_allowed_from list contains an invalid URL', function () {
      common.installs_allowed_from = [
        'foo/bar'
      ];

      var results = m.validate(common);
      results.errors.InvalidUrlInstallsAllowedFrom.should.equal(
        '`installs_allowed_from` must be a list of valid absolute URLs or `*`');
    });

    it('should be invalid when installs_allowed_from has no marketplace URLs but listed is true', function () {
      common.installs_allowed_from = [
        'https://apps.lmorchard.com'
      ];

      var results = m.validate(common, {listed: true});
      results.errors.InvalidListedRequiresMarketplaceUrlInstallsAllowedFrom.should.equal(
        '`installs_allowed_from` must include a Marketplace URL when app is listed');
    });

    it('should be invalid when installs_allowed_from has no Marketplace URLs, but listed is true', function () {
      common.installs_allowed_from = [
        'https://apps.lmorchard.com'
      ];

      var results = m.validate(common, {listed: true});
      results.errors.InvalidListedRequiresMarketplaceUrlInstallsAllowedFrom.should.equal(
        '`installs_allowed_from` must include a Marketplace URL when app is listed');
    });

    it('should be invalid when installs_allowed_from contains a Marketplace URL with http', function () {
      common.installs_allowed_from = [
        "http://marketplace.firefox.com"
      ];

      var results = m.validate(common);
      results.errors.InvalidSecureMarketplaceUrlInstallsAllowedFrom.should.equal(
        '`installs_allowed_from` must use https:// when Marketplace URLs are included');
    });
  });

  describe('screen_size', function () {
    it('should be invalid when screen_size is not an object', function () {
      common.screen_size = 'NOT AN OBJECT';

      var results = m.validate(common);
      results.errors.InvalidPropertyTypeScreenSize.should.equal(
        '`screen_size` must be of type `object`');
    });

    it('should be invalid when screen_size is an empty object', function () {
      common.screen_size = {};

      var results = m.validate(common);
      results.errors.InvalidEmptyScreenSize.should.equal(
        '`screen_size` should have at least min_height or min_width');
    });

    it('should be valid when screen_size.min_width is a number', function () {
      common.screen_size = {
        min_width: '640'
      };

      var results = m.validate(common);
      results.errors.should.be.empty;
    });

    it('should be invalid when screen_size.min_width is not a number', function () {
      common.screen_size = {
        min_width: 'NOT A NUMBER'
      };

      var results = m.validate(common);
      results.errors.InvalidNumberScreenSizeMinWidth.should.equal(
        '`min_width` must be a number');
    });

    it('should be valid when screen_size.min_height is a number', function () {
      common.screen_size = {
        min_height: '480'
      };

      var results = m.validate(common);
      results.errors.should.be.empty;
    });

    it('should be invalid when screen_size.min_height is not a number', function () {
      common.screen_size = {
        min_height: 'NOT A NUMBER'
      };

      var results = m.validate(common);
      results.errors.InvalidNumberScreenSizeMinHeight.should.equal(
        '`min_height` must be a number');
    });
  });

  describe('type', function () {
    it('should be valid when type is one of the expected values', function () {
      var types = {
        web: {},
        privileged: {
          listed: true,
          packaged: true
        },
        certified: {
          packaged: true
        }
      };

      for(var type in types) {
        common.type = type;

        var results = m.validate(common, types[type]);
        results.errors.should.not.exist;
      }
    });

    it('should be invalid when type is not one of web, privileged, or certified', function () {
      common.type = 'bonafide';

      var results = m.validate(common);
      results.errors.InvalidStringTypeType.should.equal(
        '`type` must be one of the following: web,privileged,certified');
    });

    it('should be invalid when type is not a string', function () {
      common.type = ['NOT', 'A', 'STRING'];

      var results = m.validate(common);
      results.errors.InvalidPropertyTypeType.should.equal(
        '`type` must be of type `string`');
    });

    it('should be invalid when type is certified but app is listed', function () {
      common.type = 'certified';

      var results = m.validate(common, {listed: true});
      results.errors.InvalidTypeCertifiedListed.should.equal(
        '`certified` apps cannot be listed');
    });

    it('should be invalid when type is not web but app is not packaged', function () {
      common.type = 'privileged';

      var results = m.validate(common, {packaged: false});
      results.errors.InvalidTypeWebPrivileged.should.equal(
        'unpackaged web apps may not have a type of `certified` or `privileged`');
    });
  });

  describe('fullscreen', function () {
    it('should be valid when fullscreen is "true" or "false"', function () {
      ['true', 'false'].forEach(function (val) {
        common.fullscreen = val;

        var results = m.validate(common);
        results.errors.should.be.empty;
      });
    });

    it('should be invalid when fullscreen is not "true" or "false"', function () {
      common.fullscreen = 'maybe';

      var results = m.validate(common);
      results.errors.InvalidStringTypeFullscreen.should.equal(
        '`fullscreen` must be one of the following: true,false');
    });

    it('should be invalid when fullscreen is not a string', function () {
      common.fullscreen = ['NOT', 'A', 'STRING'];

      var results = m.validate(common);
      results.errors.InvalidPropertyTypeFullscreen.should.equal(
        '`fullscreen` must be of type `string`');
    });
  });

  describe('redirects', function () {
    it('should be valid when redirects is an array of objects with expected properties', function () {
      common.redirects = [
        {
          to: 'asdf',
          from: 'qwer'
        },
        {
          to: 'asdf',
          from: 'qwer'
        }
      ];

      var results = m.validate(common);
      results.errors.should.be.empty;
    });

    it('should be invalid when redirects is not an array', function () {
      common.redirects = 'NOT AN ARRAY';

      var results = m.validate(common);
      results.errors.InvalidPropertyTypeRedirects.should.equal(
        '`redirects` must be of type `array`');
    });

    it('should be invalid when redirects is not an array of objects', function () {
      common.redirects = [
        'asdf',
        {
          to: 'asdf',
          from: 'qwer'
        }
      ];

      var results = m.validate(common);
      results.errors.InvalidItemTypeRedirects.should.equal(
        'items of array `redirects` must be of type `object`');
    });

    it('should be invalid when redirects is not an array of objects with string values', function () {
      common.redirects = [
        {
          to: ['NOT', 'A', 'STRING'],
          from: 'qwer'
        }
      ];

      var results = m.validate(common);
      results.errors.InvalidPropertyTypeRedirectsItemTo.should.equal(
        '`to` must be of type `string`');
    });

    it('should be invalid when redirect items have unexpected properties', function () {
      common.redirects = [
        {
          bar: 'asdf',
          foo: 'qwer'
        },
        {
          to: 'asdf',
          from: 'qwer'
        }
      ];

      var results = m.validate(common);
      results.errors.UnexpectedPropertyRedirectsItem.should.equal(
        'Unexpected property `foo` found in `redirects.0`');
    });
  });

  describe('chrome', function () {
    it('should be valid when chrome is an object with a boolean navigation property', function () {
      [true, false].forEach(function (val) {
        common.chrome = {
          navigation: val
        };

        var results = m.validate(common);
        results.errors.should.be.empty;
      });
    });

    it('should be invalid when chrome is not an object', function () {
      common.chrome = ['NOT', 'AN', 'OBJECT'];

      var results = m.validate(common);
      results.errors.InvalidPropertyTypeChrome.should.equal(
        '`chrome` must be of type `object`');
    });

    it('should be invalid when chrome.navigation is not boolean', function () {
      common.chrome = {
        navigation: 'woofwoof'
      };

      var results = m.validate(common);
      results.errors.InvalidPropertyTypeChromeNavigation.should.equal(
        '`navigation` must be of type `boolean`');
    });

    it('should be invalid when chrome is an object with unexpected properties', function () {
      common.chrome = {
        shiny: true
      };

      var results = m.validate(common);
      results.errors.UnexpectedPropertyChrome.should.equal(
        'Unexpected property `shiny` found in `chrome`');
    });
  });

  describe('appcache_path', function () {
    it('should be an invalid appcache_path if it is a packaged app', function () {
      common.appcache_path = 'http://kittens.com';

      var results = m.validate(common, {packaged: true});
      results.errors.InvalidAppCachePathType.should.equal(
        "packaged apps cannot use Appcache. The `appcache_path` field " +
        "should not be provided in a packaged app's manifest")
    });

    it('should be an invalid appcache_path if it is not an absolute URL', function () {
      common.appcache_path = '/some/relative/url';

      var results = m.validate(common);
      results.errors.InvalidAppCachePathURL.should.equal(
        'The `appcache_path` must be a full, absolute URL to the application ' +
        'cache manifest');
    });

    it('should be a valid appcache_path', function () {
      common.appcache_path = 'http://kittens.com';

      var results = m.validate(common);
      results.errors.should.be.empty;
    });
  });

  describe('inputs', function () {
    it('should be valid with expected content', function () {
      common.inputs = {
        input: {
          name: 'Symbols',
          description: 'Symbols Virtual Keyboard',
          launch_path: '/input1.html',
          types: ['text']
        },
        siri: {
          name: 'Voice Control',
          description: 'Voice Control Input',
          launch_path: '/vc.html',
          types: ['text', 'url']
        }
      };

      var results = m.validate(common);
      results.errors.should.be.empty;
    });

    it('should be invalid when not an object', function () {
      common.inputs = 'NOT AN OBJECT';

      var results = m.validate(common);
      results.errors.InvalidPropertyTypeInputs.should.equal(
        '`inputs` must be of type `object`');
    });

    it('should be invalid when an entry is not an object', function () {
      common.developer = {
        name: 'Frank'
      };

      common.inputs = {
        input1: 'i like turtles'
      };

      var results = m.validate(common);
      results.errors.InvalidPropertyTypeInputsInput1.should.equal(
        '`input1` must be of type `object`');
    });

    it('should be invalid when an entry is missing `name`', function () {
      common.inputs = {
        input1: {
          description: 'Symbols Virtual Keyboard',
          launch_path: '/input1.html',
          types: ['text']
        }
      };

      var results = m.validate(common);
      results.errors.MandatoryFieldInputsInput1Name.should.equal(
        'Mandatory field name is missing');
    });

    it('should be invalid when an entry is missing `description`', function () {
      common.inputs = {
        input1: {
          name: 'Symbols',
          launch_path: '/input1.html',
          types: ['text']
        }
      };

      var results = m.validate(common);
      results.errors.MandatoryFieldInputsInput1Description.should.equal(
        'Mandatory field description is missing');
    });

    it('should be invalid when an entry is missing `launch_path`', function () {
      common.inputs = {
        input1: {
          name: 'Symbols',
          description: 'Symbols Virtual Keyboard',
          types: ['text']
        }
      };

      var results = m.validate(common);
      results.errors.MandatoryFieldInputsInput1LaunchPath.should.equal(
        'Mandatory field launch_path is missing');
    });

    it('should be invalid when an entry is missing `types`', function () {
      common.inputs = {
        input1: {
          name: 'Symbols',
          launch_path: '/input1.html',
          description: 'Symbols Virtual Keyboard'
        }
      };

      var results = m.validate(common);
      results.errors.MandatoryFieldInputsInput1Types.should.equal(
        'Mandatory field types is missing');
    });

    it('should be invalid when an entry has an incorrect `types` value', function () {
      common.inputs = {
        input1: {
          name: 'Symbols',
          description: 'Symbols Virtual Keyboard',
          launch_path: '/input1.html',
          types: ['foo']
        }
      };

      var results = m.validate(common);
      results.errors.should.be.empty;
    });

    it('should be valid with valid `locales` object', function () {
      common.inputs = {
        input1: {
          name: 'Symbols',
          description: 'Symbols Virtual Keyboard',
          launch_path: '/input1.html',
          types: ['text'],
          locales: {
            es: {
              name: 'foo',
              description: 'bar'
            }
          }
        }
      };

      var results = m.validate(common);
      results.errors.should.be.empty;
    });

    it('should be invalid with invalid `locales` object', function () {
      common.inputs = {
        input1: {
          name: 'Symbols',
          description: 'Symbols Virtual Keyboard',
          launch_path: '/input1.html',
          types: ['text'],
          locales: {
            es: {
              name: 'foo',
              description: 'bar',
              foo: 'bar2'
            }
          }
        }
      };

      var results = m.validate(common);
      results.errors.should.not.be.empty;
    });

  });

  describe('required_features', function () {
    it('should be invalid when not an array', function () {
      common.required_features = 'pew pew pew';

      var results = m.validate(common);
      results.errors.InvalidPropertyTypeRequiredFeatures.should.equal(
        '`required_features` must be of type `array`');
    });

    it('should be invalid when not an array of strings', function () {
      common.required_features = [
        {
          what: 'i dont even'
        }
      ];

      var results = m.validate(common);
      results.errors.InvalidItemTypeRequiredFeatures.should.equal(
        'items of array `required_features` must be of type `string`');
    });

    it('should be valid when an empty array', function () {
      common.required_features = [];

      var results = m.validate(common);
      results.errors.should.be.empty;
    });
  });

  describe('messages', function () {
    it('should be invalid when not an array', function () {
      common.messages = 'pew pew pew';

      var results = m.validate(common);
      results.errors.InvalidPropertyTypeMessages.should.equal(
        '`messages` must be of type `array`');
    });

    it('should be invalid when not an array of objects', function () {
      common.messages = ['THESE', 'ARE', 'NOT', 'OBJECTS'];

      var results = m.validate(common);
      results.errors.InvalidItemTypeMessages.should.equal(
        'items of array `messages` must be of type `object`');
    });

    it('should be invalid when an item is an object with more than one property', function () {
      common.messages = [
        {
          alarm: '/foo.html'
        },
        {
          this: 'is',
          an: 'invalid',
          entry: 'doh'
        },
        {
          notification: '/bar.html'
        }
      ];

      var results = m.validate(common);
      results.errors.InvalidMessagesEntry.should.equal(
        'objects in array `messages` must each have only one property');
    });
  });

  describe('origin', function () {
    it('should be invalid when the origin is in the incorrect format', function () {
      common.type = 'privileged';
      common.origin = '1';

      var results = m.validate(common);
      results.errors.InvalidOriginFormat.should.equal('Origin format is invalid');
    });

    it('should be invalid when the app is not privileged', function () {
      common.type = 'web';
      common.origin = 'app://validurl.com';

      var results = m.validate(common);
      results.errors.InvalidOriginType.should.equal(
        'Apps that are not privileged may not use the `origin` field of the manifest');
    });

    it('should be invalid when the app has an banned origin', function () {
      common.type = 'privileged';
      common.origin = 'app://mozilla.org';

      var results = m.validate(common, {packaged: true});
      results.errors.InvalidOriginReference.should.equal(
        'App origins may not reference any of the following: ' +
        'gaiamobile.org,mozilla.com,mozilla.org');
    });

    it('should be valid when the app is privileged and has a valid origin', function () {
      common.type = 'privileged';
      common.origin = 'app://validurl.com';

      var results = m.validate(common, {packaged: true});
      results.errors.should.be.empty;
    });
  });

  describe('activities', function () {

    beforeEach(function () {
      common.activities = {
        simple: {
          href: 'foo.html',
          disposition: 'window',
          returnValue: true,
          filters: {
            target: "device",
            type: ["image/png", "image/gif"],
            url: {
              required: true,
              value: 'hi',
              min: 10,
              max: 100,
              pattern: '^https?:',
              patternFlags: 'gi',
              // regexp: Not relevant here because you can't use a regex in JSON
            }
          }
        }
      };
    });

    it('should be valid with minimal properties', function () {
      common.activities = {
        simple: {
          href: 'foo.html'
        }
      };

      var results = m.validate(common);
      results.errors.should.be.empty;
      results.warnings.should.be.empty;
    });

    it('should be valid with all valid activity properties', function () {
      var results = m.validate(common);
      results.errors.should.be.empty;
      results.warnings.should.be.empty;
    });

    it('should be invalid when not an object', function () {
      common.activities = 'HONK HONK';

      var results = m.validate(common);
      results.errors.InvalidPropertyTypeActivities.should.equal(
        '`activities` must be of type `object`');
    });

    it('should be invalid when not an empty object', function () {
      common.activities = {};

      var results = m.validate(common);
      results.errors.InvalidPropertyCountActivities.should.equal(
        '`activities` must have at least 1 properties.');
    });

    it('should be invalid when properties are not objects', function () {
      common.activities = {
        foo: 'HONK HONK'
      };

      var results = m.validate(common);
      results.errors.InvalidPropertyTypeActivitiesFoo.should.equal(
        '`foo` must be of type `object`');
    });

    it('should be invalid when properties are missing `href`', function () {
      delete common.activities.simple.href;

      var results = m.validate(common);
      results.errors.MandatoryFieldActivitiesSimpleHref.should.equal(
        'Mandatory field href is missing');
    });

    it('should be invalid when activities have unexpected properties', function () {
      common.activities.simple.foo = 'bar';

      var results = m.validate(common);
      results.errors.UnexpectedPropertyActivitiesSimple.should.equal(
        'Unexpected property `foo` found in `activities.simple`');
    });

    it('should be invalid with unexpected `disposition` values', function () {
      common.activities.simple.disposition = 'dumptruck';

      var results = m.validate(common);
      results.errors.InvalidStringTypeActivitiesSimpleDisposition.should.equal(
        '`disposition` must be one of the following: window,inline');
    });

    it('should be valid with expected `disposition` values', function () {
      ['window', 'inline'].forEach(function (value) {
        common.activities.simple.disposition = value;

        var results = m.validate(common);
        results.errors.should.be.empty;
        results.warnings.should.be.empty;
      });
    });

    it('should be invalid when `returnValue` is not boolean', function () {
      common.activities.simple.returnValue = 'HI THERE';

      var results = m.validate(common);
      results.errors.InvalidPropertyTypeActivitiesSimpleReturnValue.should.equal(
        '`returnValue` must be of type `boolean`');
    });

    it('should be invalid when `filters` is not an object', function () {
      common.activities.simple.filters = 'HI THERE';

      var results = m.validate(common);
      results.errors.InvalidPropertyTypeActivitiesSimpleFilters.should.equal(
        '`filters` must be of type `object`');
    });

    it('should be invalid when `filters` is an empty object', function () {
      common.activities.simple.filters = {};

      var results = m.validate(common);
      results.errors.InvalidPropertyCountActivitiesSimpleFilters.should.equal(
        '`filters` must have at least 1 properties.');
    });

    it('should be invalid when an activity filter is boolean', function () {
      common.activities.simple.filters.target = true;

      var results = m.validate(common);
      results.errors.InvalidActivitiesFilter.should.equal(
        'Activity filters must be of type `array`, `string`, or `object`');
    });

    it('should be invalid when an activity filter object has unexpected properties', function () {
      common.activities.simple.filters.url.foo = 'bar';

      var results = m.validate(common);
      results.errors.UnexpectedPropertyFiltersSimpleUrl.should.equal(
        'Unexpected property `foo` found in `filters.simple.url`');
    });

    it('should be invalid when an activity filter object has properties with the wrong types', function () {
      common.activities.simple.filters.url = {
        required: 'maybe?',
        value: true,
        min: 'BLAH',
        max: false,
        pattern: false,
        patternFlags: true
      };

      var results = m.validate(common);
      results.errors.InvalidActivitiesFilterValue.should.equal(
        'Activity filter value property must be of type `array` or `string`');
      results.errors.InvalidPropertyTypeFiltersSimpleUrlRequired.should.equal(
        '`required` must be of type `boolean`');
      results.errors.InvalidPropertyTypeFiltersSimpleUrlMin.should.equal(
        '`min` must be of type `number`');
      results.errors.InvalidPropertyTypeFiltersSimpleUrlMax.should.equal(
        '`max` must be of type `number`');
      results.errors.InvalidPropertyTypeFiltersSimpleUrlPattern.should.equal(
         '`pattern` must be of type `string`');
      results.errors.InvalidPropertyTypeFiltersSimpleUrlPatternFlags.should.equal(
         '`patternFlags` must be of type `string`');
    });

    it('should be valid when an activity filter object has an array for `value`', function () {
      common.activities.simple.filters.url.value = ['foo', 'bar'];

      var results = m.validate(common);
      results.errors.should.be.empty;
      results.warnings.should.be.empty;
    });

    it('should be invalid when an activity filter object has `value` array with non-strings', function () {
      common.activities.simple.filters.url.value = [
        true,
        {
          foo: 'bar'
        }
      ];

      var results = m.validate(common);
      results.errors.InvalidItemTypeFiltersSimpleValue.should.equal(
        'items of array `value` must be of type `string`');
    });

    it('should be invalid when an activity filter object has `patternFlags` that exceeds max length', function () {
      common.activities.simple.filters.url.patternFlags = 'iiiii';

      var results = m.validate(common);

      results.errors.InvalidPropertyLengthFiltersSimpleUrlPatternFlags.should.equal(
        '`patternFlags` must not exceed length 4');
    });

    it('should be invalid when an activity filter object has `patternFlags` that contains unexpected characters', function () {
      common.activities.simple.filters.url.patternFlags = 'asdf';

      var results = m.validate(common);
      results.errors.InvalidStringPatternFiltersSimpleUrlPatternFlags.should.equal(
        '`patternFlags` must match the pattern /^[igmy]+$/');
    });

  });

  describe('permissions', function () {
    var PERMISSIONS = {
      web: [
        'alarms', 'audio-capture', 'audio-channel-content',
        'audio-channel-normal', 'desktop-notification', 'fmradio',
        'geolocation', 'push', 'storage', 'video-capture'
      ],
      privileged: [
        'audio-channel-alarm', 'audio-channel-notification', 'browser',
        'contacts', 'device-storage:pictures', 'device-storage:videos',
        'device-storage:music', 'device-storage:sdcard', 'feature-detection',
        'input', 'mobilenetwork', 'speaker-control', 'systemXHR', 'tcp-socket'
      ],
      certified: [
        'audio-channel-publicnotification', 'background-sensors',
        'backgroundservice', 'bluetooth', 'camera', 'cellbroadcast',
        'downloads', 'device-storage:apps', 'embed-apps', 'idle',
        'mobileconnection', 'moz-attention', 'moz-audio-channel-telephony',
        'moz-audio-channel-ringer', 'moz-firefox-accounts', 'network-events',
        'networkstats-manage', 'open-remote-window', 'permissions',
        'phonenumberservice', 'power', 'settings', 'sms', 'telephony', 'time',
        'voicemail', 'webapps-manage', 'wifi-manage', 'wappush'
      ]
    };

    var _FULL_PERMISSIONS = ['readonly', 'readwrite', 'readcreate', 'createonly'];

    var PERMISSIONS_ACCESS = {
      contacts: _FULL_PERMISSIONS,
      'device-storage:apps': _FULL_PERMISSIONS,
      'device-storage:music': _FULL_PERMISSIONS,
      'device-storage:pictures': _FULL_PERMISSIONS,
      'device-storage:sdcard': _FULL_PERMISSIONS,
      'device-storage:videos': _FULL_PERMISSIONS,
      settings: ['readonly', 'readwrite']
    }

    function setPermissions () {
      common.permissions = {};

      for (var k in PERMISSIONS) {
        var set = PERMISSIONS[k];

        set.forEach(function (perm) {
          common.permissions[perm] = {
            'description': 'Required to make things good.'
          };

          if (PERMISSIONS_ACCESS.hasOwnProperty(perm)) {
            common.permissions[perm].access = PERMISSIONS_ACCESS[perm][0];
          }
        });
      }
    }

    it('should be valid with the full expected set of permissions', function () {
      setPermissions();

      var results = m.validate(common);
      results.errors.should.be.empty;
    });

    it('should be invalid when not an object', function () {
      common.permissions = 'LOL';

      var results = m.validate(common);
      results.errors.InvalidPropertyTypePermissions.should.equal(
        '`permissions` must be of type `object`');
    });

    it('should be invalid when a permission is not an object', function () {
      setPermissions();
      common.permissions.alarms = 'LOL';

      var results = m.validate(common);
      results.errors.InvalidPropertyTypePermissionsAlarms.should.equal(
        '`alarms` must be of type `object`');
    });

    it('should be invalid with an unexpected permission', function () {
      setPermissions();
      common.permissions.foo = {
        description: 'lol'
      };

      var results = m.validate(common);
      results.errors.UnexpectedPropertyPermissions.should.equal(
        'Unexpected property `foo` found in `permissions`');
    });

    it('should be invalid where a permission is missing a description', function () {
      setPermissions();
      common.permissions.alarms = {};

      var results = m.validate(common);
      results.errors.MandatoryFieldPermissionsAlarmsDescription.should.equal(
        'Mandatory field description is missing');
    });

    it('should be invalid where a permission is missing access', function () {
      setPermissions();
      delete common.permissions.contacts.access;

      var results = m.validate(common);
      results.errors.MandatoryFieldPermissionsContactsAccess.should.equal(
        'Mandatory field access is missing');
    });

    it('should be invalid where a permission has an invalid access', function () {
      setPermissions();
      common.permissions.contacts.access = 'asdf';

      var results = m.validate(common);
      results.errors.InvalidStringTypePermissionsContactsAccess.should.equal(
        '`access` must be one of the following: readonly,readwrite,readcreate,createonly');
    });

    it('should be invalid where a permission has an unavailable access', function () {
      setPermissions();
      common.permissions.settings.access = 'createonly';

      var results = m.validate(common);
      results.errors.InvalidStringTypePermissionsSettingsAccess.should.equal(
        '`access` must be one of the following: readonly,readwrite');
    });
  });
});
