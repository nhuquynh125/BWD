const express = require('express');
const { HeritageSite } = require('../db');
const { optionalAuth, requireAuth } = require('../auth');
const { awardPoints } = require('../services/GamificationService');

const router = express.Router();

const HERITAGE_SEED = [
  { name: 'Vịnh Hạ Long', province: 'Quảng Ninh', categories: ['Thiên nhiên', 'Địa chất'], type: 'thiên nhiên', unesco: 1994, page: 'vinh-ha-long.html', image_url: 'https://images.unsplash.com/photo-1669819894338-53ab7afc6958?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA==', description: 'Kỳ quan thiên nhiên thế giới với hàng nghìn đảo đá karst huyền bí. Được UNESCO công nhận hai lần năm 1994 và 2000.', lat: 20.9101, lng: 107.1839 },
  { name: 'Cố đô Huế', province: 'Thừa Thiên Huế', categories: ['Văn hóa'], type: 'văn hóa', unesco: 1993, page: 'co-do-hue.html', image_url: 'https://www.undp.org/sites/g/files/zskgke326/files/styles/featured_content_card_mobile_343_x_150_/public/2025-08/hau-nguyen-c49_d1jw9l4-unsplash.jpg?h=fee4874d&itok=KZpml8-0', description: 'Kinh thành triều Nguyễn, hologram cung điện ngàn năm.', lat: 16.4637, lng: 107.5909 },
  { name: 'Phố cổ Hội An', province: 'Quảng Nam', categories: ['Văn hóa'], type: 'văn hóa', unesco: 1999, page: 'hoi-an.html', image_url: 'https://scontent.fdad2-1.fna.fbcdn.net/v/t39.30808-6/654943425_1420466086545390_8388932195770794243_n.jpg?stp=dst-jpg_tt6&cstp=mx1365x2048&ctp=s1365x2048&_nc_cat=107&ccb=1-7&_nc_sid=127cfc&_nc_ohc=VJ_XQ9kM9vcQ7kNvwHDR2WA&_nc_oc=Adqa6N4VgCqZzQw7cZYzmdfmAAKRDAEMrc-BJgaOka2L26jGBWbH_B48k4-Vc-0oSFD39rvdjnGDW8lHLSDsckry&_nc_zt=23&_nc_ht=scontent.fdad2-1.fna&_nc_gid=6H_wud4zvp4CMZoHecLbkA&_nc_ss=7b2a8&oh=00_Af-gOF0SPLSUkrp_TMJBMO7phBUYlLIPNAeTRKnevXKowg&oe=6A2C4A8F', description: 'Đèn lồng bay giữa phố cổ tương lai, thương cảng 400 năm.', lat: 15.8794, lng: 108.3283 },
  { name: 'Thánh địa Mỹ Sơn', province: 'Quảng Nam', categories: ['Văn hóa'], type: 'văn hóa', unesco: 1999, page: 'thanh-dia-my-son.html', image_url: 'https://media.gettyimages.com/id/182114025/photo/my-son-cham-ruins-vietnam.jpg?s=612x612&w=gi&k=20&c=xn9N7d9BRWCawlogypV9OQ0mWpRiX0of3VE1RQkgdzk=', description: 'Quần thể đền tháp Chăm Pa huyền bí, gạch đỏ ngàn năm.', lat: 15.7667, lng: 108.1167 },
  { name: 'Phong Nha – Kẻ Bàng', province: 'Quảng Bình', categories: ['Thiên nhiên', 'Địa chất'], type: 'thiên nhiên', unesco: 2003, page: 'phong-nha-ke-bang.html', image_url: 'https://cdn1z.reatimes.vn/mediav2/upload/userfiles2021/images/letungduong/athic3aan20c490c6b0e1bb9dng08.jpg', description: 'Nơi có hang động lớn nhất thế giới – Sơn Đoòng. Hệ thống 300+ hang động hình thành hàng triệu năm trước.', lat: 17.5333, lng: 106.2833 },
  { name: 'Quần thể Tràng An', province: 'Ninh Bình', categories: ['Thiên nhiên', 'Văn hóa', 'Hỗn hợp'], type: 'hỗn hợp', unesco: 2014, page: 'quan-the-trang-an.html', image_url: 'https://cafefcdn.com/thumb_w/1200/203337114487263232/2026/4/20/avatar1776729575798-1776729576157129022431.jpg', description: 'Di sản hỗn hợp đầu tiên ĐNA — núi đá, hang động, cố đô.', lat: 20.2522, lng: 105.9189 },
  { name: 'Ruộng Bậc Thang', province: 'Lào Cai', categories: ['Thiên nhiên', 'Văn hóa'], type: 'văn hóa', unesco: null, page: 'ruong-bac-thang.html', image_url: 'https://images.unsplash.com/photo-1758002514616-7688e17ab6c7?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDMxfHx8ZW58MHx8fHx8', description: 'Kiệt tác nông nghiệp 500 năm của người H\'Mông.', lat: 22.3333, lng: 103.8333 },
  { name: 'Hoàng thành Thăng Long', province: 'Hà Nội', categories: ['Văn hóa'], type: 'văn hóa', unesco: 2010, page: 'hoang-thanh-thang-long.html', image_url: 'https://cdn.tcdulichtphcm.vn/upload/4-2024/images/2024-10-08/doan-mon-1728399408-978-width640height426.jpg', description: 'Trung tâm quyền lực nghìn năm của đất nước Đại Việt.', lat: 21.0362, lng: 105.8398 },
  { name: 'Thành Nhà Hồ', province: 'Thanh Hóa', categories: ['Văn hóa'], type: 'văn hóa', unesco: 2011, page: 'thanh-nha-ho.html', image_url: 'https://vstatic.vietnam.vn/vietnam/resource/IMAGE/2026/02/04/1770188747313_261d3134447t1993l1-anh-chup-man-hi4.webp', description: 'Kinh đô đá cuối TK14, kỳ tích kiến trúc không dùng vữa.', lat: 20.0767, lng: 105.6033 },
  { name: 'Cao nguyên đá Đồng Văn', province: 'Hà Giang', categories: ['Địa chất', 'Văn hóa'], type: 'địa chất', unesco: 2010, page: 'cao-nguyen-da-dong-van.html', image_url: 'https://pystravel.vn/_next/image?url=https%3A%2F%2Fbooking.pystravel.vn%2Fuploads%2Fposts%2Falbums%2F5652%2F510244747f8a6263a31b1d4887b8ca52.jpg&w=1920&q=75', description: 'Đá vôi 500 triệu năm, 17 dân tộc, con đường Hạnh Phúc.', lat: 23.2758, lng: 105.3622 },
  { name: 'Nhã nhạc Cung đình Huế', province: 'Huế', categories: ['Phi vật thể', 'Văn hóa'], type: 'phi vật thể', unesco: 2003, page: null, image_url: null, description: 'Âm nhạc nghi lễ của triều đình nhà Nguyễn, được UNESCO công nhận đầu tiên tại Việt Nam.', lat: null, lng: null },
  { name: 'Cồng chiêng Tây Nguyên', province: 'Tây Nguyên', categories: ['Phi vật thể', 'Văn hóa'], type: 'phi vật thể', unesco: 2005, page: null, image_url: null, description: 'Không gian văn hóa cồng chiêng — thanh âm của rừng núi và các tộc người Tây Nguyên.', lat: null, lng: null },
  { name: 'Dân ca Quan họ', province: 'Bắc Ninh', categories: ['Phi vật thể', 'Văn hóa'], type: 'phi vật thể', unesco: 2009, page: null, image_url: null, description: 'Làn điệu giao duyên của vùng đồng bằng Bắc Bộ, Kinh Bắc xưa.', lat: null, lng: null },
  { name: 'Ca trù', province: 'Bắc Bộ', categories: ['Phi vật thể', 'Văn hóa'], type: 'phi vật thể', unesco: 2009, page: null, image_url: null, description: 'Nghệ thuật ca hát thính phòng tinh tế của người Việt Bắc Bộ.', lat: null, lng: null },
  { name: 'Hát Xoan Phú Thọ', province: 'Phú Thọ', categories: ['Phi vật thể', 'Văn hóa'], type: 'phi vật thể', unesco: 2011, page: null, image_url: null, description: 'Hình thức ca hát nghi lễ thờ vua Hùng, truyền từ thời dựng nước.', lat: null, lng: null },
  { name: 'Phở Việt Nam', province: 'Toàn quốc', categories: ['Phi vật thể', 'Văn hóa'], type: 'phi vật thể', unesco: 2024, page: null, image_url: null, description: 'Đặc sản ẩm thực đặc trưng, biểu tượng văn hóa ẩm thực Việt Nam trên toàn thế giới.', lat: null, lng: null },
  { name: 'Đờn ca tài tử Nam Bộ', province: 'Nam Bộ', categories: ['Phi vật thể', 'Văn hóa'], type: 'phi vật thể', unesco: 2013, page: null, image_url: null, description: 'Âm nhạc đặc trưng miền Nam, phong cách ứng tấu tự do, phóng khoáng.', lat: null, lng: null },
  { name: 'Bài Chòi Trung Bộ', province: 'Trung Bộ', categories: ['Phi vật thể', 'Văn hóa'], type: 'phi vật thể', unesco: 2017, page: null, image_url: null, description: 'Trò chơi dân gian kết hợp âm nhạc và hò hét đặc trưng miền Trung.', lat: null, lng: null },
  { name: 'Nghệ thuật Xòe Thái', province: 'Tây Bắc', categories: ['Phi vật thể', 'Văn hóa'], type: 'phi vật thể', unesco: 2021, page: null, image_url: null, description: 'Điệu múa tập thể của người Thái Tây Bắc — biểu tượng của đoàn kết cộng đồng.', lat: null, lng: null }
];

router.get('/', async (req, res) => {
  try {
    const { type, category } = req.query;
    const filter = { is_active: true };
    if (category) filter.categories = { $in: [category] };
    else if (type) filter.type = type;

    let sites = await HeritageSite.find(filter).lean();

    if (!sites.length && !category && !type) {
      await HeritageSite.insertMany(HERITAGE_SEED);
      sites = await HeritageSite.find(filter).lean();
    } else if (sites.length > 0 && (!sites[0].lat && sites[0].name === 'Vịnh Hạ Long') && !category && !type) {
      await HeritageSite.deleteMany({});
      await HeritageSite.insertMany(HERITAGE_SEED);
      sites = await HeritageSite.find(filter).lean();
    }
    res.json({ data: sites.map(s => ({ ...s, id: s._id?.toString() })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ─── GET /api/heritage/sites/:slug — language-aware single site ──────────
   ?lang=en  returns English content (name_en, description_en if stored)
   Falls back to Vietnamese if translation not available.
─────────────────────────────────────────────────────────────────────────── */
router.get('/sites/:slug', optionalAuth, async (req, res) => {
  try {
    const supported = ['vi', 'en'];
    const lang = supported.includes(req.query.lang) ? req.query.lang
      : req.headers['accept-language']?.slice(0, 2).toLowerCase() === 'en' ? 'en' : 'vi';

    // Match by page slug (e.g. 'hoi-an' → 'hoi-an.html') or by name
    const slug = req.params.slug;
    const site = await HeritageSite.findOne({
      $or: [
        { page: slug + '.html' },
        { page: slug },
        { name: slug }
      ]
    }).lean();

    if (!site) return res.status(404).json({ error: 'Không tìm thấy di sản' });

    // Build localised content — fall back to Vietnamese fields if EN not stored
    const localised = {
      name:        lang === 'en' ? (site.name_en || site.name) : site.name,
      description: lang === 'en' ? (site.description_en || site.description) : site.description,
      province:    site.province,
      type:        site.type,
      categories:  site.categories,
      unesco:      site.unesco,
      lat:         site.lat,
      lng:         site.lng,
      image_url:   site.image_url,
      page:        site.page,
    };

    // Award gamification points for authenticated site visits (fire-and-forget)
    if (req.user?.userId) {
      awardPoints(req.user.userId, 'site_visit', { siteSlug: slug }).catch(() => {});
    }

    res.json({ ...localised, id: site._id?.toString(), lang });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ─── POST /api/heritage/visit/:slug — explicit visit trigger ─────────────
   Clients that don't use /sites/:slug can call this to register a visit.
─────────────────────────────────────────────────────────────────────────── */
router.post('/visit/:slug', requireAuth, async (req, res) => {
  try {
    const result = await awardPoints(req.user.userId, 'site_visit', { siteSlug: req.params.slug });
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/migrate-categories', async (req, res) => {
  try {
    const TYPE_TO_CAT = {
      'thiên nhiên': ['Thiên nhiên'],
      'văn hóa':    ['Văn hóa'],
      'hỗn hợp':   ['Thiên nhiên', 'Văn hóa', 'Hỗn hợp'],
      'phi vật thể': ['Phi vật thể', 'Văn hóa'],
      'địa chất':   ['Địa chất'],
    };
    const NAMED_CATS = {
      'Vịnh Hạ Long':           ['Thiên nhiên', 'Địa chất'],
      'Phong Nha – Kế Bàng':   ['Thiên nhiên', 'Địa chất'],
      'Quần thể Tràng An':      ['Thiên nhiên', 'Văn hóa', 'Hỗn hợp'],
      'Ruộng Bậc Thang':         ['Thiên nhiên', 'Văn hóa'],
      'Cao nguyên đá Đồng Văn': ['Địa chất', 'Văn hóa'],
    };
    const all = await HeritageSite.find({}).lean();
    let updated = 0;
    for (const site of all) {
      const cats = NAMED_CATS[site.name] || TYPE_TO_CAT[site.type] || ['Văn hóa'];
      if (!site.categories || !site.categories.length) {
        await HeritageSite.findByIdAndUpdate(site._id, { categories: cats });
        updated++;
      }
    }
    res.json({ ok: true, updated });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
