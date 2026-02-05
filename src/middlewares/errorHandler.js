import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
    let error = err;

    // Check if the error is an instance of our custom ApiError
    if (!(error instanceof ApiError)) {
        // If not, create a generic 500 server error
        const statusCode = error.statusCode || 500;
        const message = error.message || "Something went wrong";
        error = new ApiError(statusCode, message, error?.errors || [], err.stack);
    }

    const response = {
        ...error,
        message: error.message,
        ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {}) // Hide stack in production
    };

    // Remove the unused 'data' field if it's an error
    return res.status(error.statusCode).json(response);
};

export { errorHandler };