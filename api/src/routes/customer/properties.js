const express = require('express')
const router = express.Router()
const controller = require('../../controllers/customer/property-controller.js')

router.get('/', controller.findAll)
router.post('/', controller.search)
router.get('/:id', controller.findOne)

module.exports = router
