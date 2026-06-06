// cursor.js
document.addEventListener('DOMContentLoaded', () => {
    // Only apply custom cursor on non-touch devices
    if (window.matchMedia("(pointer: coarse)").matches) return;

    // Remove any existing cur element to avoid duplicates from static HTML
    let existingCur = document.getElementById('cur');
    if (existingCur) existingCur.remove();

    // Create central cursor element
    const cur = document.createElement('div');
    cur.id = 'cur';
    document.body.appendChild(cur);
    
    let tx = 0, ty = 0, cx = 0, cy = 0;
    
    document.addEventListener('mousemove', e => { 
        tx = e.clientX; 
        ty = e.clientY; 
    });
    
    if (window.__cursorTickRunning) return;
    window.__cursorTickRunning = true;

    (function tick() { 
        cx += (tx - cx) * 0.16; 
        cy += (ty - cy) * 0.16; 
        cur.style.left = cx + 'px'; 
        cur.style.top = cy + 'px'; 
        requestAnimationFrame(tick); 
    })();

    const addHover = () => document.body.classList.add('ch');
    const removeHover = () => document.body.classList.remove('ch');

    const attachHovers = () => {
        const elements = document.querySelectorAll('a, button, .card-featured, .card-reg, .intang-card, .glass-hover, .folk-card, input, textarea, select, .convo-item, .filter-btn, .menu-item');
        elements.forEach(el => {
            if (!el.dataset.cursorAttached) {
                el.addEventListener('mouseenter', addHover);
                el.addEventListener('mouseleave', removeHover);
                el.dataset.cursorAttached = 'true';
            }
        });
    };

    attachHovers();

    // Re-attach hovers for dynamically added content
    const observer = new MutationObserver((mutations) => {
        let shouldAttach = false;
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                shouldAttach = true;
                break;
            }
        }
        if (shouldAttach) attachHovers();
    });

    observer.observe(document.body, { childList: true, subtree: true });
});
