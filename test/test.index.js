'use strict';

process.env.NODE_ENV = 'test';

var should = require('should');
var Manifest = require('../index');
var m = new Manifest();
var content = '';

describe('validate', function () {
  it('should return an invalid manifest object', function () {
    m.validate(content);
    m.errors.InvalidJSON.toString().should.equal('Error: Manifest is not in a valid JSON format');
  });

  it('should return an invalid manifest with missing mandatory keys for the marketplace', function () {
    content = '{}';
    m.validate(content);

    ['name', 'description', 'developer'].forEach(function (f) {
      var currKey = m.errors['MandatoryField' + f.charAt(0).toUpperCase() + f.slice(1)];
      currKey.toString().should.equal('Error: Mandatory field ' + f + ' is missing');
    });
  });

  it('should return an invalid manifest with missing mandatory keys for non-marketplace', function () {
    content = '{}';
    m.appType = '';
    m.validate(content);

    ['name', 'description'].forEach(function (f) {
      var currKey = m.errors['MandatoryField' + f.charAt(0).toUpperCase() + f.slice(1)];
      currKey.toString().should.equal('Error: Mandatory field ' + f + ' is missing');
      should.not.exist(m.errors.MandatoryFieldDeveloper);
    });
  });
});
