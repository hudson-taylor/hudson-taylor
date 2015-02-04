Changelog 2.4.0:

 * Fix error causing multiple local transports to fail if used in the same client

Changelog 2.0.0:

 * Project converted to ES6.
 * Myriad number of bugfixes and changes.
 * Project rewrite published to npm.

Changelog 0.1.0:

 * Extreme refactor of all internals, allows using custom transports and schemas.
   WARNING: This was a major breaking change. Please consult examples and documentation
            to migrate.

Changelog 0.0.11:

 * Provide special value {htDeleteKey:true} which, if returned from a validator,
   shall ensure that the parent validator will delete it's key entirely from any
   output. If this IS the top level validator, it will return null instead.

Changelog 0.0.10:

 * Moved repo from pomke/hudson-taylor to org hudson-taylor/hudson-taylor

Changelog 0.0.9:

 * Merged Someoneweird's branch which closes services asynchronously.

Changelog 0.0.8:

 * Added support for 'foo as bar' keys in schemas, accepts foo, maps to bar.

Changelog 0.0.7:

 * Added Email validator.

Changelog 0.0.6:

 * Added support for an optional '\*' validator to Object validation in non-strict
   mode. The '\*' validator will be run against any undefined attributes.
 * Added unit test for '*' validators.

Changelog 0.0.5:

 * Bug fixes around min/max schema args not matching min values.

Changelog 0.0.3:

 * Added ht.utils.expressProxy for mapping services to express routes. 

Changelog: 0.0.2:

* Added schema support.
* Added unit testing for schemas and basic API use.

Changelog: 0.0.1:

* Initial implementation.
