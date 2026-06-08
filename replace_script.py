import os
import re

dir_path = r'd:\BaiTapHTML\files\web'

replacements = {
    'hoi-an.jpg': 'https://scontent.fdad2-1.fna.fbcdn.net/v/t39.30808-6/654943425_1420466086545390_8388932195770794243_n.jpg?stp=dst-jpg_tt6&cstp=mx1365x2048&ctp=s1365x2048&_nc_cat=107&ccb=1-7&_nc_sid=127cfc&_nc_ohc=VJ_XQ9kM9vcQ7kNvwHDR2WA&_nc_oc=Adqa6N4VgCqZzQw7cZYzmdfmAAKRDAEMrc-BJgaOka2L26jGBWbH_B48k4-Vc-0oSFD39rvdjnGDW8lHLSDsckry&_nc_zt=23&_nc_ht=scontent.fdad2-1.fna&_nc_gid=6H_wud4zvp4CMZoHecLbkA&_nc_ss=7b2a8&oh=00_Af-gOF0SPLSUkrp_TMJBMO7phBUYlLIPNAeTRKnevXKowg&oe=6A2C4A8F',
    'phong-nha.jpg': 'https://cdn1z.reatimes.vn/mediav2/upload/userfiles2021/images/letungduong/athic3aan20c490c6b0e1bb9dng08.jpg',
    'ruong-bac-thang.jpg': 'https://images.unsplash.com/photo-1758002514616-7688e17ab6c7?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDMxfHx8ZW58MHx8fHx8',
    'thang-long.jpg': 'https://cdn.tcdulichtphcm.vn/upload/4-2024/images/2024-10-08/doan-mon-1728399408-978-width640height426.jpg',
    'thanh-dia-my-son.jpg': 'https://media.gettyimages.com/id/182114025/photo/my-son-cham-ruins-vietnam.jpg?s=612x612&w=gi&k=20&c=xn9N7d9BRWCawlogypV9OQ0mWpRiX0of3VE1RQkgdzk=',
    'thanh-nha-ho.jpg': 'https://vstatic.vietnam.vn/vietnam/resource/IMAGE/2026/02/04/1770188747313_261d3134447t1993l1-anh-chup-man-hi4.webp',
    'trang-an.jpg': 'https://cafefcdn.com/thumb_w/1200/203337114487263232/2026/4/20/avatar1776729575798-1776729576157129022431.jpg',
    'vinh-ha-long.jpg': 'https://images.unsplash.com/photo-1669819894338-53ab7afc6958?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA=='
}

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return

    original_content = content

    for img_name, new_url in replacements.items():
        # Replace meta tag URLs
        old_meta = f'https://lunarheritage.com/uploads/ex/{img_name}'
        content = content.replace(old_meta, new_url)

        # Replace local paths in img src tags
        # We also need to inject style="object-fit: cover; width: 100%; height: 100%;"
        src_pattern = rf'src=[\"\']\./uploads/ex/{img_name}[\"\']'
        
        def src_replacer(match):
            return f'src="{new_url}" style="object-fit: cover; width: 100%; height: 100%;"'
            
        content = re.sub(src_pattern, src_replacer, content)
        
        # Replace the remaining local paths (like in JS objects or other places)
        old_local = f'./uploads/ex/{img_name}'
        content = content.replace(old_local, new_url)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {filepath}')

for root, _, files in os.walk(dir_path):
    for file in files:
        if file.endswith('.html') or file.endswith('.js'):
            process_file(os.path.join(root, file))

print('Done')
