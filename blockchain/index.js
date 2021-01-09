const Block = require('./block');
const Transaction = require('../wallet/transaction');
const Wallet = require('../wallet');
const {cryptoHash} = require('../util');
const {REWARD_INPUT,MINING_REWARD} = require('../config');
const { request } = require('express');

class Blockchain{
    constructor(){
        this.chain = [Block.genesis()];
    }
    addBlock( {data} ){
        const newBlock = Block.mineBlock({
            lastBlock:this.chain[this.chain.length-1],
            data
        });

        this.chain.push(newBlock);
    }

    static isValidChain(chain){
        if(JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis()))  // We are not comparing the values of the objects, but the references to their memory locations. so we convert it to something like a dictionary and compare individual values
            return false;
        
        for(let i = 1;i<chain.length;i++){
            const { timestamp , lasthash , hash , nonce, difficulty ,data} = chain[i];
            const actualLastHash = chain[i-1].hash;
            const lastDifficulty = chain[i-1].difficulty;

            if (Math.abs(lastDifficulty - difficulty) > 1)
                return false;
            if(lasthash !== actualLastHash)
                return false;
            
            const validHash = cryptoHash(timestamp,lasthash,data,nonce,difficulty);
            if(hash !== validHash)
                return false;
        }    
        return true
    }

    replaceChain(chain, validateTransactions,onSuccess){
        if(chain.length <= this.chain.length ){
            console.error('The incoming chain is not long enough');
            return;
        }            
        if(!Blockchain.isValidChain(chain)){
            console.error('The incoming chain is long but it not valid');
            return; 
        }
        
        if(validateTransactions && !this.validTransactionData({ chain })){
            console.error('The incoming chain consists of invalid transaction data');
            return;
        }
        
        if(onSuccess)
            onSuccess();
        console.log('Replacing the chain with the new chain',chain);
        this.chain = chain;
    
    }

    validTransactionData({ chain}){
        for(let i = 1;i<chain.length;i++){
            const block = chain[i];
            let rewardTransactionCount = 0;
            const transactionSet = new Set();

            for(let transaction of block.data){
                if(transaction.input.address === REWARD_INPUT.address){
                    rewardTransactionCount += 1;
                
                    if(rewardTransactionCount > 1){
                        console.error('Miner rewards exceed the limit');
                        return false;
                    }

                    if(Object.values(transaction.outputMap)[0] !== MINING_REWARD){
                        console.error('Miner reward amount is invalid');
                        return false;
                    }
                }
                else{
                    if(!Transaction.validTransaction(transaction)){
                        console.error('Invalid transaction');
                        return false;
                    }

                    const trueBalance = Wallet.calculateBalance({
                        chain: this.chain,
                        address: transaction.input.address
                    });

                    if(transaction.input.amount !== trueBalance ){
                        console.error('Invalid Input amount');
                        return false;
                    }

                    if(transactionSet.has(transaction)){
                        console.error('Multiple Identical transactions');
                        return false;
                    }
                    else{
                        transactionSet.add(transaction);
                    }
                }
            }
        }
        return true;
    }
}

module.exports = Blockchain;