# Firefox App Validator (Manifest)

WIP

This validates your Firefox app manifest for submission into https://marketplace.firefox.com.

## Changes from existing validator (notes)

* Duplicate properties throw an exception because they are invalid in strict mode
    Solution for dealing with this on the server: allowing users to paste in their manifest.webapp for packaged/hosted apps in the web interface for immediate feedback, prior to uploading.
