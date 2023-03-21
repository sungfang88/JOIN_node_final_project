const express = require("express");
const db = require("./../modules/db_connect2");
// const db = require('./modules/db_connectmain');

const router = express.Router();

router.get("/getList", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM `news`");
  res.json({rows});
})

router.get("/getDetail/:itemId", async (req, res) => {
  const sql = "SELECT `itemId`, `title`, `date`, `content`, `btnUrl`, `state`, `btnText`, `imgSrc`, `cate` FROM `news` WHERE itemId=? " 
  const [rows] = await db.query(sql, [req.params.itemId]);
  //console.log(rows)
  res.json(rows[0]);
})


  module.exports = router;
