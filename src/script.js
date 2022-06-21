module.exports = { //https://stackoverflow.com/questions/34357489/calling-webpacked-code-from-outside-html-script-tag
    run: function (arg) {
      new htmlCall(arg);
    }
  };

function strToArray(str){
    let out = [];
    for (let i = 0; i < str.length; i++)
        out.push(str[i]);
    return out;
}



const prompt = require("prompt-sync")(); // reffed
var printf = require("printf"); // reffed
var math = require("mathjs"); // reffed
var frexp = require("locutus/c/math/frexp"); // reffed
var modf = require( '@stdlib/math-base-special-modf'); // reffed
var tsToUtcFormat = require('date-format-ms').tsToUtcFormat; // reffed
var tsToLocalFormat = require('date-format-ms').tsToLocalFormat; // reffed
var strftime = require('strftime');
var bigDecimal = require('js-big-decimal');
var bigInt = require("big-integer");
const { parse, eval } = require('expression-eval');
const { addListener } = require("process");
const { assert, time, timeStamp } = require("console");
const { stripVTControlCharacters } = require("util");
const { i } = require("mathjs");


/* variables holding max values of numeric data types */
let long_max = 9223372036854775807n;
let long_min = -9223372036854775808n;
let int_max = 2147483647;
let int_min = -2147483648;
let short_max = 32767;
let short_min = -32768;
let ulong_max = 4294967295;

let float_max = 3.402823466e+38;
let float_min = 1.175494351e-38;
let double_max = new bigDecimal('1.7976931348623158e+308');
let double_min = new bigDecimal('2.2250738585072014e-308');


/*

    ------------
    CPP OVERHEAD
    ------------

*/

/* variables storing the currently defined macros */
let defines = new Object();         // defines[macroID] = macroBODY

let definesF = new Object();        // definesF[FmacroID] = {
                                    //     parameters = [token,...],
                                    //     content = [token,...]   
                                    // }

let definesFV = new Object();       // definesFV[FVmacroID] = {
                                    //     parameters = [token,...,__VA_ARGS__],
                                    //     content[token,...]
                                    // }

// globally stored the name of actual module being analyzed and a current line of code
let filename = "main.c";
let line=0;
// predefined macros
let specialMacros = ["__LINE__","__FILE__","__DATE__","__TIME__","__STDC__","__STDC_VERSION__","__STDC_HOSTED__","__ASSEMBLER__"];
// flag indicating EOF not being preceeded by EOL
let EOFwithNoNL = 0;


/*

    ---------------
    STDLIB OVERHEAD
    ---------------

*/

// object holding templates of defined structures
let structDefsTable = new Object(); // structDefsTable[structID] = {
                                    //     size = size,
                                    //     varNames = [varName,...],
                                    //     types = [type,...]
                                    // }


// first available address for allocation on stack and heap
let SaddressCounter = 1728;
let HaddressCounter = 896;

// simulated filesystem usable by stdio functions
let fileSystemTable = {
    'mylib.h': '#define testMacro 1\n#define testMacro2 2\n',
    'mylib2.h': '#define A 1\n#define B 2\n'
}

// table of streams associated with a specific file, necessary to prevent errors
let fileStreamTable = {
    'mylib.h': ['576','640']
}

/* table containing variable name and stack address they are saved at */
let nameSpaceTable = {
    // int Ca = 16;
    'Ca' : {
        initialized: true,
        address: 'X64'
    },
    // int Cb;
    'Cb' : {
        initialized: false,
        address: 'X128'
    },
    // int Cc[] = {1,2,3};
    'Cc' : {
        initialized: true,
        address: 'X192'
    },
    // int Cd[4];
    'Cd' : {
        initialized: false,
        address: 'X256'
    },
    // int *Ce = malloc(5*sizeof(int));
    'Ce' : {
        initialized: true,
        address: 'X320'
    },
    // int *Cf;
    'Cf' : {
        initialized: false,
        address: 'X384'
    },
    // char Za = 'x';
    'Za' : {
        initialized: true,
        address: 'X448'
    },
    // char Zb;
    'Zb' : {
        initialized: false,
        address: 'X512'
    },
    // char Zc[] = "123x4";
    'Zc' : {
        initialized: true,
        address: 'X576'
    },
    // char Zd[2];
    'Zd' : {
        initialized: false,
        address: 'X640'
    },
    // char *Ze = malloc(10);
    'Ze' : {
        initialized: true,
        address: 'X704'
    },
    // char *Zf = malloc(10);
    // strcpy(Zf,"1234");
    'Zf' : {
        initialized: true,
        address: 'X768'
    },
    // int **Cg = malloc(8*2);
    // for (int i = 0;i<2;i++) Cg[i] = malloc(3*4);
    'Cg' : {
        initialized: false,
        address: 'X832'
    },
    // char **Zg = malloc(2*8);
    // for (int i = 0;i<2;i++) Zg[i] = malloc(3*1);
    'Zg' : {
        initalized: true,
        address: 'X896'
    },
    // char Zh[] = "1.23ASD";
    'Zh' : {
        initialized: true,
        address: 'X960'
    },
    // char Zi[] = "FFzz";
    'Zi' : {
        initialized: true,
        address: 'X1024'
    },
    // int Ch = -16;
    'Ch' : {
        initialized: true,
        address: 'X1088'
    },
    // long int La = -369;
    'La' : {
        initialized: true,
        address: 'X1152'
    },
    // FILE *Fa = fopen("mylib.h","r+")
    'Fa' : {
        initialized: true,
        address: 'X1216'
    },
    // FILE *Fb = fopen("mylib.h","a+")
    'Fb' : {
        initialized: true,
        address: 'X1280'
    },
    // fpos_t pos;
    'pos' : {
        initialized: false,
        address: 'X1344'
    },
    // FILE *Fc;
    'Fc' : {
        initialized: true,
        address: 'X1408'        
    },
    // double Da = 1.23;
    'Da' : {
        initialized: true,
        address: 'X1472'
    },
    // double Db;
    'Db' : {
        initialized: true,
        address: 'X1536'
    },
    // struct tm {
    //     int a;         /* seconds,  range 0 to 59          */
    //     int b;         /* minutes, range 0 to 59           */
    // }; -> defineStruct('tm',8,['a','b'],['int','int']);
    // tmm Sa;
    'Sa' : {
        initialized: false,
        address: 'X1600'
    },
    // time_t seconds;
    'Ta' : {
        initialized: false,
        address: 'X1664'
    }
}

/* table containing information about the memory block on a stack */
let SaddressTable = {
    'X64' : {
        name: 'Ca',
        length: 1,
        type: 'int',
        size: 4,
        value: '16'
    },
    'X128' : {
        name: 'Cb',
        length: 0,
        type: 'int',
        size: 4,
        value: 0
    },
    'X192' : {
        name: 'Cc',
        length: 3,
        type: 'array',
        subType: 'int',
        size: 12,
        value: ['1','2','3'],
        dereferred: false,
        offset: 0
    },
    'X256' : {
        name: 'Cd',
        length: 0,
        type: 'array',
        subType: 'int',
        size: 16,
        subSize: 4,
        value: 0
    },
    'X320' : {
        name: 'Ce',
        length: 1,
        type: 'pointer',
        on: 'int',
        size: 8,
        value: '64'
    },
    'X384' : {
        name: 'Cf',
        length: 1,
        type: 'pointer',
        on: 'int',
        size: 8,
        value: 0 // wild pointer
    },
    'X448' : {
        name: 'Za',
        length: 1,
        type: 'char',
        size: 1,
        value: 'x'
    },
    'X512' : {
        name: 'Zb',
        length: 0,
        type: 'char',
        size: 1,
        value: 0
    },
    'X576' : {
        name: 'Zc',
        length: 6,
        type: 'array',
        subType: 'char',
        size: 6,
        value: ['1','2','3','x','4','\0'],
        dereferred: false,
        offset: 0
    },
    'X640' : {
        name: 'Zd',
        length: 0,
        type: 'array',
        subType: 'char',
        size: 2,
        value: [],
        dereferred: false,
        offset: 0
    },
    'X704' : {
        name: 'Ze',
        length: 1,
        type: 'pointer',
        on: 'char',
        size: 8,
        value: '192'
    },
    'X768' : {
        name: 'Zf',
        length: 1,
        type: 'pointer',
        on: 'char',
        size: 8,
        value: '256'
    },
    'X832' : {
        name: 'Cg',
        length: 1,
        type: 'pointer',
        size: 8,
        value: '320'
    },
    'X896' : {
        name: 'Zg',
        length: 1,
        type: 'pointer',
        on: 'char*',
        size: 8,
        value: '448'        
    },
    'X960' : {
        name: 'Zh',
        length: 7,
        type: 'array',
        subType: 'char',
        size: 7,
        value: strToArray("1.23ASD").concat('\0'),
        dereferred: false,
        offset: 0
    },
    'X1024' : {
        name: 'Zi',
        length: 5,
        type: 'array',
        subType: 'char',
        size: 5,
        value: strToArray("FFzz").concat('\0'),
        dereferred: false,
        offset: 0
    },
    'X1088' : {
        name: 'Ch',
        length: 1,
        type: 'int',
        size: 4,
        value: '-16'
    },
    'X1152' : {
        name: 'La',
        length: 1,
        type: 'long',
        size: 8,
        value: '-369'
    },
    'X1216' : {
        name: 'Fa',
        length: 1,
        type: 'pointer',
        on: 'FILE',
        size: 8,
        value: '576'
    },
    'X1280' : {
        name: 'Fb',
        length: 1,
        type: 'pointer',
        on: 'FILE',
        size: 8,
        value: '640'
    },
    'X1344' : {
        name: 'pos',
        length: 1,
        type: 'pos_t',
        size: 16,
        value: 0
    },
    'X1408' : {
        name: 'Fc',
        length: 1,
        type: 'pointer',
        on: 'FILE',
        size: 8,
        value: 0        
    },
    'X1472' : {
        name: 'Da',
        length: 1,
        type: 'double',
        size: 8,
        value: '1.23'
    },
    'X1536' : {
        name: 'Db',
        length: 1,
        type: 'double',
        size: 8,
        value: 0
    },
    'X1600' : {
        name: 'Sa',
        length: 1,
        type: 'struct',
        structType: 'tmm',
        size: 9*4,
        value: [/* SadressTable[X1601],... */],
        addresses: [/* X1601,... */],
        varNames: ['a','b'],
        types: ['int','int']
    },
    'X1601' : {
        sourceS: 'X1600',
        name: 'a',
        length: 1,
        type: 'int',
        size: 4,
        value: 0
    },
    'X1605' : {
        sourceS: 'X1600',
        name: 'b',
        length: 1,
        type: 'int',
        size: 4,
        value: 0
    },
    'X1664' : {
        name: 'Ta',
        length: 1,
        type: 'int',
        size: 4,
        value: 0
    }

}

/* table containing information about the memory block on heap */
let HaddressTable = {
    '64' : {
        own: '64',
        source: 'X320',
        dereferred: false,
        length: 5,
        type: 'int',
        size: 20,
        value: [],
        offset: 0
    },
    '192' : {
        own: '192',
        source: 'X704',
        dereferred: false,
        length: 10,
        type: 'char',
        size: 10,
        value: [],
        offset: 0
    },
    '256' : {
        own: '256',
        source: 'X768',
        dereferred: false,
        length: 10,
        type: 'char',
        size: 10,
        value: ['1','2','3','4','\0'],
        offset: 0
    },
    '320' : {
        own: '320',
        source: 'X832',
        dereferred: false,
        length: 2,
        type: 'pointer',
        on: 'int',
        size: 16,
        value: [/*HaddressTable['384'],HaddressTable['392']*/],
        addresses: ['384','392'],
        offset: 0
    },
    '384' : {
        own: '384',
        source: '320',
        dereferred: false,
        length: 2,
        type: 'int',
        size: 8,
        value: [],
        offset: 0
    },
    '392' : {
        own: '392',
        source: '320',
        dereferred: false,
        length: 2,
        type: 'int',
        size: 8,
        value: [],
        offset: 0
    },
    '448' : {
        own: '448',
        source: 'X832',
        dereferred: false,
        length: 2,
        type: 'pointer',
        on: 'char',
        size: 16,
        value: [/*HaddressTable['512'],HaddressTable['515']*/],
        addresses: ['512','515'],
        offset: 0
    },
    '512' : {
        own: '512',
        source: '448',
        dereferred: false,
        length: 3,
        type: 'char',
        size: 3,
        value: ['1','2','\0'],
        offset: 0
    },
    '515' : {
        own: '515',
        source: '448',
        dereferred: false,
        length: 3,
        type: 'char',
        size: 3,
        value: [],
        offset: 0
    },
    '576' : {
        own: '576',
        source: 'X1216',
        length: 1,
        type: 'FILE',
        size: 216,
        read: true,
        write: true,
        offsetLock: false,
        eof: false,
        offset: 5,
        filename: 'mylib.h'
    },
    '640' : {
        own: '640',
        source: 'X1280',
        length: 1,
        type: 'FILE',
        size: 216,
        read: true,
        write: true,
        offsetLock: true,
        eof: false,
        offset: 0,
        filename: 'mylib.h'
    }
}

HaddressTable['320']['value'].push(HaddressTable['384'])
HaddressTable['320']['value'].push(HaddressTable['392'])

HaddressTable['448']['value'].push(HaddressTable['512'])
HaddressTable['448']['value'].push(HaddressTable['515'])

/* function accepts the format [[argument,expectedType],...] and returns array filled with either the bare value or the pointer to it if desired of all passed arguments */
function getArguments(argArray){
    let outArray = new Array();
    for (let [arg,type] of argArray){
        if (arg.indexOf('\'') != -1 || arg.indexOf('"') != -1 || !arg.match(/[_a-zA-Z]+/)){
            let end = arg.indexOf('"') != -1 ? '\0' : '';
            outArray.push(arg.replaceAll(/["']/g,'')+end);
            continue;
        }
        let [argObject,rev] = finallly(arg, type);
        switch(type){
            case 'char':
                outArray.push(getVal(argObject));
                break;
            case 'char*':
                outArray.push(argObject['value'].slice(argObject['offset']).join(""));
                break;
            case 'char**':
                // tady co když crash tak uninit zas
                if (argObject['initialized'] != undefined)
                    argObject['initialized'] = true;
                argObject = dereference(argObject,'char*',0);
                outArray.push(argObject);
                break;
            case 'int':
            case 'long':
                outArray.push(getVal(argObject));
                break;
            case 'pointer*':
                if (argObject['address'])
                    outArray.push(SaddressTable[argObject['address']]);
                else
                    outArray.push(argObject);
                break;
            case 'address':
                if (argObject['address'])
                    outArray.push(argObject['address']);
                else
                    outArray.push(argObject['own']);
                break;
            case 'double':
                outArray.push(getVal(argObject));
                break;
        }
        revertOffsets(rev);
    }
    return outArray;
}

/* analyses an object holding a variable, returning necessary information for the system of pointer arithmetics */
function getTypeAndLvl(theObj){
    let offsets = new Array();
    let lvl = (theObj['type'] == 'pointer' || theObj['type'] == 'array') ? 1 : 0;
    if (theObj['name'] && theObj['type'] == 'pointer'){
        
        if (theObj['value'] === 0)
            return [theObj['type'],lvl,offsets];
        theObj = HaddressTable[theObj['value']];
    }

    if(theObj['offset'] != undefined)
        offsets = [theObj['offset']];
    if (theObj['type'] == 'pointer'){
        for (let i = 0; i<theObj['value'].length; i++){
            offsets[i+1] = getTypeAndLvl(theObj['value'][i])[2];
        }
    }
    while (theObj['type'] == 'pointer') {
        theObj = theObj['value'][0];
        lvl++;
    }
    //console.log(offsets)
    if (theObj['type'] == 'array')
        return [theObj['subType'],lvl,offsets];
    else
        return [theObj['type'],lvl,offsets];
}

/* dereferences passed object representing a pointer */
function dereference(obj, type, lvl){
    let astsStr = '';
    for (let i = 0; i < lvl; i++)
        astsStr += '*';
    // dereferences from stack memory
    if (obj['address']){
        return SaddressTable[obj['address']];
    }
    // dereferences from heap memory
    else {
        if (obj['dereferred']){
            console.log("error: invalid type argument of unary '*' (have '"+type+astsStr+"')");
            return -1;
        }
        if (obj['type'] == 'pointer') {
            if (obj['value'] === 0){
                console.log("error: trying to derefernce uninitialized pointer");
                return -1;
            }
            if (obj['name']){
                return HaddressTable[obj['value']];
            }
            else {
                if (obj['value'][obj['offset']] === 0){
                    console.log("error: trying to derefernce uninitialized pointer");
                    return -1;
                }
                return obj['value'][obj['offset']];
            }
        }
        else {
            obj['dereferred'] = true;
            return obj;
        }
    }
}

/* references passed object returning a pointer to it */
function reference(obj){
    if (obj['address']){
        console.log("error: lvalue required as unary '&' operand");
        throw '';
    } else if (obj['name'])
        obj = nameSpaceTable[obj['name']];
    else
        obj = (obj['source'][0] == 'X') ? SaddressTable[obj['source']] : HaddressTable[obj['source']];
    return obj;
}

/* function used only while evaluating pointer expression and all the changes it does are reverted at the end of the process of expression evaluation */
function applyOffset(obj, offset){
    if (obj['address']){
        err("Trying to access memory on stack which doesnt belong to you");
    }
    obj['offset'] += offset;
    if (obj['offset'] < 0 || obj['offset'] > obj['value'].length-1)
        err("Accessing pointer out of memory borders.");
}

/* function used to revert pointer offset to the state before pointer expression evaluation started */
function revertOffsets([obj, offsets]){
    if (!offsets.length || obj['on'] == 'FILE') return;
    // console.log([obj, offsets]);
    if (obj['dereferred'] != undefined)
        obj['dereferred'] = false;
    if (obj['type']=='array' && offsets[0] && offsets[0]!=0)
        err("You cant shift an array on stack.");
    //console.log(obj,offsets)
    if (offsets[0] < 0 || (obj['value'].length && offsets[0] > obj['value'].length-1))
        err("Accessing pointer out of memory borders.");
    
    // tohle je hotfix ayy pls dont break anything
    if (obj['type'] == 'pointer' && obj['name']) obj = HaddressTable[obj['value']];
    if (obj['offset'] != undefined)
        obj['offset'] = offsets[0];

//    console.log('ss',obj);
    if (!obj['name'] && obj['type'] == 'pointer'){
        for (let i = 0; i<obj['value'].length;i++)
            revertOffsets([obj['value'][i],offsets[i+1]]);
    }
    // if (obj['name'])
    //     obj = HaddressTable[obj['value']];
    // else {
    //     obj = obj['value'][0];
    // }
}

/* function wrapping fatal error occurence handling */
function err(msg){
//    console.log(msg);
    throw msg;
}

/* does the process of whole pointer expression parsing */
function finallly(arg, desiredType){
    let varName = arg.match(/[_A-Za-z][_A-Za-z\d]*/)[0];
    arg = arg.replace(varName,'x');
    let theObject = SaddressTable[nameSpaceTable[varName]['address']];
    if (theObject['type'] == 'pointer' && theObject['value'] !== 0) theObject = HaddressTable[theObject['value']];
    let [type,levelOfArgVar,defaultOffsets] = getTypeAndLvl(SaddressTable[nameSpaceTable[varName]['address']]);
    let index;
    let level = 0, brBalance = 0;
    while (arg.length != 1){
        index = arg.match(/x/)['index'];
        if (brBalance < 1 && arg[index+1]){
            if (arg[index+1] == '['){
                applyOffset(theObject, parseInt(arg.slice(index+2))*(arg[index+2] == '-' ? -1 : 1));
                theObject = dereference(theObject, type, level);
                arg = arg.slice(0,index+1) + arg.slice(index+2).replace(/^.*?\]/,'');
                level++;
                continue;
            } else if (arg[index+1] == ')'){
                brBalance++;
                arg = arg.slice(0,index+1) + arg.slice(index+2);
            } else if (arg[index+1].match(/^[+-]/) && arg[index+2].match(/^[+-]/)){
                if (level == -1)
                    err("You cant "+(arg[index+1] == '+' ? 'in' : 'de')+"crement on a stack memory.");
                let baseDef = defaultOffsets;
                for (let i = level; i!=0; i--)
                    baseDef = baseDef[0];
                baseDef[0] += arg[index+1] == '+' ? 1 : -1;
                arg = arg.slice(0,index+1) + arg.slice(index+3);
            }
        }
        if (brBalance > -1 && arg[index-1]){
            if (arg[index-1] == '*') {
                theObject = dereference(theObject, type, level);
                level++;
                arg = (arg[index-2] ? arg.slice(0,index-1) : '') + arg.slice(index);
                continue;
            } else if (arg[index-1] == '&'){
                theObject = reference(theObject);
                level--;
                arg = (arg[index-2] ? arg.slice(0,index-2) : '') + arg.slice(index);
                continue;
            } else if (arg[index-1].match(/^[+-]/) && arg[index-2].match(/^[+-]/)){
                if (level == -1)
                    err("You cant "+(arg[index-1] == '+' ? 'in' : 'de')+"crement on a stack memory.");
                let baseDef = defaultOffsets;
                for (let i = level; i!=0; i--)
                    baseDef = baseDef[0];
                baseDef[0] += arg[index-1] == '+' ? 1 : -1;
                applyOffset(theObject, (arg[index-1] == '+' ? 1 : -1));
                arg = (arg[index-3] ? arg.slice(0,index-3) : '') + arg.slice(index);
            }
        }
        if (brBalance < 1){
            if (arg[index+1] == '+' || arg[index+1] == '-'){
                applyOffset(theObject, parseInt(arg.slice(index+2))*(arg[index+1] == '+' ? 1 : -1));
                arg = arg.slice(0,index+1) + arg.slice(index+3).replace(/^\d*/,'');
                continue;
            }
        }
        if (brBalance > -1){
            if (arg[index-1] == '(') {
                arg = (arg[index-2] ? arg.slice(0,index-1) : '') + arg.slice(index);
                brBalance--;
            }
        }
    }

    let levelOfType = 0;
    let typeCalc = desiredType;
    while(getLast(typeCalc) == '*'){
        typeCalc = typeCalc.slice(0,-1);
        levelOfType++;
    }

    if (type != typeCalc && (desiredType != 'pointer*' && desiredType != 'address')){
        let asts = '',cont = levelOfArgVar;
        while (cont--)
            asts+='*';
        err('function expects \''+desiredType+'\' but \''+type+asts+'\' was passed');
    }

    if ((desiredType == 'pointer*' && levelOfType > levelOfArgVar-level) || ((desiredType != 'pointer*' && desiredType != 'address') && levelOfType != levelOfArgVar-level)){
        let asts2 = '';
        for(let i = 0;i<levelOfArgVar-level;i++) 
            asts2+='*';
        err('function accepts \''+desiredType+'\' but \''+typeCalc+asts2+'\' was passed');
    }
    let offSetToReturn = theObject['offset'];

    if (theObject['dereferred'])
        if (theObject['type'] != 'pointer')
            return [theObject,[SaddressTable[nameSpaceTable[varName]['address']],defaultOffsets]];
        else
            return [theObject['value'][offSetToReturn],[HaddressTable[SaddressTable[nameSpaceTable[varName]['address']]['value']],defaultOffsets]];
    else {
        if (theObject['type'] != 'pointer'){
            return [theObject,[SaddressTable[nameSpaceTable[varName]['address']],defaultOffsets]];
        }
        else {
            return [theObject,[theObject/*HaddressTable[SaddressTable[nameSpaceTable[varName]['address']]['value']]*/,defaultOffsets]];
        }
    }
}

/* accepts string with name of type, return C size of it as a number */
function getSize(type){
    switch(type){
        case 'char':
            return 1;
        case 'int':
            return 4;
        case 'long':
            return 8;
        case 'float':
            return 4;
        case 'double':
            return 8;
        case 'pointer':
            return 8;
        case 'fpos_t':
            return 16;
    }
}

/* extraction of a bare value from object describing the place in memory where variable is stored */
function getVal(obj){
    if (obj['address']){
        obj = SaddressTable[obj['address']];
    }
    if (obj['dereferred']){
        if (!obj['value'].length){
            throw 'error: accesing uninitalized memory';
        }
        return obj['value'][obj['offset']];
    }
    else {
        if (obj['value'] === 0){
            throw 'error: accesing uninitalized memory';
        }
        return obj['value'];
    }
}

/* typedef struct handler */
function defineStruct(id,size,varNames,types){
    if (id in structDefsTable){
        console.log('struct with such id already defined');
        return -1;
    }
    structDefsTable[id] = {
        size: size,
        varNames: varNames,
        types: types
    }
    return 0;
}

/* calculates size for a structure, accepts array of types as string, returns sum of the sizes */
function calcSize(types){
    let size = 0;
    for (let type of types)
        size += getSize(type);
    return size;
}

/* creates an object in memory in desired table, on address, with a name and a type */
function addUninitToTable(table,address,name,type){
    table[address] = {
        name: name,
        type: type,
    }
    // DLC inc - ALL OTHER TYPES
    switch(type){
        case 'int':
            table[address]['length'] = 1;
            table[address]['size'] = 4;
            table[address]['value'] = 0;
            break;
    }
    return table[address];
}

/* declares an empty structure either on heap or stack, depending of last argument */
function createStruct(id,structName,where/*1 ? stack : heap*/){
    if (!(id in structDefsTable)){
        console.log('struct with such id is not defined');
        return -1;
    }
    let structTemplate = structDefsTable[id];
    nameSpaceTable[structName] = {
        initialized: true,
        address: 'X'+SaddressCounter.toString()
    }
    let address, table;
    // create on stack
    if (where==1){
        address = SaddressCounter;
        table = SaddressTable;
    }
    // create on heap
    else {
        SaddressTable['X'+SaddressCounter.toString()] = {
            name: structName,
            length: 1,
            type: 'pointer',
            on: 'struct',
            size: 8,
            value: HaddressCounter.toString()
        }

        address = HaddressCounter;
        table = HaddressTable;
    }
    let srcAddress = address;
    
    address++;
    let obj = {
        length: 1,
        type: 'struct',
        structType: id,
        size: structTemplate['size'],
        value: [],
        addresses: [],
        varNames: structTemplate['varNames'],
        types: structTemplate['types']
    }
    if (where){
        obj['name'] = structName;
    } else {
        obj['source'] = 'X'+SaddressCounter.toString();
        obj['own'] = HaddressCounter.toString();
        HaddressCounter += 64;
    }
    SaddressCounter += 64;
    for (let i = 0; i < structTemplate['types'].length; i++){
        let [type,name] = [structTemplate['types'][i],structTemplate['varNames'][i]];
        addUninitToTable(table,address,name,type);
        table[address]['sourceS'] = srcAddress.toString();
        if (table==HaddressTable)
            table[address]['own'] = address.toString();
        obj['value'].push(table[address]);
        obj['addresses'].push(address.toString());
        address+=getSize(type);
    }
    table[srcAddress.toString()] = obj;
    return obj;
}

/* return object identified by address in memory */
function getObjByAddress(address){
    if (address[0]=='X')
        return SaddressTable[address];
    else
        return HaddressTable[address];
}

/* evalues if pointer is initialized */
function checkPointerInit(ptr,fnc){
    if (ptr['type'] == 'pointer' && !ptr['value']){
        console.log(fnc+": unitialized pointer");
        return 0;
    }
    return 1;
}

/* writes bare value to a pointer based variable */
function assignValueToPointer(source,value){
    if (source['name']){
        source['value'] = value;
        source['length'] = 1;
        nameSpaceTable[source['name']]['initialized'] = true;
    }
    else if (source['address']){
        source['initialized'] = true;
        source = SaddressTable[source['address']];
        source['value'] = value;
        source['length'] = 1;
    }   
    else {
        source['value'][source['offset']] = value;
    } 
}



/*

    ------------------
    STANDARD C LIBRARY
    ------------------

*/

/* helping functions for specific libraries */

/* returns object specifying info about a function */
function CFO(name,pointer,arguments_types,variadicFlag,ret_type){
    let fncObject = {};
    fncObject['name'] = name;
    fncObject['pointer'] = pointer;
    fncObject['arguments_types'] = arguments_types;
    fncObject['variadic'] = variadicFlag;
    fncObject['ret_type'] = ret_type;

    return fncObject;
}

/* parser for a 'mode' argument of fopen() function */
function parseFopenMode(mode){
    let read = false, write = false, offsetLock = false, removeExisting = false, mustExist = false;
    switch(mode['0'].toUpperCase()){
        case 'W':
            write = true;
            removeExisting = true;
            if (mode['1']=='+')
                read = true;
            break;
        case 'R':
            read = true;
            mustExist = true;
            if (mode['1']=='+')
                write = true;
            break;
        case 'A':
            write = true;
            offsetLock = true;
            if (mode['1']=='+')
                read = true;
            break;
    }
    return [read, write, offsetLock, removeExisting, mustExist];
}

/* removes trailing \0 from a string */
function removeTrailing0(str){
    let retArr = new Array();
    for (let strr of str)
        retArr.push(strr.replace(/\0*$/,''));
    return retArr;
}

/* wrapper for a printf() function used also in sprintf() and fprintf() */
function printfWrap(args){
    let theString = args[0];

    let formats = ([...theString.matchAll(/%[a-z]/g)]);
    if (args.slice(1).length != formats.length){
        console.log("printf(): the number of arguments dont fit the number of formating symbols");
        return -1;
    }
    let newRestOfArgs = new Array();
    for (let i = 0; i < formats.length; i++){
        let arg = args.slice(1)[i];
        switch(formats[i][0]){
            case '%s':
                newRestOfArgs.push(getArguments([[arg,'char*']])[0]);
                break;
            case '%d':
                newRestOfArgs.push(getArguments([[arg,'int']])[0]);
                break;
            case '%f':
                newRestOfArgs.push(getArguments([[arg,'double']])[0]);
                break;
            case '%u':
                let [add] = getArguments([[arg,'address']])
                if (add[0] == 'X'){
                    add = parseInt("999"+add.slice(1));
                }
                else 
                    add = parseInt("888"+add);
                newRestOfArgs.push(add);
                break; 
        }
    }
    return [theString].concat(newRestOfArgs);
}

/* disassociates a stream from a given filename */
function removeStream(stream){
    let theArr = fileStreamTable[stream['filename']];
    let index = theArr.indexOf(stream['own']);
    fileStreamTable[stream['filename']] = theArr.slice(0,index).concat(theArr.slice(index+1));
}

/* fills a time.h tm struct with data given in arr */
function stuffTime(tmstr,arr){
    let sec = parseInt(arr[0]).toString();
    let min = parseInt(arr[1]).toString();
    let hour = parseInt(arr[2]).toString();
    let mday = parseInt(arr[3]).toString();
    let mon = (parseInt(arr[4])-1).toString();
    let year = (parseInt(arr[5])-1900).toString();
    let wday = parseInt(arr[6]).toString();
    let yday = parseInt(arr[7]).toString();
    let isdst = 1;
    let ts = parseInt(arr[8]).toString();

    tmstr['value'][0]['value'] = sec;
    tmstr['value'][1]['value'] = min;
    tmstr['value'][2]['value'] = hour;
    tmstr['value'][3]['value'] = mday;
    tmstr['value'][4]['value'] = mon;
    tmstr['value'][5]['value'] = year;
    tmstr['value'][6]['value'] = wday;
    tmstr['value'][7]['value'] = yday;
    tmstr['value'][8]['value'] = isdst.toString();
    tmstr['value'][9]['value'] = ts;
    
    return tmstr;
}


/* libraries themselves */


/* stdio.h library functions definitions */
class stdioL {
    // int fclose(FILE *stream)
    static fclose(arg1){
        let [stream] = getArguments([[arg1,'pointer*']]);
        if(checkPointerInit(stream,'fclose()')==-1) return -1;
        removeStream(stream);
        return stdlibL.free(arg1);        
    }

    // int feof(FILE *stream)
    static feof(arg1){
        let [stream] = getArguments([[arg1,'pointer*']]);
        if(checkPointerInit(stream,'feof()')==-1) return -1;
        return stream['eof'] ? 1 : 0;
    }

    // int fgetpos(FILE *stream, fpos_t *pos)
    static fgetpos(arg1,arg2){
        let [stream,pos] = getArguments([[arg1,'pointer*'],[arg2,'pointer*']]);
        if(!checkPointerInit(stream,'fgetpos()') || !checkPointerInit(pos,'fgetpos()')) return -1;
        assignValueToPointer(pos,[stream['offset'],stream['source']]);
        return 0;
    }

    // FILE *fopen(const char *filename, const char *mode)
    static fopen(arg1,arg2,varName){
        let [filename,mode] = getArguments([[arg1,'char*'],[arg2,'char*']]);
        [filename,mode] = removeTrailing0([filename,mode]);
        let stackAddress = nameSpaceTable[varName]['address'];
        let heapAddress = HaddressCounter.toString(10);
        SaddressTable[stackAddress]['value'] = heapAddress;
        HaddressCounter += 64;
        let [read, write, offsetLock, removeExisting, mustExist] = parseFopenMode(mode);
        if (mustExist && !fileSystemTable[filename]){
            console.log("fopen(): file must exist");
            return -1;
        }
        if (removeExisting)
            fileSystemTable[filename] = '';
        
        HaddressTable[heapAddress] = {
            own: heapAddress,
            source: stackAddress,
            length: 1,
            type: 'FILE',
            size: 216,
            read: read,
            write: write,
            offsetLock: offsetLock,
            eof: 0,
            offset: 0,
            filename: filename
        }
        if (filename in fileStreamTable){
            fileStreamTable[filename].concat([heapAddress]);
        }
        else
            fileStreamTable[filename] = [heapAddress];
        
        return HaddressTable[heapAddress];
    }

    // FILE *freopen(const char *filename, const char *mode, FILE *stream)
    static freopen(arg1,arg2,arg3){
        let [filename,mode,stream] = getArguments([[arg1,'char*'],[arg2,'char*'],[arg3,'pointer*']]);
        // TBD
    }

    // int fseek(FILE *stream, long int offset, int whence)
    static fseek(arg1,arg2,arg3){
        // SEEK_SET = 0, SEEK_CUR = 1, SEEK_END = 2
        let [stream,offset,whence] = getArguments([[arg1,'pointer*'],[arg2,'long'],[arg3,'int']]);
        if (!checkPointerInit(stream,'fseek()')) return -1;
        let finalOffset = parseInt(offset);
        let lastCharIndex = fileSystemTable[stream['filename']].length;
        switch(whence){
            case '0':
                break;
            case '1':
                finalOffset += stream['offset'];
                break;
            case '2':
                finalOffset += lastCharIndex;
                break;
        }

        if (finalOffset >= lastCharIndex){
            if (finalOffset > lastCharIndex)
                console.log("fseek(): trying to set offset out of file, setting to the end of file");
            finalOffset = lastCharIndex;
        }

        stream['offset'] = finalOffset;
        return 0;
    }

    // int fsetpos(FILE *stream, const fpos_t *pos)
    static fsetpos(arg1,arg2){
        let [stream,pos] = getArguments([[arg1,'pointer*'],[arg2,'pointer*']]);
        if (!checkPointerInit(stream,'fsetpost()') || !checkPointerInit(pos,'fsetpost()')) return -1;
        let thePos = getVal(pos)
        if (thePos[1] != stream['source']){
            console.log('fsetpos(): position associated to different stream');
            return -1;
        }
        stream['offset'] = thePos[0];
        return 0;
    }

    // long int ftell(FILE *stream)
    static ftell(arg1){
        let [stream] = getArguments([[arg1,'pointer*']]);
        if (!checkPointerInit(stream,'ftell()')) return -1;
        return stream['offset'];
    }

    // int remove(const char *filename)
    static remove(arg1){
        let [filename] = getArguments([[arg1,'char*']]);
        [filename] = removeTrailing0([filename]);
        if (!(filename in fileSystemTable)){
            console.log("remove(): file doesnt exist");
            return -1;
        }
        for (let addr of fileStreamTable[filename]){
            console.log('remove(): deleting a file with a stream opened on address: ' + addr);
            console.log('deleting...');
            let src = HaddressTable[addr]['source'];
            if (src[0]=='X')
                SaddressTable[src]['value'] = 0;
            else
                HaddressTable[src]['value'][HaddressTable[src]['offset']] = 0;
            delete HaddressTable[addr];
        }

        delete fileSystemTable[filename];
        return 0;
    }

    // int rename(const char *old_filename, const char *new_filename)
    static rename(arg1,arg2){
        let [old_filename,new_filename] = getArguments([[arg1,'char*'],[arg2,'char*']]);
        [old_filename,new_filename] = removeTrailing0([old_filename,new_filename]);
        if (!(old_filename in fileSystemTable)){
            console.log("rename(): file to rename doesnt exist");
            return -1;
        }
        if (new_filename in fileSystemTable){
            console.log("rename(): file with such name already exists");
            return -1;
        }
        for (let addr of fileStreamTable[old_filename])
            HaddressTable[addr]['filename'] = new_filename;
        let content = fileSystemTable[old_filename];
        delete fileStreamTable[old_filename];
        fileSystemTable[new_filename] = content;
        return 0;
    }

    // void rewind(FILE *stream)
    static rewind(arg1){
        let [stream] = getArguments([[arg1,'pointer*']]);
        if(!checkPointerInit(stream,'rewind()')) return;
        stream['offset'] = 0;
        return;
    }

    // int fprintf(FILE *stream, const char *format, ...)
    static fprintf(arg1, arg2, ...args){
        let [stream,format] = getArguments([[arg1,'pointer*'],[arg2,'char*']]);
        [format] = removeTrailing0([format]);
        args = printfWrap([format].concat(args));
        if (!checkPointerInit(stream,'fprintf()')) return -1;
        if (!stream['write']){
            console.log('fprintf(): given stream is not opened for writing');
            return -1;
        }
        try{
            let result = printf.apply(null,args);
            if (stream['offsetLock'] || stream['eof'])
                fileSystemTable[stream['filename']] += result;
            else 
                fileSystemTable[stream['filename']] = fileSystemTable[stream['filename']].slice(0,stream['offset']) + result + fileSystemTable[stream['filename']].slice(stream['offset']+result.length);
            stream['offset'] += result.length;
            return result.length;
        } 
        catch(error){
            console.log('fprintf(): '+error);
            return -1;
        }
    }

    // int printf(const char *format, ...)
    static printf (arg1, ...args) {
        let [format] = getArguments([[arg1,'char*']]);
        [format] = removeTrailing0([format]);
        args = printfWrap([format].concat(args));
        try{
            let result = printf.apply(null,args);
            console.log(result);
            return result.length;
        } 
        catch(error){
            console.log(error);
            return -1;
        }
    }

    // int sprintf(char *str, const char *format, ...)
    static sprintf(arg1,arg2,...args){
        let [str,format] = getArguments([[arg1,'char**'],[arg2,'char*']]);
        [format] = removeTrailing0([format]);
        args = printfWrap([format].concat(args));
        try{
            let result = printf.apply(null,args);
            if (str['size'] < result.length+1){
                console.log('sprintf(): target string size is too small');
                return -1;
            }
            str['value'] = strToArray(result).concat(['\0']);
            return result.length;
        } 
        catch(error){
            console.log('sprintf(): '+error);
            return -1;
        }
    }

    // int fgetc(FILE *stream)
    static fgetc(arg1){
        let [stream] = getArguments([[arg1,'pointer*']]);
        if (!checkPointerInit(stream,'fgetc()')) return -1;
        if (stream['eof']){
            return -1;
        }
        let char = fileSystemTable[stream['filename']][stream['offset']];
        if (stream['offset'] == fileSystemTable[stream['filename']].length-1)
            stream['eof'] = true;
        else
            stream['offset']++;
        return char.charCodeAt(0);
    }

    // char *fgets(char *str, int n, FILE *stream)
    static fgets(arg1,arg2,arg3){
        let [str,n,stream] = getArguments([[arg1,'char**'],[arg2,'int'],[arg3,'pointer*']]);
        if(!checkPointerInit(stream,'fgets()')) return 0;
        if (!stream['read']){
            console.log('fgets(): reading from this stream is not permitted');
            return 0;
        }
        if (stream['eof'])
            return 0;
        let theString = fileSystemTable[stream['filename']].slice(stream['offset']).slice(0,n-1);
        if (theString.match(/\n/))
            theString = theString.slice(0,theString.match(/\n/)['index']);
        if (stream.length > str['size']){
            console.log('fgets(): target string not big enough');
            return 0;
        }
        str['value'] = strToArray(theString+'\0');
        return str;
    }

    // int fputc(int char, FILE *stream)
    static fputc(arg1,arg2){
        let [char,stream] = getArguments([[arg1,'char'],[arg2,'pointer*']]);
        if (!checkPointerInit(stream,'fputc()')) return -1;
        if (!stream['write']){
            console.log('putc(): given stream is not opened for writing');
            return -1;
        }
        if (stream['eof'] || stream['offsetLock'])
            fileSystemTable[stream['filename']] += char;
        else 
           fileSystemTable[stream['filename']] = fileSystemTable[stream['filename']].slice(0,stream['offset']) + char + fileSystemTable[stream['filename']].slice(stream['offset']+1);
        stream['offset']++;
        return char.charCodeAt(0);
    }

    // int getchar(void)
    static getchar(){
        let c = prompt();
        return c[0] ? c[0] : -1;
    }
    
    // char *gets(char *str)
    static gets(arg1){
        let [str] = getArguments([[arg1,'char**']]);
        let line = prompt();
        str['value'] = strToArray(line+'\0');
        return str;
    }
    
    // int putc(int char, FILE *stream)
    static putc(arg1,arg2){
        return this.fputc(arg1,arg2);
    }

    // int putchar(int char)
    static putchar(arg1){
        let [char] = getArguments([[arg1,'char']]);
        process.stdout.write(char);
        return char ? char.charCodeAt(0) : -1;
    }
    
    // int puts(const char *str)
    static puts(arg1){
        let [str] = getArguments([[arg1,'char*']]);
        [str] = removeTrailing0([str]);
        try {
            console.log(str);
            return 0;
        }
        catch(error) {
            console.log(error.message);
            return -1;
        }
    }
}

/* stdlib.h library functions definitions */
class stdlibL {
    // int atoi(const char *str);
    static atoi(arg){
        let [str] = getArguments([[arg, 'char*']])
        // let str = getArgVal(arg,'char*');
        let retVal;
        try{
            let res = parseInt(str);
            retVal = res == NaN ? 0 : ((res > int_max || res < int_min) ? -1 : res);
        }
        catch(e){
            retVal = 0;
        }
        return retVal;
    }
    
    // double atof(const char *str)
    static atof(arg){
        let [str] = getArguments([[arg, 'char*']])
        let retVal;
        try {
            let res = new bigDecimal(str);
            retVal = res == NaN ? 0.0 : (Math.abs(res) > 1.7976931348623157e+308 || Math.abs(res) < 2.225073858507201e-308 ? Infinity*res : res);
        }
        catch(e){
            retVal = 0.0;
        }
        return retVal;
    }
    
    // long atol(const char *str)
    static atol(arg){
        let [str] = getArguments([[arg, 'char*']])
        let retVal;
        try {
            let sign = '';
            if (parseInt(str)<0){
                sign = '-';
                str = str.slice(1);
            }
            let res = str.replace(/[^\d].*/i,'');
            res = sign + res;
            res = BigInt(res);
            if (res > 9223372036854775807n) retVal = 9223372036854775807n;
            else if (res < -9223372036854775808n) retVal = -9223372036854775808n;
            else retVal = res;
        }
        catch(e){
            retVal = 0n;
        }
        return retVal;        
    }
    
    // double strtod(const char *str, char **endptr)
    static strtod(arg1,arg2){
        let [str,argObject2] = getArguments([[arg1, 'char*'],[arg2, 'char**']])
        let doublePart;
        try {
            doublePart = str.match(/^[-+]?\d+(\.?\d+)?/)[0];
        }
        catch(e){
            return new bigDecimal(0.0);
        }
        let otherPart = str.slice(str.match(/^[-+]?\d+(\.?\d+)?/)[0].length);
        if (otherPart.length+1 > argObject2['size']){
            console.log("warning: trying to write into memory not big enough.");
            return new bigDecimal(0.0);
        }
        argObject2['value'] = strToArray(otherPart);
        argObject2['length'] = otherPart.length+1;

        return new bigDecimal(doublePart);
    }
    // TODO strtoul
    // long int strtol(constr char *str, char **endptr, int base)
    static strtol(arg1,arg2,arg3){
        // https://stackoverflow.com/questions/1337419/how-do-you-convert-numbers-between-different-bases-in-javascript
        // možno využít pro precizní přesnost
        let [str,argObject2,base] = getArguments([[arg1, 'char*'],[arg2, 'char**'],[arg3, 'int']])
        let longPart;
        try {
            longPart = parseInt(str, base);
        }
        catch(e){
            return new BigInt(0);
        }
        let rest = str.slice(longPart.toString(base).length);

        if (rest.length+1 > argObject2['size']){
            console.log("warning: trying to write into memory not big enough.");
            return new bigDecimal(0.0);
        }
        argObject2['value'] = strToArray(rest);
        argObject2['length'] = rest.length+1;

        return BigInt(longPart);
    }

    // int abs(int num)
    static abs(arg1){
        let [num] = getArguments([[arg1, 'int']]);

        return Math.abs(parseInt(num));
    }
    
    // long int labs(long int num)
    static labs(arg1){
        let [num] = getArguments([[arg1, 'long']]);
        let res = num.toString();
        if (res[0] == '-')
            res = res.slice(1);
        return BigInt(res);
    }
    
    // void* malloc(size_t size)
    // malloc(size,type,varName)
    static malloc(arg1, type, varName){
        let size;
        if (typeof(arg1) == 'number')
            size = arg1;
        else {
            [size] = getArguments([[arg1, 'int']]);
        }
        let typeSize = getSize(type);
        if (parseInt(size) < 1 || parseInt(size)%typeSize){
            console.log("Trying to allocate invalid size");
            return 0;
        }

        if (nameSpaceTable[varName])
            nameSpaceTable[varName]['initialized'] = true;
        else {
            nameSpaceTable[varName] = {initalized: true, address: 'X'+ SaddressCounter.toString(10)}
            SaddressCounter += 64;
        }
        let stackAddress = nameSpaceTable[varName]['address'];
        let heapAddress = HaddressCounter.toString(10);
        SaddressTable[stackAddress] = {
            name: varName,
            length: 1,
            type: 'pointer',
            size: 8,
            value: heapAddress
        }
        HaddressCounter += 64;

        HaddressTable[heapAddress] = {
            own: heapAddress,
            source: stackAddress,
            dereferred: false,
            length: size/getSize(type),
            type: type,
            size: size,
            value: [],
            offset: 0
        }
        return 1;
    }

    // void* calloc(size_t nitems, size_t size)
    // calloc(nitems,size,type,varName)
    static calloc(arg1, arg2, type, varName){
        let [nitems,size] = getArguments([[arg1, 'int'],[arg2, 'int']]);
        if (size != getSize(type) || nitems < 1){
            console.log("Trying to allocate invalid size");
            return 0;
        }
        this.malloc(nitems*size, type, varName);
        let allocatedObj = HaddressTable[SaddressTable[nameSpaceTable[varName]['address']]['value']]
        while (nitems)
            allocatedObj['value'][--nitems] = '\0';
        return 1;
    }

    // void* realloc(void *ptr, size_t size)
    // realloc(ptr, size)
    static realloc(arg1, arg2){
        let [ptr,size] = getArguments([[arg1, 'pointer*'],[arg2, 'int']])
        if (ptr['offset']){
            console.log("realloc(): invalid pointer (maybe offset)")
            return 0;
        }
        if (size%getSize(ptr['type'])){
            console.log("realloc(): invalid realloc size")
            return 0;
        }
        ptr['size'] = size;
        ptr['length'] = size/getSize(ptr['type']);
        if (ptr['value'].length > ptr['length']){
            console.log("realloc(): warning: allocating less space than was occupied by data before reallocation");
            ptr['value'] = ptr['value'].slice(0,ptr['length']-1).concat('\0');
        }
        return 1;
    }

    // void free(void *ptr)
    static free(arg1){
        let [ptr] = getArguments([[arg1, 'pointer*']]);
        if (!ptr['source']){
            console.log("free(): invalid pointer");
            return 1;
        }
        let source = getObjByAddress(ptr['source']);
        let own = ptr['own'];
        delete HaddressTable[own];

        if (Array.isArray(source['value'])){
            source['value'][source['addresses'].indexOf(own)] = 0;
            source['addresses'][source['addresses'].indexOf(own)] = 0;
        }
        else
            source['value'] = 0;
        return 0;
    }

    // int srand(void)
    static srand(){
        // DLC
    }

    // int rand(void)
    static rand(){
        return Math.floor((Math.random()-0.5)*(2147483647*2));
    }
    
    // void exit() | void abort()
    static exit_abort(){
        throw '';
    }
    
    // div_t div(int numer, int denom)
    static div(arg1,arg2){
        let [numer,denom] = getArguments([[arg1, 'int'],[arg2, 'int']])

        let div_t = {}
        div_t['quot'] = Math.floor(numer/denom);
        div_t['rem'] = numer % denom;
        return div_t;
    }
    
    // ldiv_t ldiv(long int numer, long int denom)
    static ldiv(arg1,arg2){
        let [numer,denom] = getArguments([[arg1, 'long'],[arg2, 'long']])

        let ldiv_t = {}
        ldiv_t['quot'] = numer / denom;
        ldiv_t['rem'] = numer % denom;
        return ldiv_t;
    }
}

/* string.h library functions definitions */
class stringL {
    // void *memchr(const void *str, char c, size_t n)
    static memchr(arg1,arg2,arg3){
        let [str,c,n] = getArguments([[arg1,'char*'],[arg2,'char'],[arg3,'int']]);
        let index = str.slice(0,n).indexOf(c);
        if (index == -1)
            return 0;
        else
            return str.slice(index);
    }

    // int memcmp(const void *str1, const void *str2, size_t n)
    static memcmp(arg1,arg2,arg3){
        let [str1,str2,n] = getArguments([[arg1,'char*'],[arg2,'char*'],[arg3,'int']]);
        str1 = str1.slice(0,n);
        str2 = str2.slice(0,n);
        return str1 == str2 ? 0 : (str1 > str2 ? 1 : -1);
    }

    // void *memset(void *str, int c, size_t n)
    static memset(arg1,arg2,arg3){
        let [argObject1,c,n] = getArguments([[arg1,'pointer*'],[arg2,'char'],[arg3,'int']]);
        if (n > argObject1['value'].length){
            console.log('memset(): allocated area too small');
            return 0;
        }
        for (let i = 0; i != n;)
            argObject1['value'][i++] = c;

        return argObject1;
    }

    // char *strcat(char *dest, const char *src)
    static strcat(arg1,arg2){
        let [dest,src] = getArguments([[arg1,'pointer*'],[arg2,'char*']])
        if (src.length + dest['value'] > dest['size']-1){
            console.log("strcat: destination not big enough");
            return 0;
        }
        dest['value'] = dest['value'].slice(0,-1).concat(strToArray(src));
        return dest;
    }

    // char *strncat(char *dest, const char *src, size_t n)
    static strncat(arg1,arg2,arg3){
        let [dest,src,n] = getArguments([[arg1,'pointer*'],[arg2,'char*'],[arg3,'int']])
        src = src.slice(0,n);
        if (src[src.length-1] != '\0') src = src.concat('\0');
        if (src.length + dest['value'] > dest['size']-1){
            console.log("strcat: destination not big enough");
            return 0;
        }
        dest['value'] = dest['value'].slice(0,-1).concat(strToArray(src));
        return dest;
    }
    
    // char *strchr(const char *str, int c)
    static strchr(arg1, arg2){
        let [str,c] = getArguments([[arg1,'char*'],[arg2,'char']]);
        let index = str.indexOf(c);
        if (index == -1)
            return 0;
        else
            return str.slice(index);  
    }

    // int strcmp(const char *str1, const char *str2)
    static strcmp(arg1,arg2){
        let [str1,str2] = getArguments([[arg1,'char*'],[arg2,'char*']]);
        return str1 == str2 ? 0 : (str1 > str2 ? 1 : -1);
    }

    // int strncmp(const char *str1, const char *str2, size_t n)
    static strncmp(str1,str2,n){
        return this.strcmp(str1.slice(0,n),str2.slice(0,n));
    }
    
    // size_t strxfrm(char *dest, const char *src, size_t n)
    static strxfrm(arg1,arg2,arg3){
        return this.strncpy(arg1,arg2,arg3)['value'].length;
    }

    // int strcoll(const char *str1, const char *str2)
    static strcoll(arg1,arg2){
        return this.strcmp(arg1,arg2);
    }

    // char *strcpy(char *dest, const char *src)
    static strcpy(arg1,arg2){
        let [dest,src] = getArguments([[arg1,'pointer*'],[arg2,'char*']]);
        if (src.length > dest['size']){
            console.log("strcpy: destination not big enough");
            return 0;
        }
        dest['value'] = strToArray(src);
        return dest;
    }

    // char *strncpy(char *dest, const char *src, size_t n)
    static strncpy(arg1,arg2,arg3){
        let [src,n] = getArguments([[arg2,'char*'],[arg3,'int']]);
        src = src.slice(0,n);
        return this.strcpy(arg1,'"'+src+'"',n);
    }

    // size_t strcspn(const char *str1, const char *str2)
    static strcspn(arg1,arg2){
        let [str1,str2] = getArguments([[arg1,'char*'],[arg2,'char*']]);
        for (let count = 0; count<str1.length; count++){
            if (str2.includes(str1[count]))
                return count;
        }
        return 0;
    }

    // size_t strlen(const char *str)
    static strlen(arg1){
        let [str] = getArguments([[arg1,'char*']]);
        return str.length - 1;
    }

    // char *strrchr(const char *str, char c)
    static strrchr(arg1,arg2){
        let [str,c] = getArguments([[arg1,'char*'],[arg2,'char']]);
        let index = str.lastIndexOf(c);
        if (index == -1)
            return 0;
        else
            return str.slice(index);
    }

    // size_t strspn(const char *str1, const char *str2)
    static strspn(arg1,arg2){
        let [str1,str2] = getArguments([[arg1,'char*'],[arg2,'char*']]);
        for (let count = 0; count<str1.length; count++){
            if (!str2.includes(str1[count]))
                return count;
        }
        return 0;
    }
    
    // char *strstr(const char *haystack, const char *needle)
    static strstr(arg1,arg2){
        let [haystack,needle] = getArguments([[arg1,'char*'],[arg2,'char*']]);
        if (haystack.search(needle.slice(0,-1)))
            return haystack.slice(haystack.search(needle.slice(0,-1)));
        else
            return 0;
    }
}

/* ctype.h library functions definitions */
class ctypeL {
    static *generateCntrlChars(){
        for (let i = 0; i < 32; i++)
            yield String.fromCharCode(i);
        yield String.fromCharCode(127);
    }
    
    static charSets = {
        'digits': '0123456789',
        'hexadecimals': '0123456789ABCDEFabcdef',
        'lowercase': 'abcdefghijklmnopqrstuvwxyz',
        'uppercase': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'letters': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'alnum': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        'punctuation': '!"#$%&\'()*+,-./:;<=>?@[]^_`{|}~',
        'graphical': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!"#$%&\'()*+,-./:;<=>?@[]^_`{|}~',
        'spaces': '\t\n\r\f\v ',
        'printable': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!"#$%&\'()*+,-./:;<=>?@[]^_`{|}~\t\n\r\x0c\x0b ',
        'control': [...this.generateCntrlChars()],
        'blank': '\v\t '
    }

    constructor(key){
        this.call = arg1 => {
            let [int] = getArguments([[arg1,'int']]);
            let char = String.fromCharCode(int);
            return int > 255 || int < 0 ? 0 : +this.charset[key].includes(char);
        };
    }
    
    static tolower(arg1){
        let [int] = getArguments([[arg1,'int']]);
        return int > 255 || int < 0 ? int : String.fromCharCode(int).toLowerCase().charCodeAt(0);
    }
    
    static toupper(arg1){
        let [int] = getArguments([[arg1,'int']]);
        return int > 255 || int < 0 ? int : String.fromCharCode(int).toUpperCase().charCodeAt(0);
    }
}

/* math.h library functions definitions */
class mathL {
    // double acos(double x)
    static acos(arg1){
        let [x] = getArguments([[arg1,'double']]);
        if(x < -1 || x > 1){
            console.log('acos(): argument not in interval [-1,1]')
            return -1;
        }
        return math.acos(x);
    }

    // double asin(double x)
    static asin(arg1){
        let [x] = getArguments([[arg1,'double']]);
        if(x < -1 || x > 1){
            console.log('acos(): argument not in interval [-1,1]')
            return -1;
        }
        return math.asin(x);
    }

    // double atan(double x)
    static atan(arg1){
        let [x] = getArguments([[arg1,'double']]);
        return math.atan(x);
    }

    // double atan2(double y, double x)
    static atan2(arg1,arg2){
        let [y,x] = getArguments([[arg1,'double'],[arg2,'double']]);
        return math.atan2(x,y);
    }

    // double cos(double x)
    static cos(arg1){
        let [x] = getArguments([[arg1,'double']]);
        return math.cos(x);
    }

    // double sin(double x)
    static sin(arg1){
        let [x] = getArguments([[arg1,'double']]);
        return math.sin(x);
    }
    
    // double sinh(double x)
    static sinh(arg1){
        let [x] = getArguments([[arg1,'double']]);
        return math.sinh(x);
    }

    // double tanh(double x)
    static tanh(arg1){
        let [x] = getArguments([[arg1,'double']]);
        return math.tanh(x);
    }
    
    // double exp(double x)
    static exp(arg1){
        let [x] = getArguments([[arg1,'double']]);
        return math.exp(x);
    }

    // double frexp(double x, int *exponent)
    static frexp(arg1,arg2){
        let [x,exponent] = getArguments([[arg1,'double'],[arg2,'pointer*']]);
        let [res,exp] = frexp(x);
        assignValueToPointer(exponent,exp.toString());
        return res;
    }

    // double ldexp(double x, int exponent)
    static ldexp(arg1,arg2){
        let [x,exponent] = getArguments([[arg1,'double'],[arg2,'int']]);
        return math.pow(2,exponent)*x;
    }

    // double log(double x)
    static log(arg1){
        let [x] = getArguments([[arg1,'double']]);
        return math.log(x);
    }

    // double log10(double x)
    static log10(arg1){
        let [x] = getArguments([[arg1,'double']]);
        return math.log(x,10);
    }

    // double modf(double x, double *integer)
    static modf(arg1,arg2){
        let [x,integer] = getArguments([[arg1,'double'],[arg2,'pointer*']]);
        let [res,int] = modf(x);
        assignValueToPointer(integer,int.toString());
        return res;
    }

    // double pow(double x, double y)
    static pow(arg1,arg2){
        let [x,y] = getArguments([[arg1,'double'],[arg2,'double']]);
        return math.pow(x,y);
    }

    // double sqrt(double x)
    static sqrt(arg1){
        let [x] = getArguments([[arg1,'double']]);
        return math.sqrt(x);
    }

    // double ceil(double x)
    static ceil(arg1){
        let [x] = getArguments([[arg1,'double']]);
        return math.ceil(x);
    }

    // double fabs(double x)
    static fabs(arg1){
        let [x] = getArguments([[arg1,'double']]);
        return math.abs(x);
    }

    // double floor(double x)
    static floor(arg1){
        let [x] = getArguments([[arg1,'double']]);
        return math.floor(x);
    }

    // double fmod(double x, double y)
    static fmod(arg1,arg2){
        let [x,y] = getArguments([[arg1,'double'],[arg2,'double']]);
        while (x > y)
            x -= y;
        return x;
    }
}

/* time.h library functions definitions */
class timeL {
    // char *asctime(const struct tm *timeptr)
    static asctime(arg1){
        let [timeptr] = getArguments([[arg1,'pointer*']]);
        let addr = HaddressCounter;
        HaddressCounter += 64;
        let day;
        switch(timeptr['value'][6]['value']){
            case '0':
                day = 'Sun';
                break;
            case '1':
                day = 'Mon';
                break;
            case '2':
                day = 'Tue';
                break;
            case '3':
                day = 'Wen';
                break;
            case '4':
                day = 'Thur';
                break;
            case '5':
                day = 'Fri';
                break;
            case '6':
                day = 'Sat';
                break;
        }
        let mon;
        switch(timeptr['value'][4]['value']){
            case '0':
                mon = 'Jan';
                break;
            case '1':
                mon = 'Feb';
                break;
            case '2':
                mon = 'Mar';
                break;
            case '3':
                mon = 'Apr';
                break;
            case '4':
                mon = 'May';
                break;
            case '5':
                mon = 'Jun';
                break;
            case '6':
                mon = 'Jul';
                break;
            case '7':
                mon = 'Aug';
                break;
            case '8':
                mon = 'Sep';
                break;
            case '9':
                mon = 'Oct';
                break;
            case '10':
                mon = 'Nov';
                break;
            case '11':
                mon = 'Dec';
                break;
        }
        let dayN = timeptr['value'][3]['value'].length == 1 ? '0'+timeptr['value'][3]['value'] : timeptr['value'][3]['value'];
        let hour = timeptr['value'][2]['value'].length == 1 ? '0'+timeptr['value'][2]['value'] : timeptr['value'][2]['value'];
        let min = timeptr['value'][1]['value'].length == 1 ? '0'+timeptr['value'][1]['value'] : timeptr['value'][1]['value'];
        let sec = timeptr['value'][0]['value'].length == 1 ? '0'+timeptr['value'][0]['value'] : timeptr['value'][0]['value'];
        let year = (parseInt(timeptr['value'][5]['value'])+1900).toString();
        let finalStr = day+' '+mon+' '+dayN+' '+hour+':'+min+':'+sec+' '+year;
        let obj = {
            own: addr.toString(),
            source: 0,
            dereferred: false,
            length: finalStr.length+1,
            type: 'char',
            size: finalStr.length+1,
            value: strToArray(finalStr+'\0'),
            offset: 0
        }
        return obj;
    }

    // clock_t clock(void)
    static clock(){
        // DLC
    }

    // char *ctime(const time_t *timer)
    static ctime(arg1){
        let [timer] = getArguments([[arg1,'pointer*']]);
        let string = tsToLocalFormat(parseInt(timer['value']),'D M d H:i:s Y');
        return string+'\0';
    }

    // double difftime(time_t time1, time_t time2)
    static difftime(arg1,arg2){
        let [time1,time2] = getArguments([[arg1,'int'],[arg2,'int']]);
        let res = parseInt(time1)/1000-parseInt(time2)/1000;
        return res;
    }

    // struct tm *gmtime(const time_t *timer)
    static gmtime(arg1){
        let [timer] = getArguments([[arg1,'pointer*']]);
        let hm = tsToUtcFormat(parseInt(timer['value']), 's i H d n Y w z');
        let arr = hm.split(' ');
        let tmstr = createStruct('tm','timeptr',0);
        tmstr = stuffTime(tmstr,arr.concat([parseInt(timer['value'])]));

        return tmstr;
    }
    
    // struct tm *localtime(const time_t *timer)
    static localtime(arg1){
        let [timer] = getArguments([[arg1,'pointer*']]);
        let hm = tsToLocalFormat(parseInt(timer['value']), 's i H d n Y w z');
        let arr = hm.split(' ');
        let tmstr = createStruct('tm','timeptr2',0);
        tmstr = stuffTime(tmstr,arr.concat([parseInt(timer['value'])]));

        return tmstr;
    }

    // time_t mktime(struct tm *timeptr)
    static mktime(arg1){
        let [timeptr] = getArguments([[arg1,'pointer*']]);
        let ts = parseInt(timeptr['value'][9]['value']);
        return ts;
    }

    // size_t strftime(char *str, size_t maxsize, const char *format, const struct tm *timeptr)
    static strftime(arg1,arg2,arg3,arg4){
        let [str,maxsize,format,timeptr] = getArguments([[arg1,'char**'],[arg2,'int'],[arg3,'char*'],[arg4,'pointer*']]);
        let theString = strftime(format, new Date(parseInt(timeptr['value'][9]['value'])))+'\0';
        if (theString.length > maxsize || theString.length > str['size']){
            console.log("strftime(): maxsize not max enough");
            return -1;
        }
        str['value'] = strToArray(theString);
        return theString.length;
    }

    // time_t time(time_t *seconds)
    static time(arg1){
        let theTime = new Date().getTime();
        if (arg1){
            let [seconds] = getArguments([[arg1,'pointer*']]);
            assignValueToPointer(seconds,theTime.toString());
        }
        return theTime;
    }
}


/*

    ------------------------
    STANDARD C LIBRARY TESTS
    ------------------------

*/


function testStdlib(){
    assert(stdlibL.atoi('Zc') == '123');
    assert(!stdlibL.strtod('Zh','&Ze').compareTo(new bigDecimal('1.23')) && HaddressTable['192']['value'].join("") == "ASD\0");
    assert(stdlibL.strtol('Zi','&Ze','Ca') == 255n && HaddressTable['192']['value'].join("") == "zz\0")
    assert(stdlibL.abs('Ch') == 16);    
    assert(stdlibL.labs('La') == 369n);
    assert(stdlibL.calloc('Cc[2]','Cc[0]','char','boi') && HaddressTable[SaddressTable[nameSpaceTable['boi']['address']]['value']]['value'].join("") == "\0\0\0");
    assert(stdlibL.realloc('boi','Cc[0]'))
    assert(!stdlibL.free('boi') && HaddressTable[SaddressTable[nameSpaceTable['boi']['address']]['value']] == undefined);
}

function testStringlib(){
    assert(stringL.memchr('Zc','Za','Ca') == 'x4\0');
    assert(!stringL.memcmp('Zc','Zf','Cc[2]'));
    assert(stringL.memset('Zf','Za','Cc[1]')['value'].join("") == "xx34\0");
    assert(stringL.strcat('Zf','Zi')['value'].join("") == 'xx34FFzz\0');
    assert(stringL.strncat('Zf','Zi','Cc[0]')['value'].join("") == 'xx34FFzzF\0');
    assert(stringL.strchr('Zc','Za') == 'x4\0');    
    assert(!stringL.strcmp('"aaa"','"aaa"'));
    assert(!stringL.strncmp('"aaab"','"aaab"','3'));
    assert(stringL.strcpy('Ze','"lmao"')['value'].join("") == "lmao\0");
    assert(stringL.strncpy('Ze','"lmao"','3')['value'].join("") == "lma\0");
    assert(stringL.strcspn('"ABCDEF4960910"','"013"') == 9);
    assert(stringL.strlen('"1234"') == 4);
    assert(stringL.strrchr('"123x4xlol"','Za') == 'xlol\0');
    assert(stringL.strspn('"ABCDEFG019874"','"ABCD"') == 4);
    assert(stringL.strstr('"testhaystack"','"hay"') == "haystack\0");

}

function testStdioLib(){
    assert(stdioL.fclose('Fb') == 0);
    assert(!stdioL.feof('Fa'));
    assert(!stdioL.fgetpos('Fa','&pos'));
    assert(stdioL.fopen('"mylib2.h"','"w+"','Fc')['filename']=='mylib2.h');
    assert(!stdioL.fseek('Fa','0','2') && HaddressTable['576']['offset'] == 41);
    assert(!stdioL.fsetpos('Fa','&pos') && HaddressTable['576']['offset'] == 5);
    assert(stdioL.ftell('Fa')==5);
    assert(!stdioL.remove('"mylib2.h"'));
    assert(!stdioL.rename('"mylib.h"','"mynewlib.h"') && 'mynewlib.h' in fileSystemTable);
    stdioL.rewind('Fa');
    assert(HaddressTable['576']['offset'] == 0);
    assert(stdioL.printf('"%s %u %d"','Zh','Fa','Cc[0]') == 14);
    HaddressTable['576']['offset'] = 1;
    assert(stdioL.fprintf('Fa','"%u"','Fa') == 3);
    assert(fileSystemTable['mynewlib.h'] == '#576ine testMacro 1\n#define testMacro2 2\n');
    assert(stdioL.sprintf('&Zf','"%u"','Fa') == 3);
    assert(stdioL.fgetc('Fa')==105);
    assert(HaddressTable['576']['offset'] == 5);
    assert(stdioL.fgets('&Zf','20','Fa')['value'].join("") == 'ne testMacro 1\0');
    assert(stdioL.fputc("'%'",'Fa')==37);
    assert(fileSystemTable['mynewlib.h'] == '#576i%e testMacro 1\n#define testMacro2 2\n');
    assert(stdioL.puts('"lmao"')>=0);
}

function testCtype(){
    assert(ctypeL.tolower('69')==101);
    assert(ctypeL.toupper('101')==69);
}

function testMath(){
    assert(mathL.acos('0.5') == 1.0471975511965979);
    assert(mathL.asin('0.5') == 0.5235987755982989);
    assert(mathL.atan('0.5') == 0.4636476090008061);
    assert(mathL.atan2('0.5','0.7') == 0.9505468408120751);
    assert(mathL.cos('0.5') == 0.8775825618903728);
    assert(mathL.sin('0.5') == 0.479425538604203);
    assert(mathL.sinh('0.5') == 0.5210953054937474);
    assert(mathL.tanh('0.5') == 0.46211715726000974);
    assert(mathL.exp('2') == 7.38905609893065);
    assert(mathL.frexp('1024','&Cb') == 0.5);
    assert(SaddressTable['X128']['value'] == '11');
    assert(mathL.ldexp('0.5','3') == 4);
    assert(mathL.log('0.5') == -0.6931471805599453);
    assert(mathL.log10('0.5') == -0.30102999566398114);
    assert(mathL.modf('8.123456','&Cb') == 8);
    assert(SaddressTable['X128']['value'] == '0.12345599999999912');
    assert(mathL.pow('3','2') == 9);
    assert(mathL.sqrt('0.5') == 0.7071067811865476);
    assert(mathL.ceil('0.1') == 1);
    assert(mathL.fabs('-0.3') == 0.3);
    assert(mathL.floor('0.9') == 0);
    assert(mathL.fmod('9.2','3.7') == 1.799999999999999);
}

function testTime(){
    initTime();
    assert(timeL.time('&Ta') > 1652509770402);
    assert(parseInt(SaddressTable['X1664']['value']) > 1652509770402);
    assert(timeL.gmtime('&Ta')['size'] == 40);    
    assert(timeL.localtime('&Ta')['size'] == 40);
    assert(timeL.asctime('timeptr2')['value'].join("").slice(-5,-1) == '2022');
    assert(timeL.ctime('&Ta').slice(-5,-1) == '2022');
    assert(timeL.difftime('12346000','12345000') == 1.0);
}

/* library functions initializers - macro defines, creating functions objects to be added to a global function table that should be implemented in an interpreter */


function initStdio(){
    if (defines['__STDIO_H_'])
        return;
    defines['__STDIO_H_'] = [];
    let tmpFilename = filename;
    filename = 'stdio.h';
    let myPrintfObj = CFO('printf',stdioL.printf,['char*','const char*','any'],1,'int');
    let myGetcharObj = CFO('getchar',stdioL.getchar,[],0,'int');
    let myPutcharObj = CFO('putchar',stdioL.putchar,['int'],0,'int');
    let myPutsObj = CFO('puts',stdioL.puts,['const char*'],0,'int');

    // TODO ^ add them to function hashtable

    if (!defines['NULL'])
        defines['NULL'] = tokenize('((void *) 0)').slice(0,-2);

    defines['EOF'] = tokenize('(-1)').slice(0,-2); // (-1)
    defines['FOPEN_MAX'] = tokenize(int_max.toString()).slice(0,-2);
    defines['SEEK_SET'] = tokenize('0').slice(0,-2);
    defines['SEEK_CUR'] = tokenize('1').slice(0,-2);
    defines['SEEK_END'] = tokenize('2').slice(0,-2);
    filename = tmpFilename;
}

function initStdlib(){
    if (defines['__STDLIB_H_'])
        return;
    defines['__STDLIB_H_'] = [];
    let tmpFilename = filename;
    filename = 'stdlib.h';

    let myAtoiObj = CFO('atoi',stdlibL.atoi,['const char*'],0,'int');
    let myAtofObj = CFO('atof',stdlibL.atof,['const char*'],0,'double');
    let myAtolObj = CFO('atol',stdlibL.atol,['const char*'],0,'long int'); // bigint in js
    let myAbsObj = CFO('abs',stdlibL.abs,['int'],0,'int');
    let myLabsObj = CFO('labs',stdlibL.labs,['long int'],0,'long int'); // bigint in js
    let myRandObj = CFO('rand',stdlibL.rand,[],0,'int');
    let myExitObj = CFO('exit',stdlibL.exit_abort,['int'],0,'void');
    let myAbortObj = CFO('abort',stdlibL.exit_abort,[],0,'void');
    let myDivObj = CFO('div',stdlibL.div,['int','int'],0,'div_t');
    let myLdivObj = CFO('ldiv',stdlibL.ldiv,['long int','long int'],0,'ldiv_t');
    // TODO ^ add them to function hashtable

    if (!defines['NULL'])
        defines['NULL'] = [createToken('cppnumber','0',2,1,14,0)];
    defines['RAND_MAX'] = [createToken('cppnumber','2147483647',3,10,18,0)];
    
    filename = tmpFilename;
}

function initString(){
    if (defines['__STRING_H_'])
        return;
    defines['__STRING_H_'] = [];
    let tmpFilename = filename;
    filename = 'string.h';

    let myStrcmpObj = CFO('strcmp',stringL.strcmp,['const char*','const char*'],0,'int');
    let myStrncmpObj = CFO('strncmp',stringL.strncmp,['const char*','const char*','size_t'],0,'int');
    let myStrspnObj = CFO('strspn',stringL.strspn,['const char*','const char*'],0,'size_t');
    let myStrcspnObj = CFO('strcspn',stringL.strcspn,['const char*','const char*'],0,'size_t');
    let myStrlenObj = CFO('strlen',stringL.strlen,['const char*'],0,'size_t');
    let myStrstrObj = CFO('strstr',stringL.strstr,['const char*','const char*'],0,'char*');

    if (!defines['NULL'])
        defines['NULL'] = [createToken('cppnumber','0',2,1,14,0)];

    filename = tmpFilename;
}

function initCtype(){
    if (defines['__CTYPE_H_'])
        return;
    defines['__CTYPE_H_'] = [];
    let tmpFilename = filename;
    filename = 'ctype.h';

    function beautify(key){
        return new ctypeL(key).call;
    }

    let myIsalnumObj = CFO('isalnum',beautify("alnum"),['int'],0,'int');
    let myIsalphaObj = CFO('isalpha',beautify("letters"),['int'],0,'int');
    let myIscntrlObj = CFO('iscntrl',beautify("control"),['int'],0,'int');
    let myIsdigitObj = CFO('isdigit',beautify("digits"),['int'],0,'int');
    let myIsgraphObj = CFO('isgraph',beautify("graphical"),['int'],0,'int');
    let myIslowerObj = CFO('islower',beautify("lowercase"),['int'],0,'int');
    let myIsprintObj = CFO('isprint',beautify("printable"),['int'],0,'int');
    let myIspunctObj = CFO('ispunct',beautify("punctuation"),['int'],0,'int');
    let myIsspaceObj = CFO('isspace',beautify("spaces"),['int'],0,'int');
    let myIsupperObj = CFO('isupper',beautify("uppercase"),['int'],0,'int');
    let myIsxdigitObj = CFO('isxdigit',beautify("hexadecimals"),['int'],0,'int');
    let myTolowerObj = CFO('tolower',ctypeL.tolower,['int'],0,'int');
    let myToupperObj = CFO('toupper',ctypeL.toupper,['int'],0,'int');
    fnc['o'] = myTolowerObj;
    defines['HUGE_VAL'] = [createToken('cppnumber','0',2,1,14,0)];

    filename = tmpFilename;
}

function initLimits(){
    if (defines['__LIMITS_H_'])
        return;
    defines['__LIMITS_H_'] = [];

    defines['CHAR_BIT'] = tokenize('8').slice(0,-2);
    defines['SCHAR_MIN'] = tokenize('-128').slice(0,-2);
    defines['SCHAR_MAX'] = tokenize('+127').slice(0,-2);
    defines['UCHAR_MAX'] = tokenize('255').slice(0,-2);
    defines['CHAR_MIN'] = tokenize('-128').slice(0,-2);
    defines['CHAR_MAX'] = tokenize('+127').slice(0,-2);
    defines['MB_LEN_MAX'] = tokenize('16').slice(0,-2);
    defines['SHRT_MIN'] = tokenize('-32768').slice(0,-2);
    defines['SHRT_MAX'] = tokenize('+32767').slice(0,-2);
    defines['USHRT_MAX'] = tokenize('65535').slice(0,-2);
    defines['INT_MIN'] = tokenize('-2147483648').slice(0,-2);
    defines['INT_MAX'] = tokenize('+2147483647').slice(0,-2);
    defines['UINT_MAX'] = tokenize('4294967295').slice(0,-2);
    defines['LONG_MIN'] = tokenize('-9223372036854775808').slice(0,-2);
    defines['LONG_MAX'] = tokenize('+9223372036854775807').slice(0,-2);
    defines['ULONG_MAX'] = tokenize('18446744073709551615').slice(0,-2);
}

function initMath(){
    if (defines['__MATH_H_'])
        return;
    defines['__MATH_H_'] = [];
}

function initFloat(){
    if (defines['__FLOAT_H_'])
        return;
    defines['__FLOAT_H_'] = [];

    defines['FLT_RADIX'] = tokenize('2').slice(0,-2);
    defines['FLT_DIG'] = tokenize('6').slice(0,-2);
    defines['DBL_DIG'] = tokenize('10').slice(0,-2);
    defines['LDBL_DIG'] = tokenize('10').slice(0,-2);

    defines['FLT_MIN_10_EXP'] = tokenize('-37').slice(0,-2);
    defines['DBL_MIN_10_EXP'] = tokenize('-37').slice(0,-2);
    defines['LDBL_MIN_10_EXP'] = tokenize('-37').slice(0,-2);

    defines['FLT_MAX_10_EXP'] = tokenize('37').slice(0,-2);
    defines['DBL_MAX_10_EXP'] = tokenize('37').slice(0,-2);
    defines['LDBL_MAX_10_EXP'] = tokenize('37').slice(0,-2);

    defines['FLT_MAX'] = tokenize('1E+37').slice(0,-2);
    defines['DBL_MAX'] = tokenize('1E+37').slice(0,-2);
    defines['LDBL_MAX'] = tokenize('1E+37').slice(0,-2);

    defines['FLT_EPSILON'] = tokenize('1E-5').slice(0,-2);
    defines['DBL_EPSILON'] = tokenize('1E-9').slice(0,-2);
    defines['LDBL_EPSILON'] = tokenize('1E-9').slice(0,-2);

    defines['FLT_MIN'] = tokenize('1E-37').slice(0,-2);
    defines['DBL_MIN'] = tokenize('1E-37').slice(0,-2);
    defines['LDBL_MIN'] = tokenize('1E-37').slice(0,-2);
}

function initAssert(){
    if (defines['__ASSERT_H_'])
        return;
    defines['__ASSERT_H_'] = [];
    initStdio();

    if (defines['NDEBUG']){
        definesF['assert'] = new Object();
        definesF['assert']['parameters'] = tokenize('ignore').slice(0,-2);
        definesF['assert']['content'] = tokenize('((void)0)').slice(0,-2);
    }
    else {
        definesF['assert'] = new Object();
        definesF['assert']['parameters'] = tokenize('expression').slice(0,-2);
        definesF['assert']['content'] = tokenize('((expr) ? (void)0 : printf("Assertion failed in #__FILE__ on line __LINE__))').slice(0,-2);
    }
}

function initTime(){
    if (defines['__TIME_H_'])
        return;
    defines['__TIME_H_'] = [];
    
    let types = ['int','int','int','int','int','int','int','int','int','int'];
    let size = calcSize(types);
    let varNames = ['tm_sec','tm_min','tm_hour','tm_mday','tm_mon','tm_year','tm_wday','tm_yday','tm_isdst','ts'];
    defineStruct('tm',size,varNames,types);
    
    if (!defines['NULL'])
        defines['NULL'] = tokenize('((void *) 0)').slice(0,-2);
    
}



/*

    --------------
    C PREPROCESSOR
    --------------

*/


/* helping functions */

/* expands a predefined special macro */
function expandSpecialMacro(id,index){
    let tokens;
    switch (id){
        case '__LINE__':
            tokens = [createToken('cppnumber',(line+1).toString(),(line+1).toString().length,line,index,0)];
            break;
        case '__FILE__':
            tokens = [createToken('string',filename,filename.length,line,index,0)];
            break;
        case '__DATE__':
            tokens = tokenize(tsToLocalFormat(new Date().getTime(),'M d Y')).slice(0,-2);
            break;
        case '__TIME__':
            tokens = tokenize(tsToLocalFormat(new Date().getTime(),'H:i:s')).slice(0,-2);
            break;
        case '__STDC__':
            tokens = [createToken('cppnumber','1',1,1,index,0)];
            break;
        case '__STDC_VERSION__':
            tokens = [createToken('cppnumber','199912',6,1,index,0)];
            break;
        case '__STDC_HOSTED__':
            tokens = [createToken('cppnumber','0',1,1,index,0)];
            break;
        case '__ASSEMBLER__':
            tokens = [createToken('cppnumber','0',1,1,index,0)];
            break;
    }
    return tokens;
}

/* resolves an expression CPP is responsible of */
function resolveExpression(tokens,defines,definesF,definesFV){
    for (let index = 0; index < tokens.length; index++){
        let tok = tokens[index];
        if (tok['type'] == 'identifier'){
            if (tok['content'] == 'defined'){
                let definedToken = tok;
                let startIndex = index, newToken;
                if (!tokens[++index])
                    return errorMessage("error: operator \"defined\" requires an identifier",tok['line'],tok['index']+tok['length']);
                if (tokens[index]['type'] == 'whitespace') index++;
                if (tokens[index]['type'] == '('){
                    if (tokens[++index]['type'] == 'whitespace') index++;
                    if (tokens[index]['type'] != 'identifier') return errorMessage("error: operator \"defined\" requires an identifier",tok['line'],tok['index']+tok['length']);
                    
                    let macroID = tokens[index++]['content'];
                    if (macroID in defines || macroID in definesF || macroID in definesFV)
                        newToken = createToken('int','1',1,definedToken['line'],definedToken['index'],0);
                    else 
                        newToken = createToken('int','0',1,definedToken['line'],definedToken['index'],0);

                    if (tokens[index]['type'] == 'whitespace') index++;
                    // tady opravit indexování chybové hlášky v
                    if (tokens[index++]['type'] != ')') return errorMessage("error: missing ')' after \"defined\"",tok['line'],tok['index']+tok['length']);
                    
                    tokens = tokens.slice(0,startIndex).concat([newToken].concat(tokens.slice(index)));
                    index = startIndex;
                }
                else if (tokens[index]['type'] == 'identifier'){
                    let macroID = tokens[index++]['content'];
                    if (macroID in defines || macroID in definesF || macroID in definesFV)
                        newToken = createToken('int','1',1,definedToken['line'],definedToken['index'],0);
                    else 
                        newToken = createToken('int','0',1,definedToken['line'],definedToken['index'],0);

                    tokens = tokens.slice(0,startIndex).concat([newToken].concat(tokens.slice(index)));
                    index = startIndex;
                }
                else {
                    return errorMessage("error: operator \"defined\" requires an identifier",tok['line'],tok['index']+tok['length']);
                }
            }
            else {
                let macroID = tok['content'];
                if (macroID in defines || macroID in definesF || macroID in definesFV) {
                    let expandedMacro, startIndex = index;
                    if (macroID in defines)
                        expandedMacro = replaceMacro([tok],[]);
                    else {
                        let zavorkyCounter = 0, bareIdPlusArguments = [tok];
                        while (tokens[++index]){
                            bareIdPlusArguments.push(tokens[index]);
                            if (!zavorkyCounter && tokens[index]['type'] == ')')
                                break;
                            if (tokens[index]['type'] == '(') zavorkyCounter++;
                            if (tokens[index]['type'] == ')') zavorkyCounter--;
                        }
                        expandedMacro = replaceMacro(bareIdPlusArguments,[]);
                    }
                    if(!expandedMacro) return 0;
                    let transformedExpansion = new Array();
                    for (let toky of expandedMacro){
                        if (toky['type'] == 'identifier')
                            transformedExpansion.push(createToken('int','0',1,toky['line'],toky['index'],0));
                        else
                            transformedExpansion.push(toky);
                    }
                    tokens = tokens.slice(0,startIndex).concat(transformedExpansion.concat(tokens.slice(index+1)));
                    index--;
                }
                else {
                    let newToken = createToken('int','0',1,tok['line'],tok['index'],0);
                    tokens = tokens.slice(0,index).concat([newToken].concat(tokens.slice(index+1)));
                }
            }
        }
    }
    let finalStream = "";
    for (let index = 0; index < tokens.length; index++){
        let tok = tokens[index];
        ''
        if (['+','-','*','/','%','==','>','<','>=','<=','!=','||','&&','!','?','<<','>>','~','&','^','|','(',')'].includes(tok['content'])) {
            finalStream+=tok['content'];
            continue;
        }
        if (tok['type'] == 'whitespace') continue;
        else if (tok['type'] == 'cppnumber'){
            finalStream+=tok['content'];// do shit
        }
        else if (tok['type'] == 'character'){
            finalStream+=tok['content'];// to ascii
        }
        else if (tok['type'] == 'int'){
            finalStream+=tok['content'];
        }
        else
            return errorMessage("error: token \""+tok['content']+"\" is not valid in preprocessor expressions",tok['line'],tok['index']);
    }
    try {
        return eval(parse(finalStream));
    } catch (error) {
        errorMessage("error: "+error.message,tokens[0]['line'],-1);
        return false;
    }
}

/* returns last element of an array */
function getLast(arrayos){
    return arrayos[arrayos.length-1];
}

/* function creating a token object from given data */
function createToken(type,content,length,line,index,specialFlag){
    let token = new Object();
    token['content'] = content;
    token['type'] = type;           // types: 'identifier','headername','cppnumber','character','string','punctuator','special_punctuators','concatenation','unknown symbols','eol','eof'
    token['length'] = length;
    token['line'] = line;
    token['index'] = index;
    token['special'] = specialFlag;
    token['parentSymbol'] = 0;
    token['module'] = filename;
    return token;
}

/* creates a whitespace token consisting of a one space */
function spaceToken(line,index,specialFlag){
    return createToken('whitespace',' ',1,line,index,specialFlag);
}

/* cpp error handling */
function errorMessage(message,line,index){
    if (message.match(/^error/)){
        throw message+'\n'+"in file: "+filename+" on line:"+line+" index:"+(index+1).toString()+'\n';
    }
    else {
        console.log(message+'\n'+"in file: "+filename+" on line:"+line+" index:"+(index+1).toString());
    }
}

/* analyses input for macro IDs and replaces them with according macro body */
function replaceMacro(input,recursionIds,hh){
    let output = new Array();
    for (let index = 0; index < input.length; index++){
        let token = input[index];
        if (token['type'] == 'identifier'){
            let id = token['content'];
            let parentToken = token;
            if (specialMacros.includes(id)){
                for (let t of expandSpecialMacro(id,token['index'])){
                    output.push(t);
                }
            }
            else if (id in defines && !recursionIds.includes(id)){
                let newRecIds = recursionIds;//JSON.parse(JSON.stringify(recursionIds));
                newRecIds.push(id);
                for (let tok of replaceMacro(defines[id],newRecIds)){
                    if (!tok['parentSymbol']) tok['parentSymbol'] = [parentToken];
                    else tok['parentSymbol'].push(parentToken);
                    output.push(tok);
                }
            } else if ((id in definesF || id in definesFV) && !recursionIds.includes(id)){
                let terminationFlag = 0, zavorkyCounter = 0, variadicFlag = id in definesFV ? 1 : 0, isOverVariadic = 0;
                let argumentList = new Array();
                let argPieces = new Array();
                if (!input[++index]){output.push(token); continue;}
                if (input[index]['type'] == 'whitespace'){terminationFlag = 1; index++;}
                if (input[index]['type'] == '('){
                    terminationFlag = 1;
                    argPieces.push(input[index]);
                    while (input[++index]){
                        if (zavorkyCounter == 0){
                            if (input[index]['type'] == ')'){
                                argumentList.push(argPieces.slice(1));
                                terminationFlag = 0;
                                break;
                            }
                            if (variadicFlag){
                                if (!isOverVariadic){
                                    if (input[index]['type'] == ','){
                                        argumentList.push(argPieces.slice(1));
                                        argPieces = [];
                                        if (argumentList.length == definesFV[id]['parameters'].length-1) isOverVariadic = 1;
                                    }
                                }
                            }
                            else {
                                if (input[index]['type'] == ','){
                                    argumentList.push(argPieces.slice(1));
                                    argPieces = [];
                                }    
                            }
                        }
                        if (input[index]['type'] == '(') zavorkyCounter++;
                        if (input[index]['type'] == ')') zavorkyCounter--;
                        argPieces.push(input[index]);
                    }
                    let theDefines = variadicFlag ? definesFV : definesF;
                    if (variadicFlag && argumentList.length < theDefines[id]['parameters'].length) argumentList.push(new Array());
                    if (terminationFlag) return errorMessage("error: unterminated argument list ",input[index-1]['line'],input[index-1]['index']);
                    if (argumentList.length != theDefines[id]['parameters'].length) return errorMessage("error: macro \""+id+"\" passed "+argumentList.length+" arguments, but takes "+theDefines[id]['parameters'].length,input[index-1]['line'],input[index-1]['index']);
                    let newRecIds = JSON.parse(JSON.stringify(recursionIds)).concat(id);
                    if (hh==1)
                        newRecIds.pop();
                    let replaced = replaceMacroF(argumentList,theDefines[id],newRecIds,id);
                    if (!replaced) return 0;
                    for (let tok of replaced){
                        if (!tok['parentSymbol']) tok['parentSymbol'] = [parentToken];
                        else tok['parentSymbol'].push(parentToken);    
                        output.push(tok);
                    }
                    if(input[index+1] && input[index+1]['type'] != 'whitespace')
                        output.push(spaceToken(input[index]['line'],input[index]['index']+input[index]['length'],1));
                }
                else {
                    //token['parentSymbol'] = parentToken;
                    output.push(token);
                    //asi k nicemu//if (terminationFlag) output.push(spaceToken(token['line'],token['index']+token['length'],0));
                    //input[index]['parentSymbol'] = parentToken;
                    output.push(input[index]);
                }
            }
            else{
                //token['parentSymbol'] = parentToken;
                output.push(token);
            }
        }
        else {
            output.push(token);
        }
    }
    //console.log('ssss',output);
    //if (output.length > 0) return getRidOfWS(output);
    return output;
}

/* does the same as function above, for function like macros and variadic macros */
function replaceMacroF(argumentList,theMacroObject,recursionIds,macroID){
    let output = new Array();
    // console.log('ssss',theMacroObject);
    // console.log('h',argumentList);
    let breakFlag = 0, variadicFlag = macroID in definesFV ? 1 : 0;
    let macroContent = theMacroObject['content'];
    for (let index = 0; index < macroContent.length; index++){
        breakFlag = 0;
        if (macroContent[index]['type'] == 'identifier' && (macroContent[index+1] ? macroContent[index+1]['content'] != '##' : 1)){
            for (let index2 = 0; index2 < theMacroObject['parameters'].length; index2++){
                if (macroContent[index]['content'] == theMacroObject['parameters'][index2]){
                    if (macroContent[index-1] && macroContent[index-1]['type'] == '#'){
                        if (macroContent[index-1]['type'] == '#'){
                            let stringerino = '"';
                            for (let tok of argumentList[index2]){
                                if (!tok['special']) stringerino += tok['content'];
                            }
                            stringerino+='"';
                            output.pop();
                            output.push(createToken('string',stringerino,stringerino.length,macroContent[index]['line'],macroContent[index]['index'],0));
                        }
                    }
                    else {
                        // tady bude dobrz checknout recursionIds / JSON.parse(JSON.stringify(recursionIds))
                        let tokensToInsert = replaceMacro(argumentList[index2],recursionIds);
                        for (let index3 = 0; index3 < tokensToInsert.length; index3++){
                            output.push(tokensToInsert[index3]);
                        }
                    }
                    breakFlag = 1;
                }
            }
        }
        else if (macroContent[index+1] && macroContent[index+1]['content'] == '##'){
            let tokenToConcat, tokenToConcat2, restTokens = new Array(), fitFlag = 0;
            if (theMacroObject['parameters'].includes(macroContent[index]['content'])){
                let indexik = theMacroObject['parameters'].indexOf(macroContent[index]['content']);
                for (let index3 = 0; index3 < argumentList[indexik].length - 1; index3++){
                    output.push(argumentList[indexik][index3]);
                }
                tokenToConcat = argumentList[indexik][argumentList[indexik].length-1];
            }
            else 
                tokenToConcat = macroContent[index];
            
            if (theMacroObject['parameters'].includes(macroContent[index+2]['content'])){
                let indexik = theMacroObject['parameters'].indexOf(macroContent[index+2]['content']);
                if (variadicFlag){
                    if (argumentList[indexik].length == 0)
                        fitFlag = 1;
                    else
                        tokenToConcat2 = argumentList[indexik][0]; 
                }
                else
                    tokenToConcat2 = argumentList[indexik][0];
                for (let index3 = 1; index3 < argumentList[indexik].length; index3++){
                    restTokens.push(argumentList[indexik][index3]);
                }
            }
            else
                tokenToConcat2 = macroContent[index+2];
            if (!fitFlag){
                if (!(macroContent[index]['content'] == ',' && macroContent[index+2]['content'] == '__VA_ARGS__')){
                    let superTokenObsah = tokenToConcat['content'] + tokenToConcat2['content'];
                    let tokenies = retokenize(tokenize(superTokenObsah));
                    if (tokenies[0].length != 1) return errorMessage("error: pasting \""+tokenToConcat['content']+"\" and \""+tokenToConcat2['content']+"\" does not give a valid preprocessing token",tokenToConcat['line'],tokenToConcat['index']);
                    output.push(createToken(tokenies[0][0]['type'],tokenies[0][0]['content'],tokenies[0][0]['length'],macroContent[index]['line'],macroContent[index]['index'],0));
                    for (let tok of restTokens){
                        output.push(tok);
                    }
                }
                else {
                    output.push(macroContent[index]);
                    let indexik = theMacroObject['parameters'].indexOf(macroContent[index+2]['content']);
                    for (let tok of argumentList[indexik])
                        output.push(tok);
                }
            }
            index += 2;
            breakFlag = 1;
        }
        if (!breakFlag) output.push(macroContent[index]);
    }
    
    return replaceMacro(output,JSON.parse(JSON.stringify(recursionIds)).concat(macroID));
}

/* removes double whitespaces and whitespace on a start and end of line */
function getRidOfWS(tokens){
    let newtokenlines = new Array();
    for (let tokenline of tokens){
        if (tokenline.length <= 1){ 
            newtokenlines.push(tokenline);
            continue;
        }
        if (tokenline[0]['type'] == 'whitespace' && tokenline[1] && tokenline[1]['type'] == '#')
            tokenline.shift();
        while (getLast(tokenline)['type'] == 'whitespace')
            tokenline.pop();
        newtokenlines.push(tokenline.filter(function(value, index, arr){
            return !(value['type'] == 'whitespace' && arr[index+1]['type'] == 'whitespace');
        }))
    }
    //console.log('s',newtokenlines)
    return newtokenlines;
}

/* converts a stream of tokens back to string represenation */
function tokensToString(arg){
    let preprocessedInput = "";
        for (let tokenline of arg){
            for (let token of tokenline){
                if (token['type'] == 'string'){
                    preprocessedInput += '"'+token['content']+'"';
                    // process.stdout.write('"'+token['content']+'"');
                }
                else if (token['type'] == 'corrupted_string'){
                    preprocessedInput += '"'+token['content'];
                    // process.stdout.write('"'+token['content']);
                }
                else if (token['type'] == 'character'){
                    preprocessedInput += "'"+token['content']+"'";
                    // process.stdout.write("'"+token['content']+"'");
                }
                else if (token['type'] == 'corrupted_character'){
                    preprocessedInput += "'"+token['content'];
                    // process.stdout.write("'"+token['content']);
                }
                else {
                    preprocessedInput += token['content'];
                    // process.stdout.write(token['content']);
                }
            }
            preprocessedInput += '\n';
            // process.stdout.write('\n');
        }
    return preprocessedInput.slice(0,-1);
}


/* the preprocessing itself */


// first tokenize and combine '\ eol' lines
// PHASE TWO
function tokenize(input){
    let punctuators = "{}[]:;?~"; 
    let punctuatorsPlus = `#/<>%/^!=&|"*+-,()'.`;
    let currentLine =  1;
    let tokenStream = new Array();
    for (let index = 0; index < input.length; index++){
        let character = input[index];
        // check for whitespaces
        if (character.match(/[^\S\r\n]/)){
            let match = input.slice(index).match(/^[^\S\r\n]+/);
            tokenStream.push(createToken('whitespace',match[0],match[0].length,currentLine,index,0));
            index+=match[0].length;
            character = input[index];
            if(!character)
                continue;
        }
        if (punctuatorsPlus.includes(character)){
            tokenStream.push(createToken(character,character,1,currentLine,index,0));
            continue;
        }
        // other tokens
        switch (character){
            case '\\':
                let match = input.slice(index).match(/^\\\s*?\n/);
                if (match){
                    currentLine++;
                    index += match[0].length-1;
                }
                else
                    tokenStream.push(createToken(character,character,1,currentLine,index,0));
                break;
            case '\n':
                tokenStream.push(createToken('eol','\n',1,currentLine,index,0));
                input = input.slice(index+1)
                index = -1;
                currentLine++;
                break;
            default:
                let type,content,length;
                if (character.match(/^[_A-Za-z]$/)){ 
                    let match = input.slice(index).match(/^[_A-Za-z][_A-Za-z\d]*/);
                    type = 'identifier', content = match[0], length = match[0].length;
                    if (content == 'include' && (tokenStream[tokenStream.length-1]['type'] == '#' || (tokenStream[tokenStream.length-1]['type'] == 'whitespace'&& tokenStream[tokenStream.length-2] == '#'))){
                        tokenStream.push(createToken(type,content,length,currentLine,index,0));
                        index+=length;
                        if (input[index] != '\n'){
                            let parseMore = input.slice(index);
                            match = parseMore.match(/^[^\S\r\n]+/);
                            if (match){
                                tokenStream.push(createToken('whitespace',match[0],match[0].length,currentLine,index,0));
                                index+=match[0].length;
                            }
                            if (input[index] != '\n'){
                                if (input[index] == '"' || input[index] == '<'){
                                    let c = input[index];
                                    if (c == '<') match = input.slice(index).match(/^<.*?>/);
                                    else match = input.slice(index).match(/^".*?"/);
                                    if (match){
                                        type = 'headername', content = match[0], length = match[0].length;
                                        tokenStream.push(createToken(type,content,length,currentLine,index,0));
                                        index+=length-1;
                                    }
                                    else {
                                        return errorMessage("error: missing terminating "+c+" character at include directive",currentLine,index);
                                    }
                                }
                                else
                                    index--;
                            }
                            else{
                                index--;
                            }
                        }
                        else
                            index--;
                        continue;
                    }
                // cpp number
                } else if (input.slice(index).match(/^(\.)?[0-9]/)){ 
                    let match = input.slice(index).match(/^(\.)?\d([_A-Za-z\d\.]|([E|P|e|p][\+|\-]))*/);
                    type = 'cppnumber', content = match[0], length = match[0].length;
                // punctuator
                } else if (punctuators.includes(character)){
                    type = 'punctuator', content = character, length = 1;
                }
                else {
                    type = 'unknown', content = character, length = 1;
                }
                tokenStream.push(createToken(type,content,length,currentLine,index,0));
                index+=length-1;
                break;
        }
    }
    let last = getLast(tokenStream);
    if (last['type'] != 'eol'){
        EOFwithNoNL = 1;
        tokenStream.push(createToken('eol','\n',1,last['line'],last['index']+last['length'],0));
    }
    tokenStream.push(createToken('eof','',0,last['line']+1,0,0));
    return tokenStream;
}

// PHASE THREE
function retokenize(tokens){
    let newTokens = new Array();
    let onLineTokens = new Array();
    let specialPunc = '+-*/%=><!&^|.';
    for (let index = 0; index < tokens.length; index++){
        let token = tokens[index];
        if (specialPunc.includes(token['type'])){
            let group1 = '+-&|', group2 = '*/%=!^', group3 = '<>', flag = 0;
            let type, length, ttype = token['type'];
            if (group1.includes(ttype)){
                if (tokens[index+1] && tokens[index+1]['type'] == ttype){
                    type = ttype+ttype, length = 2;
                }
                else if (tokens[index+1] && tokens[index+1]['type'] == '='){
                    type = ttype+'=', length = 2;
                } else flag = 1;
                if (!flag){
                    onLineTokens.push(createToken(type,type,length,token['line'],token['index'],0));
                    index++;
                    continue;
                }
            }
            else if (group2.includes(ttype)){
                if (tokens[index+1] && tokens[index+1]['type'] == '='){
                    type = ttype+'=', length = 2;
                    onLineTokens.push(createToken(type,type,length,token['line'],token['index'],0));
                    index++;
                    continue;
                }
            }
            else if (group3.includes(ttype)){
                if (tokens[index+1] && tokens[index+1]['type'] == '='){
                    type = ttype+'=', length = 2;
                    index++;
                }
                else if (tokens[index+1] && tokens[index+1]['type'] == ttype){
                    if (tokens[index+2] && tokens[index+2]['type'] == '='){
                        type = ttype+ttype+'=', length = 3;
                        index += 2;
                    }
                    else {
                        type = ttype+ttype, length = 2;
                        index++;
                    }
                } else flag = 1;
                if (!flag){
                    onLineTokens.push(createToken(type,type,length,token['line'],token['index'],0));
                    continue;
                }
            }
            // ...
            else {
                if (tokens[index+1] && tokens[index+2] && tokens[index+1]['content'] == '.' && tokens[index+2]['content'] == '.'){
                    onLineTokens.push(createToken('...','...',3,token['line'],token['index'],0));
                    index += 2;
                    continue;
                }
            }
        }
        switch (token['type']){
            case 'eol':
                newTokens.push(onLineTokens);
                onLineTokens = [];
                break;
            case '#':
                if (tokens[index+1]['type'] == '#'){
                    if (tokens[index-1] && tokens[index-1]['type'] == 'whitespace') onLineTokens.pop();
                    onLineTokens.push(createToken('concatenation',"##",2,token['line'],token['index'],0));
                    index++;
                }
                else
                    onLineTokens.push(token);
                if (tokens[index+1]['type'] == 'whitespace')
                    index++;
                break;
            case '\'':
            case '"':
                let theString = "";
                let failFlag = 0;
                let type = token['type']=='"' ? 'string' : 'character';
                while (tokens[++index]['type'] != token['type'] && !failFlag){
                    theString += tokens[index]['content'];
                    if (tokens[index]['type'] == 'eol')
                        failFlag = 1;

                    if (tokens[index]['type'] == '\\'){
                        if (tokens[++index]['type'] == 'eol'){
                            failFlag = 1;
                        }
                    }
                }
                if (theString[0] == '"')
                    theString = theString.slice(1);
                if (getLast(theString) == '"')
                    theString = theString.slice(0,-1);
                if (failFlag)
                    type = 'corrupted_'+type;
                onLineTokens.push(createToken(type,theString,theString.length+1,token['line'],token['index'],0));
                if (failFlag){
                    errorMessage("warning: missing terminating "+token['type']+" character",token['line'],token['index']);
                    onLineTokens.push(createToken('eol','\n',1,tokens[index]['line'],tokens[index]['index'],0));
                }
                break;
            // odstraneni komentaru
            case '/':
                if (tokens[index+1]['content'] == '/'){
                    while(tokens[++index]['type'] != 'eol');
                    onLineTokens.push(spaceToken(token['line'],token['index'],0));
                    newTokens.push(onLineTokens);
                    onLineTokens = [];
                }
                else if (tokens[index+1]['type'] == '*'){
                    index+=2;
                    let failFlag = 1;
                    while(tokens[index++]['type'] != 'eof'){
                        if (tokens[index+1] && tokens[index]['type'] == '*' && tokens[index+1]['type'] == '/'){
                            onLineTokens.push(spaceToken(token['line'],token['index'],0));
                            index++;
                            failFlag = 0;
                            break;
                        }
                    }
                    if (failFlag){
                        return errorMessage("error: unterminated comment",token['line'],token['index']);
                    }
                }
                else {
                    onLineTokens.push(token);
                }
                break;
            default:
                onLineTokens.push(token);
                break;
        }
    }
    newTokens.push(onLineTokens);
    return newTokens;
}

// PHASE FOUR
function phase4(tokens){
    let newTokensLine = new Array();
    let toParse = 1;
    let ifs = new Array();
    let ifTokens = new Array(), lastConditionalToken;
    for (let index = 0; index < tokens.length; index++,line++){
        let tokenline = tokens[index];
        if (!tokenline.length){
            newTokensLine.push(tokenline);
            continue;
        }
        // directive match
        if (tokenline[0]['type'] == '#'){
            let index2 = 1;
            if (tokenline.length == 1) continue;
            if (tokenline[index2]['type'] == 'whitespace') index2++;
            let directiveToken = tokenline[index2]; 
            let directive = tokenline[index2++]['content'];
            let invert = 0;
            let defineName;
            switch(directive){
                case 'define':
                    if (!toParse) continue;
                    if (!tokenline[index2]) return errorMessage("error: no macro name given in #define directive",tokenline[index2-1]['line'],tokenline[index2-1]['index']+6);
                    if (tokenline[index2]['type'] != 'whitespace' || tokenline[++index2]['type'] != 'identifier') return errorMessage("error: macro names must be identifiers: "+tokenline[index2]['content'],tokenline[index2]['line'],tokenline[index2]['index']);
                    defineName = tokenline[index2]['content'];
                    if (defineName in definesF || defineName in defines || defineName in definesFV || specialMacros.includes(defineName)) errorMessage("warning: \""+defineName+"\" redefined",tokenline[index2]['line'],tokenline[index2]['index']);
                    if (tokenline[++index2] && tokenline[index2]['type'] == '('){
                        // function like macro
                        let toggle = 0;
                        let failFlag = 1;
                        let variadicFlag = 0;
                        let paramList = new Array();
                        while (tokenline[++index2]){
                            if (tokenline[index2]['type'] == 'whitespace') continue;
                            if (!toggle){
                                //TODO TADY DOLE MOZNA CHYBA? == ',' PERHAPS? yup shits fucked totally holy hell
                                if (tokenline[index2]['type'] == ')' && paramList.length == 0){
                                    definesF[defineName] = new Object();
                                    definesF[defineName]['parameters'] = paramList;
                                    definesF[defineName]['content'] = new Array();
                                    failFlag = 0;
                                    break;
                                }
                                if (tokenline[index2]['type'] == ')') return errorMessage("error: parameter name missing: ...,)",tokenline[index2]['line'],tokenline[index2]['index']);
                                if (tokenline[index2]['type'] == 'identifier'){ 
                                    paramList.push(tokenline[index2]['content']);
                                    toggle = 1;
                                }
                                else if (tokenline[index2]['type'] == '...'){

                                    if (tokenline[++index2]['type'] == 'whitespace') index2++;
                                    if (tokenline[index2]['type'] != ')') break;
                                    failFlag = 0;
                                    variadicFlag = 1;
                                    definesFV[defineName] = new Object();
                                    definesFV[defineName]['parameters'] = paramList.concat('__VA_ARGS__');
                                    definesFV[defineName]['content'] = new Array();
                                    break;
                                }
                                else
                                    return errorMessage("error: \""+tokenline[index2]['content'][0]+"\" may not appear in macro parameter list",tokenline[index2]['line'],tokenline[index2]['index']);
                            }
                            else {
                                if (tokenline[index2]['type'] == ')'){
                                    definesF[defineName] = new Object();
                                    definesF[defineName]['parameters'] = paramList;
                                    definesF[defineName]['content'] = new Array();
                                    failFlag = 0;
                                    break;
                                }
                                if (tokenline[index2]['type'] != ',') return errorMessage("error: \""+tokenline[index2]['content'][0]+"\" may not appear in macro parameter list",tokenline[index2]['line'],tokenline[index2]['index']);
                                toggle = 0;
                            }
                        }
                        if (failFlag)
                            return errorMessage("error: missing ) in macro parameter list: ",tokenline[index2-1]['line'],tokenline[index2-1]['index']+tokenline[index2-1].length);
                        let obsah = tokenline.slice(index2+1);
                        let theDefines = variadicFlag ? definesFV : definesF;
                        if (obsah[0] && obsah[0]['type'] == 'whitespace') obsah.shift();
                        for (let index2 = 0; index2 < obsah.length; index2++){
                            theDefines[defineName]['content'].push(obsah[index2]);
                            if (obsah[index2]['type'] == '#'){
                                if (!obsah[index2+1] || !theDefines[defineName]['parameters'].includes(obsah[index2+1]['content']))
                                    errorMessage("error: '#' is not followed by a macro parameter",obsah[index2]['line'],obsah[index2]['index'])
                            }
                        }
                        // todo tady trochu upravit chybovou hlasku
                        if (getLast(theDefines[defineName]['content']) && getLast(theDefines[defineName]['content'])['type'] == 'concatenation' || (theDefines[defineName]['content'][0] && theDefines[defineName]['content'][0]['type'] == 'concatenation'))
                            return errorMessage("error: '##' cannot appear at either end of a macro expansion",tokenline[index2]['line'],tokenline[index2]['index']);                        
                    
                    }
                    else {
                        // object like macro
                        defines[defineName] = new Array();
                        let obsah = tokenline.slice(index2);
                        obsah.shift();
                        for (let tok of obsah)
                            defines[defineName].push(tok);
                    }
                    break;
                case 'undef':
                    if (!toParse) continue;
                    if (tokenline[index2]['type'] == 'whitespace') index2++;
                    defineName = tokenline[index2]['content'];
                    delete defines[defineName];
                    delete definesF[defineName];
                    delete definesFV[defineName];
                    break;
                case 'ifndef':
                    invert = 1;
                case 'ifdef':
                    if (tokenline[index2]['type']=='whitespace') index2++;
                    if (tokenline[index2+1]) errorMessage("error: extra tokens after the end of #"+directiveToken['content']+" directive",tokenline[index2+1]['line'],tokenline[index2+1]['index']);
                    if (tokenline[index2]['type']!='identifier') return errorMessage("error: macro names must be identifiers",tokenline[index2]['line'],tokenline[index2]['index']);
                    ifTokens.push(directiveToken);
                    lastConditionalToken = directiveToken;
                    
                    let macroID = tokenline[index2]['content'];
                    if (macroID in defines || macroID in definesF || macroID in definesFV){
                        ifs.push(!invert);
                        toParse = toParse && !invert;
                    }
                    else {
                        toParse = toParse && invert;
                        ifs.push(invert);
                    }
                    if (toParse && !getLast(ifs))
                        toParse = 0;
                    break;
                
                case 'else':
                    if (tokenline[index2+1]) errorMessage("error: extra tokens after the end of #"+directiveToken['content']+" directive",tokenline[index2+1]['line'],tokenline[index2+1]['index']);
                    if (ifs.length == 0) return errorMessage("error: #else without #if ",directiveToken['line'],directiveToken['index']);
                    let last = getLast(ifs);
                    if (lastConditionalToken['content'] == 'else') {
                        errorMessage("\0error: #else after #else ",directiveToken['line'],directiveToken['index']);
                        errorMessage("\0error: the conditional began here",ifTokens[ifTokens.length-1]['line'],ifTokens[ifTokens.length-2]['index']);
                        let lastIf = ifTokens[ifTokens.length-2];
                        errorMessage("error: unterminated #"+lastIf['content'],lastIf['line'],lastIf['index']);
                    }
                    lastConditionalToken = directiveToken;
                    ifs.pop();
                    ifs.push(!last);
                    if (!ifs.includes(0) && !ifs.includes(false)) toParse = 1;
                    else toParse = 0;
                    break;
                case 'if':
                    if(tokenline[index2+1]['type']=='whitespace') index2++;
                    let expression = tokenline.slice(index2);
                    if (!expression.length) return errorMessage("error: #if with no expression",directiveToken['line'],directiveToken['index']);
                    ifTokens.push(directiveToken);
                    lastConditionalToken = directiveToken;
                    expression = resolveExpression(expression,defines,definesF,definesFV);
                    ifs.push(expression);
                    toParse = toParse && expression;
                    break;
                case 'elif':
                    if(tokenline[index2+1]['type']=='whitespace') index2++;
                    let expression2 = tokenline.slice(index2);
                    if (!ifTokens.length) return errorMessage("error: #elif without #if",directiveToken['line'],directiveToken['index']);
                    if (!expression2.length) return errorMessage("error: #if with no expression",directiveToken['line'],directiveToken['index']);

                    ifTokens[ifTokens.length-1] = directiveToken;
		    lastConditionalToken = directiveToken;
                    expression2 = resolveExpression(expression2,defines,definesF,definesFV);
                    ifs[ifs.length-1] = !ifs[ifs.length-1] && expression2;
                    if (!ifs.includes(0) && !ifs.includes(false)) toParse = 1;
                    else toParse = 0;
                    break;
                case 'endif':
                    if (tokenline[index2+1]) errorMessage("error: extra tokens after the end of #"+directiveToken['content']+" directive",tokenline[index2+1]['line'],tokenline[index2+1]['index']);
                    ifs.pop();
		    lastConditionalToken = directiveToken;
                    ifTokens.pop();
                    if (!ifs.includes(0) && !ifs.includes(false)) toParse = 1;
                    break;
                case 'error':
                case 'warning':
                    let errorwar = directive == 'error' ? 'error' : 'warning';
                    let errTokens = "";
                    for (let tok of tokenline.slice(index2))
                        errTokens += tok['content'];
                    errorMessage(errorwar+": "+errTokens,tokenline[index2]['line'],tokenline[index2]['index']);
                    break;
                case 'line':
                    if (!tokenline[index2]){
                        //console.log(index2,tokenline)
                        if (EOFwithNoNL && index+1 == tokens.length) errorMessage("error: unexpected end of file after #line directive",tokenline[index2-1]['line'],tokenline[index2-1]['index']+tokenline[index2-1]['length']);
                        else errorMessage("error: unexpected end of line after #line directive",tokenline[index2-1]['line'],tokenline[index2-1]['index']+tokenline[index2-1]['length']);
                    }
                    else {
                        if (tokenline[index2]['type'] != 'whitespace') errorMessage("error: \""+tokenline[index2]['content']+"\" after #line is not a positive integer",tokenline[index2+1]['line'],tokenline[index2+1]['index']);
                        tokenline = tokenline.slice(0,++index2).concat(replaceMacro(tokenline.slice(index2),[]));
                        if (parseInt(tokenline[index2]['content']).toString() != tokenline[index2]['content']) errorMessage("error: \""+tokenline[index2]['content']+"\" after #line is not a positive integer",tokenline[index2+1]['line'],tokenline[index2+1]['index']);
                        line = parseInt(tokenline[index2]['content'])-1;
                        if (tokenline[++index2]){
                            // not proved it wont screw up some cases, perhaps token != whitespace -> errormessage
                            if (tokenline[index2]['type'] == 'whitespace') index2++;
                            if (tokenline[index2]['type'] != 'string') {
                                errorMessage("error: \""+tokenline[index2]['content']+"\" is not a valid filename",tokenline[index2]['line'],tokenline[index2]['index']);
                                break;
                            }
                            else 
                                filename = tokenline[index2]['content'];
                        }
                        if (tokenline[index2+1]) errorMessage("warning: extra tokens at the end of #line directive",tokenline[index2-1]['line'],tokenline[index2-1]['index']+tokenline[index2-1]['length']);
                        break;
                    }
                case 'include':
                    if (tokenline[index2]['type'] == 'whitespace') index2++;
                    if (tokenline[index2]['type'] != 'headername') errorMessage("error: #include expects \"FILENAME\" or <FILENAME>",tokenline[index2]['line'],tokenline[index2]['index']);
                    let lib = tokenline[index2]['content'].slice(1,-1);
                    if (tokenline[index2+1]) errorMessage("warning: extra tokens at end of #include directive",tokenline[index2+1]['line'],tokenline[index2+1]['index']);
                    switch(lib){
                        case 'stdio.h':
                            initStdio();
                            break;
                        case 'stdlib.h':
                            initStdlib();
                            break;
                        case 'ctype.h':
                            initCtype();
                            break;
                        case 'string.h':
                            initString();
                            break;
                        case 'limits.h':
                            initLimits();
                            break;
                        case 'math.h':
                            initMath();
                            break;
                        case 'float.h':
                            initFloat();
                            break;
                        case 'assert.h':
                            initAssert();
                            break;
                        case 'time.h':
                            initTime();
                            break;
                        default:
                            errorMessage("fatal error: "+lib+": No such file or directory",tokenline[index2]['line'],tokenline[index2]['index']);
                            break;
                    }
                    break;
                case 'pragma': // todo?
                    break;
                default:
                    return errorMessage("error: invalid preprocessing directive: "+directive,tokenline[index]['line'],tokenline[index]['index']);
            }
        }
        // non directive line
        else {
            if (!toParse) continue;
            let replaced = new Array();
            for (let index2 = 0; index2 < tokenline.length; index2++){
                if (tokenline[index2]['type'] == 'identifier'){
                    let id = tokenline[index2]['content'];
                    let parentToken = tokenline[index2];
                    if (specialMacros.includes(id)){
                        replaced = replaced.concat(replaceMacro([tokenline[index2]],[]));
                    }
                    else if (id in defines){
                        let res = replaceMacro(defines[id],[id]);
                        if (!res) return 0;
                        for (let tok of res){
                            // if (!tok['parentSymbol']) tok['parentSymbol'] = [parentToken];
                            // else tok['parentSymbol'].push(parentToken);        
                            replaced.push(tok);
                        }
                    }
                    else if (id in definesF || id in definesFV){
                        let index3 = -1, index4 = index, nlCounter = 0;
                        let tempTokenline = tokenline.slice(index2+1);
                        do {
                            if (++index3 == tempTokenline.length){
                                nlCounter++;
                                index3 = 0;
                                tempTokenline = tokens[++index4];
                            }
                        } while (tempTokenline[index3]['content'].match(/^\s/));

                        if (tempTokenline[index3]['type'] == '('){
                            let zavorkyCounter = 0, bareIdPlusArguments = new Array();
                            bareIdPlusArguments.push(tokenline[index2]);
                            bareIdPlusArguments.push(tempTokenline[index3]);
                            do {
                                while (tempTokenline.length == 0) tempTokenline = tokens[++index4];
                                if (++index3 == tempTokenline.length){
                                    nlCounter++;
                                    index3 = 0;
                                    tempTokenline = tokens[++index4];
                                    while (tempTokenline.length == 0) tempTokenline = tokens[++index4];
                                }
                                if (zavorkyCounter == 0){
                                    if (tempTokenline[index3]['type'] == ')'){
                                        bareIdPlusArguments.push(tempTokenline[index3]);
                                        break;
                                    }
                                }
                                if (tempTokenline[index3]['type'] == '(') zavorkyCounter++;
                                if (tempTokenline[index3]['type'] == ')') zavorkyCounter--;
                                bareIdPlusArguments.push(tempTokenline[index3]);
                            } while (tempTokenline[index3]['type'] != 'eof');
                            
                            index += nlCounter;
                            tokenline = tempTokenline.slice(index3+1);
                            index2 = -1;
                            let res = replaceMacro(bareIdPlusArguments,[],1);
                            if (!res) return 0;
                            for (let tok of res){
                                // if (!tok['parentSymbol']) tok['parentSymbol'] = [parentToken];
                                // else tok['parentSymbol'].push(parentToken);            
                                replaced.push(tok);
                            }
                        }
                        else
                            replaced.push(tokenline[index2]);

                        if(tokenline[index2+1] && tokenline[index2+1]['type'] != 'whitespace' && tokenline[index2+1]['type'] == 'identifier')
                            replaced.push(spaceToken(input[index]['line'],input[index]['index']+input[index]['length'],1));
                    }
                    else
                        replaced.push(tokenline[index2]);
                }
                else
                    replaced.push(tokenline[index2]);
            }
            newTokensLine.push(replaced);
        }
    }
    // for (let def in definesFV){
    //     console.log(definesFV[def])
    //     console.log(definesFV[def]['content'])
    // }
    if (ifTokens.length > 0){
        for (let toko of ifTokens){
            errorMessage("error: unterminated #"+toko['content']+" ",toko['line'],toko['index']);
        }
    }
    return newTokensLine;
}

/* wrapper for a whole preprocessor, accepts source code as a string and a name of the source code file */
function preprocess(sourceCode,modul){
    file = modul;
    let tokens = tokenize(sourceCode);
    tokens = getRidOfWS(retokenize(tokens));
    tokens = phase4(tokens);
    file = '';
    defines = new Object(), definesF = new Object(), definesFV = new Object();
    //console.log('diff stats:\n',hd.end())
    return tokens;
}

// unused function, will be used in DLC coming soon :tm:
function compareObjectArrays(arr1,arr2){
    if (arr1.length != arr2.length) return false;
    for (let index = 0; index < arr1.length; index++){
        if (JSON.stringify(arr1[index]) != JSON.stringify(arr2[index])) return false;
    }
    return true;
}



/* function being called from the frontend */
function htmlCall(arg){
    arg = preprocess(arg,'main.c');
    return tokensToString(arg);
}

// uncomment if the testing run is desired
// testStringlib();
// testStdlib();
// testStdioLib();
// testCtype();
// testMath();
// testTime();
// return;

/* differences the console run from a browser run mode */
try {
    window.htmlCall = htmlCall;
    const registerServiceWorker = async () => { // https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register(
            './sw.js',
            {
                scope: './',
            }
            );
            if (registration.installing) {
              console.log('Service worker installing');
            } else if (registration.waiting) {
              console.log('Service worker installed');
            } else if (registration.active) {
              console.log('Service worker active');
            }
          } catch (error) {
            console.error(`Registration failed with ${error}`);
          }
        }
      };
      
    registerServiceWorker();
}
catch(e){
    console.log(e);
    process.stdin.on('readable', () => {
        input = '';
        while ((input = process.stdin.read()) !== null) {
            input = input.toString();
	  console.log(input);
            input = input.replaceAll(/\r\n/g,'\n');
            let tokens = preprocess(input);

            console.log('original:\n');
            console.log(input);
            console.log('-----------');
            console.log('preprocessed:\n');
            process.stdout.write(tokensToString(tokens));
        }
    });
}
