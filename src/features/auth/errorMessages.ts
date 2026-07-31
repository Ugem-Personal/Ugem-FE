function getErrorText(error: unknown) {
  return error instanceof Error ? error.message.toLowerCase() : "";
}

function isNetworkError(message: string) {
  return (
    message.includes("network") ||
    message.includes("kết nối") ||
    message.includes("may chu") ||
    message.includes("máy chủ")
  );
}

export function getLoginErrorMessage(error: unknown) {
  const message = getErrorText(error);

  if (isNetworkError(message)) {
    return "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.";
  }

  if (
    message.includes("invalid") ||
    message.includes("incorrect") ||
    message.includes("wrong") ||
    message.includes("unauthorized") ||
    message.includes("401") ||
    message.includes("password") ||
    message.includes("not found")
  ) {
    return "Email hoặc mật khẩu không đúng.";
  }

  if (
    message.includes("inactive") ||
    message.includes("disabled") ||
    message.includes("locked") ||
    message.includes("blocked")
  ) {
    return "Tài khoản đang bị khóa hoặc chưa được kích hoạt.";
  }

  return "Đăng nhập thất bại. Vui lòng kiểm tra thông tin và thử lại.";
}

export function getRegisterErrorMessage(error: unknown) {
  const message = getErrorText(error);

  if (isNetworkError(message)) {
    return "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.";
  }

  if (
    message.includes("email") &&
    (message.includes("exist") ||
      message.includes("used") ||
      message.includes("duplicate") ||
      message.includes("already"))
  ) {
    return "Email này đã được sử dụng.";
  }

  if (
    message.includes("phone") &&
    (message.includes("exist") ||
      message.includes("used") ||
      message.includes("duplicate") ||
      message.includes("already"))
  ) {
    return "Số điện thoại này đã được sử dụng.";
  }

  if (message.includes("password")) {
    return "Mật khẩu chưa đáp ứng yêu cầu. Vui lòng kiểm tra lại.";
  }

  if (
    message.includes("invalid") ||
    message.includes("validation") ||
    message.includes("bad request") ||
    message.includes("400")
  ) {
    return "Thông tin đăng ký chưa hợp lệ. Vui lòng kiểm tra lại.";
  }

  return "Đăng ký thất bại. Vui lòng kiểm tra thông tin và thử lại.";
}

export function getForgotPasswordErrorMessage(error: unknown) {
  const message = getErrorText(error);

  if (isNetworkError(message)) {
    return "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.";
  }

  if (
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("internal_server_error")
  ) {
    return "Hệ thống gửi email đang phản hồi chậm. Vui lòng thử lại sau ít phút.";
  }

  if (
    message.includes("not found") ||
    message.includes("user") ||
    message.includes("email")
  ) {
    return "Email không tồn tại trong hệ thống.";
  }

  return "Không thể gửi mã xác nhận. Vui lòng thử lại.";
}

export function getResetPasswordErrorMessage(error: unknown) {
  const message = getErrorText(error);

  if (isNetworkError(message)) {
    return "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.";
  }

  if (
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("internal_server_error")
  ) {
    return "Máy chủ đang xử lý chậm. Vui lòng thử lại sau ít phút.";
  }

  if (
    message.includes("otp") ||
    message.includes("token") ||
    message.includes("expired") ||
    message.includes("invalid")
  ) {
    return "Mã xác nhận không hợp lệ hoặc đã hết hạn.";
  }

  if (message.includes("password")) {
    return "Mật khẩu mới chưa hợp lệ.";
  }

  return "Đặt lại mật khẩu thất bại. Vui lòng thử lại.";
}

export function getGoogleLoginErrorMessage(error: unknown) {
  const message = getErrorText(error);

  if (isNetworkError(message)) {
    return "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.";
  }

  if (
    message.includes("token") ||
    message.includes("google") ||
    message.includes("credential") ||
    message.includes("invalid") ||
    message.includes("unauthorized")
  ) {
    return "Không thể xác thực bằng Google. Vui lòng thử lại.";
  }

  return "Đăng nhập Google thất bại. Vui lòng thử lại.";
}
