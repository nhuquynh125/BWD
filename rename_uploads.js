const fs = require('fs');
const path = require('path');
const dir = path.resolve('d:/BaiTapHTML/files/web/uploads/ex');
const map = {
  ' ': '-',
  'à':'a','á':'a','â':'a','ã':'a','ä':'a','å':'a','ă':'a','ắ':'a','ằ':'a','ẳ':'a','ẵ':'a','ặ':'a',
  'è':'e','é':'e','ê':'e','ë':'e','ề':'e','ế':'e','ể':'e','ễ':'e','ệ':'e',
  'ì':'i','í':'i','î':'i','ï':'i',
  'ò':'o','ó':'o','ô':'o','õ':'o','ö':'o','ơ':'o','ô':'o','ố':'o','ồ':'o','ổ':'o','ỗ':'o','ộ':'o',
  'ù':'u','ú':'u','û':'u','ü':'u','ư':'u','ứ':'u','ừ':'u','ử':'u','ữ':'u','ự':'u',
  'ý':'y','ÿ':'y','ỵ':'y',
  'đ':'d',
  // Uppercase
  'À':'a','Á':'a','Â':'a','Ã':'a','Ä':'a','Å':'a','Ă':'a','Ắ':'a','Ằ':'a','Ẳ':'a','Ẵ':'a','Ặ':'a',
  'È':'e','É':'e','Ê':'e','Ë':'e','Ề':'e','Ế':'e','Ể':'e','Ễ':'e','Ệ':'e',
  'Ì':'i','Í':'i','Î':'i','Ï':'i',
  'Ò':'o','Ó':'o','Ô':'o','Õ':'o','Ö':'o','Ơ':'o','Ố':'o','Ồ':'o','Ổ':'o','Ỗ':'o','Ộ':'o',
  'Ù':'u','Ú':'u','Û':'u','Ü':'u','Ư':'u','Ứ':'u','Ừ':'u','Ử':'u','Ữ':'u','Ự':'u',
  'Ý':'y','Ÿ':'y','Ỵ':'y',
  'Đ':'d'
};
function slug(str){
  return str.replace(/[^a-zA-Z0-9.\-]/g, c=> map[c]||'')
            .replace(/\s+/g,'-')
            .replace(/-+/g,'-')
            .toLowerCase();
}
fs.readdirSync(dir).forEach(f=>{
  const oldPath = path.join(dir,f);
  const newName = slug(f);
  if(newName && newName!==f){
    const newPath = path.join(dir,newName);
    fs.renameSync(oldPath,newPath);
    console.log(`Renamed ${f} -> ${newName}`);
  }
});
