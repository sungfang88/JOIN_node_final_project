const express = require("express");
const moment = require("moment-timezone");
// const db = require("./../modules/db_connectmain");
const db = require("./../modules/db_connect2");
const upload = require("./../modules/upload-imgs");

const router = express.Router();
//開始自己的路由

//! 首頁最新消息資料
router.get("/news",async(req,res)=>{
  const sql="SELECT * FROM `news` ORDER BY `date` DESC LIMIT 3"
  const [result] = await db.query(sql, [req.params.sid]);
  res.json(result);
})

router.get("/", (req, res) => {
  res.send("hi");
});

//訂位資格
//Todo 超過兩筆要幹嘛
router.get('/black/:member_sid',async(req,res)=>{
  const{member_sid}=req.query
  const sql = "SELECT COUNT(`status_sid`=4) FROM `seat_all` WHERE `member_sid` = ?"
  const [result] = await db.query(sql, [req.params.member_sid]);
  const count = result[0]['COUNT(`status_sid`=4)'];
  res.json({ count });
})

//新增
router.post("/seat_add", async (req, res) => {
  let { member_sid,name, phone, reserveDate, period_sid, table_sid, people, created_at } =
    req.body;
  const status_sid = 1;
  const sql =
    "INSERT INTO `seat_all`(`member_sid`,`name`, `phone`, `reserveDate`, `period-sid`, `table_sid`, `people`, `status_sid`, `created_at`) VALUES (?,?,?,?,?,?,?,1,NOW())";
  // 檢查 `reserveDate` 是否有效，如果無效，報告錯誤
  if (!moment(reserveDate).isValid()) {
    return res.status(400).json({ message: "Invalid date format" });
  }
  const [result] = await db.query(sql, [
    member_sid,
    name,
    phone,
    reserveDate,
    period_sid,
    table_sid,
    people,
    status_sid,
    created_at,
  ]);
  res.json({
    success: !!result.affectedRows,
    postData: req.body,
    result,
  });
});

//刪除
router.delete("/seat_all/:sid", async (req, res) => {
  //req.params.sid
  const sid = req.params.sid;
  const sql = "DELETE FROM seat_all WHERE sid=?";
  const [result] = await db.query(sql, [req.params.sid]);
  res.send("訂位已取消");
});

//查詢
router.get("/search", async (req, res) => {
  const { reserveDate, period, people } = req.query;
  console.log(req.query);

  let whereClause = "WHERE ";
  let params = [];
  if (reserveDate) {
    whereClause += "reserveDate = ? AND ";
    params.push(reserveDate);
  }
  if (period) {
    whereClause += "`period-sid` = ? ";
    params.push(period);
  }

  const query1 = async () => {
    const bar_sql = `SELECT SUM(people) AS sum1 FROM seat_all ${whereClause}AND (table_sid = 1)`;
    const results = await db.query(bar_sql, params);
    // console.log(results)
    const sum1 = parseInt(results[0][0].sum1 ?? 0);
    console.log(sum1)
    let result;
    let people_num = parseInt(people)
    if (sum1 + people_num > 12) {
      result = "座位已滿";
    } else {
      result = `${12 - sum1}席`;
    }
    // console.log(result);
    return result;
  };

  const query2 = async () => {
    const desk_sql = `SELECT SUM(CEIL(people/people_contain)) AS sum2 FROM seat_all JOIN seat_table ON seat_all.table_sid = seat_table.sid ${whereClause}AND (table_sid = 2)`;
    
    const results = await db.query(desk_sql, params);
    // console.log(params)
    const sum2 = parseInt(results[0][0].sum2 ?? 0);
    console.log(sum2)
    let result;
    if (sum2 + Math.ceil(people / 5) > 12) {
      result = "座位已滿";
    } else {
      result = `${12 - sum2}桌`;
    }
    // res.send(sum1)
    // console.log(result);
    return result;
  };

  const query3 = async () => {
    const room_sql = `SELECT COUNT(*) AS sum3 FROM seat_all ${whereClause}AND (table_sid = 3)`;
    const results = await db.query(room_sql, params);
    const sum3 = parseInt(results[0][0].sum3);
    let result;
    if (people > 14) {
      result = "包廂不可超過14人";
    } else if (sum3 + 1 > 2) {
      result = "包廂已滿";
    } else {
      result = `${2 - sum3}個`;
    }
    // res.send(sum1)
    // console.log(result);
    return result;
  };

  
  try {
    const [result1, result2, result3] = await Promise.all([
      query1(),
      query2(),
      query3(),
    ]);
    // console.log(result1)
    // console.log(result2)
    // console.log(result3)
    res.send({ bar: result1, desk: result2, room: result3 });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

//驗證
router.get("/check",async(req,res)=>{
  const { reserveDate, period, people,table } = req.query;
  console.log(req.query);
  let whereClause = "WHERE ";
  let params = [];
  if (reserveDate) {
    whereClause += "reserveDate = ? AND ";
    params.push(reserveDate);
  }
  if (period) {
    whereClause += "`period-sid` = ? ";
    params.push(period);
  }
  let result;
  if(table == '1'){
    const sql = `SELECT SUM(people) AS sum1 FROM seat_all ${whereClause}AND (table_sid = 1)`
    console.log(sql);
    const results = await db.query(sql, params);
    const sum1 = parseInt(results[0][0].sum1??0);
    console.log(sum1)
    let people_num = parseInt(people)
    if (sum1 + people_num > 12) {result = "該時段的吧台已滿，建議回上一頁查詢好剩餘桌數再來訂位喔！"}else{result ="ok"}
    console.log(result)
    res.send(result) ;
  }else if(table == '2'){
    const sql = `SELECT SUM(CEIL(people/people_contain)) AS sum2 FROM seat_all JOIN seat_table ON seat_all.table_sid = seat_table.sid ${whereClause}AND (table_sid = 2)`
    const results = await db.query(sql, params);
    const sum2 = parseInt(results[0][0].sum2 ?? 0);
    console.log(sum2)
    if (sum2 + Math.ceil(people / 5) > 12) {
      result = "該時段的方桌已滿，建議回上一頁查詢好剩餘桌數再來訂位喔！";
    } else {
      result = "ok";
    }
    // res.send(sum1)
    console.log(result);
    res.send(result)
  }else if(table == '3'){
    const sql = `SELECT COUNT(*) AS sum3 FROM seat_all ${whereClause}AND (table_sid = 3)`
    const results = await db.query(sql, params);
    const sum3 = parseInt(results[0][0].sum3);
    
    if (people > 14) {
      result = "包廂不可超過14人";
    } else if (sum3 + 1 > 2) {
      result = "該時段包廂已滿，建議回上一頁查詢好剩餘桌數再來訂位喔！";
    } else {
      result = "ok";
    }
    // res.send(sum1)
    console.log(result);
    res.send(result)
  }
})

//菜單
router.get("/menu/:category",async(req,res)=>{
  const sql = "SELECT * FROM `seat_menu` LEFT JOIN `product_catagory` ON `seat_menu`.`category_id` = product_catagory.catagory_id WHERE `seat_menu`.`category_id` = ?"
  const [result] = await db.query(sql, [req.params.category]);
  // console.log(result)
  res.json(result);
})

//抓會員資料
router.get("/seat_all/:sid", async (req, res) => {
  const sid = req.params.sid;
  // const sql = "SELECT DISTINCT member.name, member.phone,member.sid FROM `seat_all` JOIN member ON seat_all.member_sid = member.sid WHERE member_sid=?";
  const sql = "SELECT DISTINCT name, phone,sid FROM `member` WHERE sid=?"
  
  const [result] = await db.query(sql, [req.params.sid]);
  // console.log(result)
  res.json(result);
});

//confirm 明細
router.get("/confirm/:sid", async (req, res) => {
  const sql = "SELECT seat_all.name,seat_all.reserveDate,seat_all.people,seat_all.phone,seat_table.category,seat_period.period FROM seat_all LEFT JOIN seat_table ON seat_all.table_sid = seat_table.sid LEFT JOIN seat_period ON seat_all.`period-sid` = seat_period.sid WHERE seat_all.sid = ?";
  // const sql = "SELECT `sid`, `member_sid`, `name`, `phone`, `reserveDate`, `period-sid`, `table_sid`, `people`, `status_sid`, `created_at` FROM `seat_all`"
  const [result] = await db.query(sql, [req.params.sid]);
  // console.log(result)、
  res.json(result);
});

//把req,res分開
router.get("/seat_all", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM seat_all");
  res.json(rows);
});



router.get("/seat_period", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM seat_period");
  res.json(rows);
});
router.get("/seat_status", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM seat_status");
  res.json(rows);
});
router.get("/seat_table", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM seat_table");
  res.json(rows);
});

module.exports = router;
