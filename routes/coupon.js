const express = require("express");
const db = require("../modules/db_connect2");
// const db = require('../modules/db_connectmain');

const router = express.Router();

//檢查會員是否存在
const checkMemberExist = async (memberId) => {
  if (!memberId) {
    return false;
  }

  const [rows] = await db.query("SELECT * FROM member WHERE sid = ?", [
    memberId,
  ]);
  return rows.length > 0;
};

//檢查優惠券重複領用
const checkCouponExist = async (memberId, codemanageSid) => {
  if (!memberId || !codemanageSid) {
    return true;
  }
  const [rows] = await db.query(
    `SELECT * FROM coupon_report WHERE menber_sid = ? AND codemanage_sid = ?`,
    [memberId, codemanageSid]
  );
  return rows.length > 0;
};

//取得會員優惠券
const getMemberCoupon = async (memberId, itemId) => {
  if (!memberId || !itemId) {
    return null;
  }

  const [rows] = await db.query(
    `SELECT * FROM coupon_report WHERE menber_sid=${memberId} AND sid=${itemId}`
  );

  return rows.length ? rows[0] : null;
};

const getCouponCodemanageByid = async (codemanageId) => {
  if (!codemanageId) return false;
  const [rows] = await db.query(
    `SELECT * FROM coupon_codemanage WHERE sid=${codemanageId}`
  );
  return rows;
};

const getLastCheckin = async (memberId) => {
  if (!memberId) {
    return true;
  }
  const [rows] = await db.query(
    `SELECT * FROM coupon_checkin WHERE menber_sid=${memberId} ORDER BY ID DESC LIMIT 1`
  );
  if (rows.length > 0) {
    return rows[0];
  } else {
    return false;
  }
};

const getCheckinRecords = async (memberId) => {
  const sql =
    " SELECT `id`, `menber_sid`, `date`, `period`, `codemanage_sid` FROM `coupon_checkin` WHERE menber_sid=? ";
  const [rows] = await db.query(sql, [memberId]);
  return rows;
};

const createNewReportRecord = async (memberId, couponId) => {
  const sql =
    "INSERT INTO coupon_report( menber_sid, codemanage_sid) VALUES (?,?)";
  const [result] = await db.query(sql, [memberId, couponId]);
  return result;
};

const returnSuccess = (res, props) => {
  return res.json({
    success: true,
    ...props,
  });
};
const returnFail = (res, errorStr) => {
  return res.json({
    success: false,
    error: errorStr,
  });
};

//領取優惠券 insertCoupon
router.post("/insertCoupon", async (req, res) => {
  const { memberId, couponId } = req.body;
  // 優惠券已領用過
  const isMemberExist = await checkMemberExist(memberId);
  if (!isMemberExist) {
    return res.json({ success: false, error: "會員不存在" });
  }
  const couponExists = await checkCouponExist(memberId, couponId);
  if (couponExists) {
    return res.json({ success: false, error: "優惠券已領用" });
  }

  const insertCouponResult = await createNewReportRecord(memberId, couponId);
  console.log(insertCouponResult);

  // Return the result of the coupon creation operation
  res.json({
    success: !!insertCouponResult.affectedRows,
    data: insertCouponResult,
  });
});

//使用優惠券 applyCoupon
router.post("/applyCoupon", async (req, res) => {
  const { memberId, itemId, orderId } = req.body;
  const isMemberExist = await checkMemberExist(memberId);
  if (!isMemberExist) {
    return res.json({ success: false, error: "會員不存在" });
  }
  const coupon = await getMemberCoupon(memberId, itemId);
  //確認有券存在
  if (!coupon || !coupon.sid) {
    return res.json({ success: false, error: "優惠券不存在" });
  }
  //確認券使用
  if (coupon.order_sid !== null) {
    return res.json({ success: false, error: "優惠券已使用" });
  }

  const sql =
    "UPDATE `coupon_report` SET `order_sid`=?, `apply_at`= NOW() WHERE menber_sid=? AND sid=?";
  const [result] = await db.query(sql, [orderId, memberId, itemId]);

  res.json({
    success: !!result.affectedRows,
    postData: req.body,
    result,
  });
});

//全站優惠券
router.get("/getCoupon", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM `coupon_codemanage`");
  res.json({ rows });
});

router.get("/getCouponWithMember", async (req, res) => {
  let sql = "SELECT * FROM `coupon_codemanage`";
  if (req.query?.memId) {
    const memberId = req.query?.memId;
    const isMemberExist = await checkMemberExist(memberId);
    if (!isMemberExist) {
      return res.json({ success: false, error: "會員不存在" });
    }
    sql = `
    SELECT distinct coupon_codemanage.*, coupon_report.menber_sid 
    FROM coupon_codemanage
    left join coupon_report on coupon_codemanage.sid = coupon_report.codemanage_sid
    where coupon_report.menber_sid is null or coupon_report.menber_sid = ${memberId}
    `;
  }
  const [rows] = await db.query(sql);
  res.json({ rows });
});

//轉盤優惠券
const WHEEL_COUPON_ARRAY = [2, 3, 4, 5, 15];
const checkWheelByDate = async (memId, date) => {
  const sql = `
    SELECT * 
    FROM coupon_report 
    WHERE menber_sid=? AND codemanage_sid in (?) and date_format(create_at, '%Y-%m-%d')=?
  `;
  const [rows] = await db.query(sql, [memId, WHEEL_COUPON_ARRAY, date]);
  return rows.length > 0;
};

router.post("/getWheelRecords", async (req, res) => {
  const { memberId } = req.body;
  try {
    let isMemberExist = await checkMemberExist(memberId);
    if (!isMemberExist) {
      throw "會員不存在";
    }

    const sql = `
    SELECT coupon_report.sid itemid, coupon_report.create_at, 
    coupon_codemanage.code, coupon_codemanage.title, coupon_codemanage.description
    FROM coupon_report 
    JOIN coupon_codemanage ON coupon_report.codemanage_sid = coupon_codemanage.sid
    WHERE menber_sid=? AND codemanage_sid in (?)
    ORDER BY coupon_report.sid DESC LIMIT 3
  `;
    const [rows] = await db.query(sql, [memberId, WHEEL_COUPON_ARRAY]);
    returnSuccess(res, { rows });
  } catch (error) {
    console.log(error);
    returnFail(res, error);
  }
});

//轉盤領用processWheel
router.post("/processWheel", async (req, res) => {
  const { memberId, couponId } = req.body;
  try {
    let isMemberExist = await checkMemberExist(memberId);
    if (!isMemberExist) {
      throw "會員不存在";
    }
    const current_date = new Date();
    let current_date_str = new Intl.DateTimeFormat("fr-ca").format(new Date());
    let isChecked = await checkWheelByDate(memberId, current_date_str);
    if (isChecked) {
      throw "今日已領取";
    }

    if (couponId === "A") {
      return returnSuccess(res, {});
    }

    if (!WHEEL_COUPON_ARRAY.includes(couponId)) {
      throw "couponid not found";
    }

    let insertCouponResult = await createNewReportRecord(memberId, couponId);
    if (!insertCouponResult.affectedRows) {
      throw "領取失敗";
    }

    // Return success response
    returnSuccess(res, {});
  } catch (error) {
    console.log(error);
    returnFail(res, error);
  }
});

//拿到簽到表
router.get("/getCheckinRecords/:memberId", async (req, res) => {
  const { memberId } = req.params;

  const isMemberExist = await checkMemberExist(memberId);
  if (!isMemberExist) {
    return returnFail(res, "會員不存在");
  }
  const records = await getCheckinRecords(memberId);
  res.json({
    success: true,
    count: records.length,
    records,
  });
});

//簽到
router.post("/doCheckin", async (req, res) => {
  const { memberId, couponId } = req.body;

  // Check if member exists
  const isMemberExist = await checkMemberExist(memberId);
  if (!isMemberExist) {
    return res.json({ success: false, error: "會員不存在" });
  }

  // Check if member already checked in today
  const lastCheckin = await getLastCheckin(memberId);
  if (lastCheckin !== false) {
    const date1 = new Intl.DateTimeFormat("fr-ca").format(lastCheckin.date);
    const date2 = new Intl.DateTimeFormat("fr-ca").format(new Date());
    if (date1 === date2) {
      return returnFail(res, "今日已簽到");
    }
  }

  // Find coupon to assign to member
  const codeMapping = {
    "1D": 17,
    "4D": 18,
    "8D": 19,
    "12D": 20,
  };
  const checkinRecords = await getCheckinRecords(memberId);
  const k = `${checkinRecords.length + 1}D`;
  const codemanageSid = codeMapping.hasOwnProperty(k) ? codeMapping[k] : null;

  // Assign coupon to member if found
  let couponTitle = null;
  if (codemanageSid !== null) {
    const insertCouponResult = await createNewReportRecord(
      memberId,
      codemanageSid
    );
    if (insertCouponResult.affectedRows > 0) {
      const codemanageDetail = await getCouponCodemanageByid(codemanageSid);
      couponTitle = codemanageDetail[0]?.title;
    } else {
      return returnFail(res, "簽到失敗");
    }
  }

  // Save checkin record
  const sql =
    "INSERT INTO coupon_checkin(menber_sid, period, codemanage_sid) VALUES (?,?,?)";
  const [result] = await db.query(sql, [memberId, 1, codemanageSid]);
  if (result.affectedRows > 0) {
    return returnSuccess(res, {
      message: "簽到成功",
      gotCoupon: couponTitle !== null,
      couponTitle: couponTitle,
    });
  } else {
    return returnFail(res, "簽到失敗");
  }
});

router.post("/getMemberCoupon", async (req, res) => {
  const { body } = req;
  // member not found
  try {
    // member not found
    const memberId = body?.memberId;
    const type = body?.type;
    let isMemberExist = false;
    if (memberId) {
      isMemberExist = await checkMemberExist(memberId);
    }
    if (memberId && !isMemberExist) {
      return res.json({ success: false, error: "會員不存在" });
    }

    let _colscr = "cr.sid itemId, cr.menber_sid";
    let _colscc =
      ", cc.title couponTitle, cc.start_date, cc.end_date, cc.status, cc.description";
    let _colscr2 =
      ", cr2.name ruleName, cr2.type, cr2.category cate, cr2.threshold, cr2.discount_type ,cr2.discount, cr2.limitation ";
    let _table = "coupon_report cr";
    let _join = "join coupon_codemanage cc on cr.codemanage_sid = cc.sid ";
    _join += "join coupon_rulesetting cr2  on cc.rule_sid = cr2.sid ";
    let _where = "WHERE cc.status = 1 AND cr.order_sid is null";
    if (memberId) {
      _where += ` AND cr.menber_sid = ${memberId}`;
    }
    if (type) {
      _where += ` AND cr2.type = ${type}`;
    }
    let sqlStr = `SELECT ${_colscr.concat(
      _colscc,
      _colscr2
    )} FROM ${_table} ${_join} ${_where}`;

    const [rows] = await db.query(sqlStr);
    res.json({ success: true, rows });
  } catch (error) {
    console.error(error);
    res.json({ success: false, error: "查詢失敗" });
  }
  /*
    json
    {
        memberId:
        type:
    }
    參數: 
    memberId: (必填) 會員ＩＤ, 
    type: (選填) 優惠券類型 1 => '會員', 2 => '商品', 3 => '課程'
    回傳:
    itemId: coupon sid in coupon_report
    menber_sid: 會員ＩＤ
    couponTitle: 券面名稱
    start_date: 起始日
    end_date: 過期日
    ruleName: 規則名稱
    type: 優惠券類型 1=>'會員',2=>'商品',3=>'課程'
    cate: 類型子類別
    threshold: 可用總金額門檻
    discount_type: 1=>金额折扣, 2=>％數折扣
    discount: 折數 (假設值為20, 若discount_type = 1 為金額 20元, 2 則是％ 20%)
    limitation: 折抵上限
    status: 狀態 1=>正常, 2=>停用 3=>刪除
  */
});

//優惠券頁面
module.exports = router;
