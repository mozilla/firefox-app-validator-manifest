# Firefox App Validator (Manifest)

[![Build Status](https://secure.travis-ci.org/mozilla/node-firefox-app-validator-manifest.png)](http://travis-ci.org/mozilla/node-firefox-app-validator-manifest)

WIP

## Setup

    git clone git@github.com:mozilla/node-firefox-app-validator-manifest.git
    cd node-firefox-app-validator-manifest
    npm install

This validates your Firefox app manifest for submission into https://marketplace.firefox.com.

## Changes from existing validator (notes)

* Duplicate properties throw an exception because they are invalid in strict mode

    * Solution for dealing with this on the server: allowing users to paste in their manifest.webapp for packaged/hosted apps in the web interface for immediate feedback, prior to uploading. Similar to http://jsonlint.com/

## Tests

    npm test
