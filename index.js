const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');
const nodemailer = require("nodemailer");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
const corsOptions = {
    origin: ["http://localhost:5173", "https://kutto-0.web.app", "https://kutto-0.firebaseapp.com"],
    credentials: true,
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())
app.use(morgan('dev'))

// Send mail using node mailer
const sendEmail = (emailAddress, emailData) => {
    // create email transporter
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: process.env.NODEMAILER_USER,
            pass: process.env.NODEMAILER_PASS,
        }
    })

    // Verify connection
    transporter.verify((error, success) => {
        if (error) {
            return console.error(error)
        } else {
            console.log('Transporter is ready to emails.', success)
        };
    })

    // create mail body
    const mailBody = {
        form: process.env.NODEMAILER_USER,
        to: emailAddress,
        subject: emailData?.subject,
        html: emailData?.message,
    }

    // send email
    transporter.sendMail(mailBody, (error, info) => {
        if (error) {
            return console.error(error)
        } else {
            console.log('Email Sent: ' + info?.response)
        }
    })
}

const uri = `mongodb+srv://${process.env.DATABASE_USERNAME}:${process.env.DATABASE_PASSWORD}@tariqul-islam.mchvj.mongodb.net/?retryWrites=true&w=majority&appName=TARIQUL-ISLAM`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // await client.connect();
        // await client.db("admin").command({ ping: 1 });
        console.log("☘️  You successfully connected to MongoDB!");

        // Database Collection Name
        const db = client.db('Kutto')
        const usersCollection = db.collection('Users')
        const petCollection = db.collection('Pets')
        const adoptionCollection = db.collection('Adoption')
        const donationCollection = db.collection("Donation")
        const paymentCollection = db.collection('Payment')

        //  ------------------- Common --------------------

        // Verify Jwt Token
        const verifyToken = async (req, res, next) => {
            const token = req.cookies.kutto_Token
            if (!token) return res.status(401).send({ error: 'unauthorized access' })

            // Verify Token
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
                if (error) return res.status(401).send({ error: 'unauthorized access' })

                req.user = decoded
                next()
            })
        }

        // Create Jwt Token
        app.post('/jwt', async (req, res) => {
            try {
                const userInfo = req.body
                const token = jwt.sign(userInfo, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
                res.cookie('kutto_Token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
                }).send({ success: true })
            } catch (err) {
                console.error('JWT:', err.message)
                res.status(500).send({ error: 'Failed to create jwt token' })
            }
        })

        //logout when not access jwt token
        app.get('/logout', async (req, res) => {
            try {
                res.clearCookie('kutto_Token', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
                    path: '/', // Match the path
                }).send({ success: true });
            } catch (err) {
                console.error('Logout:', err.message);
                res.status(500).send({ error: 'Failed to logout' });
            }
        });

        // post single user in the database
        app.post('/users', async (req, res) => {
            try {
                const user = req.body

                const isExist = await usersCollection.findOne({ email: user?.email })

                if (isExist) {
                    return res.send(isExist)
                }

                const result = await usersCollection.insertOne({ ...user, role: 'user' })

                res.send(result)
            } catch (error) {
                console.error('Post User:', error.message)
                res.status(500).send({ error: 'Failed to post user' })
            }
        })

        //  ------------------- Public --------------------

        // get single pet  details
        app.get('/pets/:id', async (req, res) => {
            try {
                const id = req.params.id
                const query = { _id: new ObjectId(id) }

                const projection = {
                    projection: {
                        "petOwner.name": 0,
                        "petOwner.photoURL": 0,
                    }
                }

                const result = await petCollection.findOne(query, projection)
                res.send(result)
            } catch (error) {
                console.error('get single pets:', error.message)
                res.status(500).send({ error: 'Failed to get single pet data' })
            }
        })

        // get all pet which not adopted for pet listing page
        app.get('/all-pet', async (req, res) => {
            try {
                const { search = "", category = "", sort = "", page = 1, limit = 8 } = req.query;

                const query = { adopted: false };
                if (search) {
                    query.petName = { $regex: search, $options: "i" };
                }

                if (category) {
                    query.petCategories = category;
                }

                const sortQuery = sort === "new" ? { createdAt: -1 } : sort === "old" ? { createdAt: 1 } : {};

                const skip = (page - 1) * parseInt(limit);

                const projection = {
                    projection: {
                        _id: 1,
                        petImage: 1,
                        petName: 1,
                        petAge: 1,
                        petLocation: 1,
                    },
                };

                const pets = await petCollection
                    .find(query, projection)
                    .sort(sortQuery)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .toArray();

                res.send(pets);
            } catch (error) {
                console.error('all pets:', error.message);
                res.status(500).send({ error: 'Failed to get all pets which are not adopted' });
            }
        });

        // get a single donation details
        app.get('/donation-details/:id', async (req, res) => {
            try {
                const id = req.params.id
                const query = { _id: new ObjectId(id) }

                const projection = {
                    projection: {
                        "donationOwner.name": 0,
                        "donationOwner.photoURL": 0,
                        totalDonateUser: 0
                    }
                }

                const result = await donationCollection.findOne(query, projection)
                res.send(result)
            } catch (error) {
                console.error('get single donation details:', error.message)
                res.status(500).send({ error: 'Failed to get single donation data' })
            }
        })

        // get all donation data
        app.get('/donation-campaign', async (req, res) => {
            try {
                const { search = "", sort = "", page = 1, limit = 8 } = req.query;

                const query = {}

                if (search) {
                    query.donationName = { $regex: search, $options: "i" };
                }

                let sortQuery = {};
                if (sort === "new") {
                    sortQuery = { createdAt: -1 };
                } else if (sort === "old") {
                    sortQuery = { createdAt: 1 };
                } else if (sort === "asc") {
                    sortQuery = {
                        maxAmount: 1
                    };
                } else if (sort === "desc") {
                    sortQuery = {
                        maxAmount: -1
                    };
                }

                const skip = (page - 1) * parseInt(limit);

                const donations = await donationCollection
                    .find(query, { projection: { _id: 1, donationImage: 1, donationName: 1, maxAmount: 1, totalDonateAmount: 1 } })
                    .sort(sortQuery)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .toArray();

                res.send(donations);
            } catch (error) {
                console.error('Error fetching donations:', error.message);
                res.status(500).send({ error: 'Failed to get all donation campaigns' });
            }
        });

        // get 3 data for suggestion donation campaign
        app.get('/suggestion-donation-campaign', async (req, res) => {
            try {
                const result = await donationCollection.aggregate([
                    {
                        $match: { status: 'Running' }
                    },
                    {
                        $sample: { size: 3 }
                    }
                ]).toArray()

                res.send(result)
            } catch (error) {
                console.error('suggestion donation:', error.message);
                res.status(500).send({ error: 'Failed to get 3 suggestion donation campaign' });
            }
        })

        // get data category ex: dog, cat etc
        app.get('/pets-category/:category', async (req, res) => {
            try {
                const { page = 1, limit = 6 } = req.query;
                const category = req.params.category
                const filter = { petCategories: category }

                const skip = (page - 1) * parseInt(limit);

                const projection = {
                    projection: {
                        _id: 1,
                        petImage: 1,
                        petName: 1,
                        petAge: 1,
                        petLocation: 1,
                    },
                };

                const result = await petCollection.find(filter, projection).skip(skip).limit(parseInt(limit)).toArray()

                res.send(result)
            } catch (error) {
                console.error('pets-category:', error.message)
                res.status(500).send({ error: 'Failed to to get pets-category wise data' })
            }
        })

        // recent pets for home page
        app.get('/recent-pets', async (req, res) => {
            try {
                const projection = {
                    projection: {
                        _id: 1,
                        petImage: 1,
                        petName: 1,
                        petAdopter: 1,
                        status: 1
                    }
                }

                const result = await petCollection.find({}, projection).sort({ createdAt: -1 }).limit(8).toArray()
                res.status(200).send(result)
            } catch (error) {
                console.error('recent pets:', error.message)
                res.status(500).send({ error: 'Failed to get recent pets' })
            }
        })

        //  -------------- Common & Secure -------------

        // Update User
        app.patch('/users/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            const userData = req.body

            const updateDoc = {
                $set: {
                    name: userData?.name,
                    image: userData?.image
                }
            }

            const result = await usersCollection.updateOne({ email }, updateDoc)
            res.send(result)
        })

        // get user role
        app.get('/users/role/:email', async (req, res) => {
            try {
                const email = req.params.email

                const result = await usersCollection.findOne({ email })

                res.send({ role: result?.role })
            } catch (error) {
                console.error('Check Role:', error.message)
                res.status(500).send({ error: 'Failed to check role' })
            }
        })

        // create payment intent
        app.post('/create-payment-intent', verifyToken, async (req, res) => {
            try {
                const { amount } = req.body
                const donationAmount = parseInt(amount * 100);

                const paymentIntent = await stripe.paymentIntents.create({
                    amount: donationAmount,
                    currency: "usd",
                    payment_method_types: ['card']
                })


                res.send(paymentIntent.client_secret)
            } catch {
                console.error('payment intent:', error.message)
                res.status(500).send({ error: 'Failed to  to create payment intent' })
            }
        })

        // save payment history in database
        app.post('/save-payment-history', verifyToken, async (req, res) => {
            try {
                const paymentHistory = req.body
                const query = { _id: new ObjectId(paymentHistory?.donationId) }

                const donation = await donationCollection.findOne(query);

                const updatedAmount = donation.totalDonateAmount + paymentHistory?.amount;

                const savePayment = await paymentCollection.insertOne(paymentHistory)

                const updateDoc = {
                    $inc: {
                        totalDonateAmount: paymentHistory?.amount,
                        totalDonateUser: 1
                    },
                    $set: {
                        status: updatedAmount >= donation.maxAmount ? 'Complete' : 'Running',
                    },
                }

                const updateHistory = await donationCollection.updateOne(query, updateDoc)

                res.send({
                    savePayment,
                    updateHistory
                })
            } catch (error) {
                console.error('Save payment history:', error.message)
                res.status(500).send({ error: 'Failed to  save payment history' })
            }
        })

        app.get('/overview-details', async (req, res) => {
            try {
                const email = req.query.email || ''

                const allUser = await usersCollection.estimatedDocumentCount();
                const allPet = await petCollection.estimatedDocumentCount();
                const allDonator = await donationCollection.estimatedDocumentCount();
                const totalDonation = await donationCollection.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalAmount: { $sum: "$totalDonateAmount" }
                        }
                    }
                ]).toArray();

                const myPet = await petCollection.countDocuments({ 'petOwner.email': email });
                const adoptionRequest = await adoptionCollection.countDocuments({ 'petOwner.email': email });

                const myDonate = await donationCollection.aggregate([
                    {
                        $match: { "donationOwner.email": email }
                    },
                    {
                        $group: {
                            _id: null,
                            totalAmount: { $sum: "$totalDonateAmount" }
                        }
                    }
                ]).toArray();
                const donationCampaign = await donationCollection.countDocuments({ 'donationOwner.email': email });

                res.status(200).json({ allUser, allPet, allDonator, totalDonation, myPet, adoptionRequest, myDonate, donationCampaign });
            } catch (error) {
                console.error('Error fetching overview details:', error.message);
                res.status(500).json({ error: 'Failed to get overview details' });
            }
        });

        //  ------------------- Users --------------------

        // save single pet data on database
        app.post('/add-pet', verifyToken, async (req, res) => {
            try {
                const petData = req.body
                const result = await petCollection.insertOne(petData)
                res.send(result)
            } catch (error) {
                console.error('Add pet:', error.message)
                res.status(500).send({ error: 'Failed to  add single pet' })
            }
        })

        // get my added pets
        app.get('/my-pets/:email', verifyToken, async (req, res) => {
            try {
                const email = req?.params.email

                if (req?.user?.email !== email) {
                    return res.status(403).send({ message: 'forbidden access' });
                }

                const projection = {
                    projection: {
                        _id: 1,
                        petImage: 1,
                        petName: 1,
                        petCategories: 1,
                        adopted: 1
                    }
                }

                const result = await petCollection.find({ "petOwner.email": email }, projection).toArray()

                res.send(result)
            } catch (error) {
                console.error('My pets:', error.message)
                res.status(500).send({ error: 'Failed to get my pets' })
            }
        })

        // update pet adoption status
        app.patch('/adopt-pet/:id', verifyToken, async (req, res) => {
            try {
                const id = req.params.id;
                const status = req.query.status;
                const query = { _id: new ObjectId(id) };
                const petId = { petId: id }

                let petResult = {};
                let adoptionResult = {};

                if (status !== 'rejected') {
                    const updatePetDoc = {
                        $set: {
                            adopted: true
                        }
                    };
                    petResult = await petCollection.updateOne(query, updatePetDoc);
                }

                const updateStatusDoc = {
                    $set: {
                        status: status
                    }
                };

                adoptionResult = await adoptionCollection.updateOne(petId, updateStatusDoc);

                res.send({
                    message: `Pet adoption updated successfully to status: ${status}`,
                    petResult,
                    adoptionResult
                });
            } catch (error) {
                console.error('Error in adopt-pet route:', error.message);
                res.status(500).send({ error: 'Failed to update adopted pet' });
            }
        });

        // User & Admin
        // delete my pet
        app.delete('/delete-pet/:id', verifyToken, async (req, res) => {
            try {
                const id = req.params.id
                const query = { _id: new ObjectId(id) }

                const result = await petCollection.deleteOne(query)
                res.send(result)
            } catch (error) {
                console.error('delete pets:', error.message)
                res.status(500).send({ error: 'Failed to delete my pets' })
            }
        })

        // User & Admin
        // update single pet
        app.put('/update-pets/:id', verifyToken, async (req, res) => {
            try {
                const id = req.params.id
                const query = { _id: new ObjectId(id) }
                const updateData = req.body

                const updateDoc = {
                    $set: updateData
                }

                const result = await petCollection.updateOne(query, updateDoc)
                res.send(result)
            } catch (error) {
                console.error('update single pets:', error.message)
                res.status(500).send({ error: 'Failed to update single pet data' })
            }
        })

        // post single adoption request
        app.post('/adoption-request', verifyToken, async (req, res) => {
            try {
                const data = req.body

                const query = { 'petAdopter.email': data?.petAdopter?.email, petId: data?.petId }

                const alreadyExist = await adoptionCollection.findOne(query)

                if (alreadyExist) return res.status(400).send('You already adopted this pet!')

                const result = await adoptionCollection.insertOne({ ...data, status: "pending" })

                res.send(result)
            } catch (error) {
                console.error('post adoption request:', error.message)
                res.status(500).send({ error: 'Failed to post adoption request' })
            }
        })

        // get all pet adoption request for single user
        app.get('/adoption-request/:email', verifyToken, async (req, res) => {
            try {
                const { email } = req.params

                const projection = {
                    projection: {
                        _id: 1,
                        petImage: 1,
                        petName: 1,
                        petAdopter: 1,
                        status: 1
                    }
                }

                const result = await adoptionCollection.find({ "petOwner.email": email }, projection).toArray()

                res.send(result)
            } catch (error) {
                console.error('all pets adoption request:', error.message)
                res.status(500).send({ error: 'Failed to get all pet which adoption request' })
            }
        })

        // create a donation campaign
        app.post('/create-donation', verifyToken, async (req, res) => {
            try {
                const donationData = req.body
                const result = await donationCollection.insertOne(donationData)
                res.send(result)
            } catch (error) {
                console.error('create donation:', error.message)
                res.status(500).send({ error: 'Failed to create a donation' })
            }
        })

        // get my donation
        app.get('/my-donation/:email', verifyToken, async (req, res) => {
            try {
                const { email } = req.params

                const projection = {
                    projection: {
                        _id: 1,
                        donationImage: 1,
                        donationName: 1,
                        maxAmount: 1,
                        status: 1,
                        totalDonateAmount: 1,
                        totalDonateUser: 1
                    }
                }

                const result = await donationCollection.find({ "donationOwner.email": email }, projection).toArray()

                res.send(result)
            } catch (error) {
                console.error('my donation:', error.message)
                res.status(500).send({ error: 'Failed to get my all donation' })
            }
        })

        // user & admin
        // donation status update
        app.patch('/donation-status/:id', verifyToken, async (req, res) => {
            try {
                const id = req.params.id;
                const status = req.query.status;
                const query = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: { status },
                };

                const result = await donationCollection.updateOne(query, updateDoc);
                res.send(result);
            } catch (error) {
                console.error('update donation status:', error.message)
                res.status(500).send({ error: 'Failed to update donation status' })
            }
        });

        // update single donation campaign
        app.put('/update-donation-campaign/:id', verifyToken, async (req, res) => {
            try {
                const id = req.params.id
                const query = { _id: new ObjectId(id) }
                const updateData = req.body

                const currentCampaign = await donationCollection.findOne(query);

                const updatedTotalDonateAmount = updateData.totalDonateAmount || currentCampaign.totalDonateAmount;
                const maxAmount = updateData.maxAmount || currentCampaign.maxAmount;

                const updatedStatus = updatedTotalDonateAmount < maxAmount ? 'Running' : currentCampaign.status;

                const updateDoc = {
                    $set: {
                        ...updateData,
                        status: updatedStatus,
                    },
                }

                const result = await donationCollection.updateOne(query, updateDoc)
                res.send(result)
            } catch (error) {
                console.error('update single donation camp:', error.message)
                res.status(500).send({ error: 'Failed to update single donation campaign' })
            }
        })

        //get my donation history
        app.get('/my-donation-history/:email', verifyToken, async (req, res) => {
            const email = req.params.email

            const projection = {
                projection: {
                    donationName: 1,
                    donationImage: 1,
                    amount: 1,
                    paymentId: 1,
                    donationId: 1
                }
            }

            const result = await paymentCollection.find({ email }, projection).toArray()
            res.send(result)
        })

        // refund my donation amount
        app.patch('/refund-donation/:id', verifyToken, async (req, res) => {
            try {
                const id = req.params.id
                const { amount } = req.body

                const updateDoc = {
                    $inc: {
                        totalDonateAmount: -amount,
                        totalDonateUser: -1
                    }
                }

                const updateRefundHistory = await donationCollection.updateOne({ _id: new ObjectId(id) }, updateDoc)

                const deleteHistory = await paymentCollection.deleteOne({ donationId: id })

                res.send({
                    updateRefundHistory,
                    deleteHistory
                })
            } catch (error) {
                console.error('Refund Amount:', error.message)
                res.status(500).send({ error: 'Failed to  refund donation amount' })
            }
        })

        //  ------------------- Admin --------------------

        // verify Admin
        const verifyAdmin = async (req, res, next) => {
            const email = req?.user?.email
            const query = { email };
            const user = await usersCollection.findOne(query)
            const isAdmin = user?.role === 'admin';
            if (!user || !isAdmin) {
                return res.status(403).send({ message: 'forbidden access. || only access admin!' });
            }
            next()
        }

        //get all users
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const email = req?.user?.email
                const result = await usersCollection.find({ email: { $ne: email } }).toArray();
                res.send(result)
            } catch (error) {
                console.error('all users:', error.message)
                res.status(500).send({ error: 'Failed to  get all users' })
            }
        })

        // user role update
        app.patch('/user-role-update/:email', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const email = req.params.email
                const updateDoc = {
                    $set: {
                        role: 'admin',
                        status: 'verified'
                    }
                }

                const result = await usersCollection.updateOne({ email }, updateDoc)
                res.send(result)
            } catch (error) {
                console.error('Role update:', error.message)
                res.status(500).send({ error: 'Failed to  role update' })
            }
        })

        // get all pet data for admin
        app.get('/all-pet-admin', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const projection = {
                    projection: {
                        _id: 1,
                        petImage: 1,
                        petName: 1,
                        petCategories: 1,
                        adopted: 1,
                        "petOwner.email": 1
                    }
                }

                const result = await petCollection.find({}, projection).toArray()
                res.send(result)
            } catch (error) {
                console.error('all pet admin:', error.message)
                res.status(500).send({ error: 'Failed to  get all pet for admin' })
            }
        })

        // adoption status update
        app.patch('/adoption-status-admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const { id } = req.params;
                const { adopted } = req.body;

                const query = { _id: new ObjectId(id) }

                const updateDoc = {
                    $set: {
                        adopted
                    }
                }

                const result = await petCollection.updateOne(query, updateDoc);

                res.send(result)
            } catch (error) {
                console.error('update adoption status:', error.message)
                res.status(500).send({ error: 'Failed to update adoption status for admin' })
            }
        })

        // get all donation campaign
        app.get('/all-donation-campaign-admin', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const projection = {
                    projection: {
                        _id: 1,
                        donationImage: 1,
                        donationName: 1,
                        maxAmount: 1,
                        totalDonateAmount: 1,
                        status: 1,
                        'donationOwner.email': 1
                    }
                }

                const result = await donationCollection.find({}, projection).toArray()
                res.send(result)
            } catch (error) {
                console.error('all donation camp admin:', error.message)
                res.status(500).send({ error: 'Failed to  get all donation campaign for admin' })
            }
        })

        // delete donation campaign
        app.delete('/donation-campaign-admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id
                const query = { _id: new ObjectId(id) }

                const result = await donationCollection.deleteOne(query)

                res.send(result)
            } catch (error) {
                console.error('delete donation camp:', error.message)
                res.status(500).send({ error: 'Failed to delete donation campaign' })
            }
        })

    } catch (err) {
        console.error('Mongodb', err.message)
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello Programmer. How Are You? This Server For Kutto Website ❤️')
})

app.listen(port, () => {
    console.log(`☘️  You successfully connected to Server: ${port}`);
})