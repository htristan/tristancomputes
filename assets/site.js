// Once-only entrances. Content is visible by default without JavaScript or motion.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
if ('IntersectionObserver' in window && !motionPreference.matches) {
  const entrances = [...document.querySelectorAll(
    '.selected-section .section-heading, .cards-grid > .work-card, ' +
    '.approach-section > div, .approach-section li, .about-teaser > div, ' +
    '.story-section, .career-heading, .community-leadership > *, .contact-band > *'
  )];
  const illustrations = [...document.querySelectorAll('.project-mini, .proof-art')];
  const reveal = element => {
    element.classList.remove('motion-pending');
    element.classList.add('motion-visible');
    if (element.matches('.project-mini, .proof-art')) element.classList.add('is-playing');
  };
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      reveal(entry.target);
      observer.unobserve(entry.target);
    });
  }, {threshold:0, rootMargin:'0px 0px -24px 0px'});
  entrances.forEach(element => {
    // Restored scroll positions and direct section links should be readable immediately.
    if (element.getBoundingClientRect().top < window.innerHeight - 24) return;
    const siblings = [...element.parentElement.children].filter(sibling => entrances.includes(sibling));
    element.style.setProperty('--entrance-delay', `${Math.min(2, siblings.indexOf(element)) * 70}ms`);
    element.classList.add('motion-enter', 'motion-pending');
    observer.observe(element);
  });
  illustrations.forEach(element => {
    element.classList.add('is-armed');
    observer.observe(element);
  });
  document.addEventListener('focusin', event => {
    const pending = event.target.closest('.motion-pending');
    if (pending) { reveal(pending); observer.unobserve(pending); }
  });
  motionPreference.addEventListener('change', event => {
    if (!event.matches) return;
    observer.disconnect();
    entrances.forEach(reveal);
    illustrations.forEach(element => element.classList.remove('is-armed', 'is-playing'));
  });
}

// Track the story itself; the next-story link and contact section are not reading time.
const readingProgress = document.querySelector('.reading-progress');
const readingContent = document.querySelector('.story-content');
if (readingProgress && readingContent) {
  const fill = readingProgress.querySelector('span');
  let progressFrame = 0;
  const updateProgress = () => {
    progressFrame = 0;
    const bounds = readingContent.getBoundingClientRect();
    const start = bounds.top + window.scrollY - window.innerHeight * .35;
    const end = bounds.bottom + window.scrollY - window.innerHeight * .8;
    const fraction = Math.max(0, Math.min(1, (window.scrollY - start) / Math.max(1, end - start)));
    fill.style.transform = `scaleX(${fraction})`;
  };
  const scheduleProgress = () => {
    if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
  };
  readingProgress.classList.add('is-enabled');
  window.addEventListener('scroll', scheduleProgress, {passive:true});
  window.addEventListener('resize', scheduleProgress);
  window.addEventListener('load', scheduleProgress, {once:true});
  updateProgress();
}

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
