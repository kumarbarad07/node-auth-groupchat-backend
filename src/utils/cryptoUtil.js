const CryptoJS = require("crypto-js");
const logger = require('../config/logger');

const SECRET_KEY = process.env.ENCRYPTION_DECRYPTION_KEY;

exports.encryptPassword = (password) => {
    return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
};

exports.encryptConfirmPassword = (confirmPassword) => {
    return CryptoJS.AES.encrypt(confirmPassword, SECRET_KEY).toString();
};

exports.decryptPassword = (encryptedPassword) => {

    try {
        const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (!decrypted) {
            logger.error("Error decrypting password", error);
        }
        return decrypted;
    } catch (error) {
        logger.error("Error decrypting password", error);
        return null;
    }
};
