'use strict';

process.env.NODE_ENV = 'test';

var should = require('should');
var Manifest = require('../src/manifest');
var m = new Manifest();
var content = '';

describe('validate', function () {
  it('should return an invalid manifest error', function () {
    try {
      var manifest = m.validate(content);
    } catch (err) {
      should.throws(err);
    }
  });

  it('should return an valid manifest object', function () {
    content = '{}';

    var manifest = m.validate(content);
    m.manifest.should.eql({});
  });
});
