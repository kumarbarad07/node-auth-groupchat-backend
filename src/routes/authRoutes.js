const router = require('express').Router();
const { verifyAnyToken } = require("../middlewares/auth.middleware");

const {
    registerUser,
    userLogin,
    userLoginWithUserName,
    getMyGroups
} = require('../controllers/authController');

router.post('/user/registerUser', registerUser);
router.post('/user/userLogin', userLogin);
router.post('/user/userLoginWithUserName', userLoginWithUserName);

router.get("/my-groups", verifyAnyToken, getMyGroups);

module.exports = router;