process.env.NODE_ENV = 'test';

var should = require('should');
var Manifest = require('../index');
var m = new Manifest();
var common;

describe('validate', function () {
  afterEach(function () {
    common = {
      description: 'test app',
      name: 'app'
    };
  });

  it('should return an invalid manifest object', function () {
    try {
      var results = m.validate('');
    } catch (err) {
      err.toString().should.equal('Error: Manifest is not in a valid JSON format or has invalid properties');
    }
  });

  it('should return an invalid manifest with missing mandatory keys for the marketplace', function () {
    var results = m.validate({});

    ['name', 'description', 'developer'].forEach(function (f) {
      var currKey = results.errors['MandatoryField' + f.charAt(0).toUpperCase() + f.slice(1)];
      currKey.toString().should.equal('Error: Mandatory field ' + f + ' is missing');
    });
  });

  it('should return an invalid manifest with missing mandatory keys for non-marketplace', function () {
    content = '{}';
    m.appType = '';
    var results = m.validate(content);

    ['name', 'description'].forEach(function (f) {
      var currKey = results.errors['MandatoryField' + f.charAt(0).toUpperCase() + f.slice(1)];
      currKey.toString().should.equal('Error: Mandatory field ' + f + ' is missing');
      should.not.exist(results.errors.MandatoryFieldDeveloper);
    });
  });

  it('should return an invalid manifest for duplicate fields', function () {
    common.activities = '1';
    common.activities = '2';

    try {
      var results = m.validate(common);
    } catch (err) {
      err.toString().should.equal('Error: Manifest is not in a valid JSON format or has invalid properties');
    }
  });

  it('should return an invalid property type', function () {
    common.launch_path = [];

    var results = m.validate(common);
    results.errors['InvalidPropertyTypeLaunchPath'].toString().should.equal("Error: `launch_path` must be of type `string`");
  });

  it('should return an invalid launch path', function () {
    common.launch_path = '//';

    var results = m.validate(common);

    results.errors['InvalidLaunchPath'].toString().should.equal("Error: `launch_path` must be a path relative to app's origin");
  });

  it('should return a valid launch path', function () {
    common.launch_path = '/';

    var results = m.validate(common);

    should.not.exist(results.errors['InvalidLaunchPath']);
  });

  it('should have an invalid icon size and invalid icon path', function () {
    common.icons = {
      a: ''
    };

    var results = m.validate(common);

    results.errors['InvalidIconSizeA'].toString().should.equal(
      'Error: Icon size must be a natural number');
    results.errors['InvalidIconPathA'].toString().should.equal(
      'Error: Paths to icons must be absolute paths, relative URIs, or data URIs');
  });

  it('should have a valid icon size and valid icon path', function () {
    common.icons = {
      '128': '/path/to/icon.png'
    };

    var results = m.validate(common);

    should.not.exist(results.errors['InvalidIconSize128']);
    should.not.exist(results.errors['InvalidIconPath128']);
  });

  it('should have an invalid length if a minLength is provided', function () {
    common.default_locale = '';

    var results = m.validate(common);

    results.errors['InvalidPropertyLengthDefaultLocale'].toString().should.equal(
      'Error: `default_locale` must not be empty');
  });

  it('should have a valid length if a minLength is provided', function () {
    common.default_locale = 'en';

    var results = m.validate(common);

    should.not.exist(results.errors['InvalidPropertyLengthDefaultLocale']);
  });

  it('should have an invalid length if a maxLength is provided', function () {
    common.name = Array(130).join('x');

    var results = m.validate(common);

    results.errors['InvalidPropertyLengthName'].toString().should.equal(
      'Error: `name` must not exceed length 128');
  });

  it('should have a valid length if a maxLength is provided', function () {
    common.name = 'my app';

    var results = m.validate(common);

    should.not.exist(results.errors['InvalidPropertyLengthName']);
  });

  it('should have an invalid developer name if empty', function () {
    common.developer = {
      'name': ''
    };

    var results = m.validate(common);

    results.errors['InvalidPropertyLengthDeveloperName'].toString().should.equal('Error: `name` must not be empty');
  });

  it('should have an invalid developer name if not string', function () {
    common.developer = {
      'name': {
        'I have': 'no idea what I am doing'
      }
    };

    var results = m.validate(common);

    results.errors['InvalidPropertyTypeDeveloperName'].toString().should.equal('Error: `name` must be of type `string`');
  });

  it('should have an invalid developer property if name is missing', function () {
    common.developer = {};

    var results = m.validate(common);

    results.errors['MandatoryFieldDeveloperName'].toString().should.equal('Error: Mandatory field name is missing');
  });

  it('should have an invalid developer url error if url invalid', function () {
    common.developer = {
      name: 'Doge',
      url: 'foo'
    };
    var results = m.validate(common);
    results.errors['InvalidDeveloperUrl'].toString().should.equal('Error: Developer URL must be an absolute HTTP or HTTPS URL');
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

  it('should have an invalid version', function () {
    common.version = 'v1.0!!';

    var results = m.validate(common);

    results.errors['InvalidVersion'].toString().should.equal(
      'Error: `version` is in an invalid format.');
  });

  it('should have a valid version', function () {
    common.version = 'v1.0';

    var results = m.validate(common);

    should.not.exist(results.errors['InvalidVersion']);
  });

  it('should have an invalid string type for oneOf', function () {
    common.role = 'test';

    var results = m.validate(common);

    results.errors['InvalidStringTypeRole'].toString().should.equal(
      'Error: `role` must be one of the following: system,input,homescreen');
  });

  it('should have a valid string type for oneOf', function () {
    common.role = 'system';

    var results = m.validate(common);

    should.not.exist(results.errors['InvalidStringTypeRole']);
  });

  it('should have an invalid string type for anyOf', function () {
    common.orientation = 'test';

    var results = m.validate(common);

    results.errors['InvalidStringTypeOrientation'].toString().should.equal(
      'Error: `orientation` must be any of the following: portrait,landscape,' +
      'portrait-secondary,landscape-secondary,portrait-primary,landscape-primary');
  });

  it('should have a valid string type for anyOf', function () {
    common.orientation = 'portrait, landscape';

    var results = m.validate(common);

    should.not.exist(results.errors['InvalidStringTypeOrientation']);
  });

  it('should have an invalid default_locale', function () {
    common.locales = {
      'es': {}
    };

    var results = m.validate(common);

    results.errors['InvalidDefaultLocale'].toString().should.equal(
      'Error: `default_locale` must match one of the keys in `locales`');
  });

  it('should have a valid default_locale', function () {
    common.locales = {
      'es': {}
    };

    common.default_locale = 'es';

    var results = m.validate(common);

    should.not.exist(results.errors['InvalidDefaultLocale']);
  });

  it("should be valid when installs_allowed_from is an array", function () {
    common.installs_allowed_from = [
      'https://apps.lmorchard.com'
    ];
    var results = m.validate(common);
    should.not.exist(results.errors['InvalidPropertyTypeInstallsAllowedFrom']);
  });

  it("should be valid when installs_allowed_from contains a wildcard", function () {
    common.installs_allowed_from = [
      '*'
    ];
    var results = m.validate(common);
    should.not.exist(results.errors['InvalidPropertyTypeInstallsAllowedFrom']);
  });

  it("should have an invalid type for installs_allowed_from when not an array", function () {
    common.installs_allowed_from = "THIS IS NOT A LIST";
    var results = m.validate(common);
    results.errors['InvalidPropertyTypeInstallsAllowedFrom'].toString().should.equal(
      'Error: `installs_allowed_from` must be of type `array`');
  });

  it("should have an invalid error for installs_allowed_from when any array item is not a string", function () {
    common.installs_allowed_from = [
      {
        this: 'is not a string'
      }
    ];
    var results = m.validate(common);
    results.errors['InvalidInstallsAllowedFrom'].toString().should.equal(
      'Error: `installs_allowed_from` must be an array of strings');
  });

  it("should be invalid when installs_allowed_from is present but empty", function () {
    common.installs_allowed_from = [];
    var results = m.validate(common);
    results.errors['InvalidInstallsAllowedFrom'].toString().should.equal(
      'Error: `installs_allowed_from` cannot be empty when present');
  });

  it("should be invalid when installs_allowed_from list contains an invalid URL", function () {
    common.installs_allowed_from = [
      'foo/bar'
    ];
    var results = m.validate(common);
    results.errors['InvalidInstallsAllowedFrom'].toString().should.equal(
      'Error: `installs_allowed_from` must be a list of valid absolute URLs or `*`');
  });

  it("should be invalid when installs_allowed_from has no marketplace URLs but listed is true", function () {
    common.listed = true;
    common.installs_allowed_from = [
      'https://apps.lmorchard.com'
    ];
    var results = m.validate(common);
    results.errors['InvalidInstallsAllowedFrom'].toString().should.equal(
      'Error: `installs_allowed_from` must include a Marketplace URL when listed is true');
  });

  it("should be invalid when installs_allowed_from has no Marketplace URLs, but listed is true", function () {
    common.listed = true;
    common.installs_allowed_from = [
      "https://marketplace.firefox.com",
      'https://apps.lmorchard.com'
    ];
    var results = m.validate(common);
    should.not.exist(results.errors['InvalidInstallsAllowedFrom']);
  });

  it("should be invalid when installs_allowed_from contains a Marketplace URL with http:", function () {
    common.installs_allowed_from = [
      "http://marketplace.firefox.com",
    ];
    var results = m.validate(common);
    results.errors['InvalidInstallsAllowedFrom'].toString().should.equal(
      'Error: `installs_allowed_from` must use https:// when Marketplace URLs are included');
  });

});
