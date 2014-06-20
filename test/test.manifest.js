'use strict';

process.env.NODE_ENV = 'test';

var should = require('should');
var Manifest = require('../src/manifest');
var m = new Manifest();
var content = '';

describe('validate', function () {
  it('should return an invalid manifest error', function (done) {
    m.validate(content, function (err, result) {
      should.exist(err);
      err.toString().should.equal('Error: Manifest is not in a valid JSON format');
      done();
    });
  });

  it('should return an valid manifest object', function (done) {
    content = '{}';

    m.validate(content, function (err, result) {
      should.exist(result);
      result.should.eql({});
      done();
    });
  });
});
