process.env.NODE_ENV = 'test';

var should = require('should');
var Manifest = require('../index');
var m = new Manifest();
var content = '';

describe('validate', function () {
  it('should return an invalid manifest object', function () {
    var results = m.validate(content);
    results.errors.InvalidJSON.toString().should.equal('Error: Manifest is not in a valid JSON format');
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

  it('should return warnings about duplicate fields', function () {
    var fields = ['activities', 'appcache_path'];

    content = {
      activities: '1',
      activities: '2',
      appcache_path: '/',
      appcache_path: '/',
      description: 'test app',
      name: 'app'
    };

    var results = m.validate(content);

    fields.forEach(function (f) {
      var currKey = results.warnings['Field' + f.charAt(0).toUpperCase() + f.slice(1)];
      currKey.toString().should.equal('Warning: Duplicate field ' + f);
    });
  });
});
