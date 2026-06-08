const mongoose = require('mongoose');
const { HeritageSite } = require('./db');

const HERITAGE_FULL = [
  {
    name: 'Vịnh Hạ Long', province: 'Quảng Ninh',
    categories: ['Thiên nhiên', 'Địa chất'], type: 'thiên nhiên',
    unesco: 1994, page: 'vinh-ha-long.html',
    image_url: './uploads/ex/Vịnh hạ long.jpg',
    description: 'Kỳ quan thiên nhiên thế giới với hàng nghìn đảo đá karst huyền bí. Được UNESCO công nhận hai lần năm 1994 và 2000.'
  },
  {
    name: 'Cố đô Huế', province: 'Thừa Thiên Huế',
    categories: ['Văn hóa'], type: 'văn hóa',
    unesco: 1993, page: 'co-do-hue.html',
    image_url: './uploads/ex/Cố đô Huế.jpg',
    description: 'Kinh thành triều Nguyễn, hologram cung điện ngàn năm.'
  },
  {
    name: 'Phố cổ Hội An', province: 'Quảng Nam',
    categories: ['Văn hóa'], type: 'văn hóa',
    unesco: 1999, page: 'hoi-an.html',
    image_url: './uploads/ex/hội an.jpg',
    description: 'Đèn lồng bay giữa phố cổ tương lai, thương cảng 400 năm.'
  },
  {
    name: 'Thánh địa Mỹ Sơn', province: 'Quảng Nam',
    categories: ['Văn hóa'], type: 'văn hóa',
    unesco: 1999, page: 'thanh-dia-my-son.html',
    image_url: './uploads/ex/thánh địa mỹ sơn.jpg',
    description: 'Quần thể đền tháp Chăm Pa huyền bí, gạch đỏ ngàn năm.'
  },
  {
    name: 'Phong Nha – Kế Bàng', province: 'Quảng Bình',
    categories: ['Thiên nhiên', 'Địa chất'], type: 'thiên nhiên',
    unesco: 2003, page: 'phong-nha-ke-bang.html',
    image_url: './uploads/ex/phong nha.jpg',
    description: 'Nơi có hang động lớn nhất thế giới – Sơn Đoòng. Hệ thống 300+ hang động hình thành hàng triệu năm trước.'
  },
  {
    name: 'Quần thể Tràng An', province: 'Ninh Bình',
    categories: ['Thiên nhiên', 'Văn hóa', 'Hỗn hợp'], type: 'hỗn hợp',
    unesco: 2014, page: 'quan-the-trang-an.html',
    image_url: './uploads/ex/trangan.jpg',
    description: 'Di sản hỗn hợp đầu tiên ĐNA — núi đá, hang động, cố đô.'
  },
  {
    name: 'Ruộng Bậc Thang', province: 'Lào Cai',
    categories: ['Thiên nhiên', 'Văn hóa'], type: 'văn hóa',
    unesco: null, page: 'ruong-bac-thang.html',
    image_url: './uploads/ex/ruộng bậc thang.jpg',
    description: 'Kiệt tác nông nghiệp 500 năm của người H\'Mông.'
  },
  {
    name: 'Hoàng thành Thăng Long', province: 'Hà Nội',
    categories: ['Văn hóa'], type: 'văn hóa',
    unesco: 2010, page: 'hoang-thanh-thang-long.html',
    image_url: './uploads/ex/thanglong.jpg',
    description: 'Trung tâm quyền lực nghìn năm của đất nước Đại Việt.'
  },
  {
    name: 'Thành Nhà Hồ', province: 'Thanh Hóa',
    categories: ['Văn hóa'], type: 'văn hóa',
    unesco: 2011, page: 'thanh-nha-ho.html',
    image_url: './uploads/ex/thanh-co-nha-ho.jpg',
    description: 'Kinh đô đá cuối TK14, kỳ tích kiến trúc không dùng vữa.'
  },
  {
    name: 'Cao nguyên đá Đồng Văn', province: 'Hà Giang',
    categories: ['Địa chất', 'Văn hóa'], type: 'địa chất',
    unesco: 2010, page: 'cao-nguyen-da-dong-van.html',
    image_url: 'https://objectstorage.omzcloud.vn/pys-object-storage/web/uploads/posts/avatar/1665717046.jpg',
    description: 'Đá vôi 500 triệu năm, 17 dân tộc, con đường Hạnh Phúc.'
  },
  {
    name: 'Nhã nhạc Cung đình Huế', province: 'Huế',
    categories: ['Phi vật thể', 'Văn hóa'], type: 'phi vật thể',
    unesco: 2003, page: null,
    image_url: null,
    description: 'Âm nhạc nghi lễ của triều đình nhà Nguyễn, được UNESCO công nhận đầu tiên tại Việt Nam.'
  },
  {
    name: 'Cồng chiêng Tây Nguyên', province: 'Tây Nguyên',
    categories: ['Phi vật thể', 'Văn hóa'], type: 'phi vật thể',
    unesco: 2005, page: null,
    image_url: null,
    description: 'Không gian văn hóa cồng chiêng — thanh âm của rừng núi và các tộc người Tây Nguyên.'
  },
  {
    name: 'Dân ca Quan họ', province: 'Bắc Ninh',
    categories: ['Phi vật thể', 'Văn hóa'], type: 'phi vật thể',
    unesco: 2009, page: null,
    image_url: null,
    description: 'Làn điệu giao duyên của vùng đồng bằng Bắc Bộ, Kinh Bắc xưa.'
  },
  {
    name: 'Ca trù', province: 'Bắc Bộ',
    categories: ['Phi vật thể', 'Văn hóa'], type: 'phi vật thể',
    unesco: 2009, page: null,
    image_url: null,
    description: 'Nghệ thuật ca hát thính phòng tinh tế của người Việt Bắc Bộ.'
  },
  {
    name: 'Hát Xoan Phú Thọ', province: 'Phú Thọ',
    categories: ['Phi vật thể', 'Văn hóa'], type: 'phi vật thể',
    unesco: 2011, page: null,
    image_url: null,
    description: 'Hình thức ca hát nghi lễ thờ vua Hùng, truyền từ thời dựng nước.'
  },
  {
    name: 'Phở Việt Nam', province: 'Toàn quốc',
    categories: ['Phi vật thể', 'Văn hóa'], type: 'phi vật thể',
    unesco: 2024, page: null,
    image_url: null,
    description: 'Đặc sản ẩm thực đặc trưng, biểu tượng văn hóa ẩm thực Việt Nam trên toàn thế giới.'
  },
  {
    name: 'Đờn ca tài tử Nam Bộ', province: 'Nam Bộ',
    categories: ['Phi vật thể', 'Văn hóa'], type: 'phi vật thể',
    unesco: 2013, page: null,
    image_url: null,
    description: 'Âm nhạc đặc trưng miền Nam, phong cách ứng tấu tự do, phóng khoáng.'
  },
  {
    name: 'Bài Chòi Trung Bộ', province: 'Trung Bộ',
    categories: ['Phi vật thể', 'Văn hóa'], type: 'phi vật thể',
    unesco: 2017, page: null,
    image_url: null,
    description: 'Trò chơi dân gian kết hợp âm nhạc và hò hét đặc trưng miền Trung.'
  },
  {
    name: 'Nghệ thuật Xòe Thái', province: 'Tây Bắc',
    categories: ['Phi vật thể', 'Văn hóa'], type: 'phi vật thể',
    unesco: 2021, page: null,
    image_url: null,
    description: 'Điệu múa tập thể của người Thái Tây Bắc — biểu tượng của đoàn kết cộng đồng.'
  }
];

async function run() {
  await mongoose.connect('mongodb://localhost:27017/lunar_heritage');
  console.log("Connected. Updating Heritage sites...");
  for (const h of HERITAGE_FULL) {
    await HeritageSite.findOneAndUpdate({ name: h.name }, h, { upsert: true, new: true });
  }
  console.log("Done updating DB!");
  process.exit(0);
}
run().catch(console.error);
