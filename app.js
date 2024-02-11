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
const merchantsSchema = {
  full_name: String,
  user_name: String,
  password: String,
  contact_phone: String,
  contact_email: String,
  signedup_at: Date
};
const Merchants = mongoose.model('merchants', merchantsSchema);

const videosSchema = {
  merchant_id: String,
  title: String,
  file_name: String,
  uploaded_at: Date
};
const Videos = mongoose.model('videos', videosSchema);

const clientsSchema = {
  full_name: String,
  user_name: String,
  password: String,
  signedup_at: Date
};

const Clients = mongoose.model('clients', clientsSchema);
//Schemas & Models end

// APIs Start

// Merchant signup starts
app.post('/merchant_signup', async (req, res) => {
  try {
    const { full_name, user_name, password, contact_phone } = req.body;
    const merchantExists = await Merchants.findOne({ user_name });
    if (merchantExists) {
      return res.status(409).json({
        status_code: 409,
        message: 'merchant exists.'
      });
    }
    const signedup_at = Date.now();

    if (!full_name || !user_name || !password || !contact_phone) {
      return res.status(400).json({
        status_code: 400,
        message: 'full_name, user_name, password, and contact_phone required.'
      });
    }
    const contact_email = user_name;
    await Merchants.create({ full_name, user_name, password, contact_phone, contact_email, signedup_at });
    return res.status(200).json({
      status_code: 200,
      message: 'merchant created.'
    });
  } catch (err) {
    console.log("/merchant_signup exception: " + err)
    return res.status(400).json({
      status_code: 400,
      message: 'something went wrong.',
    });
  }
});
// Merchant signup ends

// Merchant signin starts
const merchantSigninProjection = {
  _id: 1,
  user_name: 0,
  password: 0,
  contact_phone: 0,
  contact_email: 0,
  signedup_at: 0
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
    const merchant = await Merchants.findOne({ user_name, password }, merchantSigninProjection);

    if (merchant) {
      const token = jwt.sign({ _id: merchant._id }, 'your_secret_key', { expiresIn: '365d' });
      //console.log(merchant);
      return res.status(200).json({
        status_code: 200,
        message: 'signin successful.',
        token: token,
        data: { full_name: merchant.full_name }
      });
    } else {
      console.log(merchant)
      return res.status(401).json({
        status_code: 401,
        message: 'signin failed.',
      });
    }


  } catch (err) {
    console.log("/merchant_signin error: " + err);
    return res.status(400).json({
      status_code: 400,
      message: 'something went wrong.',
    });
  }
});
// Merchant signin ends

// View merchant profile starts
const viewMerchantOwnProfileProjection = {
  _id: 0,
  password: 0
};

app.get("/view_merchant_own_profile", async (req, res) => {
  try {
    if (!req.headers.authorization) {
      return res.status(401).json({
        status_code: 401,
        message: 'unauthorized user.'
      });
    }
    const token = req.headers.authorization.split(' ')[1];
    //console.log("Token:" + token);
    jwt.verify(token, 'your_secret_key', async (err, decoded) => {
      if (err) {
        //console.log("view_merchant_own_profile 401:" + err);
        return res.status(401).json({
          status_code: 401,
          message: 'unauthorized user.'
        });
      }
      const _id = decoded._id;
      const merchant = await Merchants.findOne({ _id }, viewMerchantOwnProfileProjection);
      //console.log("merchant: " + merchant);
      if (merchant) {
        return res.status(200).json({
          status_code: 200,
          message: 'profile found.',
          data: merchant
        });
      } else {
        console.log(merchant)
        return res.status(404).json({
          status_code: 404,
          message: 'profile not found.',
        });
      }
    });



  } catch (err) {
    console.log("/view_merchant_own_profile error: " + err);
    return res.status(400).json({
      status_code: 400,
      message: 'something went wrong',
    });
  }
});
// View merchant profile ends

// Upload video starts
const multer = require('multer');
const path = require('path');

// Set storage engine
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Init upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000000 }, // 1000MB limit
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
}).single('video');

// Check file type
function checkFileType(file, cb) {
  const filetypes = /mp4|avi|flv|mov|mkv/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Video files only!');
  }
}

// Upload endpoint
app.post('/upload_video', upload, async (req, res) => {
  try {
    if (!req.headers.authorization) {
      return res.status(401).json({
        status_code: 401,
        message: 'unauthorized user.'
      });
    }

    const token = req.headers.authorization.split(' ')[1];
    //console.log("Token:" + token);
    jwt.verify(token, 'your_secret_key', async (err, decoded) => {
      if (err) {
        //console.log("view_merchant_own_profile 401:" + err);
        return res.status(401).json({
          status_code: 401,
          message: 'unauthorized user.'
        });
      }
      if (!req.body.title || !req.file.fieldname || !req.file) {
        return res.status(400).json({
          status_code: 400,
          message: 'title and video required.'
        });
      }

      console.log("FileName: " + req.file.filename);



      const merchant_id = decoded._id;
      const title = req.body.title;
      console.log("hello1" );
      const file_name = req.file.filename;
      console.log("hello2" );
      const uploaded_at = Date.now();
      await Videos.create({ merchant_id, title, file_name, uploaded_at });
    });


    return res.status(200).json({
      status_code: 200,
      message: 'upload successful.'
    });
  } catch (err) { console.log("/upload Error: " + err) }

});
// Upload video ends

// Client signup Starts
app.post('/client_signup', async (req, res) => {
  try {
    const { full_name, user_name, password } = req.body;
    const clientExists = await Clients.findOne({ user_name });
    if (clientExists) {
      return res.status(409).json({
        status_code: 409,
        message: 'client exists.'
      });
    }
    
    const signedup_at = Date.now();

    if (!full_name || !user_name || !password) {
      return res.status(400).json({
        status_code: 400,
        message: 'full_name, user_name, and password required.'
      });
    }

    await Clients.create({ full_name, user_name, password, signedup_at });
    return res.status(200).json({
      status_code: 200,
      message: 'client created.'
    });
  } catch (err) {
    console.log("/merchant_signup exception: " + err)
    return res.status(400).json({
      status_code: 400,
      message: 'something went wrong.',
    });
  }
});
// Client signup ends

// Client signin starts
const clientSigninProjection = {
  _id: 1,
  user_name: 0,
  password: 0,
  signedup_at: 0
};

app.post('/client_signin', async (req, res) => {
  try {
    const { user_name, password } = req.body;
    if (!user_name || !password) {
      return res.status(400).json({
        status_code: 400,
        message: 'user_name and password required.'
      });
    }
    const client = await Clients.findOne({ user_name, password }, clientSigninProjection);

    if (client) {
      const token = jwt.sign({ _id: client._id }, 'your_secret_key', { expiresIn: '365d' });
      //console.log(client);
      return res.status(200).json({
        status_code: 200,
        message: 'signin successful.',
        token: token,
        data: { full_name: client.full_name }
      });
    } else {
      console.log(client)
      return res.status(401).json({
        status_code: 401,
        message: 'signin failed.',
      });
    }
  } catch (err) {
    console.log("/merchant_signin error: " + err);
    return res.status(400).json({
      status_code: 400,
      message: 'something went wrong.',
    });
  }
});
// Merchant signin ends

// APIs End

app.listen(3000, function () {
  console.log("Server started on port 3000");
});