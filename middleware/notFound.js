import { AppError } from './errorHandler.js';

const notFound = (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
};

export default notFound;
