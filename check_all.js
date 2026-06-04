const fs = require('fs');
const api    = fs.readFileSync('api.js', 'utf8');
const routes = fs.readFileSync('routes/userRoutes.js', 'utf8');
const js     = fs.readFileSync('profile.js', 'utf8');
const html   = fs.readFileSync('profile.html', 'utf8');

const checks = [
  ['api.js: deleteAvatar()',           api.includes("deleteAvatar: () =>")],
  ['api.js: deleteCover()',            api.includes("deleteCover: () =>")],
  ['api.js: uploadCoverPhoto()',       api.includes("uploadCoverPhoto")],
  ['api.js: setUser alias',           api.includes("setUser: (u)")],
  ['api.js: apiBase()',               api.includes("apiBase: () =>")],
  ['routes: DELETE /me/avatar',       routes.includes("/me/avatar") && routes.includes("router.delete")],
  ['routes: DELETE /me/cover',        routes.includes("/me/cover")],
  ['profile.js: String cast compare', js.includes("String(rawId) === String")],
  ['profile.js: AppState singleton',  js.includes("const AppState")],
  ['profile.js: initNavAvatar',       js.includes("function initNavAvatar")],
  ['profile.js: showProfileError',    js.includes("function showProfileError")],
  ['profile.js: LunarAPI.apiBase()',  js.includes("LunarAPI.apiBase()")],
  ['profile.js: LunarAPI.setUser',    js.includes("LunarAPI.setUser(")],
  ['profile.html: editProfileBtn',    html.includes('id="editProfileBtn"')],
  ['profile.html: followBtn Theo doi',html.includes('Theo d\u00f5i')],
  ['profile.html: skeleton loaders',  html.includes('profileNameSkel')],
  ['profile.html: ownActions div',    html.includes('id="ownActions"')],
];

let pass = 0, fail = 0;
checks.forEach(([name, ok]) => {
  console.log((ok ? '✅' : '❌') + ' ' + name);
  ok ? pass++ : fail++;
});
console.log(`\n${pass}/${checks.length} checks passed` + (fail ? ` — ${fail} FAILED` : ' — all good!'));
