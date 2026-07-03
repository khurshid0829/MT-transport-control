export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = "Avtorizatsiyadan o'tilmagan") {
    return new AppError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'Bu amal uchun huquqingiz yetarli emas') {
    return new AppError(403, 'FORBIDDEN', message);
  }
  static notFound(message = "Ma'lumot topilmadi") {
    return new AppError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string, details?: unknown) {
    return new AppError(409, 'CONFLICT', message, details);
  }
}
