//開發PORT=3008預設在 dev.env中
//正式環境PORT=3001預設在 production.env中

if(process.argv[2] && process.argv[2]==='production'){
  require('dotenv').config({
    path: './production.env'
  });
} else {
  require('dotenv').config({
    path:'./dev.env'
  });
} 

const express = require("express");


//----------
const moment = require("moment-timezone");
const cors = require('cors');
const bcrypt = require('bcryptjs');
const upload = require('./modules/upload-imgs');

//database串接
//可以先設置自己的db來開發
const db = require('./modules/db_connect2');
// const db = require('./modules/db_connectmain');


//webtoken
const jwt = require("jsonwebtoken")
const app = express();



// top-level middlewares


app.use(express.urlencoded({extended: false}));
app.use(express.json());
const corsOptions = {
  credentials: true,
  origin: function(origin, cb){
    console.log({origin});
    cb(null, true);
  }
};
app.use(cors(corsOptions));



// routes 路由

app.use('/cart', require('./routes/cart')); 
app.use('/class', require('./routes/class')); 
app.use('/member', require('./routes/member')); 
app.use('/news', require('./routes/news')); 
app.use('/coupon', require('./routes/coupon')); 
app.use('/product', require('./routes/product')); 
app.use('/seat', require('./routes/seat')); 



//把public資料夾當根目錄
app.use(express.static('public'));
// app.use(express.static('node_modules/bootstrap/dist'));


// 所有路由要放在 404 之前
app.use((req, res) => {
  // res.type('text/plain');
  res.status(404).send(`<h1>找不到頁面</h1>
  <p>404</p>
  `);
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`伺服器啟動: ${port}`);
});

