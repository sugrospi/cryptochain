const hexToBinary = require('hex-to-binary');
const { GENESIS_DATA,MINE_RATE } = require("../config");
const {cryptoHash} = require("../util");


class Block{
    constructor({timestamp,lasthash,hash,data,nonce,difficulty}){    //wrap all the arguments in an object so that it doesn't matter in which order we pass the arguments
        this.timestamp = timestamp;
        this.lasthash = lasthash;
        this.hash = hash;
        this.data = data;
        this.nonce = nonce;
        this.difficulty = difficulty;
    }
    static genesis() {
        return new this(GENESIS_DATA);
    }

    static mineBlock({lastBlock,data}){
        let timestamp,hash;
        const lasthash = lastBlock.hash;
        let {difficulty} = lastBlock;
        let nonce = 0;
        do{
            nonce++;
            timestamp = Date.now();
            difficulty = Block.adjustDifficulty({ originalBlock: lastBlock, timestamp });
            hash = cryptoHash(timestamp,lasthash,data,nonce,difficulty);
        }while(hexToBinary(hash).substring(0,difficulty) !== '0'.repeat(difficulty))

        return new this({ timestamp,lasthash,data,difficulty,nonce,hash });
    }

    static adjustDifficulty({originalBlock,timestamp}){
        const {difficulty} = originalBlock;

        if(difficulty < 1)
            return 1;
        if((timestamp - originalBlock.timestamp) > MINE_RATE)
            return difficulty-1;

        return difficulty +1;
    }
}

module.exports = Block;