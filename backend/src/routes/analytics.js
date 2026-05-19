const express = require("express");
const router = express.Router();
const { getAnalytiques } = require("../controllers/analyticsController");
const { proteger } = require("../middleware/auth");

router.use(proteger);

router.get("/", getAnalytiques);

module.exports = router;
