//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const app = express();
const jwt = require('jsonwebtoken');

app.set('view engine', 'ejs');
//app.use(bodyParser.urlencoded({ extended: true }));
//app.use(bodyParser.json());
app.use(express.json());
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/my_video_db");

//Schemas & Models start
const merchantSchema = {
  full_name: String,
  user_name: String,
  password: String,
  contact_phone: String,
  contact_email: String
};

const Merchants = mongoose.model('merchants', merchantSchema);
//Schemas & Models end

// APIs Start

// Merchant signup Starts
app.post('/merchant_signup', async (req, res) => {
  try {
    const { full_name, user_name, password, contact_phone } = req.body;
    const merchantExists = await Merchants.findOne({ user_name });
    if (merchantExists) {
      return res.status(409).json({
        status_code: 409,
        message: 'Merchant exists.'
      });
    }

    if (!full_name || !user_name || !password || !contact_phone) {
      return res.status(400).json({
        status_code: 400,
        message: 'name, user_name, password, and contact_phone required.'
      });
    }
    const contact_email = user_name;
    await Merchants.create({ full_name, user_name, password, contact_phone, contact_email });
    return res.status(200).json({
      status_code: 200,
      message: 'Merchant created.'
    });
  } catch (err) {
    console.log("/merchant_signup exception: " + err)
    return res.status(400).json({
      status_code: 400,
      message: 'Something went wrong.',
    });
  }
});

// Post- Merchant signup Ends

// Post- Merchant signin starts
const merchantLoginProjection = {
  //_id: 0,
  //user_name: 0,
  password: 0,
  contact_phone: 0,
  contact_email: 0,
  last_logged_in: 0
};

app.post('/merchant_signin', async (req, res) => {
  try {
    const { user_name, password } = req.body;
    if (!user_name || !password) {
      return res.status(400).json({
        status_code: 400,
        message: 'user_name and password required.'
      });
    }
    const merchant = await Merchants.findOne({ user_name, password }, merchantLoginProjection);

    if (merchant) {
      const token = jwt.sign({ _id: merchant._id }, 'your_secret_key', { expiresIn: '365d' });
      console.log(merchant);
      return res.status(200).json({
        status_code: 200,
        message: 'Login successful.',
        token: token,
        data: { full_name: merchant.full_name }
      });
    } else {
      console.log(merchant)
      return res.status(401).json({
        status_code: 401,
        message: 'Login failed.',
      });
    }


  } catch (err) {
    console.log("/merchant_signin error: " + err);
    return res.status(400).json({
      status_code: 400,
      message: 'Something went wrong.',
    });
  }
});

// Post- Merchant Login Ends

// Get- View Merchant Profile Starts
const viewMerchantOwnProfileProjection = {
  _id: 0,
  password: 0
};

app.get("/view_merchant_own_profile", async (req, res) => {
  try {
    if (!req.headers.authorization) {
      return res.status(401).json({
        status_code: 401,
        message: 'Unauthorized user.'
      });
    }
    const token = req.headers.authorization.split(' ')[1];
    //console.log("Token:" + token);
    jwt.verify(token, 'your_secret_key', async(err, decoded) => {
      if (err) {
        //console.log("view_merchant_own_profile 401:" + err);
        return res.status(401).json({
          status_code: 401,
          message: 'Unauthorized user.'
        });
      }
      const _id = decoded._id;
      const merchant = await Merchants.findOne({ _id }, viewMerchantOwnProfileProjection);
      console.log("merchant: " + merchant);
      if (merchant) {
        return res.status(200).json({
          status_code: 200,
          message: 'Profile found.',
          data: merchant
        });
      } else {
        console.log(merchant)
        return res.status(404).json({
          status_code: 404,
          message: 'Profile not found.',
        });
      }
    });

    
      
  } catch (err) {
    console.log("/view_merchant_own_profile error: " + err);
    return res.status(400).json({
      status_code: 400,
      message: 'Something went wrong',
    });
  }
});
// Get- View Merchant Profile Ends

// APIs End
app.listen(3000, function () {
  console.log("Server started on port 3000");
});