const parseArray = (str) => str ? str.split(/\s*,\s*/) : undefined;

const parseTokensArray = (str) => {
    return str ? parseArray(str).map(rawGroup => rawGroup.split(/\s*:\s*/)) : undefined;
};

const parseOrderExp = (exp) => exp ? parseArray(exp).reduce((list, field) => {
    if(field[0] !== '-'){
        list[field]= true;
    }else{
        list[field.slice(1)]= false;
    }
    return list;
}, {}) : undefined;

const parseWhereExp= (exp)=> parseTokensArray(exp).map((exp) => {
        switch (exp.length) {
            case 1:
                return [exp[0], '=', true];
            case 2:
                return [exp[0], '=', exp[1]];
        }
        return exp;
});

module.exports={
    parseArray,
    parseOrderExp,
    parseTokensArray,
    parseWhereExp
};
