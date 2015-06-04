Changelog 5.3.2:

 * Remove uid2 as a dependency.
 * Upgrade other dependencies.

Changelog 5.3.1:

 * Deprecate utils.expressProxy in favour of ht-express

Changelog 5.3.0:

 * Return $htValidationError: true along with message when data does not match schema.

Changelog 5.2.0:

 * Add support for validating the response of a call with a schema.

Changelog 5.1.1:

 * Upgrade async to version 1.0.0, 0.9.2 has a bug which makes tests fail.

Changelog 5.1.0:

 * Allow middleware to view/edit destination service/method.

Changelog 5.0.1:

 * Dependency upgrades

Changelog 5.0.0:

 * Overhaul HTTP Transport to ensure SSL works.

Changelog 4.0.0:

 * Change Client.prototype.chain to execute sequential service calls on the remote host.

Changelog 3.3.0:

 * Add Client.prototype.chain for method chaining

Changelog 3.2.0:

 * Add Client.prototype.prepare

Changelog 3.1.0:

 * Return method along with error if unknown-method

Changelog 3.0.0:

 * Remove automatic dependency injection. Export a function that takes all of your required arguments instead.

Changelog 2.4.5:

 * See 2.4.4

Changelog 2.4.4:

 * Update bundled ht-schema version.

Changelog 2.4.3:

 * Client: Deprecate 'remote' function in favour of 'call'

Changelog 2.4.2:

 * Switch to BabelJS from 6to5

Changelog 2.4.1:

 * Add client 'remote' command to make it easier to migrate from HT1.x
 * Allow optional data to be passed into a service call.
 * Allow optional function to be passed into a service call.

Changelog 2.4.0:

 * Fix regression where multiple local transports stopped working under certain conditions.

Changelog 2.3.0:

 * Fix error reponses where response is not javascript primitive type.

Changelog 2.2.0:

 * No changes, mispublish.

Changelog 2.1.0:

 * Add middleware for intercepting requests and responses.

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
