Booking API AdapterFactory Implementation Plan
Mục tiêu: Xây dựng một kiến trúc thiết kế dạng Factory/Adapter Pattern để xử lý linh hoạt nhiều phương thức thanh toán / dịch vụ đặt tour (VNPay, MoMo, Klook, Direct) mà không làm phình to route chính của Booking.

User Review Required
IMPORTANT

Các Adapter sẽ yêu cầu một số biến môi trường (Environment Variables) giả lập cho Secret Keys của VNPay/MoMo. Mình sẽ giả lập logic tạo URL thanh toán và mã hóa chữ ký (HMAC SHA512 cho VNPay và SHA256 cho MoMo) trong giới hạn mã nguồn. Bạn có muốn sử dụng các API key thực tế nào không hay chỉ cấu hình Sandbox mặc định?
Hướng đi hiện tại tập trung vào VNPay và MoMo thay vì Ticketbox do hai nhà cung cấp này phổ biến hơn ở VN và logic thanh toán phù hợp với hệ thống đặt tour trực tiếp.
Proposed Changes
services/booking/adapters/
[NEW] 
BaseAdapter.js
Tạo lớp cơ sở (Abstract Class) để đảm bảo mọi adapter (VNPay, MoMo, v.v) đều tuân theo cùng một chuẩn interface, bao gồm:

createPaymentUrl(bookingData): Tạo URL chuyển hướng người dùng đến trang thanh toán.
verifyWebhook(payload, signature): Trả về true/false để đảm bảo tính an toàn của webhook.
processPaymentReturn(query): Xử lý khi người dùng được redirect về lại website từ cổng thanh toán.
[NEW] 
VNPayAdapter.js
Thừa kế BaseAdapter, chuyên xử lý cho cổng VNPay:

Xây dựng object vnp_Params và tạo chữ ký bảo mật bằng thuật toán HMAC SHA512.
Kiểm tra mã vnp_ResponseCode == '00' trên URL trả về.
[NEW] 
MoMoAdapter.js
Thừa kế BaseAdapter, chuyên xử lý cho ví MoMo:

Tạo request signature sử dụng HMAC SHA256 với các khóa accessKey, secretKey, partnerCode.
Giao tiếp với cổng MoMo để lấy payUrl.
[NEW] 
DirectAdapter.js
Xử lý các booking thanh toán tiền mặt (cash) - tự động trả về trạng thái "pending" và không cần tạo payment URL (trả về trang success luôn).

services/booking/
[NEW] 
AdapterFactory.js
Factory phân phối Adapter:

getAdapter(providerName): Khởi tạo và trả về Instance của nhà cung cấp thanh toán tương ứng dựa vào providerName ('vnpay', 'momo', 'cash').
routes/
[MODIFY] 
bookingRoutes.js
Thay đổi logic để tích hợp Factory:

Gỡ bỏ logic thanh toán trực tiếp cứng (hardcoded).
POST / : Sử dụng AdapterFactory.get(paymentProvider) để gọi createPaymentUrl. Trả về URL thanh toán cho Frontend thay vì tự động báo "confirmed".
GET /payment/return/:provider: Route bắt URL trả về từ cổng thanh toán, gọi logic processPaymentReturn của Adapter tương ứng để cập nhật status vào MongoDB (success / failed).
POST /webhook/:provider: Cập nhật webhook để xác minh chữ ký an toàn (verifyWebhook) và cập nhật database.
Verification Plan
Automated Tests
Gửi cURL hoặc gọi fetch đến POST /api/booking truyền các paymentProvider khác nhau để xem server có trả về đúng URL của nhà cung cấp đó không (ví dụ VNPay thì URL https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_...).
Manual Verification
Thực hiện submit form Booking ở FE bằng tùy chọn VNPay, đảm bảo có luồng chuyển tiếp (hoặc URL) sinh ra chính xác.
Thử nghiệm việc truy cập giả lập Return URL của VNPay với dữ liệu lỗi và dữ liệu đúng để xem Booking status có update tương ứng không.