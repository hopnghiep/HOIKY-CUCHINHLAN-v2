import React from 'react';
import { BookOpen, HelpCircle, Shield, UploadCloud, Users, X } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#171719] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng hướng dẫn"
          className="absolute right-4 top-4 rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F02028]/15 border border-[#F02028]/30 text-[#F02028]">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 id="help-modal-title" className="text-xl font-semibold text-white">
              Hướng dẫn sử dụng Hồi ký Điện tử
            </h2>
            <p className="text-xs text-zinc-400">
              Chi đoàn Cù Chính Lan – Đoàn trường THPT Hoàng Hoa Thám – Quận Đoàn Bình Thạnh
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <div className="rounded-xl border border-white/10 bg-[#242428] p-4">
            <div className="flex items-center gap-2 font-semibold text-white mb-1.5">
              <BookOpen className="w-4 h-4 text-[#F02028]" />
              1. Dành cho Khách tham quan & Đoàn viên
            </div>
            <p className="text-xs text-zinc-300">
              Khám phá Trang chủ Hồi ký để xem lịch sử hình thành, mốc son, Hành khúc Chi đoàn và Lời ngỏ. Chuyển qua
              tab Thành viên để xem ảnh so sánh Thời trẻ – Hiện tại, và tab Sự kiện để tra cứu theo danh sách hoặc lịch
              tháng.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#242428] p-4">
            <div className="flex items-center gap-2 font-semibold text-white mb-1.5">
              <Shield className="w-4 h-4 text-[#F02028]" />
              2. Chế độ Quản trị & Chỉnh sửa trực tiếp
            </div>
            <p className="text-xs text-zinc-300">
              Nhấn Đăng nhập trên thanh công cụ để thiết lập mật khẩu quản trị (lần đầu) hoặc đăng nhập. Khi ở chế độ
              Quản trị, bạn có thể nhấn trực tiếp vào các đoạn văn bản có nút Sửa để chỉnh sửa tại chỗ, dùng Hoàn tác /
              Làm lại trên thanh điều hướng, hoặc mở tab Quản trị để quản lý toàn diện.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#242428] p-4">
            <div className="flex items-center gap-2 font-semibold text-white mb-1.5">
              <Users className="w-4 h-4 text-[#F02028]" />
              3. Phân biệt dữ liệu mẫu và dữ liệu thực tế
            </div>
            <p className="text-xs text-zinc-300">
              Các hồ sơ và sự kiện khởi tạo ban đầu được gắn nhãn Tư liệu mẫu minh họa. Quản trị viên có thể chỉnh sửa
              từng mục hoặc dùng nút Xóa toàn bộ dữ liệu mẫu trong Admin Console để bắt đầu nhập tư liệu chính thức.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#242428] p-4">
            <div className="flex items-center gap-2 font-semibold text-white mb-1.5">
              <UploadCloud className="w-4 h-4 text-[#F02028]" />
              4. Sao lưu & Phục hồi dữ liệu JSON
            </div>
            <p className="text-xs text-zinc-300">
              Mọi thay đổi được tự động lưu vào IndexedDB và đồng bộ lên máy chủ. Trước khi cập nhật ứng dụng hoặc
              chuyển thiết bị, hãy vào Quản trị → Thống kê & Sao lưu để xuất tệp JSON trọn gói (bao gồm hình ảnh). Khi
              nhập lại, hệ thống luôn kiểm tra cấu trúc và tạo bản dự phòng trước khi ghi đè.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
