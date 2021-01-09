const redis = require('redis');

const CHANNELS ={
    TEST:'TEST',
    BLOCKCHAIN:'BLOCKCHAIN',
    TRANSACTION:'TRANSACTION'
};

class PubSub{
    constructor({blockchain, transactionPool}){
        this.blockchain = blockchain;
        this.transactionPool = transactionPool;
        this.publisher  = redis.createClient();
        this.subscriber = redis.createClient();
    
        this.subscribeToChannels();
        //configuring the subsriber to handle the messages we use a callback function sucn that it fires when it recieves a message event

        this.subscriber.on(
            'message',
            (channel,message) =>    this.handleMessage(channel,message)
        );

    }

    handleMessage(channel,message){
        console.log(`message recieved on the channel ${channel} and the message was${message}`);

        const parsedMessage = JSON.parse(message);
        
        switch(channel){
            case CHANNELS.BLOCKCHAIN:
                this.blockchain.replaceChain(parsedMessage, true,() =>{
                    this.transactionPool.clearBlockchainTransactions({
                        chain:parsedMessage
                    });
                });
                break;
            case CHANNELS.TRANSACTION:
                this.transactionPool.setTransaction(parsedMessage);
                break;
            default:
                return;
        }
    }

    subscribeToChannels(){
        Object.values(CHANNELS).forEach(channel => {
            this.subscriber.subscribe(channel);
        });
    }

    publish({channel,message}){                 //While we publish a message we don't want to recieve so what we do is before publishing a message we unsubscribe and then publish and after publishing again we subsribe to that channel
        this.subscriber.unsubscribe(channel, () =>{
            this.publisher.publish(channel,message,() =>{
                this.subscriber.subscribe(channel);
            });
        });
    }

    broadcastChain(){
        this.publish({
            channel:CHANNELS.BLOCKCHAIN,
            message:JSON.stringify(this.blockchain.chain)       //We have to convert it to a JSON  as the chain is an array and we cannot send arrays over the network
        })
    }

    broadcastTransaction(transaction){
        this.publish({
            channel:CHANNELS.TRANSACTION,
            message:JSON.stringify(transaction)
        });
    }

}

// const testPubSub= new PubSub();

// setTimeout(()   =>    testPubSub.publisher.publish(CHANNELS.TEST,'foo'),1000);

module.exports = PubSub;