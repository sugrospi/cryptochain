const TransactionMiner = require('../app/transaction-miner');
const { verifySignature, cryptoHash } = require('../util');
const Wallet = require('./index');
const Transaction = require('./transaction');
const { REWARD_INPUT, MINING_REWARD } = require('../config');

describe('Transaction',() =>{
    let transaction,senderWallet,recipient,amount;

    beforeEach(() =>{
        senderWallet = new Wallet();
        recipient = 'recipient-public-key';
        amount = 50;

        transaction = new Transaction({senderWallet,recipient,amount});
    });

    it('has an id',()=>{
        expect(transaction).toHaveProperty('id');
    });

    describe('outputMap()',() =>{
        it('has an outputMap',() =>{
            expect(transaction).toHaveProperty('outputMap');
        });

        it('outputs the amount to the recipient ',() =>{
            expect(transaction.outputMap[recipient]).toEqual(amount);
        });

        it('contains the remaining balance for the sender wallet',() =>{    //The output map contains a key whcih contains the remaining balance in the senderWallet
            expect(transaction.outputMap[senderWallet.publicKey]).toEqual(senderWallet.balance - amount);
        });
    });

    describe('input',() =>{
        it('has an input section',() =>{
            expect(transaction).toHaveProperty('input');
        });

        it('has an timestamp atrribute in the input',() =>{
            expect(transaction.input).toHaveProperty('timestamp');
        });

        it('This contains the senderWallet ka balance',() =>{
            expect(transaction.input.amount).toEqual(senderWallet.balance)
        });

        it('should contain the senderWallet[here is called as the address] ka public key',() =>{
            expect(transaction.input.address).toEqual(senderWallet.publicKey);
        });

        it('contains a signature',() =>{
            expect(
                verifySignature({
                    publicKey:senderWallet.publicKey,
                    data:transaction.outputMap,
                    signature:transaction.input.signature
                })
            ).toBe(true)
        });

    });

    describe('validTransaction()',() =>{
        let errorMock;
        beforeEach(() => { 
            errorMock = jest.fn();
            global.console.error = errorMock;
        });
        describe('when the transaction is valid',() =>{
            it('returns true',() =>{
                expect(Transaction.validTransaction(transaction)).toBe(true);
            });
        });

        describe('when the transaction is  not valid',() =>{
            describe('and the transaction outputmap value is invalid',() =>{
                it('returns false and logs the error',() =>{
                    transaction.outputMap[senderWallet.publicKey] = 999999;
                    expect(Transaction.validTransaction(transaction)).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });

            describe('the input signature has been faked',() =>{
                it('returns false and logs the error',() =>{
                    transaction.input.signature = new Wallet().sign('data');
                    expect(Transaction.validTransaction(transaction)).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });
        });
    });

    describe('update()',() =>{
        let originalSignature,originalSenderOutput,nextRecipient,NextAmount;

        describe('and the amount is invalid',() =>{
            it('throws an error',() =>{
                expect(() =>{
                    transaction.update({
                        senderWallet,recipient:'foo',amount:999999
                    })
                }).toThrow('Amount exceeds balance');
            });
        });

        describe('and the amount is valid',() =>{
            beforeEach(() =>{
                originalSignature = transaction.input.signature;
                originalSenderOutput = transaction.outputMap[senderWallet.publicKey];
                nextRecipient = 'next-recipient';
                NextAmount = 50;
    
                transaction.update({ senderWallet, recipient:nextRecipient, amount:NextAmount });
            });
            it('outputs the amount to the next recipient',() =>{
                expect(transaction.outputMap[nextRecipient]).toEqual(NextAmount);
            });
            
            it('subtracts an amount from the original sender output amount',() =>{
                expect(transaction.outputMap[senderWallet.publicKey])
                .toEqual(originalSenderOutput - NextAmount);
            });
    
            it('maintains a total output that matches the input amount',() =>{
                expect(
                    Object.values(transaction.outputMap)
                    .reduce((outputTotal,total) => total+ outputTotal)
                ).toEqual(transaction.input.amount);
            });
    
            it('re-signs the transaction',() =>{
                expect(transaction.input.signature).not.toEqual(originalSignature);
            });

            describe('and another update for the same recipient',() =>{
                let addedAmount;

                beforeEach(() =>{
                    addedAmount = 80;
                    transaction.update({
                        senderWallet,
                        recipient:nextRecipient,
                        amount:addedAmount
                    });
                });

                it('adds to the recipient amount',() =>{
                    expect(transaction.outputMap[nextRecipient])
                    .toEqual(NextAmount+addedAmount);
                });

                it('subtracts the new amount from the sender',() =>{
                    expect(transaction.outputMap[senderWallet.publicKey])
                    .toEqual(originalSenderOutput - NextAmount - addedAmount);
                });
            });
        });

    });

    describe('rewardTransactions()',() =>{
        let rewardTransaction,minerWallet;

        beforeEach(() =>{
            minerWallet = new Wallet();
            rewardTransaction = Transaction.rewardTransaction({ minerWallet });
        });

        it('creates a transaction with the reward input ',() =>{
            expect(rewardTransaction.input).toEqual(REWARD_INPUT);
        });
        
        it('creates one transaction with the mining reward',() =>{
            expect(rewardTransaction.outputMap[minerWallet.publicKey]).toEqual(MINING_REWARD);
        });
    });
});