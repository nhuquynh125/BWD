const fs = require('fs');
const path = require('path');

const templateContent = fs.readFileSync(path.join(__dirname, 'vinh-ha-long.html'), 'utf-8');

const heritageData = [
    {
        filename: 'cao-nguyen-da-dong-van.html',
        id: 'cao-nguyen-da-dong-van',
        name: 'Cao nguyên đá Đồng Văn',
        shortName: 'Đồng Văn',
        eyebrow: 'Công viên địa chất toàn cầu – UNESCO 2010',
        heroDesc: 'Vùng đất của đá, nơi những dãy núi đá vôi xám xịt nhô lên giữa mây mù, tạo nên khung cảnh hùng vĩ và ngoạn mục bậc nhất Việt Nam.',
        youtubeUrl: 'https://www.youtube.com/embed/5a1_72A_a20',
        introTitle: 'Huyền thoại <em>đá xám</em>',
        introDesc: 'Cao nguyên đá Đồng Văn là công viên địa chất toàn cầu đầu tiên của Việt Nam, chứa đựng những dấu ấn lịch sử phát triển vỏ trái đất, cùng sự đa dạng văn hóa của các dân tộc thiểu số vùng cao.',
        stats: [
            { val: '2.356 km²', lbl: 'Diện tích' },
            { val: '1.000m-1.600m', lbl: 'Độ cao' },
            { val: 'UNESCO 2010', lbl: 'Công nhận' }
        ],
        exploreTitle: 'Khám phá <em>Đồng Văn</em>',
        exploreItems: [
            { icon: '⛰️', name: 'Rừng đá lởm chởm', desc: 'Hàng ngàn đỉnh núi đá vôi với hình thù kỳ dị, sắc nhọn vươn lên giữa nền trời mây trắng.' },
            { icon: '🌸', name: 'Mùa hoa tam giác mạch', desc: 'Sắc hồng mỏng manh của hoa tam giác mạch phủ kín những sườn đồi, làm mềm đi sự gai góc của đá.' },
            { icon: '🏘️', name: 'Nhà trình tường', desc: 'Những ngôi nhà đất với mái ngói âm dương cổ kính, in đậm dấu ấn văn hóa của đồng bào dân tộc.' }
        ],
        historyContent: 'Cao nguyên đá Đồng Văn không chỉ là một kỳ quan địa chất mà còn là bảo tàng văn hóa sống động của 17 dân tộc thiểu số. Những cung đường uốn lượn, những phiên chợ vùng cao rực rỡ sắc màu tạo nên sức hút mãnh liệt cho mảnh đất địa đầu tổ quốc.'
    },
    {
        filename: 'co-do-hue.html',
        id: 'co-do-hue',
        name: 'Cố đô Huế',
        shortName: 'Huế',
        eyebrow: 'Di sản văn hóa – UNESCO 1993',
        heroDesc: 'Kinh đô xưa của triều Nguyễn, nơi lưu giữ những đền đài, lăng tẩm uy nghiêm, cùng dòng sông Hương thơ mộng, tĩnh lặng.',
        youtubeUrl: 'https://www.youtube.com/embed/K1ie-Vgss-Q',
        introTitle: 'Dấu ấn <em>hoàng triều</em>',
        introDesc: 'Quần thể di tích Cố đô Huế là tài sản vô giá của dân tộc, minh chứng cho một thời kỳ lịch sử hào hùng và rực rỡ của triều đại phong kiến cuối cùng tại Việt Nam.',
        stats: [
            { val: 'UNESCO 1993', lbl: 'Công nhận' },
            { val: '143 năm', lbl: 'Triều Nguyễn' },
            { val: '16', lbl: 'Điểm di tích' }
        ],
        exploreTitle: 'Khám phá <em>Huế</em>',
        exploreItems: [
            { icon: '🏯', name: 'Đại Nội uy nghiêm', desc: 'Trung tâm chính trị của triều đình, với những cung điện lộng lẫy, ngói hoàng lưu ly rực rỡ.' },
            { icon: '🏞️', name: 'Lăng tẩm huyền bí', desc: 'Nơi an nghỉ của các vị vua, mỗi lăng tẩm mang một nét kiến trúc độc đáo, hòa mình vào thiên nhiên.' },
            { icon: '⛵', name: 'Sông Hương núi Ngự', desc: 'Biểu tượng của xứ Huế mộng mơ, dòng sông hiền hòa chảy qua lòng thành phố mang theo những câu hò vĩ dạ.' }
        ],
        historyContent: 'Được xây dựng từ đầu thế kỷ 19, Cố đô Huế là một kiệt tác về quy hoạch đô thị và kiến trúc cảnh quan. Mặc dù trải qua nhiều biến cố lịch sử, quần thể di tích vẫn giữ được vẻ đẹp trầm mặc, cổ kính, làm say lòng biết bao du khách thập phương.'
    },
    {
        filename: 'hoang-thanh-thang-long.html',
        id: 'hoang-thanh-thang-long',
        name: 'Hoàng thành Thăng Long',
        shortName: 'Thăng Long',
        eyebrow: 'Di sản văn hóa – UNESCO 2010',
        heroDesc: 'Quần thể di tích gắn liền với lịch sử ngàn năm văn hiến của thủ đô Hà Nội, trung tâm quyền lực của nhiều triều đại.',
        youtubeUrl: 'https://www.youtube.com/embed/K1ie-Vgss-Q',
        introTitle: 'Hồn thiêng <em>sông núi</em>',
        introDesc: 'Khu trung tâm Hoàng thành Thăng Long là minh chứng độc đáo về sự giao thoa văn hóa, lịch sử và nghệ thuật kiến trúc của dân tộc Việt Nam qua hàng ngàn năm.',
        stats: [
            { val: 'UNESCO 2010', lbl: 'Công nhận' },
            { val: '1300 năm', lbl: 'Lịch sử' },
            { val: '18 ha', lbl: 'Diện tích' }
        ],
        exploreTitle: 'Khám phá <em>Hoàng Thành</em>',
        exploreItems: [
            { icon: '⛩️', name: 'Đoan Môn', desc: 'Cửa chính phía Nam dẫn vào Cấm thành, uy nghi và trầm mặc nhuốm màu thời gian.' },
            { icon: '🏺', name: 'Khu khảo cổ 18 Hoàng Diệu', desc: 'Nơi phát hiện hàng triệu hiện vật quý giá, minh chứng cho sự phát triển liên tục của kinh đô Thăng Long.' },
            { icon: '🐉', name: 'Điện Kính Thiên', desc: 'Trung tâm của Hoàng thành, nơi cử hành các nghi lễ quan trọng nhất của triều đình.' }
        ],
        historyContent: 'Được khởi dựng từ thời Lý, Hoàng thành Thăng Long đã trải qua nhiều thăng trầm lịch sử cùng thủ đô Hà Nội. Những tàn tích còn lại dưới lòng đất và các công trình trên mặt đất là di sản vô giá, kể lại câu chuyện về một trung tâm quyền lực chính trị và văn hóa lâu đời.'
    },
    {
        filename: 'hoi-an.html',
        id: 'hoi-an',
        name: 'Phố cổ Hội An',
        shortName: 'Hội An',
        eyebrow: 'Di sản văn hóa – UNESCO 1999',
        heroDesc: 'Đô thị cổ kính nằm bên bờ sông Hoài, nơi những dãy nhà cổ ngói âm dương và những chiếc đèn lồng rực rỡ sắc màu hòa quyện làm một.',
        youtubeUrl: 'https://www.youtube.com/embed/K1ie-Vgss-Q',
        introTitle: 'Nét duyên <em>phố Hội</em>',
        introDesc: 'Hội An từng là thương cảng quốc tế sầm uất, nơi giao thoa văn hóa giữa Việt Nam và các quốc gia trên thế giới. Ngày nay, vẻ đẹp bình yên, thơ mộng của phố cổ vẫn được gìn giữ nguyên vẹn.',
        stats: [
            { val: 'UNESCO 1999', lbl: 'Công nhận' },
            { val: '1.360', lbl: 'Di tích kiến trúc' },
            { val: 'Thế kỷ 16-17', lbl: 'Thời kỳ hoàng kim' }
        ],
        exploreTitle: 'Khám phá <em>Hội An</em>',
        exploreItems: [
            { icon: '🏮', name: 'Đêm đèn lồng', desc: 'Ánh sáng huyền ảo từ hàng ngàn chiếc đèn lồng chiếu rọi trên dòng sông Hoài thơ mộng.' },
            { icon: '🌉', name: 'Chùa Cầu', desc: 'Biểu tượng của Hội An, công trình kiến trúc độc đáo kết hợp giữa Việt Nam và Nhật Bản.' },
            { icon: '🏘️', name: 'Nhà cổ', desc: 'Những ngôi nhà gỗ cổ kính với kiến trúc truyền thống, mang đậm dấu ấn thời gian.' }
        ],
        historyContent: 'Sự pha trộn tinh tế giữa các phong cách kiến trúc bản địa và ngoại lai đã tạo nên một Hội An độc nhất vô nhị. Từ những hội quán của người Hoa, những ngôi nhà cổ của thương nhân Nhật Bản đến kiến trúc truyền thống Việt Nam, tất cả đều góp phần làm nên sức hấp dẫn của di sản này.'
    },
    {
        filename: 'phong-nha-ke-bang.html',
        id: 'phong-nha-ke-bang',
        name: 'Vườn quốc gia Phong Nha – Kẻ Bàng',
        shortName: 'Phong Nha',
        eyebrow: 'Thiên nhiên – UNESCO 2003 & 2015',
        heroDesc: 'Vương quốc hang động kỳ vĩ ẩn mình dưới những cánh rừng nguyên sinh xanh thẳm, nơi sở hữu hang động lớn nhất thế giới.',
        youtubeUrl: 'https://www.youtube.com/embed/K1ie-Vgss-Q',
        introTitle: 'Kiệt tác <em>tạo hóa</em>',
        introDesc: 'Phong Nha – Kẻ Bàng là một trong những vùng đá vôi nhiệt đới cổ đại nhất thế giới, với hệ thống hang động tráng lệ, sông ngầm và thạch nhũ tuyệt đẹp.',
        stats: [
            { val: '1.233 km²', lbl: 'Diện tích' },
            { val: '300+', lbl: 'Hang động' },
            { val: '2× UNESCO', lbl: 'Công nhận' }
        ],
        exploreTitle: 'Khám phá <em>Phong Nha</em>',
        exploreItems: [
            { icon: '🦇', name: 'Hang động kỳ vĩ', desc: 'Khám phá những hang động tuyệt đẹp với thạch nhũ muôn hình vạn trạng, kiến tạo qua hàng triệu năm.' },
            { icon: '🚣', name: 'Sông ngầm xuyên núi', desc: 'Du thuyền trên dòng sông ngầm dài nhất thế giới, len lỏi qua những vòm hang hùng vĩ.' },
            { icon: '🌳', name: 'Rừng nguyên sinh', desc: 'Hệ sinh thái phong phú với nhiều loài động thực vật quý hiếm được bảo tồn nghiêm ngặt.' }
        ],
        historyContent: 'Được UNESCO vinh danh hai lần, Phong Nha – Kẻ Bàng không chỉ nổi tiếng với vẻ đẹp địa chất mà còn đóng vai trò quan trọng trong việc bảo vệ đa dạng sinh học toàn cầu. Đây là điểm đến lý tưởng cho những người đam mê khám phá thiên nhiên hoang dã.'
    },
    {
        filename: 'quan-the-trang-an.html',
        id: 'quan-the-trang-an',
        name: 'Quần thể danh thắng Tràng An',
        shortName: 'Tràng An',
        eyebrow: 'Hỗn hợp – UNESCO 2014',
        heroDesc: 'Vịnh Hạ Long trên cạn với những dãy núi đá vôi trùng điệp, hang động xuyên thủy và những ngôi đền cổ kính nằm chênh vênh.',
        youtubeUrl: 'https://www.youtube.com/embed/K1ie-Vgss-Q',
        introTitle: 'Bức tranh <em>thủy mặc</em>',
        introDesc: 'Tràng An là di sản hỗn hợp đầu tiên của Việt Nam, kết hợp hài hòa giữa vẻ đẹp thiên nhiên ngoạn mục và những giá trị văn hóa, lịch sử lâu đời.',
        stats: [
            { val: 'UNESCO 2014', lbl: 'Công nhận' },
            { val: '6.226 ha', lbl: 'Diện tích lõi' },
            { val: '3', lbl: 'Khu vực chính' }
        ],
        exploreTitle: 'Khám phá <em>Tràng An</em>',
        exploreItems: [
            { icon: '🛶', name: 'Chèo thuyền ngoạn cảnh', desc: 'Trôi theo dòng nước trong vắt, lướt qua những ngọn núi đá vôi sừng sững.' },
            { icon: '🕳️', name: 'Hang động xuyên thủy', desc: 'Khám phá hệ thống hang động bí ẩn, nối liền những thung lũng khép kín.' },
            { icon: '🛕', name: 'Đền chùa cổ kính', desc: 'Viếng thăm những ngôi đền linh thiêng, gắn liền với lịch sử dựng nước và giữ nước.' }
        ],
        historyContent: 'Nơi đây từng là kinh đô của nước Đại Cồ Việt thời Đinh và Tiền Lê. Sự kết hợp giữa cảnh quan thiên nhiên tráng lệ và những dấu ấn lịch sử hào hùng đã tạo nên một Tràng An mang vẻ đẹp huyền bí, cuốn hút mọi ánh nhìn.'
    },
    {
        filename: 'ruong-bac-thang.html',
        id: 'ruong-bac-thang',
        name: 'Ruộng bậc thang Mù Cang Chải',
        shortName: 'Mù Cang Chải',
        eyebrow: 'Di tích quốc gia đặc biệt – 2019',
        heroDesc: 'Những thửa ruộng bậc thang uốn lượn như những dải lụa vàng óng ả vắt ngang lưng chừng trời.',
        youtubeUrl: 'https://www.youtube.com/embed/K1ie-Vgss-Q',
        introTitle: 'Tuyệt tác <em>bàn tay con người</em>',
        introDesc: 'Ruộng bậc thang Mù Cang Chải là kết tinh sức lao động sáng tạo của đồng bào dân tộc Mông, biến những sườn núi dốc đứng thành những cánh đồng trù phú.',
        stats: [
            { val: '2.200 ha', lbl: 'Diện tích ruộng' },
            { val: '3', lbl: 'Xã trọng điểm' },
            { val: '1.000m', lbl: 'Độ cao trung bình' }
        ],
        exploreTitle: 'Khám phá <em>Mù Cang Chải</em>',
        exploreItems: [
            { icon: '🌾', name: 'Mùa lúa chín', desc: 'Khung cảnh rực rỡ khi lúa chín vàng ươm, trải dài ngút ngàn từ đỉnh đồi xuống tận thung lũng.' },
            { icon: '💧', name: 'Mùa nước đổ', desc: 'Những thửa ruộng lấp lánh như những chiếc gương khổng lồ phản chiếu bầu trời.' },
            { icon: '👲', name: 'Văn hóa bản địa', desc: 'Trải nghiệm cuộc sống bình dị và những nét văn hóa độc đáo của đồng bào dân tộc Mông.' }
        ],
        historyContent: 'Trải qua nhiều thế hệ, người Mông đã cải tạo địa hình đồi núi hiểm trở thành những thửa ruộng bậc thang kỳ vĩ. Đây không chỉ là nguồn sống của họ mà còn là một tác phẩm nghệ thuật cảnh quan độc đáo, thu hút du khách từ khắp nơi trên thế giới.'
    },
    {
        filename: 'thanh-dia-my-son.html',
        id: 'thanh-dia-my-son',
        name: 'Thánh địa Mỹ Sơn',
        shortName: 'Mỹ Sơn',
        eyebrow: 'Di sản văn hóa – UNESCO 1999',
        heroDesc: 'Quần thể đền tháp Chăm Pa cổ kính, mang vẻ đẹp huyền bí và những giá trị nghệ thuật điêu khắc đỉnh cao.',
        youtubeUrl: 'https://www.youtube.com/embed/K1ie-Vgss-Q',
        introTitle: 'Bí ẩn <em>đền tháp</em>',
        introDesc: 'Mỹ Sơn từng là trung tâm tôn giáo quan trọng của vương quốc Chăm Pa. Dù đã trở thành phế tích, những ngọn tháp rêu phong vẫn toát lên vẻ đẹp uy nghiêm và cuốn hút.',
        stats: [
            { val: 'UNESCO 1999', lbl: 'Công nhận' },
            { val: '70+', lbl: 'Công trình kiến trúc' },
            { val: 'Thế kỷ 4-13', lbl: 'Thời kỳ xây dựng' }
        ],
        exploreTitle: 'Khám phá <em>Mỹ Sơn</em>',
        exploreItems: [
            { icon: '🧱', name: 'Kiến trúc gạch nung', desc: 'Nghệ thuật xây dựng tinh siêu, không sử dụng chất kết dính mà vẫn bền vững qua ngàn năm.' },
            { icon: '🗿', name: 'Điêu khắc đá', desc: 'Những bức phù điêu chạm khắc tinh xảo, tái hiện các vị thần và truyền thuyết Ấn Độ giáo.' },
            { icon: '💃', name: 'Múa Apsara', desc: 'Điệu múa truyền thống uyển chuyển, làm sống lại không gian văn hóa Chăm Pa rực rỡ.' }
        ],
        historyContent: 'Được phát hiện vào cuối thế kỷ 19, Thánh địa Mỹ Sơn là minh chứng rõ nét cho sự giao lưu văn hóa giữa vương quốc Chăm Pa và các nền văn minh khu vực. Quần thể này đóng vai trò quan trọng trong việc nghiên cứu lịch sử, kiến trúc và nghệ thuật của vùng Đông Nam Á.'
    },
    {
        filename: 'thanh-nha-ho.html',
        id: 'thanh-nha-ho',
        name: 'Thành nhà Hồ',
        shortName: 'Thành nhà Hồ',
        eyebrow: 'Di sản văn hóa – UNESCO 2011',
        heroDesc: 'Tòa thành đá độc đáo và đồ sộ nhất Việt Nam, biểu tượng cho sức mạnh và kỹ thuật xây dựng vượt bậc thời kỳ cuối thế kỷ 14.',
        youtubeUrl: 'https://www.youtube.com/embed/K1ie-Vgss-Q',
        introTitle: 'Kiệt tác <em>đá tảng</em>',
        introDesc: 'Thành nhà Hồ là công trình kiến trúc quân sự bằng đá hiếm hoi còn sót lại ở Đông Nam Á, thể hiện sự sáng tạo và nỗ lực phi thường của người xưa.',
        stats: [
            { val: 'UNESCO 2011', lbl: 'Công nhận' },
            { val: '1397', lbl: 'Năm xây dựng' },
            { val: '20.000m³', lbl: 'Đá khối' }
        ],
        exploreTitle: 'Khám phá <em>Thành nhà Hồ</em>',
        exploreItems: [
            { icon: '🏰', name: 'Cổng thành bằng đá', desc: 'Bốn cổng thành xây dựng theo kiến trúc vòm cuốn, vững chãi qua sáu thế kỷ.' },
            { icon: '🪨', name: 'Kỹ thuật ghép đá', desc: 'Những khối đá khổng lồ nặng hàng chục tấn được ghép nối hoàn hảo không cần chất kết dính.' },
            { icon: '🌿', name: 'Dấu tích đền đài', desc: 'Khám phá những nền móng cung điện xưa, tưởng tượng về quy mô hoành tráng của kinh thành.' }
        ],
        historyContent: 'Do Hồ Quý Ly cho xây dựng chỉ trong vòng ba tháng, Thành nhà Hồ từng là kinh đô của nước Đại Ngu. Mặc dù triều đại này tồn tại rất ngắn ngủi, nhưng di sản họ để lại là một tòa thành đá vĩnh cửu, thách thức thời gian và khói lửa chiến tranh.'
    }
];

heritageData.forEach(data => {
    let html = templateContent;
    
    // Replace standard tags
    html = html.replace(/<title>.*?<\/title>/, `<title>${data.name} – LUNAR HERITAGE</title>`);
    html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${data.heroDesc}">`);
    
    // Active link replace
    html = html.replace(/<a href="vinh-ha-long.html" class="active" style="color:#f0ece4;">Vịnh Hạ Long<\/a>/, `<a href="${data.filename}" class="active" style="color:#f0ece4;">${data.name}</a>`);
    
    // Replace Hero
    html = html.replace(/<img loading="lazy" src="\.\/uploads\/ex\/vinh-ha-long\.jpg" alt=".*?">/, `<img loading="lazy" src="./uploads/ex/${data.id}.jpg" alt="${data.name}">`);
    html = html.replace(/<p class="eyebrow">.*?<\/p>/, `<p class="eyebrow">${data.eyebrow}</p>`);
    
    // Replace Title inside <h1> with <em> logic
    const titleParts = data.name.split(' ');
    const lastWord = titleParts.pop();
    const restOfTitle = titleParts.join(' ');
    html = html.replace(/<h1>.*?<\/h1>/, `<h1>${restOfTitle} <em>${lastWord}</em></h1>`);
    
    html = html.replace(/<p class="page-hero-desc">.*?<\/p>/, `<p class="page-hero-desc">${data.heroDesc}</p>`);
    
    // Replace Youtube
    html = html.replace(/<iframe.*?src=".*?".*?><\/iframe>/, `<iframe width="100%" height="400" src="${data.youtubeUrl}" title="${data.name}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`);
    
    // Replace Intro
    html = html.replace(/<h2 class="intro-title">.*?<\/h2>/, `<h2 class="intro-title">${data.introTitle}</h2>`);
    html = html.replace(/<p class="intro-desc">.*?<\/p>/, `<p class="intro-desc">${data.introDesc}</p>`);
    
    // Replace Stats
    html = html.replace(/<div class="stat-row">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/, `<div class="stat-row">
                <div class="stat-item">
                    <span class="stat-val">${data.stats[0].val}</span>
                    <span class="stat-lbl">${data.stats[0].lbl}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-val">${data.stats[1].val}</span>
                    <span class="stat-lbl">${data.stats[1].lbl}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-val">${data.stats[2].val}</span>
                    <span class="stat-lbl">${data.stats[2].lbl}</span>
                </div>
            </div>
        </div>
    </div>`);

    // Replace Explore Title
    html = html.replace(/<h2 class="section-title">.*?<\/h2>/, `<h2 class="section-title">${data.exploreTitle}</h2>`);
    
    // Replace Explore Cards
    html = html.replace(/<div class="explore-grid">([\s\S]*?)<\/div>\s*<\/div>/, `<div class="explore-grid">
        <div class="explore-card">
            <span class="explore-icon">${data.exploreItems[0].icon}</span>
            <h3 class="explore-name">${data.exploreItems[0].name}</h3>
            <p class="explore-desc">${data.exploreItems[0].desc}</p>
        </div>
        <div class="explore-card">
            <span class="explore-icon">${data.exploreItems[1].icon}</span>
            <h3 class="explore-name">${data.exploreItems[1].name}</h3>
            <p class="explore-desc">${data.exploreItems[1].desc}</p>
        </div>
        <div class="explore-card">
            <span class="explore-icon">${data.exploreItems[2].icon}</span>
            <h3 class="explore-name">${data.exploreItems[2].name}</h3>
            <p class="explore-desc">${data.exploreItems[2].desc}</p>
        </div>
    </div>
</div>`);

    // Replace History
    html = html.replace(/<div class="history-block">\s*<p>.*?<\/p>\s*<\/div>/, `<div class="history-block">
        <p>${data.historyContent}</p>
    </div>`);
    
    // Replace Call to Action & Footer mentions of Vịnh Hạ Long
    html = html.replace(/Vịnh Hạ Long/g, data.name);
    
    fs.writeFileSync(path.join(__dirname, data.filename), html);
    console.log(`Updated ${data.filename}`);
});
