let string0 = '90' // 1.000
let string1 = '1000.' // 1.000,
let string2 = '1000.98' // 1.000,98
let string3 = '-1000.98' // -1.000,98

function format(string = '') {

    let hasDecimalPoint = /\./.test(string);    
    let isNegative = /^-/.test(string);

    let integer = string; 
    let decimal = '';
    let sign = '';
     
    if (hasDecimalPoint) {
        integer = string.split('.')[0];
        decimal = string.split('.')[1];
    };

    if (isNegative) {
        sign = '-';
        integer = integer.replace('-', '');
    }; 

    let classes = /\d{1,3}/g;
    let pretty = '';
    
    pretty =  integer.split('').reverse('').join('').match(classes).join('.').split('').reverse().join('')
    pretty = sign + pretty + ( hasDecimalPoint? ',' : '' ) + decimal;

    return pretty;
};

format('1890')
