const multer = require("multer");
const moment = require("moment-timezone");
const { v4: uuidv4 } = require("uuid");

const extMap = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
};

const fileFilter = (req, file, cb) => {
  cb(null, !!extMap[file.mimetype]);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __dirname + "/../public/uploads");
  },
  filename: (req, file, cb) => {
    const ext = extMap[file.mimetype];
    const fid = uuidv4();
  // const m1 = moment(); // 取得當下時間 

    cb(null, fid + ext);
  },
});


module.exports = multer({ fileFilter, storage });
