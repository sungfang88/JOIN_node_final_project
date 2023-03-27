const express = require("express");
const db = require("./../modules/db_connect2");

const router = express.Router();

router.get('/api/getProductId/:sid', async (req, res) => {
  const sql = `
    SELECT pm.*, pc.country_ch 
    FROM productmanage AS pm
    INNER JOIN product_country AS pc ON pm.country_id = pc.country_id 
    WHERE pm.product_id = ?
  `;

  const [results] = await db.query(sql,[req.params.sid]);

  console.log(results);

  res.json({rows: results});
});


router.get('/api/getProductbest', async (req, res) => {
  const sql = `SELECT pm.*, pc.country_ch FROM productmanage AS pm 
  INNER JOIN product_country AS pc ON pm.country_id = pc.country_id 
  ORDER BY pm.sellout DESC LIMIT 5 ;`
  
  const [results] = await db.query(sql);
  
  console.log(results);
  
  res.json({rows: results});
  });

  router.get('/api/allproduct', async (req, res) => {
    const sql = `SELECT pm.product_id, pm.product_ch, pm.productprice, pm.product_img, pm.product_catagory_id, pc.country_id, pc.country_ch 
    FROM productmanage AS pm 
    INNER JOIN product_country AS pc ON pm.country_id = pc.country_id 
    ORDER BY pm.product_id ASC;
    `
    
    const [results] = await db.query(sql);
    
    console.log(results);
    
    res.json({rows: results});
    });

    router.get('/api/productcatagory', async (req, res) => {
      const sql = `SELECT catagory_ch, catagory_id FROM product_catagory
      ORDER BY catagory_id;`
      
      const [results] = await db.query(sql);
      
      console.log(results);
      
      res.json({rows: results});
      });

    router.get('/api/getproductlike/:sid', async (req, res) => {
    const sql = `SELECT productmanage FROM member_collection
    WHERE member = ?;`
        
    const [results] = await db.query(sql,[req.params.sid]);
        
    console.log(results);
        
    res.json({rows: results});
    });


    router.delete('/api/productlikedelete/:sid/:id', async (req, res) => {
    const sql = `DELETE FROM member_collection WHERE member = ? AND productmanage = ?;`
          
    const [results] = await db.query(sql,[req.params.sid,req.params.id]);
          
    console.log(results);
          
    res.json({rows: results});
    });


    router.post('/api/productlikeadd', async (req, res) => {
    const { member, productmanage } = req.body;
    const sql = `INSERT INTO member_collection (member, productmanage) VALUES (?, ?)`;
                    
    const [results] = await db.query(sql, [member, productmanage]);
                    
    console.log(results);
                    
    res.json({ rows: results });
    });          
    router.post('/api/productaddtocart', async (req, res) => {
      const { m_id, product_img, product_ch, product_eg, product_id, price, quantity} = req.body;
      const sql = `INSERT INTO cart_details 
      ( m_id, product_img, 
        product_ch, product_eg, product_id, 
        price, quantity, created_at) 
        VALUES (?,?,?,
          ?,?,?,
          ?,?,NOW())`;
                      
      const [results] = await db.query(sql, [member, productmanage]);
                      
      console.log(results);
                      
      res.json({ rows: results });
      }); 
          

module.exports = router;

