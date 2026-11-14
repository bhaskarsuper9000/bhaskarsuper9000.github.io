/* Shared top navigation + theme toggle. Injected so all four pages stay identical. */
(function () {
  const q = new URLSearchParams(location.search);
  const saved = (function(){ try { return localStorage.getItem('a4-theme'); } catch (e) { return null; } })();
  const theme = q.get('theme') || saved;
  if (theme === 'dark' || theme === 'light') document.documentElement.dataset.theme = theme;

  const cur = document.body.dataset.section; // projects | blog
  const links = [
    ['Resume', '../a2-resume/index.html', 'resume'],
    ['Story', '../a3-story/index.html', 'story'],
    ['Projects', 'index.html', 'projects'],
    ['Blog', 'blog.html', 'blog']
  ];
  const nav = document.getElementById('nav');
  nav.innerHTML =
    '<div class="protonote"><div class="wrap">Prototype A4: document-style pages. Resume and Story link to sibling prototypes.</div></div>' +
    '<nav class="topnav" aria-label="Main"><div class="wrap">' +
    '<a class="brand" href="../a1-landing/index.html">Bhaskar Bandyopadhyay</a>' +
    '<ul><li><a href="../a1-landing/index.html">Home</a></li>' +
    links.map(l => '<li><a href="' + l[1] + '"' + (l[2] === cur ? ' aria-current="page"' : '') + '>' + l[0] + '</a></li>').join('') +
    '</ul><button class="theme-btn" type="button" id="themeBtn" aria-label="Toggle light or dark theme">Theme</button></div></nav>';

  document.getElementById('themeBtn').addEventListener('click', function () {
    const dark = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() === '#17181a';
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('a4-theme', next); } catch (e) {}
  });
})();
