const router = require('express').Router();
const { verifyAnyToken } = require("../middlewares/auth.middleware");

const {
    registerUser,
    userLogin,
    getMyGroups
} = require('../controllers/authController');

router.post('/user/registerUser', registerUser);
router.post('/user/userLogin', userLogin);

router.get("/my-groups", verifyAnyToken, getMyGroups);

module.exports = router;