# Firefox App Validator: Manifest

[![Build Status](https://secure.travis-ci.org/mozilla/node-firefox-app-validator-manifest.png)](http://travis-ci.org/mozilla/node-firefox-app-validator-manifest)

## What it is

This is the Firefox App manifest validator for verifying that your `manifest.webapp` file has the correct information before submitting to the [Firefox Marketplace](https://marketplace.firefox.com).

## Setup

    git clone git@github.com:mozilla/node-firefox-app-validator-manifest.git
    cd node-firefox-app-validator-manifest
    npm install

## Checking your manifest: an example

    var fs = require('fs');
    var Manifest = require('firefox-app-validator-manifest');
    var ff = new Manifest({
        url: '/path/to/custom/url/module' // custom URL module if you want to override the node one
    });

    fs.readFile('manifest.webapp', 'utf8', function (err, data) {
      if (!err) {
        var results = ff.validate(data, options);

        // If there are any errors or warnings, this will have them listed.
        console.log(results);
      }
    });

## Options

The first parameter to the `validate()` method expects a webapp manifest. The
second parameter, however, can be an object containing validation options.

These options include:

* `listed` - default `false`, flag whether or not this app will be listed on the Marketplace

* `packaged` - default `false`, flag whether or not this app is packaged, rather than a plain web app

## Tests

    # To run tests once
    npm test

    # To run tests continually on file change
    npm run-script testwatch

## License

Mozilla Public License Version 2.0
