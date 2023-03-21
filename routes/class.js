const express = require("express");
// const db = require('./modules/db_connectmain');
const db = require('../modules/db_connect2');


const router = express.Router();

router.get("/classname", async (req, res) => {
     const sql = "SELECT * FROM `classname` WHERE 1 ";
  
    const [rows] = await db.query(sql);
    console.log('rows',rows)
  
      res.json(rows);
    }
  
);


// router.get("/classname/", async (req, res) => {
//   const sql = "SELECT * FROM `classname` INNER JOIN `classwine` on `classname`.`wine1`= `classwine`.`wine_name` WHERE `classname`.sid=1 ";

//  const [rows] = await db.query(sql);
//  console.log('rows',rows)

//    res.json(rows);
//  }

// );
router.get("/classwine", async (req, res) => {
  const sql = "SELECT `sid`, `wine_name` FROM `classwine` WHERE 1";

 const [rows] = await db.query(sql);

   res.json(rows);
 }

);

router.get("/bartender", async (req, res) => {
    const sql = "SELECT * FROM `bartender` WHERE 1";
 
   const [rows] = await db.query(sql);
 
     res.json(rows);
   }
 
);

router.get("/classtime", async (req, res) => {
    const sql = "SELECT * FROM `classtime` WHERE 1";
 
    const [rows] = await db.query(sql);
 
     res.json(rows);
   }
 
);

router.get("/classform", async (req, res) => {
    const sql = "SELECT * FROM `classform` WHERE 1";
 
   const [rows] = await db.query(sql,[req.params.sid]);
 
     res.json(rows);
   }
 
);



router.post("/classform", async (req, res) => {
  try {
  
    //建立新訂單給資料庫
    const { class_id, bartender, class_date, class_time, class_prople,p1,s1,wine1,wine2 } = req.body;
    const classformSql = "INSERT INTO `classform`(`class_id`, `Bartender`, `class_date`, `class_time`, `class_prople`) VALUES (?,?,?,?,?)";
    const [classformRows] = await db.query(classformSql, [ class_id, bartender, class_date, class_time, class_prople]);

    const classformsid = classformRows.insertId;
    const class_propleSql = "INSERT INTO `classbooking`(`classformsid`, `	student`, `phone`) VALUES (?,?,?)";

    const [result] = await db.query(class_propleSql , [classformsid, 	student, phone]);

    res.json({classformsid});

  } catch (error) {
    console.log(error);

  }
});

router.get("/classbooking", async (req, res) => {
    const sql = "SELECT * FROM `classbooking` WHERE 1";
 
   const [rows] = await db.query(sql,[req.params.sid]);
 
     res.json(rows);
   }
 
);


// router.post("/classbooking", async (req, res) => {
//   const sql = "SELECT * FROM `classbooking` WHERE 1";

//  const [rows] = await db.query(sql,[req.params.sid]);

//    res.json(rows);
//  }

// );



//開始自己的路由
module.exports = router;
