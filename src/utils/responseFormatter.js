module.exports = {
    successResponse: (res, data, message = 'Request was successful', statusCode = 200) => {
        res.status(statusCode).json({
            status: true,
            message,
            data,
        });
    },

    errorResponse: (res, error, message = 'Request failed', statusCode = 400) => {
        res.status(statusCode).json({
            status: false,
            message,
            error: error.message || error,
        });
    },
};