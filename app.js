const express = require('express');
const app = express();
app.use(express.json());
const fetch = require("node-fetch");
const ws = require('ws');
const verifiableCredential = require('./verifiableCredential.js');
var cors = require('cors');

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://geoffreycuffchartrand:XwazPm2lDw50MFeD@cluster0.6oaecgd.mongodb.net/?appName=Cluster0";

/*
const wsServer = new ws.Server({ noServer: true });
wsServer.on('connection', socket => {
    socket.on('message', function message(data) {
        if (data + "" == "bucketsPls") {
            const buckets = await bucketer("a")
            socket.send(buckets);
        }
        else {
            console.log(data + "");
        }
    });
});
*/

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

async function search(searchedName) {
    try {
        await client.connect();
        var bucket = "";
        const db = client.db("hash_database");
        const coll = db.collection("hashes");
        const cursor = await coll.find({ "vc.id" : searchedName}, { vc: 1, _id: 0 });
        for await (const doc of cursor) {
            bucket = bucket + JSON.stringify(doc.vc) + ", "
        }
        bucket = bucket.slice(0, -2);
        return bucket;
    }
    finally {
        //Ensures that the client will close when you finish/error
        await client.close();
    }
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

async function run(hash_data, hash) {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const db = client.db("hash_database");
        const coll = db.collection("hashes");
        const docs = {vc:hash_data, hash:hash};
        const result = await coll.insertOne(docs);
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}

app.use(cors());

app.post('/', (req, res) => {
    
    const hash = createHash('sha256');
    hash.update(JSON.stringify(req.body));
    const hashedCred = hash.copy().digest('hex');
    const hash_data = req.body;
    console.log(hashedCred);
    run(hash_data, hashedCred);
    res.end(hashedCred);
});

const server = app.listen(3001);

server.on('upgrade', (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, socket => {
        wsServer.emit('connection', socket, request);
    });
});

app.get('/bucket/{bucketId}', async (req, res) => {
    res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    const bucketId = req.pa;
    const hashList = await bucketer(bucketId);
    const result = await signer(hashList);
    res.json(result);
    
});

app.get('/search', async (req, res) => {
    res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    const name = req.query.name;
    console.log(name);
    const result = await search(name);
    res.end(JSON.stringify(result));

});
