// A quiet, keyboard-accessible cue for the section currently in view.
// Navigation and all content remain functional without JavaScript.
const storySections = document.querySelectorAll('.story-section');
if ('IntersectionObserver' in window && storySections.length) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      document.querySelectorAll('.story-toc a').forEach(link => {
        if (link.getAttribute('href') === `#${entry.target.id}`) {
          link.setAttribute('aria-current', 'location');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    });
  }, { rootMargin: '-10% 0px -65% 0px' });
  storySections.forEach(section => observer.observe(section));
}

// Freely pan the timeline. Proximity to the pointer (or center on touch) expands roles.
const career = document.querySelector('.career-progression');
if (career) {
  const track = career.querySelector('.career-track');
  const canvas = career.querySelector('.career-canvas');
  const points = [...career.querySelectorAll('.career-point')];
  const dots = [...career.querySelectorAll('.career-dot')];
  const today = career.querySelector('.career-today');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = Math.max(0, points.length - 2);
  let pointerX = null;
  let drag = null;
  let frame = 0;
  career.classList.add('is-enhanced');
  dots.forEach(dot => {dot.disabled = false;});
  const center = index => points[index].offsetLeft + points[index].offsetWidth / 2;
  const updateEdge = () => canvas.style.setProperty('--career-edge', `${Math.max(24, (track.clientWidth - points[0].offsetWidth) / 2)}px`);
  const draw = () => {
    frame = 0;
    const focus = track.scrollLeft + (pointerX === null || drag ? track.clientWidth / 2 : pointerX);
    let closest = 0;
    points.forEach((point, index) => {
      const distance = Math.abs(center(index) - focus);
      const proximity = Math.exp(-Math.pow(distance / 220, 2));
      point.style.setProperty('--role-scale', reducedMotion.matches ? 1 : .78 + .26 * proximity);
      if (distance < Math.abs(center(closest) - focus)) closest = index;
    });
    active = closest;
    points.forEach((point, index) => {
      point.classList.toggle('is-active', index === active);
      if (index === active) dots[index].setAttribute('aria-current', 'step');
      else dots[index].removeAttribute('aria-current');
    });
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(draw);
  };
  const go = index => {
    pointerX = null;
    track.scrollTo({left: center(Math.max(0, Math.min(points.length - 1, index))) - track.clientWidth / 2, behavior: reducedMotion.matches ? 'auto' : 'smooth'});
    schedule();
  };
  dots.forEach((dot, index) => dot.addEventListener('click', () => go(index)));
  today.addEventListener('click', () => go(points.length - 1));
  track.addEventListener('scroll', schedule, {passive:true});
  track.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    if (drag) {
      if (Math.abs(event.clientX - drag.x) > 5) {
        track.classList.add('is-dragging');
        track.scrollLeft = drag.left + drag.x - event.clientX;
      }
    } else pointerX = event.clientX - track.getBoundingClientRect().left;
    schedule();
  });
  track.addEventListener('pointerleave', () => {pointerX = null; schedule();});
  track.addEventListener('pointerdown', event => {
    pointerX = null;
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('button')) return;
    drag = {x:event.clientX, left:track.scrollLeft};
    track.setPointerCapture(event.pointerId);
  });
  const finishDrag = () => {
    drag = null;
    pointerX = null;
    track.classList.remove('is-dragging');
    schedule();
  };
  track.addEventListener('pointerup', finishDrag);
  track.addEventListener('pointercancel', finishDrag);
  track.addEventListener('lostpointercapture', finishDrag);
  track.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = {ArrowLeft:active - 1, ArrowRight:active + 1, Home:0, End:points.length - 1}[event.key];
    if (target === undefined) return;
    event.preventDefault();
    go(target);
  });
  window.addEventListener('resize', () => {
    updateEdge();
    track.scrollTo({left:center(active) - track.clientWidth / 2,behavior:'auto'});
    schedule();
  });
  reducedMotion.addEventListener('change', schedule);
  updateEdge();
  track.scrollLeft = center(active) - track.clientWidth / 2;
  draw();
}
