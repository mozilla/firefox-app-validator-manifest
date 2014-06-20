'use strict';

process.env.NODE_ENV = 'test';

var should = require('should');
var Manifest = require('../index');
var m = new Manifest();
var content = '';

describe('validate', function () {
  it('should return an invalid manifest object', function () {
    try {
      m.validate(content);
    } catch (err) {
      should.throws(err);
      err.toString().should.equal('Error: Manifest is not in a valid JSON format');
    }
  });

  it('should return an invalid manifest with missing mandatory keys for the marketplace', function () {
    content = '{}';

    try {
      m.validate(content);
    } catch (err) {
      should.throws(err);
      err.toString().should.equal('Error: Manifest is missing mandatory fields: name, description, developer');
    }
  });

  it('should return an invalid manifest with missing mandatory keys for non-marketplace', function () {
    content = '{}';
    m.appType = '';

    try {
      m.validate(content);
    } catch (err) {
      should.throws(err);
      err.toString().should.equal('Error: Manifest is missing mandatory fields: name, description');
    }
  });
});
