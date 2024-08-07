const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config()

// middleWare
app.use(cors({
  origin:['http://localhost:5173'],
  credentials: true
}));

const verifyToken = async(req, res, next)=>{
  const token = req.cookies?.token;
  if(!token)
  {
    return res.status(401).send({message: 'UnAuthorized'});
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded)=>{
    if(err)
    {
      console.log(err);
      return res.status(401).send({message: 'UnAuthorized'})
    }
    console.log('value of the token', token);
    req.user = decoded;
    next();
  })
}

app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.richl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("carDoctor").collection("services");
    const bookingCollection = client.db("carDoctor").collection("booking");

    // read operation type: all
    app.get('/services', async(req, res)=>{
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    // read operation type: specific one
    app.get('/checkOut/:id', async(req, res)=>{
      const id  = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await serviceCollection.findOne(query);
      res.send(result);
    })

    //read operation type: query [give data depends on a query]
    app.get('/bookings', verifyToken, async(req, res)=>{
      console.log('the token coming from client', req.cookies.token)
      console.log('user in the valid token', req.user)
      if(req.query.email!==req.user.email)
      {
        return res.status(401).send({message: 'Acsess Forbidden'});
      }
      let query = {};
      
      if(req.query?.email)
      {
        query = {email: req.query.email}
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);

    })

    app.post('/bookings', async(req, res)=>{
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result)
    })
     //auth related api
     app.post('/jwt', async(req, res)=>{
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user,process.env.ACCESS_TOKEN, {expiresIn: '1h'})
      res.
      cookie('token', token, {
        httpOnly: true,
        secure: false,
      })
      .send({success:true})
    })

    app.patch('/bookings/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id : new ObjectId(id)};
      const updatedBooking = req.body;
      console.log(updatedBooking)
      const updateDoc ={
        $set:{
          status: updatedBooking.status
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.delete('/bookings/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result = await bookingCollection.deleteOne(query);
      res.send(result);


     
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res)=>{
    res.send('server is running');
})
app.listen(port, ()=>{
    console.log(`server is running on port ${port}`);
})