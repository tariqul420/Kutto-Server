const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');
const nodemailer = require("nodemailer");

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
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("☘️  You successfully connected to MongoDB!");

        // Database Collection Name
        const db = client.db('Kutto')
        const usersCollection = db.collection('Users')
        const petCollection = db.collection('Pets')

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

                // send email when first login
                if (result?.insertedId) {
                    sendEmail(user?.email, {
                        subject: "Welcome to Kutto!",
                        message: `
                        <div style="font-family: Arial, sans-serif; line-height: 1.6; background-color: #f3f4f6; padding: 20px;">
                        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
                            <!-- Header -->
                            <div style="background-color: #007bff; color: #ffffff; padding: 20px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px;">Welcome to Kutto!</h1>
                            </div>

                            <!-- Body -->
                            <div style="padding: 20px; color: #333;">
                            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${user.name},</p>
                            <p style="font-size: 16px; margin-bottom: 20px;">
                                Thank you for joining Kutto! We are delighted to have you on board and are excited to help you make the most of your experience.
                            </p>
                            <p style="font-size: 16px; font-weight: bold; margin-bottom: 20px;">Here’s how to get started:</p>
                            <ol style="font-size: 16px; color: #333; padding-left: 20px;">
                                <li style="margin-bottom: 10px;">
                                <strong style="color: #007bff;">Explore:</strong> Discover features and services tailored just for you.
                                </li>
                                <li style="margin-bottom: 10px;">
                                <strong style="color: #007bff;">Update Your Profile:</strong> Personalize your experience by updating your profile 
                                <a href="[Profile Link]" style="color: #007bff; text-decoration: none;">here</a>.
                                </li>
                                <li style="margin-bottom: 10px;">
                                <strong style="color: #007bff;">Get Support:</strong> Need help? Visit our 
                                <a href="[Support Link]" style="color: #007bff; text-decoration: none;">Support Center</a>.
                                </li>
                            </ol>
                            <p style="font-size: 16px; margin-bottom: 20px;">
                                If you have any questions or need assistance, feel free to reply to this email or reach out to us at 
                                <a href="mailto:[Support Email]" style="color: #007bff; text-decoration: none;">[Support Email]</a>.
                            </p>
                            <p style="font-size: 16px; margin-bottom: 20px;">We’re here to help you succeed!</p>
                            <p style="font-size: 16px; margin-top: 30px;">Best regards,</p>
                            <p style="font-size: 16px; font-weight: bold;">The Kutto Team</p>
                            </div>

                            <!-- Footer -->
                            <div style="background-color: #f9f9f9; padding: 10px 20px; text-align: center; font-size: 12px; color: #777;">
                            <p style="margin: 0;">If you didn’t sign up for this account, please ignore this email or contact us at 
                                <a href="mailto:[Support Email]" style="color: #007bff; text-decoration: none;">[Support Email]</a>.
                            </p>
                            <p style="margin: 10px 0;">&copy; ${new Date().getFullYear()} Kutto. All rights reserved.</p>
                            </div>
                        </div>
                        </div>
                        `
                    })
                }

                res.send(result)
            } catch (error) {
                console.error('Post User:', error.message)
                res.status(500).send({ error: 'Failed to post user' })
            }
        })

        // Update User
        app.patch('/users/:email', async (req, res) => {
            const email = req.params.email
            const userData = req.body

            const updateDoc = {
                $set: {
                    displayName: userData?.displayName,
                    photoURL: userData?.photoUrl
                }
            }

            const result = await usersCollection.updateOne({ email }, updateDoc)
            res.send(result)
        })

        // get user role
        app.get('/users/role/:email', verifyToken, async (req, res) => {
            try {
                const email = req.params.email

                if (req?.user?.email !== email) {
                    return res.status(403).send({ message: 'forbidden access' });
                }

                const result = await usersCollection.findOne({ email })

                res.send({ role: result?.role })
            } catch (error) {
                console.error('Check Role:', error.message)
                res.status(500).send({ error: 'Failed to check role' })
            }
        })

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

                const result = await petCollection.find({ "petOwner.email": email }).toArray()

                res.send(result)
            } catch (error) {
                console.error('My pets:', error.message)
                res.status(500).send({ error: 'Failed to get my pets' })
            }
        })

        // Status update update pet
        app.patch('/adopt-pet/:id', verifyToken, async (req, res) => {
            try {
                const id = req.params.id
                const query = { _id: new ObjectId(id) }

                const updateDoc = {
                    $set: {
                        adopted: true
                    }
                }

                const result = await petCollection.updateOne(query, updateDoc)

                res.send(result)
            } catch (error) {
                console.error('adopted ped:', error.message)
                res.status(500).send({ error: 'Failed to update adopted pet' })
            }
        })

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

        // get single pet data
        app.get('/pets/:id', verifyToken, async (req, res) => {
            try {
                const id = req.params.id
                const query = { _id: new ObjectId(id) }

                const result = await petCollection.findOne(query)
                res.send(result)
            } catch (error) {
                console.error('get single pets:', error.message)
                res.status(500).send({ error: 'Failed to get single pet data' })
            }
        })

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

        // get all pet which not adopted
        app.get('/all-pet', async (req, res) => {
            try {
                const { search = "", category = "", sort = "", page = 1, limit = 6 } = req.query;

                const query = { adopted: false };
                if (search) {
                    query.petName = { $regex: search, $options: "i" };
                }
                if (category) {
                    query.petCategories = category;
                }

                const sortQuery = sort === "new" ? { createdAt: -1 } : sort === "old" ? { createdAt: 1 } : {};

                const skip = (page - 1) * parseInt(limit);
                const pets = await petCollection
                    .find(query)
                    .sort(sortQuery)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .toArray();

                res.send(pets);
            } catch (error) {
                console.error('all pets:', error.message)
                res.status(500).send({ error: 'Failed to get all pet which not adopted' })
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