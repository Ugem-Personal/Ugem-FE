function getRawErrorText(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const responseData = (
      error as {
        response?: {
          data?: {
            message?: string;
            error?: string;
          };
        };
        message?: string;
      }
    ).response?.data;

    if (responseData?.message && typeof responseData.message === "string") {
      return responseData.message;
    }
    if (responseData?.error && typeof responseData.error === "string") {
      return responseData.error;
    }

    const errObj = error as { message?: string };
    if (errObj.message && typeof errObj.message === "string") {
      return errObj.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error || "");
}

function isNetworkError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("network") ||
    lower.includes("kết nối") ||
    lower.includes("may chu") ||
    lower.includes("máy chủ")
  );
}

export function getLoginErrorMessage(error: unknown) {
  const rawMsg = getRawErrorText(error);
  const message = rawMsg.toLowerCase();

  if (isNetworkError(message)) {
    return "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.";
  }

  // If backend provided a clear custom Vietnamese message
  if (rawMsg && !message.includes("status code") && /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(rawMsg)) {
    return rawMsg;
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

  return rawMsg && !message.includes("status code") ? rawMsg : "Đăng nhập thất bại. Vui lòng kiểm tra thông tin và thử lại.";
}

export function getRegisterErrorMessage(error: unknown) {
  const rawMsg = getRawErrorText(error);
  const message = rawMsg.toLowerCase();

  if (isNetworkError(message)) {
    return "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.";
  }

  // If backend provided a clear custom Vietnamese message
  if (rawMsg && !message.includes("status code") && /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(rawMsg)) {
    return rawMsg;
  }

  if (
    message.includes("email") &&
    (message.includes("exist") ||
      message.includes("used") ||
      message.includes("duplicate") ||
      message.includes("already") ||
      message.includes("tồn tại"))
  ) {
    return "Email này đã được sử dụng trên hệ thống.";
  }

  if (
    message.includes("phone") &&
    (message.includes("exist") ||
      message.includes("used") ||
      message.includes("duplicate") ||
      message.includes("already") ||
      message.includes("tồn tại"))
  ) {
    return "Số điện thoại này đã được sử dụng trên hệ thống.";
  }

  if (message.includes("password")) {
    return "Mật khẩu chưa đáp ứng yêu cầu. Vui lòng kiểm tra lại.";
  }

  if (
    message.includes("invalid") ||
    message.includes("validation") ||
    message.includes("bad request")
  ) {
    return "Thông tin đăng ký chưa hợp lệ. Vui lòng kiểm tra lại.";
  }

  return rawMsg && !message.includes("status code") ? rawMsg : "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.";
}

export function getForgotPasswordErrorMessage(error: unknown) {
  const rawMsg = getRawErrorText(error);
  const message = rawMsg.toLowerCase();

  if (isNetworkError(message)) {
    return "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.";
  }

  if (rawMsg && !message.includes("status code") && /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(rawMsg)) {
    return rawMsg;
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

  return rawMsg && !message.includes("status code") ? rawMsg : "Không thể gửi mã xác nhận. Vui lòng thử lại.";
}

export function getResetPasswordErrorMessage(error: unknown) {
  const rawMsg = getRawErrorText(error);
  const message = rawMsg.toLowerCase();

  if (isNetworkError(message)) {
    return "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.";
  }

  if (rawMsg && !message.includes("status code") && /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(rawMsg)) {
    return rawMsg;
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

  return rawMsg && !message.includes("status code") ? rawMsg : "Đặt lại mật khẩu thất bại. Vui lòng thử lại.";
}

export function getGoogleLoginErrorMessage(error: unknown) {
  const rawMsg = getRawErrorText(error);
  const message = rawMsg.toLowerCase();

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

  return rawMsg && !message.includes("status code") ? rawMsg : "Đăng nhập Google thất bại. Vui lòng thử lại.";
}
