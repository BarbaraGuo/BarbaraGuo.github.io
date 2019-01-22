

(function(){
    angular
        .module("mainPage",['typed-effect', 'interpreter'])
        .controller("mainPageCtrl", mainPageCtrl)
        .directive('myEnter', function () {
            return function (scope, element, attrs) {
                element.bind("keydown keypress", function (event) {
                    if(event.which === 13) {
                        scope.$apply(function (){
                            scope.$eval(attrs.myEnter);
                        });
        
                        event.preventDefault();
                    }
                });
            };
        });

    function mainPageCtrl(interpreterService, $interval){
        var vm = this;
        vm.title = " Generate";
        //vm.language = "Language";
        vm.language = "C++";
        vm.genMessage = "Unable to translate"
        vm.languages = [
            {name: "C++"}
        ]
        vm.languageDisplayLimit = 8;
        vm.command = "";
        vm.generate = generate;
        vm.successfulTranslate = false;
        vm.failed = false;
        vm.result = "";

        var i = 0;
        messages = ["Write programs without having to code",
                    "Interpret your code"];
        vm.message = messages[0];
        var tick = function() {
            if(i < messages.length){
                vm.message = messages[i%2];
                i++;
            } else {
                vm.message = "Let's Get Started!";
            }
          }
          tick();
          $interval(tick, 3000);
        var tokens = [];


        vm.init = function(){
            interpreterService.read();
            document.getElementById('commandBar').focus();
        }
        function generate(){
            //console.log(vm.command);
            vm.result = "";
            try{
                vm.command = vm.command.toLowerCase().trim();
                tokens = vm.command.split("then");

                for(var line = 0; line < tokens.length; line++){
                    
                    var x = tokens[line].split(/[' ')}{(]/);
                        // console.log(tokens);
                        console.log(x);
                    for(var i = 0; i < x.length; i++){
                        if(x[i].charAt(0) == '"' && x[i].charAt(x[i].length - 1) == '"'){
                            x[i] = {name: x[i]}
                        } else if (x[i] == "=" || x[i] == "=="){
                            x[i] = {name: "equal to"};
                        } else if (x[i] == "<="){
                            x[i] = {name: "less than equal to"};
                        } else if (x[i] == ">="){
                            x[i] = {name: "greater than equal to"};
                        } else if (x[i] == "<"){
                            x[i] = {name: "less than"};
                        } else if (x[i] == ">"){
                            x[i] = {name: "more than"};
                        } else if (x[i] == "!="){
                            x[i] = {name: "not equal to"};
                        } else if (x[i] == "!"){
                            x[i] = {name: "not"};
                        } else if (x[i] == "&&"){
                            x[i] = {name: "and"};
                        } else if (x[i] == "||"){
                            x[i] = {name: "or"};
                        } else if (x[i] == "+"){
                            x[i] = {name: "add"};
                        }else{
                            if(x[i] != ""){
                                x[i] = {name: x[i],
                                    ngram: interpreterService.nGrams(x[i])};
                            } else {
                                x.splice(i, 1);
                                i--;
                            }
                        }
                    }
                    for(var i = 0; i < x.length; i++){
                        if(x[i].name == ""){
                            tokens.splice(i, 1);
                            i--;
                        }
                    }
                    var parsed = interpreterService.translate(x);
                    
                    for(var tab = 0; tab < line; tab++){
                        vm.result += "\t";
                    }
                    vm.result += interpreterService.compile(vm.language);
                    

                    for(var tab = 0; tab < line; tab++){
                        if(line - tab == 1){
                            vm.result += "}"
                        } else {
                            vm.result += "\t";
                        }
                    }
                    console.log(vm.result);
                }
                if (vm.result.charAt(vm.result.length-1) != '}'){
                    vm.result += "}";
                }
                

                
                vm.failed = false;
                vm.successfulTranslate = true;
            } catch (err){
                vm.failed = true;
            }
        }
    }
})();


(function (){
    angular
        .module('interpreter', [])
        .service('interpreterService', interpreterService);

    function interpreterService(){
        var vm = this;
        vm.contents = [];
        vm.nGrams = function(line){
            line = '$' + line + "$";
            var grams= [];
            for(var i = 0; i < line.length-2; i++){
                grams.push(line.substring(i, i+3));
            }
           // console.log(grams);
            return grams;
        };


        var natural = require('natural'),
        classifier = new natural.BayesClassifier();
        vm.read = function() {
            var tokens='{"command": "add",'+ //////Commands VB
                            '"ngrams":[{'+
                            '"name": "add",'+
                            '"ngram": ["$ad","add","dd$"]'+
                        '}, {' +
                            '"name": "append",' +
                            '"ngram": ["$ap","app","ppe","pen","end","nd$"]' +
                        '}],' +
                       '"tag": "VB"'+
                    '};'+ 
                    '{"command": "merge",'+ //////Commands VB
                            '"ngrams":[{'+
                            '"name": "merge",' +
                            '"ngram": ["$me","mer","erg","rge","gr$"]' +
                        '}, {' +
                            '"name": "combine",' +
                            '"ngram": ["$co","com","omb","mbi","bin","ine","ne$"]' +
                        '}],' +
                       '"tag": "VB"'+
                    '};'+
                    '{"command": "create",'+
                    '"ngrams":[{' +
                            '"name": "create",' +
                            '"ngram": ["$cr","cre","rea", "eat","ate","te$"]' +
                        '}, {' +
                            '"name": "generate",' +
                            '"ngram": ["$ge","gen","ene","ner","era","rat","ate", "te$"]'+
                        '}, {' +
                            '"name": "define",' +
                            '"ngram": ["$de","def","efi", "fin","ine","ne$"]' +
                        '}],' +
                        '"tag": "VB"'+
                    '};' + 
                    '{"command": "intialize",'+
                    '"ngrams":[{' +
                            '"name": "initialize",' +
                            '"ngram": ["$in","ini","nit","iti","tia","ial", "ali", "liz", "ize", "ze$"]'+
                        '}, {' +
                            '"name": "declare",' +
                            '"ngram": ["$de","dec","ecl","cla","lar","are","re$"]'+
                        '}],' +
                        '"tag": "VB"'+
                    '};' + 
                    '{"command": "remove",'+ //////Commands VB
                            '"ngrams":[{'+
                            '"name": "remove",'+
                            '"ngram": ["$re","rem","emo","mov","ove","ve$"]'+
                        '}, {' +
                            '"name": "subtract",' +
                            '"ngram": ["$su","sub","ubt","btr","tra","rac","act","ct$"]' +
                        '}, {' +
                            '"name": "decrement",' +
                            '"ngram": ["$de","dec","ecr","cre","rem","eme","men","ent","nt$"]' +
                        '}],' +
                       '"tag": "VB"'+
                    '};' + 
                    '{"command": "insert",'+ //////Commands VB
                            '"ngrams":[{'+
                            '"name": "insert",'+
                            '"ngram": ["$in","ins","nse","ser","ert","rt$"]'+
                        '}],' +
                       '"tag": "VB"'+
                    '};' + 
                    '{"command": "find",'+ //////Commands VB
                            '"ngrams":[{'+
                            '"name": "find",'+
                            '"ngram": ["$fi","fin","ind","nd$"]'+
                        '}, {' +
                            '"name": "search",' +
                            '"ngram": ["$se","sea","ear","arc","rch","ch$"]' +
                        '}],' +
                       '"tag": "VB"'+
                    '};' + 
                    '{"command": "map",'+ //////Commands VB
                            '"ngrams":[{'+
                            '"name": "map",'+
                            '"ngram": ["$ma","map","ap$"]'+
                        '}],' +
                       '"tag": "VB"'+
                    '};' + 
                    '{"command": "iterate",'+ //////Commands VB
                            '"ngrams":[{'+
                            '"name": "iterate",'+
                            '"ngram": ["$it","ite","ter","era", "rat", "ate", "te$"]'+
                        '}, {' +
                            '"name": "loop",' +
                            '"ngram": ["$lo","loo","oop","op$"]' +
                        '}],' +
                       '"tag": "VB"'+
                    '};' + 
                    '{"command": "while",'+ //////Commands VB
                            '"ngrams":[{'+
                            '"name": "while",' +
                            '"ngram": ["$wh","whi","hil","ile", "le$"]' +
                        '}],' +
                       '"tag": "VB"'+
                    '};' + 
                    '{"command": "click",'+ //////Commands VB
                            '"ngrams":[{'+
                            '"name": "press",'+
                            '"ngram": ["$pr", "pre", "res" , "ess", "ss$"]'+
                        '}, {'+
                            '"name": "click",' +
                            '"ngram": ["$cl","cli","lic","ick", "ck$"]' +
                        '}],' +
                       '"tag": "VB"'+
                    '};' + 
                    '{"command": "divide",'+ //////Commands VB
                            '"ngrams":[{'+
                            '"name": "divide",'+
                            '"ngram": ["$di","div","ivi","vid", "ide", "de$"]'+
                        '}],' +
                       '"tag": "VB"'+
                    '};' + 
                    '{"command": "multiply",'+ //////Commands VB
                            '"ngrams":[{'+
                            '"name": "multiply",'+
                            '"ngram": ["$mu","mul","ult","lti", "tip", "ipl", "ply", "ly$"]'+
                        '}],' +
                       '"tag": "VB"'+
                    '};' + 
                    '{"command": "get",'+ //////Commands VB
                            '"ngrams":[{'+
                            '"name": "get",'+
                            '"ngram": ["$ge","get","et$"]'+
                        '}],' +
                       '"tag": "VB"'+
                    '};' + 
                    '{"command": "set",'+ //////Commands VB
                            '"ngrams":[{'+
                            '"name": "set",'+
                            '"ngram": ["$se","set","et$"]'+
                        '}],' +
                       '"tag": "VB"'+
                    '};' + 
                    '{"command": "replace",'+ //////Commands VB
                            '"ngrams":[{'+
                            '"name": "replace",'+
                            '"ngram": ["$re","rep","epl", "pla","lac","ace","ce$"]'+
                        '}],' +
                       '"tag": "VB"'+
                    '};' + 
                    '{"command": "evaluate",'+ //////Commands VB
                            '"ngrams":[{'+
                            '"name": "evaluate",'+
                            '"ngram": ["$ev","eva","val", "alu","lua","uat","ate", "te$"]'+
                        '}],' +
                       '"tag": "VB"'+
                    '};' + 
                    '{"command": "return",'+ //////Commands VB
                            '"ngrams":[{'+
                            '"name": "return",'+
                            '"ngram": ["$re","ret","etu", "tur","urn","rn$"]'+
                        '}],' +
                       '"tag": "VB"'+
                    '};' + 
                    '{"command": "subset",'+ //////Commands VB
                            '"ngrams":[{'+
                            '"name": "subset",'+
                            '"ngram": ["$su","sub","ubs","bse", "set", "et$"]'+
                        '}, {' +
                            '"name": "split",' +
                            '"ngram": ["$sp","spl","pli","lit", "it$"]' +
                        '}],' +
                       '"tag": "VB"'+
                    '};'  + ///////PREPositons/////////////
                    '{"command": "prep",'+
                    '"ngrams":[{' +
                            '"name": "to",' +
                            '"ngram": ["$to", "to$"],' +
                            '"specifier":"end"' +
                        '}, {' +
                            '"name": "after",' +
                            '"ngram": ["$af","aft","fte","ter","er$"],'+
                            '"specifer":"end"' +
                        '}, {' +
                            '"name": "at",' +
                            '"ngram": ["$at","at$"],'+
                            '"specifier": "uni"' +
                        '}, {' +
                            '"name": "by",' +
                            '"ngram": ["$by","by$"],'+
                            '"specifier": "uni"' +
                        '}, {' +
                            '"name": "before",' +
                            '"ngram": ["$be","bef","efo","for","ore","re$"],'+
                            '"specifier": "start"'+
                        '}, {' +
                            '"name": "behind",' +
                            '"ngram": ["$be","beh","ehi","hin","ind","nd$"],'+
                            '"specifier": "end"' +
                        '}, {' +
                            '"name": "between",' +
                            '"ngram": ["$be","bet","etw","twe","wee","een","en$"],'+
                            '"specifier":"start"' +
                        '}, {' +
                            '"name": "for",' +
                            '"ngram": ["$fo","for"],'+
                            '"specifier":""' +
                        '}, {' +
                            '"name": "from",' +
                            '"ngram": ["$fr","fro","rom","om$"],'+
                            '"specifier": "start"' +
                        '},  {' +
                            '"name": "begin",' +
                            '"ngram": ["$be","beg","egi","gin","in$"],'+
                            '"specifier": "start"' +
                        '}, {' +
                            '"name": "into",' +
                            '"ngram": ["$in","int","nto","to$"],'+
                            '"specifier":"end"'+
                        '}, {' +
                            '"name": "except",' +
                            '"ngram": ["$be","bef","efo","for","ore","re$"],'+
                            '"specifier": "negation"'+
                        '}, {' +
                            '"name": "until",' +
                            '"ngram": ["$un","unt","nti","til","il$"],'+
                            '"specifier": "end"' +
                        '}, {' +
                            '"name": "with",' +
                            '"ngram": ["$wi","wit","ith","th$"],'+
                            '"specifier":"conj"' +
                        '}, {' +
                            '"name": "through",' +
                            '"ngram": ["$th","thr","hro","rou","oug","ugh","gh$"],'+
                            '"specifier":"start"'+
                        '}],' +
                        '"tag": "IN"'+
                    '};'+
                    '{"command": "conjuction",'+
                    '"ngrams":[{' +
                            '"name": "and",' +
                            '"ngram": ["$an", "and", "nd$"],' +
                            '"specifier":"uni"' +
                        '},{' +
                            '"name": "if",' +
                            '"ngram": ["$if", "if$"],' +
                            '"specifier":"uni"' +
                        '}, {' +
                            '"name": "or",' +
                            '"ngram": ["$or","or$"],'+
                            '"specifer":"uni"' +
                        '}, {' +
                            '"name": "than",' +
                            '"ngram": ["$th","tha", "han","an$"],'+
                            '"specifier": "uni"' +
                        '}],' +
                        '"tag": "CJ"'+
                    '};'+
                    '{"command": "less",'+
                    '"ngrams":[{' +
                            '"name": "less",' +
                            '"ngram": ["$le", "les", "ess", "ss$"],' +
                            '"specifier":"uni"' +
                        '}, {' +
                            '"name": "more",' +
                            '"ngram": ["$mo","mor","ore","re$"],'+
                            '"specifer":"uni"' +
                        '}, {' +
                            '"name": "equal",' +
                            '"ngram": ["$eq","equ", "qua","ual","al$"],'+
                            '"specifier": "uni"' +
                        '}, {' +
                            '"name": "is",' +
                            '"ngram": ["$is","is$"],'+
                            '"specifier": "uni"'+
                        '}],' +
                        '"tag": "CP"'+
                    '};'+
                    '{"command": "universal",'+
                    '"ngrams":[{' +
                            '"name": "all",' +
                            '"ngram": ["$al", "all", "ll$"],' +
                            '"specifier":"uni"' +
                        '}, {' +
                            '"name": "each",' +
                            '"ngram": ["$ea","eac","ach","ch$"],'+
                            '"specifer":"uni"' +
                        '}, {' +
                            '"name": "every",' +
                            '"ngram": ["$ev","eve", "ver","ery","ry$"],'+
                            '"specifier": "uni"' +
                        '}],' +
                        '"tag": "DT"'+
                    '};' +
                    '{"command": "not",'+ //////Commands VB
                            '"ngrams":[{'+
                            '"name": "not",' +
                            '"ngram": ["$no", "not", "ot$"]' +
                        '}],' +
                       '"tag": "AV"'+
                    '};' + 
                    '{"command": "only",'+ //////Commands VB
                            '"ngrams":[{'+
                            '"name": "only",' +
                            '"ngram": ["$on","onl","nly","ly$"]'+
                        '}],' +
                       '"tag": "AV"'+
                    '}';


                    ///////////////
            

            classifier.addDocument('is equal to', '-equal');
            classifier.addDocument('strictly less than', '-less-than');
            classifier.addDocument('strictly greater more than', '-more-than');
            classifier.addDocument('less than equal to', '-less-equal');
            classifier.addDocument('more than equal to', '-more-equal');
            classifier.addDocument('until', '-not-equal');
            classifier.addDocument('not', '-not-equal');
            classifier.addDocument('add', 'add');
            classifier.addDocument('add to', 'add');
            classifier.addDocument('equal add', 'add');
            
            classifier.addDocument('while less than', 'for');
            classifier.addDocument('while more than', 'for');
            classifier.addDocument('while not equal', 'while');
            classifier.addDocument('while less than equal to', 'for');
            classifier.addDocument('while more than equal to', 'for');
            classifier.addDocument('while true', 'while');
            classifier.addDocument('while and', 'while');
            classifier.addDocument('while or', 'while');
            classifier.addDocument('iterate through each element in', 'for'); //forall
            classifier.addDocument('iterate through', 'for'); //forall
            classifier.addDocument('for each element in', 'for'); //forall
            classifier.addDocument('for less than equal to', 'for'); //forall
            classifier.addDocument('for more than equal to', 'for'); //forall
            classifier.addDocument('for less than', 'for'); //forall
            classifier.addDocument('for more than', 'for'); //forall
            classifier.addDocument('for less ', 'for'); //forall
            classifier.addDocument('for more ', 'for'); //forall
            classifier.addDocument('for equal to', 'for'); //forall
            classifier.addDocument('for at until increment by each time', 'for'); //foruntilincrement
            classifier.addDocument('for at until decrement by each time', 'for'); //foruntilincrement
            classifier.addDocument('iterate increment decrement', 'for'); //foruntilincrement
            classifier.addDocument('for at until starting at', 'for'); //foruntilincrement
            classifier.addDocument('for iterate through equal to and until', 'for'); //foruntilincrement
            classifier.addDocument('while equal is than increment decrement', 'for'); //foruntilinc
            classifier.addDocument('iterate through until equal', 'for'); //for until
            
            
            classifier.train();
            vm.contents = tokens.split(";");

            for(var i = 0; i < vm.contents.length; i++){
                vm.contents[i] = JSON.parse(vm.contents[i]);
            }

            //vm.rules = JSON.parse(rule);
            //console.log(JSON.parse(rule));
            
        }
        
        vm.translated = [];
        vm.translate = function(arr){
            console.log(arr);
            vm.translated = [];
            var exit = false;

        
            for(var i = 0; i < arr.length; i++){
                exit = false;
                
                if(!arr[i].ngram && arr[i].name.indexOf(" ") != -1){
                    
                    var temp = vm.translated.pop();
                    temp = {
                        command:temp.name,
                        name:temp.name,
                        tag: temp.tag,
                        relationship: arr[i].name
                    };
                    var n = {
                        command:arr[i].name,
                        name:arr[i].name,
                        tag: "",
                        relationship: ""
                    };
                    vm.translated.push(temp);
                    vm.translated.push(n);
                    continue;
                }
                for(var j = 0; j < vm.contents.length; j++){
                    for(var k = 0; k < vm.contents[j].ngrams.length; k++){
                        if(arr[i].name == vm.contents[j].ngrams[k].name){
                            var x = {
                                name:vm.contents[j].ngrams[k].name,
                                command: vm.contents[j].command,
                                tag: vm.contents[j].tag,
                                specifier: vm.contents[j].ngrams[k].specifier,
                                relationship: ""
                            }
                            vm.translated.push(x);
                            exit = true;
                            break;
                        }
                        if(calculateJaccardIndex(arr[i].ngram, vm.contents[j].ngrams[k].ngram) > 0.30){
                            var x = {
                                name:vm.contents[j].ngrams[k].name,
                                command: vm.contents[j].command,
                                tag: vm.contents[j].tag,
                                specifier: vm.contents[j].ngrams[k].specifier,
                                relationship: ""
                            }
                            vm.translated.push(x);
                            exit = true;
                            break;
                        }
                    }
                    if(exit){
                        exit = true;
                        break;
                    }
                }
                if(!exit && arr[i].name.indexOf(" ") == -1 && isNaN(arr[i].name)){
                    var n = {
                        command:arr[i].name,
                        name:arr[i].name,
                        tag: "NN",
                        relationship: ""
                    };
                    vm.translated.push(n);
                } else if (!exit && !isNaN(arr[i].name)){
                    var n = {
                        command:arr[i].name,
                        name:arr[i].name,
                        tag: "NUM",
                        relationship: ""
                    };
                    vm.translated.push(n);
                } else if(!exit){
                    var n = {
                        command:arr[i].name,
                        name:arr[i].name,
                        tag: "",
                        relationship: ""
                    };
                    vm.translated.push(n);
                }
            }
            //console.log(vm.translated);
            return vm.translated;
            
        }

        var translations = [{
            language: "C++",
            code:[
                {   name: "add-equal",
                    template: "$0 = $0 + $1\n",
                    defaultValues:[{
                        placeholder: "$0",
                        value: "x",
                        relationship: "equal to"
                    },{
                        placeholder: "$1",
                        value: 0,
                        relationship: "uni"
                    }]
                },{   name: "create",
                    template: "$0 $1;",
                    defaultValues:[{
                        placeholder: "$0",
                        value: "T"
                    },{
                        placeholder: "$1",
                        value: "x"
                    }]
                },{   name: "for-less-than",
                    template: "for(int i = $0; i < $1; $2){\n",
                    defaultValues:[{
                        placeholder: "$0",
                        value: 0,
                        relationship: ""
                    },{
                        placeholder: "$1",
                        value: 0,
                        relationship: "less than"
                        
                    }, {placeholder: "$2",
                        value: "i++",
                        relationship: ""
                    }]
                },{   name: "initialize",
                    template: "$0 $1 = $2",
                    defaultValues:[{
                        placeholder: "$0",
                        value: "T"
                    },{
                        placeholder: "$1",
                        value: "a"
                    }, {placeholder: "$2",
                        value: "0"
                    }]
                },{   name: "remove-vector-at",
                    template: "for(int i = 0; i < $1.length; i++){\n"+
                                "if(i.at(i) == $2){\n"+
                                "$1.erase($1.begin()+i);\n"+
                                "}\n"+
                                "}",
                    defaultValues:[{
                        placeholder: "$0",
                        value: "T"
                    },{
                        placeholder: "$1",
                        value: "a",
                        relationship: "less than"
                    }, {placeholder: "$2",
                        value: "0"
                    }]
                },{ name: "merge",
                    template: "#include <algorithm>\n#include<vector> \\include these at the top of the file\n"+
                    "\\Below goes where you want it to \n"+
                    "std::vector<$0> $1; \n std::merge ($2,$3,$4,$5,$1.begin())",
                    defaultValues:[{
                        placeholder: "$0",
                        value: "typename T"
                    },{
                        placeholder: "$1",
                        value: "v"
                    },{
                        placeholder: "$2",
                        value: "PLACE_HOLDER_1.begin()"
                    },{
                        placeholder: "$3",
                        value: "PLACE_HOLDER_1.last()"
                    },{
                        placeholder: "$4",
                        value: "PLACE_HOLDER_2.begin()"
                    },{
                        placeholder: "$5",
                        value: "PLACE_HOLDER_2.last()"
                    }]
                },{ name: "while",
                    template: "while($0 $1){\n\n}",
                    defaultValues:[{
                        placeholder: "$0",
                        value: "true"
                    },{
                        placeholder: "$1",
                        value: ""
                    }]
                }]
        },{
            language: "BASH",
            code:[]
        }];
        
        vm.program = "";

        vm.compile = function(language){
            var variables = [];
            var parsedLine = "";
            var prev = "";
            var obj;
            //console.log(vm.translated);
            for(var i = 0; i < vm.translated.length; i++){
                // if(prev.tag && prev.command.indexOf(' ') != -1 && vm.translated[i].tag == "NN"){ // noun has an assigned value
                //     var temp = variables.pop();
                //     console.log("sd");
                //     obj = {
                //         var: prev.command,
                //         val: vm.translated[i].command,
                //         relationship: temp.relationship
                //     };
                //     variables.push(obj);
                // } else 
                if(vm.translated[i].tag == "NN" ){ // unsure if noun has assigned value could be for declaration purposes
                    if(variables.length > 0 && variables[variables.length-1].var == vm.translated[i].command){
                       
                    } else {
                        obj = {
                            var: vm.translated[i].command,
                            val: vm.translated[i].command,
                            relationship: vm.translated[i].relationship
                        };
                        variables.push(obj);
                    }                  
                    parsedLine = parsedLine + vm.translated[i].command + " ";
                } else if (vm.translated[i].tag == "NUM"){
                    if(prev.tag == "VB"){
                        obj = {
                            var: vm.translated[i].command,
                            val: vm.translated[i].command,
                            relationship: "uni"
                        };
                        variables.push(obj);
                    }else {
                        variables[variables.length - 1] = {
                            var: variables[variables.length - 1].var,
                            val: vm.translated[i].command,
                            relationship: variables[variables.length - 1].relationship
                        };
                    }
                    
                } else {
                    if(vm.translated[i].tag != "VB"){
                        parsedLine = parsedLine + vm.translated[i].name + " ";
                    } else {
                        parsedLine = parsedLine + vm.translated[i].command + " ";
                    }
                }
                
                prev = vm.translated[i];
                //console.log(prev);
                
            }

            var classified = classifier.getClassifications(parsedLine);
            //console.log(variables);
            var inquiry;
            if(classified.length > 1 && (classified[0].value - classified[1].value < 0.6) && 
            classified[1].label.charAt(0) == '-'){
                inquiry = classified[0].label+classified[1].label;
            } else {
                inquiry = classified[0].label;
            }

            var template;
            var quit = false;
            for(var i = 0; i < translations.length; i++){
                if(language == translations[i].language){
                    for(var j = 0; j < translations[i].code.length; j++){
                        if(translations[i].code[j].name == inquiry){
                            template = translations[i].code[j];
                            vm.program = translations[i].code[j].template;
                            quit = true;
                        }
                    }
                    if(quit){
                        quit = false;
                        break;
                    }
                }
            }

            var replacement = [];
            for(var i = 0; i < template.defaultValues.length; i++){
                if(template.defaultValues[i].relationship != ""){
                    for(var j = 0; j < variables.length; j++){
                        if(variables[j].relationship == template.defaultValues[i].relationship){
                            template.defaultValues[i] = {
                                placeholder: template.defaultValues[i].placeholder,
                                value: variables[j].val
                            };
                        }
                    }
                }
            }
            //console.log(variables);
            //console.log(inquiry);
            
           // console.log(template.defaultValues);

            for (var i = 0; i < vm.program.length; i++){
                if(vm.program.charAt(i) == '$'){
                    var x = Number(vm.program.charAt(i+1));
                    vm.program = vm.program.replace("$" + vm.program.charAt(i+1), template.defaultValues[x].value);
                }
            }

            // vm.translated = vm.translated.splice(0, vm.translated.length);
            // variables.splice(0, variables.length);
            // template = "";
            return vm.program;
            //console.log(vm.program);
        };

        function checkIndex(value){
            return -1 !== arr2.indexOf(value);
        }

        function calculateJaccardIndex(arr1, arr2){
            //console.log(arr1.filter(value => -1 !== arr2.indexOf(value)));
            //console.log(arr1.filter(value => -1 !== arr2.indexOf(value)));
            var intersection = arr1.filter(value => -1 !== arr2.indexOf(value)).length;
            return intersection/(arr1.length + arr2.length - intersection);
        }

    }
})();

(function(){
    angular
        .module('typed-effect', [])
        .directive('typedEffect', typedEffect);
    
    typedEffect.$inject = ['$interval', '$timeout'];

    function typedEffect($interval, $timeout){
        var directive = {
            restrict: 'A',
            scope: {
                text: '<',
                callback: '&'
            },
            link: link
        };

        return directive;
        
        function link(scope, element, attrs) {
            var i = 0, interval,
                text = scope.text || '',
                delay = parseInt(attrs.delay) || 0,
                speed = parseInt(attrs.speed) || 100,
                cursor = "|",
                blink = attrs.blink ? attrs.blink === 'true' : true;

            cursor = angular.element('<span>' + cursor + '</span>');

            $timeout(typeText, delay);

            function typeText() {
                typeChar();
                interval = $interval(typeChar, speed);

                function typeChar() {
                    if (i <= text.length) {
                        element.html(text.substring(0, i)).append(cursor);
                        i++;
                    } else {
                        // $interval.cancel(interval);

                        // if (blink) {
                        //     cursor.addClass('blink');
                        // } else {
                        //     cursor.remove();
                        // }
                        cursor.remove();
                    }
                }
            }
        }
    }
})();
