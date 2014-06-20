'use strict';

process.env.NODE_ENV = 'test';

var should = require('should');
var Manifest = require('../index');
var m = new Manifest();
var content = '';

describe('validate', function () {
  it('should return an invalid manifest object', function () {
    try {
      var manifest = m.validate(content);
    } catch (err) {
      should.throws(err);
      err.toString().should.equal('Error: Manifest is not in a valid JSON format');
    }
  });

  it('should return an valid manifest object', function () {
    content = '{}';

    var manifest = m.validate(content);
    m.manifest.should.eql({});
  });
});
