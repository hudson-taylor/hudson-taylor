function makeParser(parserFunc, docFunc) {
    return function(args, childValidators) {

        return new function() {
            var self = this;
            if(arguments.length == 1) {
                children = arguments[0];
                args = {};
            }

            this.parse = function(data) {
                var val = parserFunc.call(self, args, childValidators, data);
            }

            this.document = function() {
                return docFunc.call(self, args);
            }
        }

    };
}


ObjectParser = makeParser(parseObject, documentObject);

/*
var data = {
    id : "11234141231231245113",
    name "Choclate Cake",
    tags : [
        {id : "123123568674635735", label : "Baking"},
        {id : "347457457745745743", label : "Chocolate"}
    ]
}

var schema = s.Object({
    id : s.ObjectID({doc : "ID of the object"}),
    name : s.String({min:3, max:256, doc : "Users preferred name"}),
    tags : s.Array({opt : true}, [
        s.Object({
            id : s.ObjectID(),
            label : s.String({opt : true})
        })
        ]),
    extras : s.Object({opt:true, strict:false, doc : "schemaless info"}, {})
});

schema.validate(data);
*/

//s.addValidators({"ObjectID" : ObjectIDValidator});
//
//s = {
//    parsers : {
//        "Boolean" : BooleanParser,
//        "Number" : NumberParser,
//        "String" : StringParser,
//        "Date" : DateParser,
//        "Object" : ObjectParser,
//        "Array" : ArrayParser,
//        "Enum" : EnumParser,
//        "Binary" : BinaryParser
//    }
//}
//

