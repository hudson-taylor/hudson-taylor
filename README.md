hudson-taylor
=============

[![Build Status](https://travis-ci.org/hudson-taylor/hudson-taylor.svg?branch=master)](https://travis-ci.org/hudson-taylor/hudson-taylor)
[![Coverage Status](https://img.shields.io/coveralls/hudson-taylor/hudson-taylor/master.svg)](https://coveralls.io/r/hudson-taylor/hudson-taylor?branch=master)

Hudson Taylor is a set of libraries for building automatically
documented, well validated services.

HT is comprised of a server library for providing services with well documented
and defined APIs with validation, and client libraries for calling
services over a number of transports, HTTP, Websocket, TCP or in-process.

All service methods (should) have a schema that lets you dictate the type
of data you want, so you can be sure of what you're receiving. This has the
added benefit of being able to automatically generate documentation for these methods.

See [Changelog here](CHANGELOG.md)

### Todos

 * Automatic documentation generation still WIP

# Documentation

Please visit [https://hudson-taylor.github.io](https://hudson-taylor.github.io)

# Details

## Methods of communicating between services

One of the nice things about HT is that you can connect to a service via
methods without having to change your service code in any way.

Hudson-Taylor is bundled with a couple of low-level transports such as:

* TCP:   uses long-lived TCP sockets for communication between client & server
* HTTP:  uses HTTP requests
* Local: in-process transport that communicates internally between client & server

Custom transports can be implemented easily, see /lib/transports/http.js for a documented example.

## Schemas

Hudson-Taylors schema library is no longer bundled directly, see [ht-schema](https://github.com/hudson-taylor/ht-schema) instead.

## Utils

### Express Proxy

Proxy express requests to a particular service method.

See [ht-express](https://github.com/hudson-taylor/ht-express)

### ES7 Decorators

Provides helpful decorators for working with HT

See [ht-decorators](https://github.com/hudson-taylor/ht-decorators)
