const express = require('express');
const app = express();
app.use(express.json());
const fetch = require("node-fetch");
const ws = require('ws');

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://geoffreycuffchartrand:XwazPm2lDw50MFeD@cluster0.6oaecgd.mongodb.net/?appName=Cluster0";

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
const verifiableCredential = require('./verifiableCredential.js');

function jsonParserGetData(stringValue) {

    var string = JSON.stringify(stringValue);
    var objectValue = JSON.parse(string);
    return [objectValue.name, objectValue.issuer.id, objectValue.issuanceDate];
}

async function signer(hashlist) {
    const credential = {"credential": verifiableCredential.VC(hashlist), 
    "options": {"verificationMethod":"did:web:digitalcredentials.github.io#z6MkrXSQTybtqyMasfSxeRBJxDvDUGqb7mt9fFVXkVn6xTG7"}};
    const response = await fetch('http://localhost:4006/instance/testing/credentials/sign', {
	    method: 'post',
	    body: credential,
	    headers: {'Content-Type': 'application/json'}
    });
    const signedCred = await response.json();
    console.log("this is the signedCred:")
    console.log(signedCred);
    return signedCred;
}

async function search (searchedName) {
    try {
        await client.connect();
        var bucket = "";
        const db = client.db("hash_database");
        const coll = db.collection("hashes");
        const cursor = await coll.find({name: searchedName}, { name: 1, _id: 0 });
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

async function bucketer() {
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
        const docs = {name: hash_data[0], issuerID: hash_data[1], issuanceDate: hash_data[2], hash: hash}; 
        const result = await coll.insertOne(docs);
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}

app.post('/', (req, res) => {
    const hash = createHash('sha256');
    hash.update(JSON.stringify(req.body));
    const hashedCred = hash.copy().digest('hex');
    const hash_data = jsonParserGetData(req.body);
    console.log(hashedCred);
    run(hash_data, hashedCred);
    res.end(hashedCred);
});

const server = app.listen(3000);

server.on('upgrade', (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, socket => {
      wsServer.emit('connection', socket, request);
    });
  });

app.get('/', async (req, res) => {
	const hashList = await bucketer();
    const name = req.query.name;
    console.log(name);
    if (typeof name == 'undefined') {
        const result = await signer(hashList);
        res.end(JSON.stringify(result));
    }
    else {
        const result = await search(name);
        res.end(JSON.stringify(result));
    }
});


