const crypto = require('crypto');

const cryptoHash = (...inputs)=>{   //we use ... to make all the arguments as a single input array
    const hash = crypto.createHash('sha256');
    hash.update(inputs.map(input => JSON.stringify(input)).sort().join(' '));
    return hash.digest('hex');

};

module.exports = cryptoHash;