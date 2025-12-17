const express = require('express')
const router = express.Router()

router.use('/customer/properties', require('./customer/properties'))

module.exports = router
