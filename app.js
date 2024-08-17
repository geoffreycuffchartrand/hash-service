const express = require('express');
const app = express();
app.use(express.json());
const fetch = require("node-fetch");
const ws = require('ws');
const verifiableCredential = require('./verifiableCredential.js');
const cors = require('cors')
app.use(cors())

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://gregorycuff:J5SyknlDUSMmh3oo@cluster0.sn5zs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
// const uri = "mongodb+srv://geoffreycuffchartrand:XwazPm2lDw50MFeD@cluster0.6oaecgd.mongodb.net/?appName=Cluster0";
// format: monogdb+srv://<username>:<password>@<cluster>.<projectId>.mongodb.net/...

const wsServer = new ws.Server({ noServer: true });
wsServer.on('connection', socket => {
    socket.on('message', function message(data) {
        if (data == "bucketsPls") {
            wsServer.send(bucketer);
        }
        else {
            console.log(data);
        }
    });
});

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const {
    createHash,
} = require('node:crypto');

async function signer(hashlist) {
    const credential = JSON.stringify(verifiableCredential.VC(hashlist));
    const response = await fetch('http://localhost:4006/instance/testing/credentials/sign', {
        method: 'post',
        body: credential,
        headers: { 'Content-Type': 'application/json' }
    });
    const signedCred = await response.json();
    console.log("this is the signedCred:")
    console.log(signedCred);
    return signedCred;
}

async function search(name) {
    const query = { vc: name }; // define what we're searching for
    const fields = { projection: { _id: 1, vc: 1, hash: 1}} // define the fields we want returned (all of it for now)
    try {
        await client.connect();
        var bucket = [];
        const db = client.db("hash_database");
        const coll = db.collection("hashes");
        const cursor = coll.find(query, fields);
        for await (const doc of cursor) {
            bucket.push(doc);
        }
    }
    catch (e) {
        console.log(e)
    }
    finally {
        await client.close();
    }
    return bucket;
}

async function bucketer(bucketID) {
    try {
        await client.connect();
        var bucket = "";
        const db = client.db("hash_database");
        const coll = db.collection("hashes");
        const cursor = await coll.find({}, { hash: 1, _id: 0 });
        for await (const doc of cursor) {
            bucket = bucket + doc.hash + ", "
        }
        bucket = bucket.slice(0, -2);
        return bucket;
    }
    finally {
        //Ensures that the client will close when you finish/error
        await client.close();
    }
}

async function run(hash_data, hash) { // add hash_data and hash to the Mongo database
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const db = client.db("hash_database");
        const coll = db.collection("hashes");
        const docs = {vc:hash_data, hash:hash};
        await coll.insertOne(docs); 
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
    console.log('Mongo success!')
}

app.post('/', (req, res) => { // upon recieving credential from front end, send credential and a hashed copy to Mongo using run() above
    const hash = createHash('sha256')
    hash.update(req.body.cred);
    const hashedCred = hash.copy().digest('hex');
    const hash_data = req.body.cred;
    run(hash_data, hashedCred);
    res.end(hashedCred); // ends request and sends the hashed credential back to front end
});

const server = app.listen(3001);

server.on('upgrade', (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, socket => {
        wsServer.emit('connection', socket, request);
    });
});

app.get('/bucket/{bucketId}', async (req, res) => {
    const bucketId = req.pa;
    const hashList = await bucketer(bucketId);
    const result = await signer(hashList);
    res.json(result);
});

app.get('/search', async (req, res) => {
    const name = req.query.name;
    const result = await search(name);
    res.send(result);
});
