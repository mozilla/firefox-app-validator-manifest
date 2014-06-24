# Firefox App Validator (Manifest)

WIP

This validates your Firefox app manifest for submission into https://marketplace.firefox.com.

## Changes from existing validator (notes)

* Duplicate properties throw an exception because they are invalid in strict mode

    * Solution for dealing with this on the server: allowing users to paste in their manifest.webapp for packaged/hosted apps in the web interface for immediate feedback, prior to uploading. Similar to http://jsonlint.com/

## Discussion points for manifest schema (re)design?

* Redesigning the `icons` data from having arbitrary key names, e.g. changing:

    {
      '128': '/path/to/128-icon.png',
      '256': '/path/to/256-icon.png'
    }

    to

    [
      { size: 128, path: '/path/to/128-icon.png' },
      { size: 256, path: '/path/to/256-icon.png' }
    ]
