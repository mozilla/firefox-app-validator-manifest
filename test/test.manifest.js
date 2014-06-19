'use strict';

process.env.NODE_ENV = 'test';

var should = require('should');
var Manifest = require('../src/manifest');
var m = new Manifest();

describe('validatePath', function () {
  it('should return an array of files in the packaged app path', function (done) {
    m.appPath = './test/apps/app2';

    m.setFiles(function (err, result) {
      should.exist(result);
      result.should.eql(['./test/apps/app2/manifest.webapp']);
      done();
    });
  });
});

describe('validateManifest', function () {
  it('should return an missing manifest error', function (done) {
    m.appPath = './test/apps/app1';

    m.setFiles(function (err, result) {
      m.validateManifest(function (err, result) {
        should.exist(err);
        err.toString().should.equal('Error: No manifest.webapp file found');
        done();
      });
    });
  });

  it('should return an invalid manifest error', function (done) {
    m.appPath = './test/apps/app2';

    m.setFiles(function (err, result) {
      m.validateManifest(function (err, result) {
        should.exist(err);
        err.toString().should.equal('Error: Manifest is not in a valid JSON format');
        done();
      });
    });
  });

  it('should return an valid manifest file object', function (done) {
    m.appPath = './test/apps/app3';

    m.setFiles(function (err, result) {
      m.validateManifest(function (err, result) {
        should.exist(result);
        result.should.eql({});
        done();
      });
    });
  });
});
