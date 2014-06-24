process.env.NODE_ENV = 'test';

var should = require('should');
var Manifest = require('../index');
var m = new Manifest();
var content = '';

describe('validate', function () {
  it('should return an invalid manifest object', function () {
    try {
      var results = m.validate(content);
    } catch (err) {
      err.toString().should.equal('Error: Manifest is not in a valid JSON format or has invalid properties');
    }
  });

  it('should return an invalid manifest with missing mandatory keys for the marketplace', function () {
    content = '{}';
    var results = m.validate(content);

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
    content = {
      activities: '1',
      activities: '2',
      description: 'test app',
      name: 'app'
    };

    try {
      var results = m.validate(content);
    } catch (err) {
      err.toString().should.equal('Error: Manifest is not in a valid JSON format or has invalid properties');
    }
  });

  it('should return an invalid launch path', function () {
    content = {
      description: 'test app',
      launch_path: '//',
      name: 'app'
    };

    var results = m.validate(content);

    results.errors['InvalidLaunchPath'].toString().should.equal("Error: `launch_path` must be a path relative to app's origin.");
  });
});
