const express = require("express");
const Base64 = require("crypto-js/enc-base64");
const { HmacSHA256 } = require("crypto-js");
const db = require("../modules/db_connect2");
// const db = require('../modules/db_connectmain');
const router = express.Router();
const axios = require("axios");
const { response } = require("express");
require("dotenv").config();
router.use(express.json());

//LINE環境變數
const {
	LINEPAY_CHANNEL_ID,
	LINEPAY_CHANNEL_SECRET_KEY,
	LINEPAY_VERSION,
	LINEPAY_SITE,
	LINEPAY_RETURN_HOST,
	LINEPAY_RETURN_CONFIRM_URL,
	LINEPAY_RETURN_CANCEL_URL,
} = process.env;

//取得勾選得值
router.get("/cartCheck/*", async (req, res) => {
	const ids = req.params[0].split("/"); // 將萬用字元以外的參數值轉成陣列
	const placeholders = ids.map(() => "?").join(","); // 產生與陣列長度相等的問號字串
	const sql = `SELECT * FROM cart_details WHERE sid IN (${placeholders})`;
	try {
		const [rows] = await db.query(sql, ids);
		res.json(rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Something went wrong" });
	}
});

// 取得特定會員的購物車資料
router.get("/getCart/:m_id", async (req, res) => {
	const sql = "SELECT * FROM cart_details WHERE m_id = ?";
	try {
		const [rows] = await db.query(sql, [req.params.m_id]);
		res.json(rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Something went wrong" });
	}
});

//刪除點擊到的購物車
router.delete("/cartDelete/:sid", async (req, res) => {
	const sql = "DELETE FROM cart_details WHERE sid = ?";
	const [result] = await db.query(sql, [req.params.sid]);
	res.json(result);
	console.log(req.params.sid);
});

//取得購物車m_id sid內容 更新購物車
router.put("/cartUpdate/:m_id/:sid", async (req, res) => {
	try {
		const { m_id, sid } = req.params;
		let cartData = req.body;
		if (!Array.isArray(cartData)) {
			cartData = [cartData]; // 組成陣列
		}
		const promises = cartData.map((item) => {
			const sql =
				"UPDATE cart_details SET quantity = ? WHERE sid = ? AND m_id = ?";
			return db.query(sql, [item.quantity, sid, m_id]);
		});
		await Promise.all(promises);
		res.json({ success: true });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// 取得特定會員的資料
router.get("/member/:sid", async (req, res) => {
	const sql = "SELECT * FROM member WHERE sid = ?";
	try {
		const [rows] = await db.query(sql, [req.params.sid]);
		res.json(rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Something went wrong" });
	}
});

//取得購物車m_id內容 更新購物車
router.post("/order/:m_id", async (req, res) => {
	try {
		//建立新訂單給資料庫
		const { amount, addressee, orderId, phone, address, payment } = req.body;
		const orderSql =
			"INSERT INTO `product_order`(`m_id`, `orderId`, `amount`, `addressee`, `address`, `phone`, `created_at`, `payment`) VALUES (?,?,?,?,?,?,NOW(),?)";
		const [orderRows] = await db.query(orderSql, [
			req.params.m_id,
			orderId,
			amount,
			addressee,
			address,
			phone,
			payment,
		]);
		const products_order_sid = orderRows.insertId;
		const detailsSql =
			"INSERT INTO `product_order_details`(`products_order_sid`, `product_id`, `price`, `quantity`) VALUES (?,?,?,?)";
		for (const product of req.body.products) {
			const { id, price, quantity, name } = product;
			const [detailsRows] = await db.query(detailsSql, [
				products_order_sid,
				id,
				price,
				quantity,
				name,
			]);
		}
		// 建立給 LINE Pay
		const productsTotal = req.body.products.reduce(
			(total, { price, quantity }) => total + price * quantity,
			0
		);
		const discounAmount = productsTotal - req.body.itemsAmount;
		console.log("req.body123456:", productsTotal);
		const linePayBody = {
			orderId: orderId,
			currency: "TWD",
			amount: Math.round(req.body.amount),
			packages: [
				{
					id: "package1",
					amount: Math.round(req.body.amount),
					products: [
						{
							name: req.body.products[0].name,
							price: Math.round(req.body.amount),
							quantity: 1,
						},
					],
				},
			],
			redirectUrls: {
				confirmUrl: `${LINEPAY_RETURN_HOST}${LINEPAY_RETURN_CONFIRM_URL}`,
				cancelUrl: `${LINEPAY_RETURN_HOST}${LINEPAY_RETURN_CANCEL_URL}`,
			},
		};
		const uri = "/payments/request"; //對應到API名稱 用於簽章
		const { signature, headers } = createSignature(uri, linePayBody); //重構成全域的方法
		const url = `${LINEPAY_SITE}/${LINEPAY_VERSION}${uri}`; //發出請求的路徑
		const linePayRes = await axios.post(url, linePayBody, { headers });
		console.log("linePayRes.data.info", linePayRes.data.info); //驗證路徑回應是否正確
		if (linePayRes?.data?.returnCode === "0000") {
			res.json({ web: linePayRes?.data?.info.paymentUrl.web, amount: amount });
		}
	} catch (error) {
		console.log(error);
		//錯誤的回饋
		res.end();
	}
});
const createSignature = (uri, linePayBody) => {
	const nonce = parseInt(new Date().getTime() / 1000); //隨機產生的 於簽章
	const string = `${LINEPAY_CHANNEL_SECRET_KEY}/${LINEPAY_VERSION}${uri}${JSON.stringify(
		linePayBody
	)}${nonce}`; //建立簽章（Signature） ${LINEPAY_CHANNEL_SECRET_KEY}商店密鑰
	const signature = Base64.stringify(
		HmacSHA256(string, LINEPAY_CHANNEL_SECRET_KEY)
	); //加密的簽章
	const headers = {
		"Content-Type": "application/json",
		"X-LINE-ChannelId": LINEPAY_CHANNEL_ID,
		"X-LINE-Authorization-Nonce": nonce,
		"X-LINE-Authorization": signature, //加密的簽章
	};
	return { signature, headers };
};

//刪除點擊到的購物車
router.delete("/emptyCart", async (req, res) => {
	const { sids } = req.body;
	const placeholders = sids.map(() => "?").join(",");
	const sql = `DELETE FROM cart_details WHERE sid IN (${placeholders})`;
	const [result] = await db.query(sql, sids);
	res.json({ deletedCount: result.affectedRows });
});

//取得登入會員的購物車資料
router.get("/cart01/:m_id/:sid", async (req, res) => {
	const sql = "SELECT * FROM cart_details WHERE m_id =6 AND m_id= ?";
	try {
		const [rows] = await db.query(sql, [req.params.m_id]);
		res.json(rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Something went wrong" });
	}
});

//取得訂單資料
router.get("/order/:orderId", async (req, res) => {
	const sql = "SELECT * FROM product_order WHERE product_order.orderId =? ";
	const [rows] = await db.query(sql, [req.params.orderId]);
	res.json(rows);
	console.log("rows", rows);
});

//取得classOrder資料
router.get("/classOrder/:class_form_sid", async (req, res) => {
	try {
		const sql =
			"SELECT classform.*, classtime.*, class_order.*FROM classform INNER JOIN classtime ON classform.class_time = classtime.classtime INNER JOIN class_order ON class_order.class_form_sid = classform.sid WHERE class_order.class_form_sid =? ";
		const [rows] = await db.query(sql, [req.params.class_form_sid]);
		res.json(rows);
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error");
	}
});

//取得classOrder資料
router.get("/classForm/:class_form_sid", async (req, res) => {
	const sql =
		"SELECT * FROM classform INNER JOIN classbooking ON classform.sid=classbooking.classformsid WHERE classform.sid =?";
	const [rows] = await db.query(sql, [req.params.class_form_sid]);
	res.json(rows);
});

//取得購物車m_id內容 更新購物車
router.post("/upDataClassForm/:class_form_sid", async (req, res) => {
	try {
		const { orderId, m_id, amount } = req.body;
		const orderSql =
			"INSERT INTO `class_order`(`orderId`, `m_id`, `class_form_sid`, `amount`, `created_at`) VALUES (?, ?, ?, ?, NOW())";
		const [orderRows] = await db.query(orderSql, [
			orderId,
			m_id,
			req.params.class_form_sid,
			amount,
		]);
		res.json({ success: true, message: "Order created successfully." });
	} catch (error) {
		console.log("error", error);
		res.status(500).json({ success: false, message: error.message });
	}
});

module.exports = router;
