(function () {
  'use strict';

  var body = document.body;
  var nav = document.getElementById('site-nav');
  var menuToggle = document.querySelector('.menu-toggle');
  var backdrop = document.querySelector('[data-menu-backdrop]');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desktopQuery = window.matchMedia('(min-width: 901px)');
  var animated = Array.prototype.slice.call(document.querySelectorAll('.appear'));
  var heroPhoto = document.querySelector('.hero-photo');
  var heroSection = document.querySelector('.hero');
  var revealItems = Array.prototype.slice.call(document.querySelectorAll('.reveal-on-scroll'));
  var capabilityRows = Array.prototype.slice.call(document.querySelectorAll('.capability-row'));
  var caseLinks = Array.prototype.slice.call(document.querySelectorAll('[data-case-target]'));
  var caseSections = Array.prototype.slice.call(document.querySelectorAll('[data-case-section]'));
  var practiceViewport = document.querySelector('[data-practice-viewport]');
  var practiceTrack = document.querySelector('[data-practice-track]');
  var practicePrev = document.querySelector('[data-practice-prev]');
  var practiceNext = document.querySelector('[data-practice-next]');
  var statementSection = document.getElementById('statement');
  var bottleSection = document.getElementById('bottle');

  // Inspiration cards sit in a moving, clipped stage. Retry only a failed
  // request so a transient image/decode error cannot leave a ring slot empty.
  function retryBottleImages() {
    if (!bottleSection) return;
    bottleSection.querySelectorAll('img').forEach(function (image) {
      var retry = function () {
        var attempts = Number(image.dataset.bottleRetry || 0);
        if (image.naturalWidth > 0 || attempts >= 3) return;
        attempts += 1;
        image.dataset.bottleRetry = String(attempts);
        var source = image.currentSrc || image.src;
        image.src = source + (source.indexOf('?') === -1 ? '?' : '&') + 'bottle_retry=' + attempts;
      };

      if (image.dataset.bottleRetryBound !== 'true') {
        image.dataset.bottleRetryBound = 'true';
        image.addEventListener('error', retry);
      }
      if (image.complete && image.naturalWidth === 0) retry();
      if (image.complete && image.naturalWidth > 0 && typeof image.decode === 'function') {
        image.decode().catch(retry);
      }
    });
  }

  retryBottleImages();
  window.addEventListener('pageshow', retryBottleImages);

  // Navigation intentionally relies on the browser's actual history. The old
  // sessionStorage restoration path overwrote unrelated sources and repeatedly
  // scrolled after navigation, which made Back skip pages and visibly glide.
  // The hrefs remain deterministic fallbacks for directly opened deep links.
  function hasSameOriginReferrer() {
    if (!document.referrer || window.history.length <= 1) return false;
    try {
      return new URL(document.referrer).origin === window.location.origin;
    } catch (error) {
      return false;
    }
  }

  function cameFromProject(source) {
    var projectPaths = {
      'charging-station': '/charging-station/',
      'internship-app': '/internship-app/',
      'web-design': '/web-design/',
      'ai-park-assistant': '/ai-park-assistant/',
      'aiot-platform': '/aiot-platform/'
    };
    if (!projectPaths[source] || !document.referrer) return false;
    try {
      var referrer = new URL(document.referrer);
      var referrerPath = referrer.pathname.replace(/\/{2,}/g, '/').replace(/\/?$/, '/');
      return referrer.origin === window.location.origin && referrerPath === projectPaths[source];
    } catch (error) {
      return false;
    }
  }

  document.querySelectorAll('[data-history-back]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!hasSameOriginReferrer()) return;
      event.preventDefault();
      window.history.back();
    });
  });

  // A resume opened from a project's contact page should return straight to
  // that project. Replacing only the current contact entry preserves a true
  // one-step Back action without touching the surrounding browser history.
  document.querySelectorAll('[data-project-resume-history]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var source = link.getAttribute('data-project-resume-history') || '';
      if (!cameFromProject(source)) return;
      event.preventDefault();
      var destination = new URL(link.href, window.location.href);
      destination.searchParams.set('history', 'project');
      window.location.replace(destination.href);
    });
  });

  // Native details handles a single click; keep a double click open as well.
  capabilityRows.forEach(function (row) {
    row.addEventListener('dblclick', function () {
      row.open = true;
    });
  });

  function markIn(element) {
    if (element) element.classList.add('is-in');
  }

  animated.forEach(function (element) {
    element.addEventListener('animationend', function () {
      markIn(element);
    }, { once: true });
  });

  // The fallback keeps the first frame visible when animation APIs are unavailable.
  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(function () {
      animated.forEach(function (element) {
        var animations = typeof element.getAnimations === 'function' ? element.getAnimations() : [];
        var active = animations.some(function (animation) {
          return animation.playState === 'running' || animation.playState === 'finished';
        });
        if (!active || reduceMotion) markIn(element);
      });
      markIn(heroPhoto);
      if (heroPhoto && typeof heroPhoto.play === 'function') heroPhoto.play().catch(function () {});
    });
  });

  // The hero is a muted, decorative video with no user controls. Browsers can
  // pause it while the long page is being inspected; resume it whenever the
  // opening chapter becomes active again so returning to the top never leaves
  // a black video frame behind the copy.
  function resumeHeroVideo() {
    if (!heroPhoto || document.hidden || typeof heroPhoto.play !== 'function') return;
    if (heroPhoto.ended) heroPhoto.currentTime = 0;
    if (heroPhoto.readyState === 0 && heroPhoto.networkState !== 3) heroPhoto.load();
    if (heroPhoto.paused || heroPhoto.ended) heroPhoto.play().catch(function () {});
  }

  if (heroPhoto) {
    ['loadeddata', 'canplay'].forEach(function (eventName) {
      heroPhoto.addEventListener(eventName, resumeHeroVideo);
    });
    heroPhoto.addEventListener('pause', function () {
      if (!document.hidden) window.setTimeout(resumeHeroVideo, 80);
    });
    heroPhoto.addEventListener('error', function () {
      heroPhoto.load();
      window.setTimeout(resumeHeroVideo, 120);
    });
    document.addEventListener('visibilitychange', resumeHeroVideo);
    window.addEventListener('pageshow', resumeHeroVideo);
    if ('IntersectionObserver' in window && heroSection) {
      var heroVideoObserver = new IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) resumeHeroVideo();
      }, { threshold: 0.2 });
      heroVideoObserver.observe(heroSection);
    }
  }

  function closeMenu() {
    body.classList.remove('menu-open');
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', '打开菜单');
    }
    if (backdrop) backdrop.setAttribute('aria-hidden', 'true');
  }

  function openMenu() {
    body.classList.add('menu-open');
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', 'true');
      menuToggle.setAttribute('aria-label', '关闭菜单');
    }
    if (backdrop) backdrop.setAttribute('aria-hidden', 'false');
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      if (body.classList.contains('menu-open')) closeMenu();
      else openMenu();
    });
  }

  if (backdrop) backdrop.addEventListener('click', closeMenu);

  if (nav) {
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeMenu();
  });

  function closeOnDesktop(event) {
    if (event.matches) closeMenu();
  }

  if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', closeOnDesktop);
  else desktopQuery.addListener(closeOnDesktop);

  if (revealItems.length && 'IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var item = entry.target;
        // CENTERED and INSPIRATIONS deliberately retain their full chapter motion.
        var keepsFullMotion = Boolean(item.closest('#statement, #bottle'));

        if (entry.isIntersecting) {
          if (!keepsFullMotion && item.dataset.revealSeen === 'true') {
            item.classList.add('is-revisit');
          }
          item.dataset.revealSeen = 'true';
          item.classList.add('is-visible');
        } else {
          item.classList.remove('is-visible');
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    revealItems.forEach(function (item) { revealObserver.observe(item); });
  } else {
    revealItems.forEach(function (item) { item.classList.add('is-visible'); });
  }

  // Narrative sections fade upward only after they have actually passed the viewport.
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var narrativeSections = [statementSection, bottleSection].filter(Boolean);
    if (narrativeSections.length) {
      var narrativeObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var section = entry.target;
          if (entry.isIntersecting) {
            section.classList.add('is-visible');
            section.classList.remove('is-past');
          } else {
            // Clear the section state off-screen so the next entry can replay its motion.
            section.classList.remove('is-visible');
            section.classList.toggle('is-past', entry.boundingClientRect.top < 0);
          }
        });
      }, { threshold: 0.08, rootMargin: '-6% 0px -8% 0px' });
      narrativeSections.forEach(function (section) { narrativeObserver.observe(section); });
    }
  } else {
    [statementSection, bottleSection].filter(Boolean).forEach(function (section) {
      section.classList.add('is-visible');
    });
  }

  // The case rail follows the article that contains the focus line. Reading all
  // cards on each observer update avoids using only the entries that happened
  // to cross a threshold in that callback, which could leave a stale label.
  function setActiveCase(id) {
    caseLinks.forEach(function (link) {
      var active = link.getAttribute('data-case-target') === id;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
  }

  function updateActiveCase() {
    if (!caseSections.length) return;
    var focusY = window.innerHeight * .4;
    var containing = [];
    var nearest = null;
    var nearestDistance = Infinity;

    caseSections.forEach(function (section) {
      var rect = section.getBoundingClientRect();
      var distance = rect.top > focusY
        ? rect.top - focusY
        : rect.bottom < focusY
          ? focusY - rect.bottom
          : 0;
      if (distance === 0) containing.push({ section: section, center: Math.abs((rect.top + rect.bottom) / 2 - focusY) });
      if (distance < nearestDistance) {
        nearest = section;
        nearestDistance = distance;
      }
    });

    var active = containing.length
      ? containing.sort(function (a, b) { return a.center - b.center; })[0].section
      : nearest;
    if (active) setActiveCase(active.getAttribute('data-case-section'));
  }

  if (caseSections.length && caseLinks.length) {
    // Observe a narrow band around the reading focus instead of relying on
    // whichever cards happened to cross a broad viewport threshold. This
    // keeps the label tied to the card under the focus line even on fast jumps.
    var caseScrollFrame = null;
    function scheduleActiveCaseUpdate() {
      if (caseScrollFrame !== null) return;
      caseScrollFrame = window.requestAnimationFrame(function () {
        caseScrollFrame = null;
        updateActiveCase();
      });
    }

    if ('IntersectionObserver' in window) {
      var caseObserver = new IntersectionObserver(function (entries) {
        if (entries.length) scheduleActiveCaseUpdate();
      }, {
        threshold: [0, .5, 1],
        rootMargin: '-39% 0px -59% 0px'
      });
      caseSections.forEach(function (section) { caseObserver.observe(section); });
    }
    // Recheck between observer thresholds while coalescing work to one frame.
    window.addEventListener('scroll', scheduleActiveCaseUpdate, { passive: true });
    window.addEventListener('resize', scheduleActiveCaseUpdate);
    scheduleActiveCaseUpdate();
  }

  // Small studies use native horizontal scrolling enhanced with drag and arrow controls.
  if (practiceViewport && practiceTrack) {
    var dragging = false;
    var dragStartX = 0;
    var dragStartScroll = 0;
    var dragPointerX = 0;
    var dragFrame = null;
    var carouselPaused = false;
    var carouselInView = false;
    var autoplayFrame = null;
    var autoplayLastTime = 0;

    function slides() {
      return Array.prototype.slice.call(practiceTrack.querySelectorAll('.practice-slide'));
    }

    function updatePracticeControls() {
      // Keep both controls available so a click at either end wraps around.
      if (practicePrev) practicePrev.disabled = false;
      if (practiceNext) practiceNext.disabled = false;
    }

    function slidePosition(item) {
      // The track moves with the scroll container, so use the fixed viewport as
      // the reference and add scrollLeft back to recover the content position.
      var itemRect = item.getBoundingClientRect();
      var viewportRect = practiceViewport.getBoundingClientRect();
      return itemRect.left - viewportRect.left + practiceViewport.scrollLeft;
    }

    function movePractice(direction) {
      var items = slides();
      if (!items.length) return;
      var current = practiceViewport.scrollLeft;
      var max = Math.max(0, practiceViewport.scrollWidth - practiceViewport.clientWidth);
      var targetPosition;
      if (direction > 0) {
        // Once the viewport is at the far edge, the next action wraps to the
        // first card instead of repeatedly targeting the last card's offset.
        if (current >= max - 8) {
          targetPosition = 0;
        } else {
          var next = items.find(function (item) { return slidePosition(item) > current + 8; });
          targetPosition = next ? slidePosition(next) : 0;
        }
      } else {
        if (current <= 8) {
          targetPosition = max;
        } else {
          var previous = items.slice().reverse().find(function (item) { return slidePosition(item) < current - 8; });
          targetPosition = previous ? slidePosition(previous) : max;
        }
      }
      practiceViewport.scrollTo({ left: Math.max(0, Math.min(max, targetPosition)), behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    function stopPracticeAutoplay() {
      if (autoplayFrame) window.cancelAnimationFrame(autoplayFrame);
      autoplayFrame = null;
      autoplayLastTime = 0;
    }

    function advancePracticeAutoplay(timestamp) {
      if (!carouselInView) {
        stopPracticeAutoplay();
        return;
      }

      if (!carouselPaused && !dragging) {
        var max = Math.max(0, practiceViewport.scrollWidth - practiceViewport.clientWidth);
        if (max > 0) {
          if (!autoplayLastTime) autoplayLastTime = timestamp;
          var elapsed = Math.min(80, timestamp - autoplayLastTime);
          // A constant low velocity avoids the hard, card-by-card jumps of the old timer.
          var nextPosition = practiceViewport.scrollLeft + elapsed * .012;
          practiceViewport.scrollLeft = nextPosition >= max - .25 ? 0 : nextPosition;
        }
      }

      autoplayLastTime = timestamp;
      autoplayFrame = window.requestAnimationFrame(advancePracticeAutoplay);
    }

    function startPracticeAutoplay() {
      if (reduceMotion || autoplayFrame || !carouselInView) return;
      // 手机端（触屏设备）禁止自动轮播，仅支持手动滑动切换；PC 端保持原自动轮播
      if (window.matchMedia && window.matchMedia('(max-width: 900px), (hover: none), (pointer: coarse)').matches) return;
      autoplayFrame = window.requestAnimationFrame(advancePracticeAutoplay);
    }

    if (practicePrev) practicePrev.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      carouselPaused = true;
      movePractice(-1);
    });
    if (practiceNext) practiceNext.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      carouselPaused = true;
      movePractice(1);
    });

    practiceViewport.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        carouselPaused = true;
        movePractice(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        carouselPaused = true;
        movePractice(-1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        carouselPaused = true;
        practiceViewport.scrollTo({ left: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      } else if (event.key === 'End') {
        event.preventDefault();
        carouselPaused = true;
        practiceViewport.scrollTo({ left: practiceViewport.scrollWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    });

    practiceViewport.addEventListener('pointerdown', function (event) {
      // Leave touch gestures to native horizontal scrolling; drag enhancement is for mouse and pen.
      if (event.pointerType === 'touch' || event.target.closest('button, input, a')) return;
      event.preventDefault();
      carouselPaused = true;
      dragging = true;
      dragStartX = event.clientX;
      dragPointerX = event.clientX;
      dragStartScroll = practiceViewport.scrollLeft;
      practiceViewport.classList.add('is-dragging');
      practiceViewport.setPointerCapture(event.pointerId);
    });

    practiceViewport.addEventListener('pointermove', function (event) {
      if (!dragging) return;
      dragPointerX = event.clientX;
      if (dragFrame) return;
      dragFrame = window.requestAnimationFrame(function () {
        dragFrame = null;
        if (dragging) practiceViewport.scrollLeft = dragStartScroll - (dragPointerX - dragStartX);
      });
    });

    function endDrag(event) {
      if (!dragging) return;
      if (event && typeof event.clientX === 'number') dragPointerX = event.clientX;
      if (dragFrame) {
        window.cancelAnimationFrame(dragFrame);
        dragFrame = null;
      }
      practiceViewport.scrollLeft = dragStartScroll - (dragPointerX - dragStartX);
      dragging = false;
      practiceViewport.classList.remove('is-dragging');
      if (event && typeof event.pointerId === 'number' && practiceViewport.hasPointerCapture(event.pointerId)) practiceViewport.releasePointerCapture(event.pointerId);
      // Keep autoplay paused while the pointer remains over the carousel; if
      // the pointer was released outside it, let the normal hover state resume.
      carouselPaused = Boolean(practiceCarousel && practiceCarousel.matches(':hover'));
    }

    practiceViewport.addEventListener('pointerup', endDrag);
    practiceViewport.addEventListener('pointercancel', endDrag);
    practiceViewport.addEventListener('lostpointercapture', endDrag);
    var practiceCarousel = document.querySelector('[data-practice-carousel]');
    if (practiceCarousel) {
      practiceCarousel.addEventListener('mouseenter', function () { carouselPaused = true; });
      practiceCarousel.addEventListener('mouseleave', function () { carouselPaused = false; });
      practiceCarousel.addEventListener('focusin', function () { carouselPaused = true; });
      practiceCarousel.addEventListener('focusout', function () { carouselPaused = false; });
    }
    practiceViewport.addEventListener('scroll', updatePracticeControls, { passive: true });
    window.addEventListener('resize', updatePracticeControls);
    updatePracticeControls();

    if ('IntersectionObserver' in window) {
      var practiceObserver = new IntersectionObserver(function (entries) {
        carouselInView = entries.some(function (entry) { return entry.isIntersecting; });
        if (carouselInView) startPracticeAutoplay();
        else stopPracticeAutoplay();
      }, { threshold: 0.15 });
      practiceObserver.observe(practiceViewport);
      var initialPracticeRect = practiceViewport.getBoundingClientRect();
      carouselInView = initialPracticeRect.bottom > 0 && initialPracticeRect.top < window.innerHeight;
      if (carouselInView) startPracticeAutoplay();
    } else {
      carouselInView = true;
      startPracticeAutoplay();
    }

    // Keep the first study's controls local to its video so the carousel stays
    // usable while the media can be previewed without leaving the page.
    practiceViewport.querySelectorAll('[data-practice-video-wrap]').forEach(function (wrap) {
      var video = wrap.querySelector('[data-practice-video]');
      if (!video) return;
      // The motion study is a continuous loop; keep this explicit for
      // browsers that do not preserve the markup attribute after reloads.
      video.loop = true;
      var playButton = wrap.querySelector('[data-practice-video-play]');
      var soundButton = wrap.querySelector('[data-practice-video-sound]');
      var progress = wrap.querySelector('[data-practice-video-progress]');
      var volume = wrap.querySelector('[data-practice-video-volume]');
      var currentTime = wrap.querySelector('[data-practice-video-current]');
      var duration = wrap.querySelector('[data-practice-video-duration]');
      var fullscreenButton = wrap.querySelector('[data-practice-video-fullscreen]');
      var fullscreenScrollLeft = null;
      var fullscreenPageScrollY = null;
      var fullscreenScrollRestoration = null;
      var fullscreenWasActive = false;
      var fullscreenControlsLocked = false;
      var fullscreenRequestPending = false;

      wrap.classList.add('is-muted');

      // Pointer focus can otherwise keep the controls visible after leaving the
      // media. Clear pointer focus so the hover-only presentation can close.
      wrap.addEventListener('pointerleave', function () {
        if (document.activeElement && wrap.contains(document.activeElement) && document.activeElement.matches('button, input')) {
          document.activeElement.blur();
        }
      });

      function formatTime(value) {
        if (!isFinite(value)) return '0:00';
        var seconds = Math.max(0, Math.floor(value));
        var minutes = Math.floor(seconds / 60);
        var remainder = String(seconds % 60).padStart(2, '0');
        return minutes + ':' + remainder;
      }

      function syncVideoState() {
        wrap.classList.toggle('is-playing', !video.paused);
        if (playButton) playButton.setAttribute('aria-label', video.paused ? '播放视频' : '暂停视频');
        var isMuted = video.muted || video.volume === 0;
        wrap.classList.toggle('is-muted', isMuted);
        if (soundButton) {
          soundButton.setAttribute('aria-pressed', isMuted ? 'false' : 'true');
          soundButton.setAttribute('aria-label', isMuted ? '打开声音' : '静音');
        }
        if (volume) volume.value = String(video.volume);
        if (progress && isFinite(video.duration)) {
          progress.max = String(video.duration);
          progress.value = String(video.currentTime || 0);
        }
        if (currentTime) currentTime.textContent = formatTime(video.currentTime);
        if (duration) duration.textContent = formatTime(video.duration);
      }

      function fullscreenElement() {
        return document.fullscreenElement || document.webkitFullscreenElement || null;
      }

      function setFullscreenControlsVisible(active) {
        if (active) wrap.setAttribute('data-fullscreen-controls', 'locked');
        else wrap.removeAttribute('data-fullscreen-controls');
        [wrap.querySelector('.practice-video__audio'), wrap.querySelector('.practice-video__controls')].forEach(function (element) {
          if (!element) return;
          if (active) {
            // Inline priority keeps custom controls visible in the browser's
            // fullscreen top layer, even when a transient fullscreen event
            // or hover transition would otherwise hide them.
            element.style.setProperty('opacity', '1', 'important');
            element.style.setProperty('visibility', 'visible', 'important');
            element.style.setProperty('pointer-events', 'auto', 'important');
            // Keep the controls in their own composited layer above the
            // fullscreen video. Some Chrome GPU paths otherwise paint the
            // video bitmap over visible, but still clickable, DOM controls.
            element.style.setProperty('transform', 'translate3d(0, 0, 1px)', 'important');
          } else {
            element.style.removeProperty('opacity');
            element.style.removeProperty('visibility');
            element.style.removeProperty('pointer-events');
            element.style.removeProperty('transform');
          }
        });
      }

      function syncFullscreenState(fromFullscreenChange) {
        var activeElement = fullscreenElement();
        var active = activeElement === wrap || activeElement === video;
        var wasFullscreen = fullscreenWasActive;

        // A fullscreen request can briefly report no active element while the
        // browser promotes the wrapper to its top layer. The controls are
        // deliberately unlocked only by a real fullscreenchange exit event,
        // never by one of those transient state probes.
        if (active) {
          fullscreenControlsLocked = true;
          fullscreenRequestPending = false;
        } else if (fromFullscreenChange && wasFullscreen) {
          fullscreenControlsLocked = false;
          fullscreenRequestPending = false;
        } else if (!fullscreenRequestPending && !wasFullscreen) {
          fullscreenControlsLocked = false;
        }

        // Fullscreen reparents the media wrapper in the browser's top layer.
        // Remember the carousel position so closing fullscreen returns to the
        // exact card the user was viewing instead of resetting to the start.
        if (!active && wasFullscreen && fromFullscreenChange && fullscreenScrollLeft !== null) {
          var restoreScrollLeft = fullscreenScrollLeft;
          var restorePageScrollY = fullscreenPageScrollY;
          var restoreScrollRestoration = fullscreenScrollRestoration;
          fullscreenScrollLeft = null;
          fullscreenPageScrollY = null;
          fullscreenScrollRestoration = null;
          var restorePracticePosition = function () {
            practiceViewport.scrollLeft = restoreScrollLeft;
            if (restorePageScrollY !== null) {
              try { window.history.scrollRestoration = 'manual'; } catch (error) {}
              var root = document.documentElement;
              var pageBody = document.body;
              var previousRootBehavior = root.style.scrollBehavior;
              var previousBodyBehavior = pageBody ? pageBody.style.scrollBehavior : '';
              if (pageBody) pageBody.classList.remove('practice-fullscreen-open');
              // The site uses smooth scrolling for anchor links. Temporarily
              // override that policy so closing fullscreen is an instant,
              // exact restoration rather than a visible glide from the top.
              root.style.setProperty('scroll-behavior', 'auto', 'important');
              if (pageBody) pageBody.style.setProperty('scroll-behavior', 'auto', 'important');
              window.scrollTo(0, restorePageScrollY);
              root.scrollTop = restorePageScrollY;
              if (pageBody) pageBody.scrollTop = restorePageScrollY;
              root.style.scrollBehavior = previousRootBehavior;
              if (pageBody) pageBody.style.scrollBehavior = previousBodyBehavior;
            }
          };
          // Restore immediately and once per following frame. Browsers may
          // perform their own top-layer reflow after fullscreenchange; these
          // short, synchronous corrections keep the return visually still.
          restorePracticePosition();
          window.requestAnimationFrame(restorePracticePosition);
          window.requestAnimationFrame(function () { window.requestAnimationFrame(restorePracticePosition); });
          window.setTimeout(restorePracticePosition, 80);
          window.setTimeout(restorePracticePosition, 220);
          window.setTimeout(function () {
            try { window.history.scrollRestoration = restoreScrollRestoration || 'auto'; } catch (error) {}
          }, 260);
        }
        if (active) fullscreenWasActive = true;
        else if (fromFullscreenChange && wasFullscreen) fullscreenWasActive = false;
        wrap.classList.toggle('is-fullscreen', active);
        // Fullscreen is an explicit viewing mode: controls remain available
        // until the user exits, independent of pointer hover state.
        wrap.classList.toggle('is-controls-visible', fullscreenControlsLocked);
        document.body.classList.toggle('practice-fullscreen-open', fullscreenControlsLocked);
        setFullscreenControlsVisible(fullscreenControlsLocked);
        if (fullscreenButton) {
          fullscreenButton.setAttribute('aria-label', active ? '缩小视频' : '放大视频');
          fullscreenButton.setAttribute('title', active ? '缩小' : '放大');
        }
      }

      if (playButton) {
        playButton.addEventListener('click', function () {
          if (video.paused) video.play().catch(function () {});
          else video.pause();
          carouselPaused = true;
        });
      }

      if (soundButton) {
        soundButton.addEventListener('click', function () {
          if (video.muted || video.volume === 0) {
            if (video.volume === 0) video.volume = 1;
            video.muted = false;
          } else {
            video.muted = true;
          }
          if (video.paused) video.play().catch(function () {});
          carouselPaused = true;
          syncVideoState();
        });
      }

      if (volume) {
        volume.addEventListener('input', function () {
          video.volume = Number(volume.value);
          video.muted = video.volume === 0;
          carouselPaused = true;
          syncVideoState();
        });
      }

      if (progress) {
        progress.addEventListener('input', function () {
          video.currentTime = Number(progress.value) || 0;
          carouselPaused = true;
          syncVideoState();
        });
      }

      if (fullscreenButton) {
        fullscreenButton.addEventListener('click', function () {
          var activeElement = fullscreenElement();
          if (activeElement === wrap || activeElement === video) {
            var exit = document.exitFullscreen || document.webkitExitFullscreen;
            if (exit) exit.call(document);
          } else {
            fullscreenScrollLeft = practiceViewport.scrollLeft;
            fullscreenPageScrollY = Math.max(0, window.pageYOffset || window.scrollY || 0);
            try {
              fullscreenScrollRestoration = window.history.scrollRestoration || 'auto';
              window.history.scrollRestoration = 'manual';
            } catch (error) {
              fullscreenScrollRestoration = null;
            }
            var target = wrap;
            var request = target.requestFullscreen || target.webkitRequestFullscreen;
            // Make the controls available during the short period before the
            // browser dispatches fullscreenchange (some browsers delay it).
            fullscreenControlsLocked = true;
            fullscreenRequestPending = true;
            wrap.classList.add('is-controls-visible');
            document.body.classList.add('practice-fullscreen-open');
            setFullscreenControlsVisible(true);
            if (request) {
              var requestResult = request.call(target);
              if (requestResult && typeof requestResult.then === 'function') {
                requestResult.then(function () {
                  fullscreenRequestPending = false;
                  syncFullscreenState();
                }).catch(function () {
                  fullscreenScrollLeft = null;
                  fullscreenRequestPending = false;
                  fullscreenControlsLocked = false;
                  syncFullscreenState();
                });
              }
            } else if (video.webkitEnterFullscreen) {
              video.webkitEnterFullscreen();
            }
          }
          carouselPaused = true;
          // For an exit, sync immediately; for an entry the fullscreenchange
          // event (plus the timeout below) will confirm the actual state.
          if (activeElement === wrap || activeElement === video) syncFullscreenState();
          // Some browsers dispatch fullscreenchange after the click cycle.
          window.setTimeout(syncFullscreenState, 40);
        });
      }

      ['loadedmetadata', 'timeupdate', 'durationchange', 'volumechange', 'play', 'pause', 'ended'].forEach(function (eventName) {
        video.addEventListener(eventName, syncVideoState);
      });
      video.addEventListener('ended', function () {
        // Keep the study running even in browsers that ignore the loop
        // attribute after a transient media decode error.
        if (!video.loop) {
          video.currentTime = 0;
          video.play().catch(function () {});
        }
      });
      ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (eventName) {
        document.addEventListener(eventName, function () {
          syncFullscreenState(true);
        });
      });
      syncVideoState();
      syncFullscreenState();

      function playIfVisible() {
        var rect = wrap.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight && video.paused) {
          video.play().catch(function () {});
        }
      }

      ['loadedmetadata', 'loadeddata', 'canplay'].forEach(function (eventName) {
        video.addEventListener(eventName, playIfVisible);
      });

      // A transient media error can occur while the browser returns this
      // slide to view. Reload once and resume only if it is visible.
      var recoveringVideo = false;
      video.addEventListener('error', function () {
        if (recoveringVideo) return;
        recoveringVideo = true;
        window.setTimeout(function () {
          video.load();
          window.setTimeout(function () {
            recoveringVideo = false;
            playIfVisible();
          }, 180);
        }, 80);
      });

      if ('IntersectionObserver' in window) {
        var videoObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) playIfVisible();
            else if (!video.paused) video.pause();
          });
        }, { threshold: 0.08 });
        videoObserver.observe(wrap);
      } else {
        video.play().catch(function () {});
      }
    });
  }

  // Contact dialogs are present on the home page and the standalone contact page.
  var contactTriggers = Array.prototype.slice.call(document.querySelectorAll('[data-contact-modal-open]'));
  var contactModals = Array.prototype.slice.call(document.querySelectorAll('[data-contact-modal]'));

  function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(value);
    }

    return new Promise(function (resolve, reject) {
      var textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      var copied = false;
      try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
      textarea.remove();
      if (copied) resolve();
      else reject(new Error('copy failed'));
    });
  }

  function closeContactModal(modal) {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (!contactModals.some(function (item) { return !item.hidden; })) body.classList.remove('modal-open');
    if (modal._trigger && typeof modal._trigger.focus === 'function') modal._trigger.focus();
  }

  function openContactModal(modal, trigger) {
    if (!modal) return;
    modal._trigger = trigger;
    modal.hidden = false;
    body.classList.add('modal-open');
    var closeButton = modal.querySelector('.contact-modal__close');
    if (closeButton) closeButton.focus();
  }

  contactTriggers.forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      var section = trigger.closest('section');
      var modal = section ? section.querySelector('[data-contact-modal]') : contactModals[0];
      openContactModal(modal, trigger);
    });
  });

  contactModals.forEach(function (modal) {
    modal.querySelectorAll('[data-contact-modal-close]').forEach(function (closeTarget) {
      closeTarget.addEventListener('click', function () { closeContactModal(modal); });
    });

    var copyButton = modal.querySelector('[data-copy-wechat]');
    var copyStatus = modal.querySelector('[data-copy-status]');
    if (copyButton) {
      copyButton.addEventListener('click', function () {
        var value = copyButton.getAttribute('data-copy-wechat') || '';
        copyText(value).then(function () {
          if (copyStatus) copyStatus.textContent = '复制成功';
        }).catch(function () {
          if (copyStatus) copyStatus.textContent = '复制失败，请手动复制';
        });
      });
    }
  });

  // Keep Escape scoped to whichever dialog is currently open.
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    contactModals.forEach(function (modal) { closeContactModal(modal); });
  });

  // Keep the full resume visible initially, then transform it inside a clipped canvas.
  document.querySelectorAll('[data-resume-canvas]').forEach(function (canvas) {
    var image = canvas.querySelector('[data-resume-image]');
    if (!image) return;

    var fitScale = 1;
    var scale = 1;
    var panX = 0;
    var panY = 0;
    var draggingResume = false;
    var dragStartX = 0;
    var dragStartY = 0;
    var dragStartPanX = 0;
    var dragStartPanY = 0;
    var hasInteracted = false;

    function dimensions() {
      return {
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height
      };
    }

    function clampPan() {
      var imageSize = dimensions();
      var maxX = Math.max(0, (imageSize.width * scale - canvas.clientWidth) / 2);
      var maxY = Math.max(0, (imageSize.height * scale - canvas.clientHeight) / 2);
      panX = Math.max(-maxX, Math.min(maxX, panX));
      panY = Math.max(-maxY, Math.min(maxY, panY));
    }

    function renderResume() {
      clampPan();
      var imageSize = dimensions();
      // Size first, then center the scaled bitmap. This avoids transform-order drift
      // that can push a tall page out of the clipped canvas.
      image.style.width = (imageSize.width * scale).toFixed(1) + 'px';
      image.style.transform = 'translate(-50%, -50%) translate3d(' + panX.toFixed(1) + 'px, ' + panY.toFixed(1) + 'px, 0)';
      canvas.classList.toggle('is-zoomed', scale > fitScale * 1.015);
    }

    function fitResume() {
      var imageSize = dimensions();
      if (!imageSize.width || !imageSize.height || !canvas.clientWidth || !canvas.clientHeight) return;
      fitScale = Math.min(canvas.clientWidth / imageSize.width, canvas.clientHeight / imageSize.height);
      if (!hasInteracted) {
        scale = fitScale;
        panX = 0;
        panY = 0;
      }
      renderResume();
    }

    image.addEventListener('load', fitResume);
    if (image.complete) window.requestAnimationFrame(fitResume);

    if ('ResizeObserver' in window) {
      var resumeResizeObserver = new ResizeObserver(function () {
        if (!hasInteracted) fitResume();
        else renderResume();
      });
      resumeResizeObserver.observe(canvas);
    } else {
      window.addEventListener('resize', function () {
        if (!hasInteracted) fitResume();
        else renderResume();
      });
    }

    canvas.addEventListener('wheel', function (event) {
      event.preventDefault();
      hasInteracted = true;
      scale *= event.deltaY < 0 ? 1.12 : 1 / 1.12;
      scale = Math.max(fitScale * .55, Math.min(fitScale * 4.5, scale));
      renderResume();
    }, { passive: false });

    canvas.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'touch' || event.button !== 0) return;
      hasInteracted = true;
      draggingResume = true;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      dragStartPanX = panX;
      dragStartPanY = panY;
      canvas.classList.add('is-dragging');
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener('pointermove', function (event) {
      if (!draggingResume) return;
      panX = dragStartPanX + event.clientX - dragStartX;
      panY = dragStartPanY + event.clientY - dragStartY;
      renderResume();
    });

    function finishResumeDrag(event) {
      if (!draggingResume) return;
      draggingResume = false;
      canvas.classList.remove('is-dragging');
      if (event && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    }

    canvas.addEventListener('pointerup', finishResumeDrag);
    canvas.addEventListener('pointercancel', finishResumeDrag);
  });
}());

/*
 * 移动端自适应修复（2026-09-08，2026-09-09 第8轮修订）
 * 手机端（触屏/粗指针）：滑到练习轮播页视频自动播放（轮播不自动，仅手动切换）；
 * 播放时控件隐藏，点击视频画面显示控件（进度条/音量/全屏），点击视频以外区域隐藏。
 */
(function () {
  if (!window.matchMedia || !window.matchMedia('(max-width: 900px), (hover: none), (pointer: coarse)').matches) return;
  var wrap = document.querySelector('.practice-slide--video [data-practice-video-wrap]');
  var video = wrap && wrap.querySelector('[data-practice-video]');
  if (!wrap || !video) return;
  var playButton = wrap.querySelector('[data-practice-video-play]');
  function syncMobileState() {
    wrap.classList.toggle('is-playing', !video.paused);
    if (playButton) playButton.setAttribute('aria-label', video.paused ? '播放视频' : '暂停视频');
  }
  var watcher = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        if (video.paused) video.play().catch(function () {});
      } else if (!video.paused) {
        video.pause();
      }
      syncMobileState();
    });
  }, { threshold: 0.6 });
  watcher.observe(wrap);
  // 交互：点击视频画面 → 显示控件；点击视频以外 → 隐藏
  wrap.addEventListener('click', function () {
    wrap.classList.add('is-controls-visible');
  });
  document.addEventListener('click', function (e) {
    if (!wrap.contains(e.target)) wrap.classList.remove('is-controls-visible');
  });
}());

/*
 * 第10轮（2026-09-09）：视频填满容器（16:9 内容 cover 裁切），消除 PC/手机四周黑边
 */
(function () {
  var wrap = document.querySelector('.practice-slide--video [data-practice-video-wrap]');
  var video = wrap && wrap.querySelector('[data-practice-video]');
  if (!wrap || !video) return;
  function fitVideo() {
    var media = wrap.parentElement;
    if (!media) return;
    var mw = media.clientWidth, mh = media.clientHeight;
    if (mw > 0 && mh > 0) {
      video.style.width = mw + 'px';
      video.style.height = mh + 'px';
    }
  }
  fitVideo();
  window.addEventListener('resize', fitVideo);
  setTimeout(fitVideo, 300);
  setTimeout(fitVideo, 1200);
}());
