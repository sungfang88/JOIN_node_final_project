const express = require("express");
const moment = require("moment-timezone");
const db = require("./../modules/db_connect2");
const upload = require('./../modules/upload-imgs');
//使用 Node.js 中的 fs(filesystem) 的 readFile 方法
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken")
//引用 nodemailer 
const nodemailer = require('nodemailer');

const router = express.Router();

//Navbar購物車清單數量
router.get('/navbarcart/:sid',async (req, res) => {
  const membersid = req.params.sid
  console.log('membersid',membersid)

  const cartnumsql = 'SELECT COUNT(*) FROM `cart_details` WHERE `cart_details`.`m_id`=?'
  const[rows]=await db.query(cartnumsql, [membersid]);
  console.log('rows',rows)
  const num =rows[0]["COUNT(*)"]
  res.json(num) 
})


 
//登入時新增會員收藏 
router.post('/loginstore',async (req, res) => {
  const {mid,productarray} = req.body
  const searchsql = "SELECT `member_collection`.`productmanage` FROM `member_collection` WHERE `member_collection`.`member`=?"
  const [searchres] = await db.query(searchsql, [mid]);
  console.log('searchres',searchres)
  const dataout = searchres.map((v,i)=>{return v.productmanage})
  console.log('dataout',dataout)
  const newArr = productarray.filter((v,i) => {return !dataout.includes(v)})

  const insertsql = "INSERT INTO `member_collection`(`member`, `productmanage`) VALUES (?,?)"
  newArr.map(async(v,i)=>{
    console.log("v",v)
    await db.query(insertsql, [mid,v])
  })
  

  

  res.json(newArr)

}) 







//登入時有新增購物數量寫入cart
router.post('/logincart',async (req, res) => {
  const {productId,amount,mid} =req.body
  console.log(productId,amount,mid)
  const searchsql = "SELECT * FROM `cart_details` WHERE `cart_details`.`m_id`=? AND `cart_details`.`product_id`=?"
  const [searchres] = await db.query(searchsql, [mid,productId]);
  console.log('searchres',searchres)
   
  if(searchres.length===0){
  const productsql ='SELECT `productmanage`.`product_ch`,`productmanage`.`product_eg`,`productmanage`.`product_img`,`productmanage`.`productprice` FROM `productmanage` WHERE `productmanage`.`product_id`=?'
  const [productsqlres] = await db.query(productsql, [productId]);
  const {product_ch,product_eg,product_img,productprice} =productsqlres[0]
  const sql = "INSERT INTO `cart_details`(`m_id`, `product_img`, `product_ch`, `product_eg`, `product_id`, `price`, `quantity`, `created_at`) VALUES (?,?,?,?,?,?,?,NOW())";
    const [result] = await db.query(sql, [mid, product_img, product_ch, product_eg, productId,productprice,amount]);
    const data={success:!!result.affectedRows,result:result}
    console.log("無商品紀錄的購物車",data)
  res.json(data)

 
  }else{
    const{product_img,product_ch,product_eg,product_id,price,quantity}=searchres[0]
    const quantityplus =quantity+amount;
    const now = new Date();
    const sql = "UPDATE `cart_details` SET `product_img`=?,`product_ch`=?,`product_eg`=?,`price`=?,`quantity`=?,`created_at`=? WHERE `cart_details`.`m_id`=? AND `cart_details`.`product_id`=?";
     const [result] = await db.query(sql, [ product_img, product_ch, product_eg, price, quantityplus, now, mid, product_id]);
     console.log(result)
     const data={success:!!result.affectedRows,result:result}
    console.log("有商品紀錄的購物車",data)

     res.json(data)
  }
})




//Gmail測試
router.get('/gmail/:usergmail',async (req, res) => {
  const verifygmail = req.params.usergmail
  console.log('verifygmail',verifygmail)

  const usersql = 'SELECT * FROM `member` WHERE `member`.`email`=?'
  const[rows]=await db.query(usersql, [verifygmail]);
  console.log('rows',rows)
  if(rows.length>0){



  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // 忽略自簽憑證的錯誤

   const randomNumber = Math.floor(100000 + Math.random() * 900000);

   const mytoken = jwt.sign({randomNumber: randomNumber},process.env.JWT_SECRET);

  //宣告發信物件 -> 是使用 nodemailer.createTransport 物件先建立好發信的服務 service 為 Gmail
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // 使用 SSL/TLS 加密連線
  auth: {
    user: process.env.SMTP_TO_EMAIL,
    pass: process.env.SMTP_TO_PASSWORD,
  }
 });
 console.log(process.env.EMAIL_ACCOUNT)

  console.log(process.env.CLINENTED)
  console.log(process.env.CLINENTSECRET)
  console.log(process.env.REFRESHTOKEN)
  console.log(process.env.ACCESSTOKEN) 
 

  const options = {  
    //寄件者
    from: 'for0329front@gmail.com',
    //收件者
    to: verifygmail, 
    //主旨
    subject: '酒癮更新密碼簡訊', // Subject line
    //純文字
    text: '酒癮更新密碼簡訊', // plaintext body
    //嵌入 html 的內文
    html: `<h2>驗證密碼簡訊${randomNumber}</h2>`
   }

  //發送信件方法 建立好發信的服務 service用sendMail送
  transporter.sendMail(options, function(error, info){
    if(error){
      console.log(error);
      res.json({'error':error,"message":"token過期了"})
    } else {
      console.log('訊息發送: ' + info.response);
      res.json({'info.response':info.response,success:true,mytoken:mytoken})
    }
  });} else {


    res.json({success:false,message:"gmail未註冊，請先前往註冊"})

  }
 
  
}); 

//gmail 驗證密碼
router.post('/verify',async (req, res) => {
 
  const {code,mytoken} = req.body

  console.log('code',code)
  const codeintonum = +(code)
  console.log('codeintonum',codeintonum)
  console.log('mytoken',mytoken)
  let output={success:false}

  const verifymytoken = jwt.verify(mytoken,process.env.JWT_SECRET);
  console.log('verifymytoken',verifymytoken)
  if(codeintonum===verifymytoken.randomNumber){
    output={success:true}
  }
  res.json(output)
 
})



//re-newpassword 重新設定密碼
router.post('/newpassword',async (req, res) => {
  const {gmail,newpassword} = req.body
  console.log('gmail',gmail)
  console.log('newpassword',newpassword)


   const usersql = 'SELECT * FROM `member` WHERE `member`.`email`=?'
   const[rows]=await db.query(usersql, [gmail]);
   console.log('rows',rows)
   const {sid} = rows[0]
   console.log('sid',sid) 

  
  const hash = await bcrypt.hash(newpassword, 10);
  console.log('hash',hash)
  const output={success:false}

  const sql ="UPDATE `member` SET `password`=? WHERE `member`.`email`=? ";
  const [result] = await db.query(sql, [hash,gmail]);
  console.log("result",result)

  if(result.affectedRows===1){
    output.token = jwt.sign({
      sid: sid,
      gmail: gmail},
      process.env.JWT_SECRET);
      output.accountId = sid;
      output.useremail = gmail;
      output.success=true

  }

 console.log('output',output)
  
 

  res.json(output)

})


//判斷會員是不是黑名單
router.get("/blackmember/:sid", async (req, res) => {
  let data ={success:true}
  const sql ='SELECT `seat_all`.`status_sid` FROM `seat_all` WHERE  `seat_all`.`member_sid`=?'
  const [rows] = await db.query(sql, [req.params.sid]);
  console.log('rows',rows)
  const filterstatus = rows.filter((v,i)=>{return v.status_sid===4})
  console.log('filterstatus',filterstatus)
  if(filterstatus.length>1){
   res.json(data)
  }else{
   data = {success:false}
   res.json(data)
  }

})


//判斷會員訂單、課程、折價券、訂位、我的收藏有沒有資料
router.get("/alldata/:sid", async (req, res) => {

  let dataObj ={coupondata:false,listdata:false,classdata:false,seatdata:false,mystoredata:false}



const coupondatasql = "SELECT * FROM `coupon_report` WHERE `coupon_report`.`menber_sid`=?"
const [coupon] = await db.query(coupondatasql, [req.params.sid]);

if(coupon.length>0){
  console.log('coupon.length',coupon.length)
  dataObj ={...dataObj,coupondata:true}}

const listdatasql ="SELECT * FROM `product_order` WHERE `product_order`.`m_id`=?"
const [list] = await db.query(listdatasql, [req.params.sid]);
if(list.length>0){
  console.log('list.length',list.length)
  dataObj ={...dataObj,listdata:true}}

const seatdatasql ="SELECT * FROM `seat_all` WHERE `seat_all`.`member_sid`=?"
const [seatnum] = await db.query(seatdatasql, [req.params.sid]);
if(seatnum.length>0){
  console.log('seatnum.length',seatnum.length)
  dataObj ={...dataObj,seatdata:true}}  

const classdatasql ="SELECT * FROM `class_order` WHERE `class_order`.`m_id`=?"
const [classnum] = await db.query(classdatasql, [req.params.sid]);
if(classnum.length>0){
  console.log('classnum.length',classnum.length)
  dataObj ={...dataObj,classdata:true}} 

const storedatasql ="SELECT * FROM `member_collection` WHERE `member_collection`.`member`=?"
const [storenum] = await db.query(storedatasql, [req.params.sid]);
if(storenum.length>0){
  console.log('storenum.length',storenum.length)
  dataObj ={...dataObj,mystoredata:true}}


console.log('dataObj123',dataObj)
res.json(dataObj)




})

//會員主頁 及 編輯頁get
  router.get(["/edit/:sid","/data/:sid"], async (req, res) => {
    const sql = "SELECT `sid`,`name`,`email`,`phone`,`birthday`,`area`,`city`,`address`,`userphoto` FROM `member` WHERE sid=?";
  
    const [rows] = await db.query(sql, [req.params.sid]);
     
    
    //路徑要寫相當於 index.js的路徑
    const image = fs.readFileSync('public/uploads/' + rows[0].userphoto);
    const data = {
      rows: rows, // 表格数据
      image: image.toString('base64'), // 图片数据转换为 Base64 编码格式的字符串
      // Referer: req.get('Referer') || ''
      Referer: req.headers.referer || ''

    };

    
  
    if(rows.length){
      // res.json(rows[0]);
      // res.render('address-book/edit', rows[0]);  // 呈現編輯的表單
      res.json(data);
      
    } else {
      res.redirect(req.baseUrl);
    }
  
  });

//會員編輯頁put
  router.put('/edit/:sid', upload.single('userphoto'), async (req, res) => {
   
    //處理圖片的檔名 好讓資料庫存入
    console.log(req.file);
    console.log(req.body);
    // let userphoto = '';
  

    //拿query-string 的sid
    const sid = req.params.sid;
    let setarea =""
    let setcity =""
  
    let {name, email, password, phone, birthday,area,city,address,userphoto} = req.body;

  

    if(area==='選擇縣市'||city==="選擇區域"){
    const nochangearea = "SELECT `area`,`city` FROM `member` WHERE sid=?";
    const [nochangeareaResult] = await db.query(nochangearea, [sid]);
    setarea = nochangeareaResult[0].area
    console.log(setarea+'1')

    setcity= nochangeareaResult[0].city
    console.log(setcity+'1')

    }else{    
      setarea=area
      setcity=city
  console.log(setarea+'2')
  console.log(setcity+'2')}


    if(req.file && req.file.filename){
      userphoto = req.file.filename
   }

   //處理password成雜臭
   let hash = '';
   if(password!==''){
    hash = await bcrypt.hash(password, 10);
   }

 
    console.log(hash)

     // 檢查表單中的 email 是否已經存在於資料庫中  `sid` != ? 表示“不等於” 當gmail重新輸入一樣時，當前的sid也不會被檢查到跳重複gmail訊息
  const checkEmailSql = 'SELECT * FROM `member` WHERE `email` = ? AND `sid` != ?';
  const [emailResult] = await db.query(checkEmailSql, [email, sid]);
 
  if (emailResult.length) {
    return res.json({
      success: false,
      error: '該email已經被註冊 更新失敗',
    });
  }
     
    

    // TODO: 檢查表單各欄位的資料
  
    if(! moment(birthday).isValid()){
      birthday = null;
    } else {
      birthday = moment(birthday).format('YYYY-MM-DD');
    } 
 
    
    if(password!==''){
    const sql = "UPDATE `member` SET `name`=?, `email`=?,`password`=?,`phone`=?,`birthday`=?,`area`=?,`city`=?, `address`=?,`userphoto`=? WHERE `sid`=? ";
  
    const [result] = await db.query(sql, [name, email, hash, phone, birthday,setarea,setcity,address,userphoto,sid]);
  
    res.json({
      success: !! result.changedRows,
      formData: req.body,
      result:result
    })}
    else{
      const sql = "UPDATE `member` SET `name`=?, `email`=?,`phone`=?,`birthday`=?,`area`=?,`city`=?, `address`=?,`userphoto`=? WHERE `sid`=? ";
      const [result] = await db.query(sql, [name, email, phone, birthday,setarea,setcity,address,userphoto,sid]);
      if(!! result.changedRows){res.json({
        success: !! result.changedRows,
        formData: req.body,
        result:result
      })}else{res.json({
        success: !! result.changedRows,
        formData: req.body,
        error:'資料未被變更'
      })}
      }
    }
  );




//新增會員
 router.post("/register", upload.none(),async (req, res) => {

  console.log('register被拜訪')
 
  let {name, email, password, phone, birthday,area,city,address,userphoto} = req.body;
  
    // TODO: 檢查表單各欄位的資料


    // 判斷email是否已經存在
    const sqlCheckEmail = "SELECT * FROM `member` WHERE `member`.`email`=?";
     const [rows] = await db.query(sqlCheckEmail, [email]);
     console.log('email已經被註冊過了',rows)

     if (rows.length > 0) {
    // 如果已經存在，返回錯誤信息
      return res.json({
        success: false,
        error:'email已經被註冊過了'
    });
    }

     //處理password成雜臭
     const hash = await bcrypt.hash(password, 10);
     console.log(hash)

    // 處理生日的時間格式
    if(! moment(birthday).isValid()){
      birthday = '';
    } else {
      birthday = moment(birthday).format('YYYY-MM-DD');
    }
  
    const sql = "INSERT INTO `member`( `name`, `email`, `password`, `phone`, `birthday`, `area`, `city`, `address`, `userphoto`, `creat_time`) VALUES (?,?,?,?,?,?,?,?,?,NOW())";

    const [result] = await db.query(sql, [name, email, hash, phone, birthday,area,city,address,userphoto]);
   console.log(result)
  
    res.json({
      success: !! result.affectedRows,
      postData: req.body,
      result,
      token:hash
    });
  });

//新增會員領取新進的95折優惠券
router.get("/insertCoupon/:sid/:couponid", async (req, res) => {


  //檢查優惠券重複領用
const checkCouponExist = async (memberId, codemanage_sid) => {
  if (!memberId) return true;
  if (!codemanage_sid) return true;
  const [rows] = await db.query(`SELECT * FROM coupon_report WHERE menber_sid=${memberId} AND codemanage_sid=${codemanage_sid}`);
  return rows.length > 0;
};
    
   // 優惠券已領用過
  let isCouponExist = await checkCouponExist(req.params.sid, req.params.couponid);
  if (isCouponExist) {
    return res.json({ success: false, error: "優惠券已領用" });
  }

  const sql = "INSERT INTO coupon_report( menber_sid, codemanage_sid) VALUES (?,?)";
  const [result] = await db.query(sql, [req.params.sid, req.params.couponid]);

  res.json({
    success: !! result.affectedRows,
    postData: req.body,
    result
  });
})






//會員coupon
router.get("/coupon/:sid",async (req, res) => {
   const totalMount = "SELECT `product_order`.`amount` FROM `product_order` WHERE`product_order`.`m_id`=?"

    const [totalMountrows] = await db.query(totalMount, [req.params.sid]);
    console.log('totalMountrows',totalMountrows)
    const MountArray = totalMountrows.map((v,i)=>{return v.amount})
    console.log('MountArray',MountArray)
    const sum = MountArray.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
    console.log('sum',sum); // 結果為 該會員的訂單總額
    let member_level =0
    if(sum<1000){member_level =1}else if(sum<2000){member_level =2}else{member_level =3}
    const copondata = "SELECT `coupon_codemanage`.`title`,`coupon_codemanage`.`end_date`,`coupon_codemanage`.`status` FROM `coupon_report` LEFT JOIN `coupon_codemanage` ON `coupon_report`.`codemanage_sid` = `coupon_codemanage`.`sid` WHERE `coupon_codemanage`.`status`=1 AND `coupon_report`.`menber_sid`=?"
    const [MemberCoupon] = await db.query(copondata, [req.params.sid]);
//測試
    //const endtime = moment(MemberCoupon[0].end_date).format('YYYY-MM-DD')
    //moment(v["created_at"]).format('YYYY-MM-DD HH:mm ZZ')
    // 取得今天日期
    const today = new Date();
    console.log('today',today)

   
 
    const addexpireCoupon = MemberCoupon.map((v,i)=>{
      let endtime = moment(v.end_date).format('YYYY-MM-DD')
      console.log('endtime',endtime)
      let endtimesec = new Date(endtime);
      console.log('endtimesec',endtimesec)

      
      
      let diffTime = endtimesec.getTime() - today.getTime(); // 取得相差的時間戳記（毫秒）
      let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // 將毫秒轉換為天數，並向上取整
      console.log('diffDays',diffDays)
      //expire_soon 1=>已過期 2=>快過期 3=>還有3天以上
      if(diffDays<0){
        return {...v,expire_soon:'已過期',expirecolor:"text-danger"}
      }else if(diffDays>3) {return {...v,expire_soon:'已取得',expirecolor:"text-success"}}else{
        return {...v,expire_soon:'快過期',expirecolor:"text-warning"}
      }
    })
    console.log('addexpireCoupon',addexpireCoupon)
    const data = {data:addexpireCoupon,member_level:member_level}
    console.log(data)
    
    res.json(data)

  });


//要取會員收藏-我的最愛
router.get("/mystore/:sid",async (req, res) => {

  const mystore = "SELECT `member_collection`.`member`,`member_collection`.`productmanage`,`productmanage`.`product_id`,`productmanage`.`product_ch`,`productmanage`.`product_eg`,`productmanage`.`productprice`,`productmanage`.`product_img` FROM `member_collection` LEFT JOIN `productmanage` ON `member_collection`.`productmanage`= `productmanage`. `product_id` WHERE `member_collection`.`member`=?"
  const [mystoreData] = await db.query(mystore, [req.params.sid]);
  console.log('mystoreData',mystoreData)
 
  const deletewebp = mystoreData.map((v,i)=>{return {...v,product_img:v.product_img.slice(0, -5)}})
  console.log('deletewebp',deletewebp)

  res.json(deletewebp)

   

})
//會員收藏-刪除該品項我的最愛
router.get("/mystoredelete/:sid/:productId",async (req, res) => {
  const mystore = "SELECT * FROM `member_collection` WHERE `member_collection`.`member`=? AND `member_collection`.`productmanage`=?"
  const [mystoredelete] = await db.query(mystore, [req.params.sid,req.params.productId]);
 
  console.log('mystoredelete[0].productmanage',mystoredelete[0].productmanage)
  const deleteItem = mystoredelete[0].productmanage
  

  const deletingmystore = "DELETE FROM `member_collection` WHERE `member_collection`.`member`=? AND `member_collection`.`productmanage`=?"
  const [deleting] = await db.query(deletingmystore, [req.params.sid,deleteItem]);

  res.json(deleting)


 
})  

//會員加到 我的購物車
router.post("/addstoretocart/:sid",async (req, res) => {
 
  console.log('req.body',req.body)
  let {member,product_img, product_ch,product_eg,product_id,productprice} = req.body;
  console.log('product_eg',product_eg)

  const imgpluswebp = product_img +'.webp'
  const searchsql = "SELECT * FROM `cart_details` WHERE `cart_details`.`m_id`=? AND `cart_details`.`product_id`=?"
  const [searchrows] = await db.query(searchsql, [member,product_id]);
  console.log('searchrows',searchrows)
  if(searchrows.length===0){
      //加到購物車  
      const sql = "INSERT INTO `cart_details`(`m_id`, `product_img`, `product_ch`, `product_eg`, `product_id`, `price`, `quantity`, `created_at`) VALUES (?,?,?,?,?,?,?,NOW())";
      const [result] = await db.query(sql, [member, imgpluswebp, product_ch, product_eg, product_id,productprice,1]);
      console.log(result) 
      //同時刪掉該項的收藏
      //  const deletingmystore = "DELETE FROM `member_collection` WHERE `member_collection`.`member`=? AND `member_collection`.`productmanage`=?"
      //  const [deleting] = await db.query(deletingmystore, [member,product_id]);
    
      //  console.log(deleting)
      
      res.json(result)

  }else{ 
     const {quantity}=searchrows[0]
     console.log("quantity",quantity)
     const quantityplus1 =quantity+1
     const now = new Date();
     const sql = "UPDATE `cart_details` SET `product_img`=?,`product_ch`=?,`product_eg`=?,`price`=?,`quantity`=?,`created_at`=? WHERE `cart_details`.`m_id`=? AND `cart_details`.`product_id`=?";
     const [result] = await db.query(sql, [ imgpluswebp, product_ch, product_eg, productprice, quantityplus1, now, member, product_id]);
     console.log(result)
      //同時刪掉該項的收藏
      // const deletingmystore = "DELETE FROM `member_collection` WHERE `member_collection`.`member`=? AND `member_collection`.`productmanage`=?"
      // const [deleting] = await db.query(deletingmystore, [member,product_id]);
   
      // console.log(deleting) 
     
     res.json(result)


  
  }
 
  
})


  
//會員登入
router.post('/login', upload.none() ,async (req, res) => {
    const output = {
      success: false,
      error: '帳號或密碼錯誤 !!!',
      code: 0,
      postData: req.body,
      token:""
    };
    console.log(output)
  
    const sql = "SELECT * FROM member WHERE email=?";
  console.log(req.body.email)
    const [rows] = await db.query(sql, [req.body.email]);
    console.log(rows[0])
    if(! rows.length){
      // 帳號是錯的
      output.code = 401;
     
  
      return res.json(output);
    }
  
    let passwordCorrect = false //預設密碼是錯的
    try {
    passwordCorrect = await bcrypt.compare(req.body.password, rows[0].password)
     } catch (error) {}
   
  
    if(!passwordCorrect ){
      // 密碼是錯的
      output.code = 402;
 

    } else {
      output.success = true;
      output.code = 200;
      output.error = '';
  
 
      //output.token的token是output中新增的屬性
      output.token = jwt.sign({
        sid: rows[0].sid,
        gmail: rows[0].gmail,},
        process.env.JWT_SECRET);
        output.accountId = rows[0].sid;
        output.useremail = rows[0].email;
  
    }
    res.json(output);
  });

//會員gmail登入
router.post('/gmaillogin',upload.none() ,async (req, res) => {
  const output = {
    success: false,
    error: '此Gmail帳號還未註冊!!!',
    code: 0,
    postData: req.body,
    token:""
  };
  const sql = "SELECT * FROM member WHERE email=?";
  console.log(req.body.email)
  const [rows] = await db.query(sql, [req.body.email]);
    console.log(rows[0])
    if(! rows.length){
      // 帳號是錯的
      output.code = 401;
      return res.json(output);
    }else{
      output.success = true;
      output.code = 200;
      output.error = '';
      output.token = jwt.sign({
        sid: rows[0].sid,
        gmail: rows[0].gmail,},
        process.env.JWT_SECRET);
        output.accountId = rows[0].sid;
        output.useremail = rows[0].email;
    }
    res.json(output);

})




//會員訂位
router.get('/bookingseat/:sid',async(req,res)=>{
  const sql = "SELECT `seat_all`.`sid`,`seat_all`.`member_sid`,`seat_all`.`name`,`seat_all`.`phone`,`seat_all`.`reserveDate`,`seat_all`.`people`,`seat_all`.`created_at`,`seat_period`.`period`,`seat_table`.`category`,`seat_table`.`table_num`,`seat_status`.`status` FROM seat_all LEFT JOIN seat_period ON seat_all.`period-sid` = seat_period.sid LEFT JOIN `seat_status` ON seat_all.`status_sid`=`seat_status`.sid LEFT JOIN seat_table ON seat_all.table_sid = seat_table.sid WHERE member_sid=?";
  const [rows] = await db.query(sql, [req.params.sid]);
  console.log("rows",rows)
  const data =rows.map((v,i)=>{  return {...v,period_sid:v["period-sid"]}})
  console.log('data',data)

  res.json({
    data,
 
  });

})

//會員訂位取消 deleteseating
router.get('/deleteseating/:sid/:listnum',async(req,res)=>{ 
 
  const sql = 'SELECT * FROM `seat_all` WHERE `seat_all`.member_sid=? AND `seat_all`.sid=?'
  const [rows] = await db.query(sql, [req.params.sid,req.params.listnum]);
  const changrStatusdata = rows.map((v,i)=>{return v.sid})
  console.log("changrStatusdata",changrStatusdata)
  console.log(rows)
  const status = rows.map((v,i)=>{return {...v,["status_sid"]:3,period_sid:v['period-sid']}})
  const statuschange =status[0]
  console.log('statuschange',statuschange)
 //準備上傳的listnum後把後台的status改成取消訂單
  const changestatussql = " UPDATE `seat_all` SET `member_sid`=?, `name`=?, `phone`=?, `reserveDate`=?, `period-sid`=?, `table_sid`=?, `people`=?, `status_sid`=?, `created_at`=? WHERE `sid`=?"
 const [deleteseating] = await db.query(changestatussql, [req.params.sid,statuschange.name,statuschange.phone,statuschange.reserveDate,statuschange.period_sid,statuschange.table_sid,statuschange.people,statuschange.status_sid,statuschange.created_at,req.params.listnum]);
 console.log('deleteseating',deleteseating)
 res.json(deleteseating);
 

})


//會員歷史訂單
router.get('/orderlist/:sid',async(req,res)=>{
   const sql = "SELECT `product_order`.*, `product_order_details`.`products_order_sid`,`product_order_details`.`product_id`,`product_order_details`.`price`,`productmanage`.`product_ch`,`productmanage`.`product_img` FROM `product_order` LEFT JOIN `product_order_details` ON `product_order`.`sid` = `product_order_details`.`products_order_sid` LEFT JOIN `productmanage` ON `product_order_details`.`product_id` = `productmanage`.`product_id` WHERE `product_order`.`m_id`=?"
   const [rows] = await db.query(sql, [req.params.sid]);
   //如果是rows[0]只能拿到第1筆
   console.log(rows)
   //先把陣列中每個物件資料的訂單時間轉成'YYYY-MM-DD'
   const changedTime = rows.map((v,i)=>{return {...v,"created_at":moment(v["created_at"]).format('YYYY-MM-DD HH:mm ZZ')}})
   res.json(changedTime)

})
//會員歷史訂單總比數
router.get('/orderlistTotal/:sid',async(req,res)=>{
  const sql = "SELECT * FROM `product_order` WHERE `m_id` = ?"
  const [rows] = await db.query(sql, [req.params.sid]);
  console.log(rows);
  const totalorderlist=rows.map((v,i)=>{return {'sid':v.sid,'orderId':v.orderId,'created_at':moment(v.created_at).format('YYYY-MM-DD HH:mm ZZ')}});
  res.json(totalorderlist)



})
//會員該訂單細項
router.get('/listTproduct/:sid/:orderId',async(req,res)=>{
  const sql = "SELECT `product_order`.*, `product_order_details`.`products_order_sid`,`product_order_details`.`quantity`,`product_order_details`.`product_id`,`product_order_details`.`price`,`productmanage`.`product_ch`,`productmanage`.`product_img` FROM `product_order` LEFT JOIN `product_order_details` ON `product_order`.`sid` = `product_order_details`.`products_order_sid` LEFT JOIN `productmanage` ON `product_order_details`.`product_id` = `productmanage`.`product_id` WHERE `product_order`.`m_id`=? AND `product_order`.`orderId`=?"
  const [rows] = await db.query(sql, [req.params.sid,req.params.orderId]);
  console.log(rows);
  const data = rows.map((v,i)=>{return {...v,'product_img':v.product_img.slice(0, -5)}})
  console.log('data',data)
  
  res.json(data)



})
 

//會員課程訂單紀錄
router.get('/classlist/:sid',async(req,res)=>{
  const sql = "SELECT `class_order`.`orderId`,`class_order`.`m_id`,`class_order`.`amount`,`class_order`.`created_at`,`classform`.`Bartender`,`classform`.`class_time`,`classform`.`class_date`,`classform`.`class_prople` FROM `class_order` LEFT JOIN `classform` ON `class_order`.`class_form_sid` = `classform`.`sid` WHERE `class_order`.`m_id` = ?"
  const [rows] = await db.query(sql, [req.params.sid]);
  console.log('rows',rows)
  res.json(rows)

})





module.exports = router;

