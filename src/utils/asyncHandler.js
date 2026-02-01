const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise
            .resolve(requestHandler(req, res, next))
            .catch((err) => next(err)) //catches the error and send to the Express(next(err))
    }
}

export { asyncHandler }