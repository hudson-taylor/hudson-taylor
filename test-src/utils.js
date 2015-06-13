
"use strict";

const assert = require("assert");

const express    = require("express");
const bodyParser = require("body-parser");
const supertest  = require("supertest");

const Service    = require("../lib/service");
const Client     = require("../lib/client");
const Transports = require("../lib/transports");
const utils      = require("../lib/utils");
const s          = require("ht-schema");

describe("Utilities", function() {

    describe("merge", function() {

        it("should merge", function() {

            var data1 = { a: 5         };
            var data2 = { a: 15, b: 10 };

            var result = utils.merge(data1, data2);

            assert.deepEqual(result, {
                a: data1.a,
                b: data2.b
            });

        });

    });

    describe("formatError", function() {

        it("should return object", function() {

            let str = "err1234";

            let data = utils.formatError(str);

            assert.deepEqual(data, {
                error: str
            });

        });

        it("should convert Error instance to object", function() {

            let str = "err1234";

            let err = new Error(str);

            let data = utils.formatError(err);

            assert.deepEqual(data, {
                error: str
            });

            let err2 = new Error();

            let data2 = utils.formatError(err2);

            assert.deepEqual(data2, {
                error: "Error"
            });

        });

        it("should not do anything if data has an error variable", function() {

            let _data = {
                error: "something"
            };

            let data = utils.formatError(_data);

            assert.deepEqual(data, _data);

        });

    });

});
