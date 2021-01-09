const Wallet = require('./index');
const {verifySignature} = require('../util');
const Transaction = require('./transaction');
const Blockchain  = require('../blockchain');
const { STARTING_BALANCE } = require('../config');
const { calculateBalance } = require('./index');
describe('wallet',() =>{
    let wallet;
    
    beforeEach(() =>{
        wallet = new Wallet();
    });

    it('has a balance', () =>{
        expect(wallet).toHaveProperty('balance');
    });

    it('has a publicKey',() =>{
        expect(wallet).toHaveProperty('publicKey');
    });

    describe('signing data',() =>{
        const data = 'foobar';

        it('verifies a signature',() =>{
            expect(
                verifySignature({
                    publicKey:wallet.publicKey,
                    data,
                    signature:wallet.sign(data)
                })
            ).toBe(true);
            
        });

        it('does not verify a invalid signature',()=>{
            expect(
                verifySignature({
                    publicKey:wallet.publicKey,
                    data,
                    signature:new Wallet().sign(data)
                })
            ).toBe(false);
        });
    });
    
    describe('createTransaction()',() =>{
        describe('amount exceeds the balance',() =>{
            it('throws an error',() =>{
                // wallet.createTransation();
                // expect(errorMock).toHaveBeenCalled();
                expect(() => wallet.createTransaction({amount:999999,recipient:'foo-recipient'}))
                .toThrow('Amount exceeds balance');
            });
            
        });

        describe('amount is valid',() =>{
            let transaction,amount,recipient;

            beforeEach(() =>{
                amount=50;
                recipient = 'foo-recepient';
                transaction = wallet.createTransaction({ amount, recipient });
            })
            
            it('creates an instance of transaction',() =>{
                // expect(transaction).toBeInstanceOf(Transaction);
                expect(transaction instanceof Transaction).toBe(true);
            });

            it('matches the transaction input with the wallet',() =>{
                expect(transaction.input.address).toEqual(wallet.publicKey);
            });

            it('outputs the amount to the recipient',() =>{
                expect(transaction.outputMap[recipient]).toEqual(amount);
            });
        });

        describe('and a chain is passed', () =>{
            it('calls Wallet.calculateBalance',() =>{
                const calculateBalanceMock = jest.fn();

                const originalCalculateBalance = Wallet.calculateBalance;
                Wallet.calculateBalance = calculateBalanceMock;

                wallet.createTransaction({
                    recipient:'foo',
                    amount:10,
                    chain: new Blockchain().chain
                });

                expect(calculateBalanceMock).toHaveBeenCalled();

                Wallet.calculateBalance = originalCalculateBalance;
            });
        });
    });

    describe('calculateBalance()',() =>{
        let blockchain;
        beforeEach(() =>{
            blockchain = new Blockchain();
        });

        describe('and there are no outputs for the wallet',() =>{
            it('returns the starting balance',() =>{
                expect(
                    Wallet.calculateBalance({
                        chain:blockchain.chain,
                        address:wallet.publicKey 
                    })
                ).toEqual(STARTING_BALANCE);
            });
        });

        describe('and there are outputs for the wallet',() =>{
            let transactionOne,transactionTwo;

            beforeEach(() =>{
                transactionOne = new Wallet().createTransaction({
                    amount:50,
                    recipient:wallet.publicKey
                });
                
                transactionTwo = new Wallet().createTransaction({
                    amount:60,
                    recipient:wallet.publicKey
                });
                blockchain.addBlock({ data:[ transactionOne, transactionTwo] });
            });

            it('adds all the sum of all outputs to the wallet balance',() =>{
                expect(
                    Wallet.calculateBalance({
                        chain:blockchain.chain,
                        address:wallet.publicKey 
                    })
                ).toEqual(
                    STARTING_BALANCE +
                    transactionOne.outputMap[wallet.publicKey] +
                    transactionTwo.outputMap[wallet.publicKey]
                );
            });

            describe(' and the wallet has made a transaction ',() =>{
                let recentTransaction;

                beforeEach(() =>{
                    recentTransaction = wallet.createTransaction({
                        recipient:'foo-address',
                        amount:50
                    });
                    blockchain.addBlock({ data: [ recentTransaction ] });
                });

                it('returns the output amount of the recent transaction',() =>{
                    expect(
                        Wallet.calculateBalance({
                            chain:blockchain.chain,
                            address:wallet.publicKey,
                        })
                    ).toEqual(recentTransaction.outputMap[wallet.publicKey]);
                });

                describe('and there are outputs next to and after the recent transactions',() =>{
                    let sameBlockTransaction,nextBlockTransaction;

                    beforeEach(() =>{
                        recentTransaction = wallet.createTransaction({
                            recipient:'later-foo-address',
                            amount:60
                        });

                        sameBlockTransaction = Transaction.rewardTransaction({ minerWallet:wallet});

                        blockchain.addBlock({data: [ recentTransaction, sameBlockTransaction ]});

                        nextBlockTransaction = new Wallet().createTransaction({
                            recipient:wallet.publicKey,
                            amount:75
                        });

                        blockchain.addBlock({ data: [nextBlockTransaction] });
                    });

                    it('includes the output amounts in the returned balance',() =>{
                        expect(
                            Wallet.calculateBalance({
                                chain:blockchain.chain,
                                address:wallet.publicKey
                            })
                        ).toEqual(
                            recentTransaction.outputMap[wallet.publicKey] +
                            sameBlockTransaction.outputMap[wallet.publicKey] +
                            nextBlockTransaction.outputMap[wallet.publicKey] 
                        );
                    });
                });
            });
        });
    });
});

