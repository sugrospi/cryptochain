//Use of this API is to make the frontend interact with the backend[to read and write data into the blockchain] and make the multiple blockchains interact with each other using their respective APIs
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');
const Blockchain = require('./blockchain');
const PubSub = require('./app/pubsub');
const TransactionPool = require('./wallet/transaction-pool');
const Wallet = require('./wallet');
const TransactionMiner = require('./app/transaction-miner');

const app = express();
const blockchain = new Blockchain();
const transactionPool = new TransactionPool();
const wallet = new Wallet();
const pubsub = new PubSub({ blockchain , transactionPool });
const transactionMiner = new TransactionMiner({
    blockchain,
    transactionPool,
    wallet,
    pubsub
});

const DEFAULT_PORT = 3000;
const ROOT_NODE_ADDRESS = `http://localhost:${DEFAULT_PORT}`;

// setTimeout(() => pubsub.broadcastChain(),1000);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'client/dist')));

//Now we define a get request that allows the user to get the information about the blockchain
app.get('/api/blocks',(req,res) =>{        //This is a get type HTTP request used to read data from the backend two args one endpoint where we want the get request to be located and the second argument is a callback function which is fires when this get request is fired
    res.json(blockchain.chain);
});

app.get('/api/blocks/length',(req,res) =>{
    res.json(blockchain.chain.length);
});

app.get('/api/blocks/:id',(req,res) =>{
    const { id } = req.params;
    const { length } = blockchain.chain;
    
    const blocksReversed = blockchain.chain.slice().reverse();

    let startIndex = (id-1) * 5;
    let endIndex = id * 5;

    startIndex = startIndex < length ? startIndex : length;
    endIndex = endIndex < length ? endIndex : length;

    res.json(blocksReversed.slice(startIndex,endIndex));
});

app.post('/api/mine',(req,res) =>{
    const {data} = req.body;    //This receives data from the user in a json format
    
    blockchain.addBlock({data});
    pubsub.broadcastChain();
    res.redirect('/api/blocks');    //showing that the request has been added to the blockchain
});

app.post('/api/transact',(req,res) => {
    const { amount, recipient } = req.body;
    let transaction = transactionPool
    .existingPool({inputAddress:wallet.publicKey});
    try{            //If the amount is greater than the balance[not exactly balance] then we throw an error if there is an error then we gotta send a clean message to the user not a gibberish html page
        if(transaction){
            transaction.update({ senderWallet:wallet, amount, recipient });
        }
        else{
            transaction = wallet.createTransaction({
                amount,
                recipient,
                chain:
                blockchain.chain});
        }
    }catch(error){
        return res.status(400).json({
            type:'error',
            message:error.message
        });
        
    }
    transactionPool.setTransaction(transaction);
    pubsub.broadcastTransaction(transaction);
    console.log('transactionPool ',transactionPool);
    res.json({ type:'success',transaction });
});

app.get('/api/transaction-pool-map',(req,res) =>{
    res.json(transactionPool.transactionMap);
});

app.get('/api/mine-transactions',(req,res) =>{
    transactionMiner.mineTransactions();
    res.redirect('/api/blocks');
});

app.get('/api/wallet-info',(req,res) =>{
    const address = wallet.publicKey;
    res.json({
        address,
        balance: Wallet.calculateBalance({ chain:blockchain.chain, address })
    });
});

app.get('/api/known-addresses',(req,res) =>{
    const addressMqp = {};

    for( let block of blockchain.chain){
        for(let transaction of block.data){
            const recipient = Object.keys(transaction.outputMap);

            recipient.forEach(recipient => addressMqp[recipient] = recipient);
        }
    }

    res.json(Object.keys(addressMqp));
});

app.get('*',(req,res) =>{
    res.sendFile( path.join(__dirname, 'client/dist/index.html'));
})


const syncWithRootState = () =>{               //When a new peer joins the network it doesnt have the updated chain so what we do is that we want the updated chain so we send a request to the rootchain and sync up with the chain of the rootchain
    request({url:`${ROOT_NODE_ADDRESS}/api/blocks`},(error,response,body) =>{
       if(!error && response.statusCode == 200){
            const rootChain = JSON.parse(body);

            console.log('replace chain on a sync with',rootChain);
            blockchain.replaceChain(rootChain);

       } 
    });

    request({ url:`${ROOT_NODE_ADDRESS}/api/transaction-pool-map`},(error,response,body) =>{
        if(!error && response.statusCode == 200){
            const rootTransactionPoolMap = JSON.parse(body);

            console.log('replace transaction-pool-map on a sync with',rootTransactionPoolMap);
            transactionPool.setMap(rootTransactionPoolMap);
       } 
    });
};

const walletFoo = new Wallet();
const walletBar = new Wallet();

const generateWalletTransaction = ({ wallet, recipient, amount }) =>{
    const transaction = wallet.createTransaction({
        recipient,
        amount,
        chain: blockchain.chain
    });

    transactionPool.setTransaction(transaction);
};

const walletAction = () => generateWalletTransaction({
    wallet, recipient: walletFoo.publicKey, amount:5
});

const walletFooAction = () => generateWalletTransaction({
    wallet: walletFoo, recipient: walletBar.publicKey, amount: 10
});

const walletBarAction = () => generateWalletTransaction({
    wallet: walletBar, recipient: wallet.publicKey, amount:15
});


for(let i = 0;i<20; i++){
    if(i%3 === 0){
        walletAction();
        walletFooAction();
    }else if(i%3 === 1){
        walletAction();
        walletBarAction();
    }else{
        walletFooAction();
        walletBarAction();
    }
    transactionMiner.mineTransactions();
}

let PEER_PORT;

if (process.env.GENERATE_PEER_PORT === 'true'){
    PEER_PORT = DEFAULT_PORT + Math.ceil(Math.random()*1000);
}

const PORT = PEER_PORT || DEFAULT_PORT;
app.listen(PORT,() =>{
    console.log(`Listen at localhost:${PORT}`);
    if(PORT !== DEFAULT_PORT)           //Run the sync only on the peers i.e when the root joins we dont want it to sync to itself it is redundant
    syncWithRootState();
});